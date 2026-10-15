-- ==============================================================================
-- Migration: 20260912000006_wave6_commercial_orders.sql
-- Wave 6: Commercial Orders & Purchase/Sales Contracts (poReceived, poIssued)
-- Purpose: Unified orders model with updatable PostgREST views, companyId bridge,
--          conflict detection, authoritative derivation, and dual-tenant RLS.
-- Status: DRAFT ONLY — NOT EXECUTED
-- ==============================================================================

-- 1. ORDERS TABLE (Unified Commercial Orders / Purchase & Sales Contracts)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('received', 'issued')), -- 'received' = Client Sales PO; 'issued' = Vendor Purchase PO
    po_number VARCHAR(100) NOT NULL, -- Manual contract number e.g. '1110503346', '260300265'
    po_date DATE NOT NULL,
    due_date DATE NOT NULL,
    po_type_id VARCHAR(50) REFERENCES public.po_types(id) ON DELETE RESTRICT,
    po_type_name VARCHAR(50), -- Preserves existing text value e.g. 'Regular' (Open Inconsistency)
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    party_id VARCHAR(50) NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    delivery_location TEXT,
    contact_person VARCHAR(150),
    vendor_code VARCHAR(50),
    separate_consignor_consignee BOOLEAN DEFAULT FALSE,
    item_id VARCHAR(50) NOT NULL REFERENCES public.items(id) ON DELETE RESTRICT,
    item_description TEXT,
    item_qty NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit_id VARCHAR(50) NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
    item_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    hsn_code VARCHAR(50),
    cgst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    sgst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    igst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    ugst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    total_qty NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    consumed_qty NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_qty NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_terms_days INTEGER DEFAULT 30,
    terms_conditions TEXT,
    comments TEXT,
    attachment_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Exhausted/Closed', 'Cancelled')),
    financial_year VARCHAR(20),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- COMPOUND CONSTRAINTS: Prevent cross-plant/business reference pollution
    CONSTRAINT uq_orders_id_plant UNIQUE (id, plant_id),
    CONSTRAINT uq_orders_id_biz UNIQUE (id, business_id),
    CONSTRAINT uq_orders_number UNIQUE (business_id, order_type, po_number),
    CONSTRAINT fk_orders_plant_business FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_orders_timestamps
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- 2. AUTHORITATIVE DERIVATION TRIGGER (Frontend Compatibility Bridge & Conflict Detection)
CREATE OR REPLACE FUNCTION trigger_orders_derive_business()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_plant_id VARCHAR(50);
    v_biz_id UUID;
BEGIN
    IF NEW."companyId" IS NOT NULL AND NEW.plant_id IS NOT NULL AND NEW."companyId" <> NEW.plant_id THEN
        RAISE EXCEPTION 'Conflicting tenant identifiers: companyId (%) does not match plant_id (%)', NEW."companyId", NEW.plant_id;
    END IF;

    v_plant_id := COALESCE(NEW.plant_id, NEW."companyId");
    IF v_plant_id IS NULL THEN
        RAISE EXCEPTION 'plant_id or companyId is required for orders';
    END IF;

    SELECT business_id INTO v_biz_id
    FROM public.plants
    WHERE id = v_plant_id;

    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id / companyId % supplied to order', v_plant_id;
    END IF;

    -- Authoritatively assign keys
    NEW.plant_id := v_plant_id;
    NEW."companyId" := v_plant_id;
    NEW.business_id := v_biz_id;

    -- Compute balance quantity if not supplied
    IF NEW.balance_qty = 0 AND NEW.total_qty > 0 AND NEW.consumed_qty = 0 THEN
        NEW.balance_qty := NEW.total_qty;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_derive_business
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION trigger_orders_derive_business();

-- 3. UPDATABLE COMPATIBILITY VIEWS (1:1 with Frontend camelCase module schemas)
CREATE OR REPLACE VIEW public.view_po_received AS
SELECT 
    o.id AS internal_uuid,
    o.po_number AS id,
    o.po_date AS date,
    o.due_date AS "dueDate",
    COALESCE(o.po_type_name, pt.name, 'Regular') AS "poType",
    p.name AS party,
    o.party_id AS "partyId",
    o.delivery_location AS "deliveryLocation",
    o.contact_person AS "contactPerson",
    o.vendor_code AS "vendorCode",
    o.separate_consignor_consignee AS "separateConsignorConsignee",
    i.name AS "itemName",
    o.item_id AS "itemId",
    o.item_description AS "itemDescription",
    o.item_qty AS "itemQty",
    u.name AS unit,
    o.unit_id AS "unitId",
    o.item_rate AS "itemRate",
    o.hsn_code AS "hsnCode",
    o.cgst_rate AS cgst,
    o.sgst_rate AS sgst,
    o.igst_rate AS igst,
    o.ugst_rate AS ugst,
    o.total_qty AS "totalQty",
    o.consumed_qty AS "consumedQty",
    o.balance_qty AS "balanceQty",
    o.payment_terms_days AS "paymentTermsDays",
    o.terms_conditions AS "termsConditions",
    o.comments,
    o.attachment_url AS attachment,
    o.status,
    o.plant_id AS "companyId",
    o.financial_year AS "financialYear",
    o.created_by AS "createdBy",
    o.updated_by AS "updatedBy"
