-- ==============================================================================
-- Migration: 20260912000007_wave7_operational_logistics_receiving.sql
-- Wave 7: Operational Logistics (Trips), Gate Verification & Receiving (GRN)
-- Purpose: Physical movement tracking, gate security logs, and goods receipts.
--          Enforces grn_items->trip cross-plant integrity, gate_entry->trip integrity,
--          shared-fleet vehicle compatibility, companyId conflict detection, and dual-tenant RLS.
-- Status: DRAFT ONLY — NOT EXECUTED
-- ==============================================================================

-- 1. TRIPS (Fleet Logistics, Weighments & Transit Tracking)
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_number VARCHAR(100) NOT NULL, -- e.g. '36422655'
    trip_type VARCHAR(50) NOT NULL CHECK (trip_type IN ('Outward (Sales)', 'Inward (Purchase)')),
    trip_date DATE NOT NULL,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    party_id VARCHAR(50) NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES public.orders(id) ON DELETE RESTRICT, -- Direct relational link to commercial contract
    po_received_number VARCHAR(100), -- Preserves business-visible contract reference
    transport_po_received_number VARCHAR(100),
    po_issued_number VARCHAR(100), -- Preserves business-visible contract reference
    linked_transport_po_issued_number VARCHAR(100),
    vehicle_id VARCHAR(50) NOT NULL,
    transport_mode VARCHAR(50) NOT NULL DEFAULT 'By Road',
    freight_paid_by VARCHAR(50) NOT NULL DEFAULT 'Consignor',
    bill_type VARCHAR(50) NOT NULL DEFAULT 'To Bill',
    is_insured BOOLEAN NOT NULL DEFAULT FALSE,
    insurance_policy_details TEXT,
    origin_city VARCHAR(100) NOT NULL,
    origin_state VARCHAR(100) NOT NULL,
    destination_city VARCHAR(100) NOT NULL,
    destination_state VARCHAR(100) NOT NULL,
    gross_weight NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tare_weight NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_weight NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    driver_name VARCHAR(150),
    driver_phone VARCHAR(50),
    eway_bill_no VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    financial_year VARCHAR(20),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- COMPOUND CONSTRAINTS: Ensures trip cannot mix plants, businesses, vehicles, or orders
    CONSTRAINT uq_trips_id_plant UNIQUE (id, plant_id),
    CONSTRAINT uq_trips_id_biz UNIQUE (id, business_id),
    CONSTRAINT uq_trips_number UNIQUE (business_id, trip_number),
    CONSTRAINT fk_trips_plant_business FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_trips_order_plant FOREIGN KEY (order_id, plant_id)
        REFERENCES public.orders(id, plant_id) ON DELETE RESTRICT,
    -- Vehicle must belong to the same business; plant check handled via trigger (supports shared fleet)
    CONSTRAINT fk_trips_vehicle_biz FOREIGN KEY (vehicle_id, business_id)
        REFERENCES public.vehicles(id, business_id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_trips_timestamps
BEFORE UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- Auto-derive business_id from plant_id, conflict detection, order linkage, and vehicle dedication check
CREATE OR REPLACE FUNCTION trigger_trips_derive_business()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_plant_id VARCHAR(50);
    v_biz_id UUID;
    v_order_id UUID;
    v_veh_plant VARCHAR(50);
BEGIN
    IF NEW."companyId" IS NOT NULL AND NEW.plant_id IS NOT NULL AND NEW."companyId" <> NEW.plant_id THEN
        RAISE EXCEPTION 'Conflicting tenant identifiers: companyId (%) does not match plant_id (%)', NEW."companyId", NEW.plant_id;
    END IF;

    v_plant_id := COALESCE(NEW.plant_id, NEW."companyId");
    IF v_plant_id IS NULL THEN
        RAISE EXCEPTION 'plant_id or companyId is required for trips';
    END IF;

    SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id / companyId % supplied to trip', v_plant_id;
    END IF;

    NEW.plant_id := v_plant_id;
    NEW."companyId" := v_plant_id;
    NEW.business_id := v_biz_id;

    -- Verify vehicle dedication: if vehicle is dedicated to a specific plant, it cannot be used by another
    SELECT plant_id INTO v_veh_plant FROM public.vehicles WHERE id = NEW.vehicle_id;
    IF v_veh_plant IS NOT NULL AND v_veh_plant <> v_plant_id THEN
        RAISE EXCEPTION 'Vehicle % is dedicated to plant % and cannot be used on trip for plant %', NEW.vehicle_id, v_veh_plant, v_plant_id;
    END IF;

    -- Calculate net weight if zero
    IF NEW.net_weight = 0 AND NEW.gross_weight > 0 AND NEW.tare_weight > 0 THEN
        NEW.net_weight := NEW.gross_weight - NEW.tare_weight;
    END IF;

    -- Auto-resolve order_id from po_received_number or po_issued_number if omitted
    IF NEW.order_id IS NULL THEN
        IF NEW.po_received_number IS NOT NULL THEN
            SELECT id INTO v_order_id FROM public.orders 
            WHERE po_number = NEW.po_received_number AND plant_id = v_plant_id LIMIT 1;
            NEW.order_id := v_order_id;
        ELSIF NEW.po_issued_number IS NOT NULL THEN
            SELECT id INTO v_order_id FROM public.orders 
            WHERE po_number = NEW.po_issued_number AND plant_id = v_plant_id LIMIT 1;
            NEW.order_id := v_order_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_trips_derive_business
BEFORE INSERT OR UPDATE ON public.trips
FOR EACH ROW EXECUTE FUNCTION trigger_trips_derive_business();

-- 2. GATE ENTRIES (Security Gate Verification)
CREATE TABLE IF NOT EXISTS public.gate_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_number VARCHAR(100) NOT NULL,
    trip_id UUID,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('Inward (Entering Plant)', 'Outward (Leaving Plant)')),
    vehicle_no VARCHAR(50) NOT NULL,
    driver_name VARCHAR(150),
    driver_phone VARCHAR(50),
    status VARCHAR(50) NOT NULL CHECK (status IN ('Verified - Allowed Entry', 'Verified - Allowed Exit', 'Hold/Rejected')),
    photo_front_url TEXT,
    photo_back_url TEXT,
    guard_remarks TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_gate_id_plant UNIQUE (id, plant_id),
    CONSTRAINT fk_gate_plant_business FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT,
    -- Blocker 3: Trip linked to gate entry must belong to the exact same plant
    CONSTRAINT fk_gate_trip_plant FOREIGN KEY (trip_id, plant_id)
        REFERENCES public.trips(id, plant_id) ON DELETE SET NULL
);