FROM public.orders o
JOIN public.parties p ON p.id = o.party_id
JOIN public.items i ON i.id = o.item_id
JOIN public.units u ON u.id = o.unit_id
LEFT JOIN public.po_types pt ON pt.id = o.po_type_id
WHERE o.order_type = 'received';

CREATE OR REPLACE VIEW public.view_po_issued AS
SELECT 
    o.id AS internal_uuid,
    o.po_number AS id,
    o.po_date AS date,
    o.due_date AS "dueDate",
    COALESCE(o.po_type_name, pt.name, 'Regular') AS "poType",
    p.name AS party,
    o.party_id AS "partyId",
    o.delivery_location AS "deliveryLocation",
    o.contact_person AS "contactPerson",
    o.vendor_code AS "vendorCode",
    o.separate_consignor_consignee AS "separateConsignorConsignee",
    i.name AS "itemName",
    o.item_id AS "itemId",
    o.item_description AS "itemDescription",
    o.item_qty AS "itemQty",
    u.name AS unit,
    o.unit_id AS "unitId",
    o.item_rate AS "itemRate",
    o.hsn_code AS "hsnCode",
    o.cgst_rate AS cgst,
    o.sgst_rate AS sgst,
    o.igst_rate AS igst,
    o.ugst_rate AS ugst,
    o.total_qty AS "totalQty",
    o.consumed_qty AS "consumedQty",
    o.balance_qty AS "balanceQty",
    o.payment_terms_days AS "paymentTermsDays",
    o.terms_conditions AS "termsConditions",
    o.comments,
    o.attachment_url AS attachment,
    o.status,
    o.plant_id AS "companyId",
    o.financial_year AS "financialYear",
    o.created_by AS "createdBy",
    o.updated_by AS "updatedBy"
FROM public.orders o
JOIN public.parties p ON p.id = o.party_id
JOIN public.items i ON i.id = o.item_id
JOIN public.units u ON u.id = o.unit_id
LEFT JOIN public.po_types pt ON pt.id = o.po_type_id
WHERE o.order_type = 'issued';

-- 4. INSTEAD OF INSERT TRIGGERS FOR POSTGREST CAMELCASE VIEW COMPATIBILITY
CREATE OR REPLACE FUNCTION trg_view_po_received_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_party_id VARCHAR(50);
    v_item_id VARCHAR(50);
    v_unit_id VARCHAR(50);
    v_po_type_id VARCHAR(50);
    v_plant_id VARCHAR(50);
    v_biz_id UUID;