CREATE TRIGGER trg_gate_entries_timestamps
BEFORE UPDATE ON public.gate_entries
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

CREATE OR REPLACE FUNCTION trigger_gate_derive_business()
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
        RAISE EXCEPTION 'plant_id or companyId is required for gate entries';
    END IF;

    SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id / companyId % supplied to gate entry', v_plant_id;
    END IF;

    NEW.plant_id := v_plant_id;
    NEW."companyId" := v_plant_id;
    NEW.business_id := v_biz_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_gate_derive_business
BEFORE INSERT OR UPDATE ON public.gate_entries
FOR EACH ROW EXECUTE FUNCTION trigger_gate_derive_business();

-- 3. GOODS RECEIPT NOTES (GRN)
CREATE TABLE IF NOT EXISTS public.grn (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_number VARCHAR(100) NOT NULL, -- e.g. 'GRN-1'
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    party_id VARCHAR(50) NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT, -- Client / Vendor
    order_id UUID REFERENCES public.orders(id) ON DELETE RESTRICT, -- Relational PO linkage
    po_ref VARCHAR(100) NOT NULL, -- Preserves business-visible contract reference
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    condition VARCHAR(50) DEFAULT 'Good' CHECK (condition IN ('Good', 'Damaged', 'Partial')),
    total_grn_weight NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_shortage NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    financial_year VARCHAR(20),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- COMPOUND CONSTRAINTS: Ensures GRN integrity within business & plant
    CONSTRAINT uq_grn_id_plant UNIQUE (id, plant_id),
    CONSTRAINT uq_grn_id_biz UNIQUE (id, business_id),
    CONSTRAINT uq_grn_number UNIQUE (business_id, grn_number),
    CONSTRAINT fk_grn_plant_business FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_grn_order_plant FOREIGN KEY (order_id, plant_id)
        REFERENCES public.orders(id, plant_id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_grn_timestamps
BEFORE UPDATE ON public.grn
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

CREATE OR REPLACE FUNCTION trigger_grn_derive_business()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_plant_id VARCHAR(50);
    v_biz_id UUID;
    v_order_id UUID;
BEGIN
    IF NEW."companyId" IS NOT NULL AND NEW.plant_id IS NOT NULL AND NEW."companyId" <> NEW.plant_id THEN
        RAISE EXCEPTION 'Conflicting tenant identifiers: companyId (%) does not match plant_id (%)', NEW."companyId", NEW.plant_id;
    END IF;

    v_plant_id := COALESCE(NEW.plant_id, NEW."companyId");
    IF v_plant_id IS NULL THEN
        RAISE EXCEPTION 'plant_id or companyId is required for GRN';
    END IF;

    SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id / companyId % supplied to GRN', v_plant_id;
    END IF;

    NEW.plant_id := v_plant_id;
    NEW."companyId" := v_plant_id;
    NEW.business_id := v_biz_id;

    -- Auto-resolve order_id from po_ref if not explicitly provided
    IF NEW.order_id IS NULL AND NEW.po_ref IS NOT NULL THEN
        SELECT id INTO v_order_id FROM public.orders 
        WHERE po_number = NEW.po_ref AND plant_id = v_plant_id LIMIT 1;
        NEW.order_id := v_order_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_grn_derive_business
BEFORE INSERT OR UPDATE ON public.grn
FOR EACH ROW EXECUTE FUNCTION trigger_grn_derive_business();

-- 4. GRN ITEMS (Normalized Multi-Trip Batch Weighment Selections)
-- Blocker 2: Enforces compound FK so trip must belong to the exact same plant as the parent GRN
CREATE TABLE IF NOT EXISTS public.grn_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grn_id UUID NOT NULL,
    plant_id VARCHAR(50) NOT NULL, -- Propagated from parent GRN for compound FK verification
    trip_uuid UUID NOT NULL, -- Relational trip linkage
    trip_number VARCHAR(100) NOT NULL, -- Preserves business-visible trip code
    trip_weight NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    received_weight NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    grn_weight NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    shortage NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    material_doc_num VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- COMPOUND CONSTRAINTS: Guarantees GRN and Trip belong to the exact same plant
    CONSTRAINT fk_grn_items_grn_plant FOREIGN KEY (grn_id, plant_id)
        REFERENCES public.grn(id, plant_id) ON DELETE CASCADE,
    CONSTRAINT fk_grn_items_trip_plant FOREIGN KEY (trip_uuid, plant_id)
        REFERENCES public.trips(id, plant_id) ON DELETE RESTRICT
);

-- Auto-propagate plant_id to grn_items from parent GRN
CREATE OR REPLACE FUNCTION trigger_grn_items_derive()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.plant_id IS NULL THEN
        SELECT plant_id INTO NEW.plant_id FROM public.grn WHERE id = NEW.grn_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_grn_items_derive
BEFORE INSERT OR UPDATE ON public.grn_items
FOR EACH ROW EXECUTE FUNCTION trigger_grn_items_derive();

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_trips_business ON public.trips(business_id);
CREATE INDEX IF NOT EXISTS idx_trips_plant ON public.trips(plant_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON public.trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_order ON public.trips(order_id);
CREATE INDEX IF NOT EXISTS idx_gate_plant ON public.gate_entries(plant_id);
CREATE INDEX IF NOT EXISTS idx_gate_trip ON public.gate_entries(trip_id);
CREATE INDEX IF NOT EXISTS idx_grn_business ON public.grn(business_id);
CREATE INDEX IF NOT EXISTS idx_grn_plant ON public.grn(plant_id);
CREATE INDEX IF NOT EXISTS idx_grn_order ON public.grn(order_id);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON public.grn_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_grn_items_trip ON public.grn_items(trip_uuid);
CREATE INDEX IF NOT EXISTS idx_grn_items_plant ON public.grn_items(plant_id);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES (Dual Business & Plant Enforced)
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trips_select" ON public.trips FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "trips_insert" ON public.trips FOR INSERT TO authenticated
WITH CHECK (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "trips_update" ON public.trips FOR UPDATE TO authenticated
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

CREATE POLICY "trips_delete" ON public.trips FOR DELETE TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "gate_select" ON public.gate_entries FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "gate_insert" ON public.gate_entries FOR INSERT TO authenticated
WITH CHECK (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "gate_update" ON public.gate_entries FOR UPDATE TO authenticated
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

CREATE POLICY "gate_delete" ON public.gate_entries FOR DELETE TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "grn_select" ON public.grn FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "grn_insert" ON public.grn FOR INSERT TO authenticated
WITH CHECK (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "grn_update" ON public.grn FOR UPDATE TO authenticated
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

CREATE POLICY "grn_delete" ON public.grn FOR DELETE TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "grn_items_select" ON public.grn_items FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.grn g 
        WHERE g.id = grn_items.grn_id 
          AND (auth_is_super_admin() OR (g.business_id = ANY(auth_user_business_ids()) AND g.plant_id = ANY(auth_user_plant_ids())))
    )
);

CREATE POLICY "grn_items_write" ON public.grn_items FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.grn g 
        WHERE g.id = grn_items.grn_id 
          AND (auth_is_super_admin() OR (g.business_id = ANY(auth_user_business_ids()) AND g.plant_id = ANY(auth_user_plant_ids())))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.grn g 
        WHERE g.id = grn_items.grn_id 
          AND (auth_is_super_admin() OR (g.business_id = ANY(auth_user_business_ids()) AND g.plant_id = ANY(auth_user_plant_ids())))
    )
);