BEGIN
    v_plant_id := NEW."companyId";
    SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid companyId / plant %', v_plant_id;
    END IF;

    -- Resolve party_id from ID or Name
    SELECT id INTO v_party_id FROM public.parties WHERE id = NEW."partyId" OR name = NEW.party LIMIT 1;
    IF v_party_id IS NULL THEN
        RAISE EXCEPTION 'Party % not found', COALESCE(NEW."partyId", NEW.party);
    END IF;

    -- Resolve item_id from ID or Name
    SELECT id INTO v_item_id FROM public.items WHERE id = NEW."itemId" OR name = NEW."itemName" LIMIT 1;
    IF v_item_id IS NULL THEN
        RAISE EXCEPTION 'Item % not found', COALESCE(NEW."itemId", NEW."itemName");
    END IF;

    -- Resolve unit_id from ID or Name
    SELECT id INTO v_unit_id FROM public.units WHERE id = NEW."unitId" OR name = NEW.unit LIMIT 1;
    IF v_unit_id IS NULL THEN
        SELECT default_unit_id INTO v_unit_id FROM public.items WHERE id = v_item_id;
    END IF;

    -- Resolve po_type_id from name
    SELECT id INTO v_po_type_id FROM public.po_types WHERE name = NEW."poType" LIMIT 1;

    INSERT INTO public.orders (
        order_type, po_number, po_date, due_date, po_type_id, po_type_name,
        business_id, plant_id, "companyId", party_id, delivery_location,
        contact_person, vendor_code, separate_consignor_consignee,
        item_id, item_description, item_qty, unit_id, item_rate,
        hsn_code, cgst_rate, sgst_rate, igst_rate, ugst_rate,
        total_qty, consumed_qty, balance_qty, payment_terms_days,
        terms_conditions, comments, attachment_url, status, financial_year,
        created_by, updated_by
    ) VALUES (
        'received', NEW.id, NEW.date, NEW."dueDate", v_po_type_id, NEW."poType",
        v_biz_id, v_plant_id, v_plant_id, v_party_id, NEW."deliveryLocation",
        NEW."contactPerson", NEW."vendorCode", COALESCE(NEW."separateConsignorConsignee", FALSE),
        v_item_id, NEW."itemDescription", COALESCE(NEW."itemQty", 0.00), v_unit_id, COALESCE(NEW."itemRate", 0.00),
        NEW."hsnCode", COALESCE(NEW.cgst, 0.00), COALESCE(NEW.sgst, 0.00), COALESCE(NEW.igst, 0.00), COALESCE(NEW.ugst, 0.00),
        COALESCE(NEW."totalQty", 0.00), COALESCE(NEW."consumedQty", 0.00), COALESCE(NEW."balanceQty", NEW."totalQty", 0.00),
        COALESCE(NEW."paymentTermsDays", 30), NEW."termsConditions", NEW.comments, NEW.attachment,
        COALESCE(NEW.status, 'Open'), NEW."financialYear", NEW."createdBy", NEW."updatedBy"
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_view_po_received_instead_insert
INSTEAD OF INSERT ON public.view_po_received
FOR EACH ROW EXECUTE FUNCTION trg_view_po_received_insert();

CREATE OR REPLACE FUNCTION trg_view_po_issued_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_party_id VARCHAR(50);
    v_item_id VARCHAR(50);
    v_unit_id VARCHAR(50);
    v_po_type_id VARCHAR(50);
    v_plant_id VARCHAR(50);
    v_biz_id UUID;
BEGIN
    v_plant_id := NEW."companyId";
    SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid companyId / plant %', v_plant_id;
    END IF;

    SELECT id INTO v_party_id FROM public.parties WHERE id = NEW."partyId" OR name = NEW.party LIMIT 1;
    IF v_party_id IS NULL THEN
        RAISE EXCEPTION 'Party % not found', COALESCE(NEW."partyId", NEW.party);
    END IF;

    SELECT id INTO v_item_id FROM public.items WHERE id = NEW."itemId" OR name = NEW."itemName" LIMIT 1;
    IF v_item_id IS NULL THEN
        RAISE EXCEPTION 'Item % not found', COALESCE(NEW."itemId", NEW."itemName");
    END IF;

    SELECT id INTO v_unit_id FROM public.units WHERE id = NEW."unitId" OR name = NEW.unit LIMIT 1;
    IF v_unit_id IS NULL THEN
        SELECT default_unit_id INTO v_unit_id FROM public.items WHERE id = v_item_id;
    END IF;

    SELECT id INTO v_po_type_id FROM public.po_types WHERE name = NEW."poType" LIMIT 1;

    INSERT INTO public.orders (
        order_type, po_number, po_date, due_date, po_type_id, po_type_name,
        business_id, plant_id, "companyId", party_id, delivery_location,
        contact_person, vendor_code, separate_consignor_consignee,
        item_id, item_description, item_qty, unit_id, item_rate,
        hsn_code, cgst_rate, sgst_rate, igst_rate, ugst_rate,
        total_qty, consumed_qty, balance_qty, payment_terms_days,
        terms_conditions, comments, attachment_url, status, financial_year,
        created_by, updated_by
    ) VALUES (
        'issued', NEW.id, NEW.date, NEW."dueDate", v_po_type_id, NEW."poType",
        v_biz_id, v_plant_id, v_plant_id, v_party_id, NEW."deliveryLocation",
        NEW."contactPerson", NEW."vendorCode", COALESCE(NEW."separateConsignorConsignee", FALSE),
        v_item_id, NEW."itemDescription", COALESCE(NEW."itemQty", 0.00), v_unit_id, COALESCE(NEW."itemRate", 0.00),
        NEW."hsnCode", COALESCE(NEW.cgst, 0.00), COALESCE(NEW.sgst, 0.00), COALESCE(NEW.igst, 0.00), COALESCE(NEW.ugst, 0.00),
        COALESCE(NEW."totalQty", 0.00), COALESCE(NEW."consumedQty", 0.00), COALESCE(NEW."balanceQty", NEW."totalQty", 0.00),
        COALESCE(NEW."paymentTermsDays", 30), NEW."termsConditions", NEW.comments, NEW.attachment,
        COALESCE(NEW.status, 'Open'), NEW."financialYear", NEW."createdBy", NEW."updatedBy"
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_view_po_issued_instead_insert
INSTEAD OF INSERT ON public.view_po_issued
FOR EACH ROW EXECUTE FUNCTION trg_view_po_issued_insert();

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_orders_business ON public.orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_plant ON public.orders(plant_id);
CREATE INDEX IF NOT EXISTS idx_orders_party ON public.orders(party_id);
CREATE INDEX IF NOT EXISTS idx_orders_type ON public.orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(po_number);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES (Dual Business & Plant Enforced)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select" ON public.orders FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "orders_insert" ON public.orders FOR INSERT TO authenticated
WITH CHECK (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "orders_update" ON public.orders FOR UPDATE TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
)
WITH CHECK (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "orders_delete" ON public.orders FOR DELETE TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);
