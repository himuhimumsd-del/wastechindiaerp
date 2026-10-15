-- ==============================================================================
-- Migration: 20260912000008_wave8_financial_invoicing_hr_logs.sql
-- Wave 8: Financial Invoicing, HR Execution, Operational Logs & Storage Attachments
-- Purpose: Invoicing with immutable snapshots, attendance, payroll ledger, machine logs,
--          invoice->grn cross-plant integrity, companyId conflict detection, and dual-tenant RLS.
-- Status: DRAFT ONLY — NOT EXECUTED
-- ==============================================================================

-- 1. SALES INVOICES (Outward Customer Billing)
CREATE TABLE IF NOT EXISTS public.sales_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) NOT NULL, -- e.g. 'INV-1' (Manual/Open convention)
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    tax_identity_id UUID NOT NULL,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    bank_account_id UUID,
    party_id VARCHAR(50) NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES public.orders(id) ON DELETE RESTRICT, -- Relational sales order linkage
    po_ref VARCHAR(100) NOT NULL, -- Preserves business-visible PO contract number
    invoice_date DATE NOT NULL,
    create_with_grn BOOLEAN DEFAULT FALSE,
    grn_id UUID, -- Relational GRN linkage
    grn_ref VARCHAR(100), -- Preserves business-visible GRN reference
    payment_terms_days INTEGER DEFAULT 30,
    comments TEXT,
    total_qty NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Proforma' CHECK (status IN ('Proforma', 'Generated', 'Paid', 'Overdue', 'Cancelled')),
    financial_year VARCHAR(20),
    -- IMMUTABLE DOCUMENT SNAPSHOTS (Protects audit validity from future master mutations)
    seller_snapshot JSONB DEFAULT '{}'::jsonb, -- Legal Name, GSTIN, Trade Name, SPCB, Address, Bank Info
    buyer_snapshot JSONB DEFAULT '{}'::jsonb,  -- Client Name, GSTIN, Billing/Shipping Address
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- COMPOUND CONSTRAINTS: Prevent cross-business/plant contamination
    CONSTRAINT uq_sales_invoices_id_plant UNIQUE (id, plant_id),
    CONSTRAINT uq_sales_invoices_id_biz UNIQUE (id, business_id),
    CONSTRAINT uq_sales_invoices_num UNIQUE (business_id, tax_identity_id, financial_year, invoice_number),
    CONSTRAINT fk_sales_inv_order_plant FOREIGN KEY (order_id, plant_id)
        REFERENCES public.orders(id, plant_id) ON DELETE RESTRICT,
    -- Blocker 4: Cross-plant integrity between Sales Invoice and GRN
    CONSTRAINT fk_sales_inv_grn_plant FOREIGN KEY (grn_id, plant_id)
        REFERENCES public.grn(id, plant_id) ON DELETE SET NULL,
    CONSTRAINT fk_sales_inv_plant_biz FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_inv_tax_biz FOREIGN KEY (tax_identity_id, business_id)
        REFERENCES public.tax_identities(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_inv_bank_biz FOREIGN KEY (bank_account_id, business_id)
        REFERENCES public.bank_accounts(id, business_id) ON DELETE SET NULL
);

-- Blocker 9: Explicit unique index handling COALESCE for financial_year nullability safety
CREATE UNIQUE INDEX IF NOT EXISTS uq_sales_invoices_num_coalesce_idx 
ON public.sales_invoices (business_id, tax_identity_id, COALESCE(financial_year, ''), invoice_number);

CREATE TRIGGER trg_sales_invoices_timestamps
BEFORE UPDATE ON public.sales_invoices
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- Auto-derivation, conflict detection, snapshot builder, and lifecycle snapshot protection trigger
CREATE OR REPLACE FUNCTION trigger_sales_invoices_derive()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_plant RECORD;
    v_tax RECORD;
    v_bank RECORD;
    v_biz RECORD;
    v_party RECORD;
    v_order_id UUID;
    v_grn_id UUID;
BEGIN
    -- 1. LIFECYCLE IMMUTABILITY PROTECTION (Blocker 8)
    -- Finalized invoices (Generated, Paid, Overdue, Cancelled) cannot have their legal identities,
    -- parties, plants, or snapshots mutated.
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status IN ('Generated', 'Paid', 'Overdue', 'Cancelled') THEN
            IF (NEW.seller_snapshot IS DISTINCT FROM OLD.seller_snapshot)
               OR (NEW.buyer_snapshot IS DISTINCT FROM OLD.buyer_snapshot)
               OR (NEW.party_id IS DISTINCT FROM OLD.party_id)
               OR (NEW.plant_id IS DISTINCT FROM OLD.plant_id)
               OR (NEW.tax_identity_id IS DISTINCT FROM OLD.tax_identity_id)
               OR (NEW.bank_account_id IS DISTINCT FROM OLD.bank_account_id)
               OR (NEW.invoice_number IS DISTINCT FROM OLD.invoice_number) THEN
                RAISE EXCEPTION 'Cannot modify party, plant, bank account, or legal snapshots on finalized invoice (Status: %)', OLD.status;
            END IF;
        END IF;
    END IF;

    -- 2. CONFLICT DETECTION & PLANT RESOLUTION (Blocker 6)
    IF NEW."companyId" IS NOT NULL AND NEW.plant_id IS NOT NULL AND NEW."companyId" <> NEW.plant_id THEN
        RAISE EXCEPTION 'Conflicting tenant identifiers: companyId (%) does not match plant_id (%)', NEW."companyId", NEW.plant_id;
    END IF;

    NEW.plant_id := COALESCE(NEW.plant_id, NEW."companyId");
    IF NEW.plant_id IS NULL THEN
        RAISE EXCEPTION 'plant_id or companyId is required for sales invoice';
    END IF;

    SELECT * INTO v_plant FROM public.plants WHERE id = NEW.plant_id;
    IF v_plant IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id / companyId % for sales invoice', NEW.plant_id;
    END IF;

    NEW."companyId" := NEW.plant_id;
    NEW.business_id := v_plant.business_id;

    -- Auto-bind tax_identity_id from plant if not explicitly provided
    IF NEW.tax_identity_id IS NULL THEN
        NEW.tax_identity_id := v_plant.tax_identity_id;
    END IF;

    -- Auto-bind bank_account_id from plant default if not supplied
    IF NEW.bank_account_id IS NULL THEN
        NEW.bank_account_id := v_plant.default_bank_account_id;
    END IF;

    -- Auto-resolve order_id from po_ref if omitted
    IF NEW.order_id IS NULL AND NEW.po_ref IS NOT NULL THEN
        SELECT id INTO v_order_id FROM public.orders 
        WHERE po_number = NEW.po_ref AND plant_id = NEW.plant_id LIMIT 1;
        NEW.order_id := v_order_id;
    END IF;

    -- Auto-resolve grn_id from grn_ref if omitted
    IF NEW.grn_id IS NULL AND NEW.grn_ref IS NOT NULL THEN
        SELECT id INTO v_grn_id FROM public.grn 
        WHERE grn_number = NEW.grn_ref AND plant_id = NEW.plant_id LIMIT 1;
        NEW.grn_id := v_grn_id;
    END IF;

    -- 3. BUILD OR REBUILD SNAPSHOTS WHILE IN 'Proforma'
    IF TG_OP = 'INSERT' OR OLD.status = 'Proforma' THEN
        -- Build seller snapshot
        IF TG_OP = 'INSERT' OR (NEW.seller_snapshot IS NULL OR NEW.seller_snapshot = '{}'::jsonb)
           OR (NEW.plant_id IS DISTINCT FROM OLD.plant_id)
           OR (NEW.tax_identity_id IS DISTINCT FROM OLD.tax_identity_id)
           OR (NEW.bank_account_id IS DISTINCT FROM OLD.bank_account_id) THEN
            SELECT * INTO v_biz FROM public.businesses WHERE id = NEW.business_id;
            SELECT * INTO v_tax FROM public.tax_identities WHERE id = NEW.tax_identity_id;
            SELECT * INTO v_bank FROM public.bank_accounts WHERE id = NEW.bank_account_id;

            NEW.seller_snapshot := jsonb_build_object(
                'legalName', v_biz.legal_name,
                'pan', v_biz.pan,
                'cin', v_biz.cin,
                'gstin', v_tax.gstin,
                'stateCode', v_tax.state_code,
                'stateName', v_tax.state_name,
                'plantTradeName', v_plant.trade_name,
                'spcbAuth', v_plant.spcb_auth,
                'eprRegNo', v_plant.epr_reg_no,
                'dispatchAddress', v_plant.physical_address,
                'bankName', COALESCE(v_bank.bank_name, ''),
                'accountNo', COALESCE(v_bank.account_no, ''),
                'ifscCode', COALESCE(v_bank.ifsc_code, '')
            );
        END IF;

        -- Build buyer snapshot
        IF TG_OP = 'INSERT' OR (NEW.buyer_snapshot IS NULL OR NEW.buyer_snapshot = '{}'::jsonb)
           OR (TG_OP = 'UPDATE' AND NEW.party_id IS DISTINCT FROM OLD.party_id) THEN
            SELECT * INTO v_party FROM public.parties WHERE id = NEW.party_id;
            IF v_party IS NOT NULL THEN
                NEW.buyer_snapshot := jsonb_build_object(
                    'partyId', v_party.id,
                    'name', v_party.name,
                    'gstin', v_party.gstin,
                    'pan', v_party.pan,
                    'address', v_party.primary_address,
                    'city', v_party.city,
                    'state', v_party.state
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sales_invoices_derive
BEFORE INSERT OR UPDATE ON public.sales_invoices
FOR EACH ROW EXECUTE FUNCTION trigger_sales_invoices_derive();

-- 2. VENDOR INVOICES (Inward Purchase Accounts Payable)
CREATE TABLE IF NOT EXISTS public.vendor_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_invoice_number VARCHAR(100) NOT NULL,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    tax_identity_id UUID NOT NULL,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    party_id VARCHAR(50) NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT, -- Vendor
    order_id UUID REFERENCES public.orders(id) ON DELETE RESTRICT, -- Relational PO linkage
    po_ref VARCHAR(100) NOT NULL,
    grn_id UUID, -- Relational GRN linkage
    grn_ref VARCHAR(100),
    invoice_date DATE NOT NULL,
    due_date DATE,
    qty NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Overdue', 'Rejected')),
    financial_year VARCHAR(20),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_vendor_inv_id_plant UNIQUE (id, plant_id),
    CONSTRAINT uq_vendor_inv_id_biz UNIQUE (id, business_id),
    CONSTRAINT fk_vendor_inv_order_plant FOREIGN KEY (order_id, plant_id)
        REFERENCES public.orders(id, plant_id) ON DELETE RESTRICT,
    -- Blocker 4: Cross-plant integrity between Vendor Invoice and GRN
    CONSTRAINT fk_vendor_inv_grn_plant FOREIGN KEY (grn_id, plant_id)
        REFERENCES public.grn(id, plant_id) ON DELETE SET NULL,
    CONSTRAINT fk_vendor_inv_plant_biz FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_vendor_inv_tax_biz FOREIGN KEY (tax_identity_id, business_id)
        REFERENCES public.tax_identities(id, business_id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_vendor_invoices_timestamps
BEFORE UPDATE ON public.vendor_invoices
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

CREATE OR REPLACE FUNCTION trigger_vendor_invoices_derive()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_plant RECORD;
    v_order_id UUID;
    v_grn_id UUID;
BEGIN
    IF NEW."companyId" IS NOT NULL AND NEW.plant_id IS NOT NULL AND NEW."companyId" <> NEW.plant_id THEN
        RAISE EXCEPTION 'Conflicting tenant identifiers: companyId (%) does not match plant_id (%)', NEW."companyId", NEW.plant_id;
    END IF;

    NEW.plant_id := COALESCE(NEW.plant_id, NEW."companyId");
    IF NEW.plant_id IS NULL THEN
        RAISE EXCEPTION 'plant_id or companyId is required for vendor invoice';
    END IF;

    SELECT * INTO v_plant FROM public.plants WHERE id = NEW.plant_id;
    IF v_plant IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id / companyId % for vendor invoice', NEW.plant_id;
    END IF;

    NEW."companyId" := NEW.plant_id;
    NEW.business_id := v_plant.business_id;

    IF NEW.tax_identity_id IS NULL THEN
        NEW.tax_identity_id := v_plant.tax_identity_id;
    END IF;

    -- Auto-resolve order_id
    IF NEW.order_id IS NULL AND NEW.po_ref IS NOT NULL THEN
        SELECT id INTO v_order_id FROM public.orders 
        WHERE po_number = NEW.po_ref AND plant_id = NEW.plant_id LIMIT 1;
        NEW.order_id := v_order_id;
    END IF;

    -- Auto-resolve grn_id
    IF NEW.grn_id IS NULL AND NEW.grn_ref IS NOT NULL THEN
        SELECT id INTO v_grn_id FROM public.grn 
        WHERE grn_number = NEW.grn_ref AND plant_id = NEW.plant_id LIMIT 1;
        NEW.grn_id := v_grn_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vendor_invoices_derive
BEFORE INSERT OR UPDATE ON public.vendor_invoices
FOR EACH ROW EXECUTE FUNCTION trigger_vendor_invoices_derive();

-- 3. ATTENDANCE (Daily Personnel Punches & Geofence Verification)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attendance_code VARCHAR(50) NOT NULL, -- e.g. 'ATT-1'
    attendance_date DATE NOT NULL,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    employee_id VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Absent', 'Half Day', 'On Leave', 'Late')),
    punch_time TIME,
    total_hours NUMERIC(4, 2) DEFAULT 0.00,
    selfie_url TEXT,
    punch_lat NUMERIC(10, 7),
    punch_lng NUMERIC(10, 7),
    geofence_verified BOOLEAN DEFAULT TRUE,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_attendance_id_plant UNIQUE (id, plant_id),
    CONSTRAINT uq_attendance_emp_date UNIQUE (employee_id, attendance_date),
    CONSTRAINT fk_attendance_emp_plant FOREIGN KEY (employee_id, plant_id)
        REFERENCES public.employees(id, plant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_attendance_plant_biz FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_attendance_timestamps
BEFORE UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

CREATE OR REPLACE FUNCTION trigger_attendance_derive_business()
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
        RAISE EXCEPTION 'plant_id or companyId is required for attendance';
    END IF;

    SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id / companyId % supplied to attendance', v_plant_id;
    END IF;

    NEW.plant_id := v_plant_id;
    NEW."companyId" := v_plant_id;
    NEW.business_id := v_biz_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attendance_derive_business
BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION trigger_attendance_derive_business();

-- 4. PAYROLL LEDGER (Monthly Employee Payroll Computation Runs)
CREATE TABLE IF NOT EXISTS public.payroll_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_code VARCHAR(100) NOT NULL, -- e.g. 'PAY-1'
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    payroll_month VARCHAR(20) NOT NULL, -- '2026-03'
    employee_id VARCHAR(50) NOT NULL,
    payable_days NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    present_days NUMERIC(5, 2) DEFAULT 0.00,
    half_days NUMERIC(5, 2) DEFAULT 0.00,
    late_days NUMERIC(5, 2) DEFAULT 0.00,
    absent_days NUMERIC(5, 2) DEFAULT 0.00,
    paid_leave_days NUMERIC(5, 2) DEFAULT 0.00,
    unpaid_leave_days NUMERIC(5, 2) DEFAULT 0.00,
    weekly_off_days NUMERIC(5, 2) DEFAULT 0.00,
    holiday_days NUMERIC(5, 2) DEFAULT 0.00,
    missing_punch_days NUMERIC(5, 2) DEFAULT 0.00,
    basic_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    hra_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    allowances_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    ot_hours NUMERIC(6, 2) DEFAULT 0.00,
    ot_pay NUMERIC(12, 2) DEFAULT 0.00,
    gross_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    employee_pf NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    employee_esi NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    professional_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    advance_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    employer_pf NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    employer_esi NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Reviewed', 'Approved', 'Paid')),
    financial_year VARCHAR(20),
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_payroll_emp_month UNIQUE (employee_id, payroll_month),
    CONSTRAINT uq_payroll_id_plant UNIQUE (id, plant_id),
    CONSTRAINT fk_payroll_emp_plant FOREIGN KEY (employee_id, plant_id)
        REFERENCES public.employees(id, plant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_payroll_plant_biz FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_payroll_ledger_timestamps
BEFORE UPDATE ON public.payroll_ledger
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

CREATE OR REPLACE FUNCTION trigger_payroll_derive_business()
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
        RAISE EXCEPTION 'plant_id or companyId is required for payroll ledger';
    END IF;

    SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id / companyId % supplied to payroll', v_plant_id;
    END IF;

    NEW.plant_id := v_plant_id;
    NEW."companyId" := v_plant_id;
    NEW.business_id := v_biz_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payroll_derive_business
BEFORE INSERT OR UPDATE ON public.payroll_ledger
FOR EACH ROW EXECUTE FUNCTION trigger_payroll_derive_business();

-- 5. CONSUMABLE MOVEMENTS (Inventory Inward/Outward Logs)
CREATE TABLE IF NOT EXISTS public.consumable_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_code VARCHAR(50) NOT NULL, -- 'CL-1'
    movement_date DATE NOT NULL,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    consumable_id VARCHAR(50) NOT NULL,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('Purchased (In)', 'Issued (Out)')),
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    price_per_unit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    issued_to_employee_id VARCHAR(50) REFERENCES public.employees(id) ON DELETE SET NULL,
    used_on_machine_id VARCHAR(50) REFERENCES public.machinery(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_con_mov_id_plant UNIQUE (id, plant_id),
    CONSTRAINT fk_con_movements_con_plant FOREIGN KEY (consumable_id, plant_id)
        REFERENCES public.consumables(id, plant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_con_movements_plant_biz FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_consumable_movements_timestamps
BEFORE UPDATE ON public.consumable_movements
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

CREATE OR REPLACE FUNCTION trigger_con_mov_derive_business()
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
        RAISE EXCEPTION 'plant_id or companyId is required for consumable movements';
    END IF;

    SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id / companyId % supplied to consumable movement', v_plant_id;
    END IF;

    NEW.plant_id := v_plant_id;
    NEW."companyId" := v_plant_id;
    NEW.business_id := v_biz_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_con_mov_derive_business
BEFORE INSERT OR UPDATE ON public.consumable_movements
FOR EACH ROW EXECUTE FUNCTION trigger_con_mov_derive_business();

-- 6. MACHINE LOGS (Daily Operational Machinery Run Hours & Diesel Logs)
CREATE TABLE IF NOT EXISTS public.machine_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_code VARCHAR(50) NOT NULL, -- 'ML-1'
    log_date DATE NOT NULL,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    machine_id VARCHAR(50) NOT NULL,
    shift_name VARCHAR(50) NOT NULL DEFAULT 'Day',
    operator_name VARCHAR(150),
    opening_reading NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    closing_reading NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    hours_run NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    opening_diesel_reading NUMERIC(10, 2) DEFAULT 0.00,
    closing_diesel_reading NUMERIC(10, 2) DEFAULT 0.00,
    diesel_consumed_litres NUMERIC(10, 2) DEFAULT 0.00,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_machine_logs_id_plant UNIQUE (id, plant_id),
    CONSTRAINT fk_machine_logs_machine_plant FOREIGN KEY (machine_id, plant_id)
        REFERENCES public.machinery(id, plant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_machine_logs_plant_biz FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_machine_logs_timestamps
BEFORE UPDATE ON public.machine_logs
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

CREATE OR REPLACE FUNCTION trigger_machine_logs_derive_business()
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
        RAISE EXCEPTION 'plant_id or companyId is required for machine logs';
    END IF;

    SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id / companyId % supplied to machine log', v_plant_id;
    END IF;

    NEW.plant_id := v_plant_id;
    NEW."companyId" := v_plant_id;
    NEW.business_id := v_biz_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_machine_logs_derive_business
BEFORE INSERT OR UPDATE ON public.machine_logs
FOR EACH ROW EXECUTE FUNCTION trigger_machine_logs_derive_business();

-- 7. ATTACHMENTS (Storage Metadata Catalog for Files Uploaded to Supabase Storage)
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) REFERENCES public.plants(id) ON DELETE SET NULL,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    bucket_name VARCHAR(100) NOT NULL DEFAULT 'documents',
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size_bytes BIGINT,
    linked_module VARCHAR(100), -- 'orders', 'trips', 'gateVerification', etc.
    linked_record_id VARCHAR(100),
    uploaded_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION trigger_attachments_derive_business()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_plant_id VARCHAR(50);
    v_biz_id UUID;
BEGIN
    -- Conflict detection between companyId and plant_id
    IF NEW."companyId" IS NOT NULL AND NEW.plant_id IS NOT NULL AND NEW."companyId" <> NEW.plant_id THEN
        RAISE EXCEPTION 'Conflicting tenant identifiers: companyId (%) does not match plant_id (%)', NEW."companyId", NEW.plant_id;
    END IF;

    v_plant_id := COALESCE(NEW.plant_id, NEW."companyId");

    IF v_plant_id IS NOT NULL THEN
        SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
        IF v_biz_id IS NULL THEN
            RAISE EXCEPTION 'Invalid plant_id / companyId % supplied to attachment', v_plant_id;
        END IF;
        NEW.plant_id := v_plant_id;
        NEW."companyId" := v_plant_id;
        NEW.business_id := v_biz_id;
    ELSE
        -- Unscoped attachment: only super-admin can create attachments without plant context
        IF NOT auth_is_super_admin() THEN
            RAISE EXCEPTION 'plant_id or companyId is required for tenant attachments';
        END IF;
        NEW.plant_id := NULL;
        NEW."companyId" := NULL;
    END IF;

    -- Automatically record uploaded_by username from profiles if not supplied
    IF NEW.uploaded_by IS NULL AND auth.uid() IS NOT NULL THEN
        SELECT username INTO NEW.uploaded_by FROM public.profiles WHERE id = auth.uid();
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attachments_derive_business
BEFORE INSERT OR UPDATE ON public.attachments
FOR EACH ROW EXECUTE FUNCTION trigger_attachments_derive_business();

-- 8. AUDIT LOGS (System Mutation Trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_code VARCHAR(50) NOT NULL, -- 'AUD-01'
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_role VARCHAR(100),
    user_id UUID,
    module VARCHAR(100) NOT NULL,
    module_key VARCHAR(50) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'Create', 'Update', 'Delete'
    details TEXT,
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    plant_id VARCHAR(50) REFERENCES public.plants(id) ON DELETE SET NULL,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    raw_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION trigger_audit_logs_derive_business()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_plant_id VARCHAR(50);
    v_biz_id UUID;
BEGIN
    -- Audit logs are strictly immutable: updates are forbidden for all non-super-admins
    IF TG_OP = 'UPDATE' AND NOT auth_is_super_admin() THEN
        RAISE EXCEPTION 'Audit log records are immutable and cannot be updated.';
    END IF;

    -- Conflict detection between companyId and plant_id
    IF NEW."companyId" IS NOT NULL AND NEW.plant_id IS NOT NULL AND NEW."companyId" <> NEW.plant_id THEN
        RAISE EXCEPTION 'Conflicting tenant identifiers: companyId (%) does not match plant_id (%)', NEW."companyId", NEW.plant_id;
    END IF;

    v_plant_id := COALESCE(NEW.plant_id, NEW."companyId");

    IF v_plant_id IS NOT NULL THEN
        SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
        IF v_biz_id IS NULL THEN
            RAISE EXCEPTION 'Invalid plant_id / companyId % supplied to audit log', v_plant_id;
        END IF;
        NEW.plant_id := v_plant_id;
        NEW."companyId" := v_plant_id;
        NEW.business_id := v_biz_id;
    ELSE
        -- Unscoped audit log: only super-admin can create audit logs without plant context
        IF NOT auth_is_super_admin() THEN
            RAISE EXCEPTION 'plant_id or companyId is required for tenant audit logs';
        END IF;
        NEW.plant_id := NULL;
        NEW."companyId" := NULL;
    END IF;

    -- Bind user_id to authenticated caller to prevent impersonation
    IF auth.uid() IS NOT NULL THEN
        NEW.user_id := auth.uid();
    END IF;

    -- Ensure timestamp is set
    IF NEW.timestamp IS NULL THEN
        NEW.timestamp := NOW();
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_logs_derive_business
BEFORE INSERT OR UPDATE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION trigger_audit_logs_derive_business();

-- 9. INDEXES
CREATE INDEX IF NOT EXISTS idx_sales_inv_biz ON public.sales_invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_inv_plant ON public.sales_invoices(plant_id);
CREATE INDEX IF NOT EXISTS idx_sales_inv_party ON public.sales_invoices(party_id);
CREATE INDEX IF NOT EXISTS idx_sales_inv_order ON public.sales_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_inv_grn ON public.sales_invoices(grn_id);
CREATE INDEX IF NOT EXISTS idx_sales_inv_num ON public.sales_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_vendor_inv_biz ON public.vendor_invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_vendor_inv_plant ON public.vendor_invoices(plant_id);
CREATE INDEX IF NOT EXISTS idx_vendor_inv_order ON public.vendor_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_vendor_inv_grn ON public.vendor_invoices(grn_id);
CREATE INDEX IF NOT EXISTS idx_attendance_biz ON public.attendance(business_id);
CREATE INDEX IF NOT EXISTS idx_attendance_plant_date ON public.attendance(plant_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_payroll_biz ON public.payroll_ledger(business_id);
CREATE INDEX IF NOT EXISTS idx_payroll_plant_month ON public.payroll_ledger(plant_id, payroll_month);
CREATE INDEX IF NOT EXISTS idx_consumable_mov_biz ON public.consumable_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_consumable_mov_plant ON public.consumable_movements(plant_id);
CREATE INDEX IF NOT EXISTS idx_machine_logs_biz ON public.machine_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_machine_logs_plant ON public.machine_logs(plant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_biz ON public.audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_plant ON public.audit_logs(plant_id);

-- 10. ROW LEVEL SECURITY (RLS) POLICIES (Dual Business & Plant Enforced)
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumable_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_inv_select" ON public.sales_invoices FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "sales_inv_insert" ON public.sales_invoices FOR INSERT TO authenticated
WITH CHECK (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "sales_inv_update" ON public.sales_invoices FOR UPDATE TO authenticated
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

-- Note: Sales invoices are immutable financial records. Hard deletion is strictly forbidden
-- for all authenticated users (including administrators). Invoices must be cancelled via status update.
-- Therefore, NO DELETE policy is granted on public.sales_invoices.

CREATE POLICY "vendor_inv_select" ON public.vendor_invoices FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "vendor_inv_insert" ON public.vendor_invoices FOR INSERT TO authenticated
WITH CHECK (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "vendor_inv_update" ON public.vendor_invoices FOR UPDATE TO authenticated
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

CREATE POLICY "vendor_inv_delete" ON public.vendor_invoices FOR DELETE TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "attendance_select" ON public.attendance FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "attendance_insert" ON public.attendance FOR INSERT TO authenticated
WITH CHECK (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "attendance_update" ON public.attendance FOR UPDATE TO authenticated
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

CREATE POLICY "attendance_delete" ON public.attendance FOR DELETE TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "payroll_select" ON public.payroll_ledger FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "payroll_insert" ON public.payroll_ledger FOR INSERT TO authenticated
WITH CHECK (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "payroll_update" ON public.payroll_ledger FOR UPDATE TO authenticated
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

CREATE POLICY "payroll_delete" ON public.payroll_ledger FOR DELETE TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "consumable_mov_select" ON public.consumable_movements FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "consumable_mov_insert" ON public.consumable_movements FOR INSERT TO authenticated
WITH CHECK (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "consumable_mov_update" ON public.consumable_movements FOR UPDATE TO authenticated
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

CREATE POLICY "consumable_mov_delete" ON public.consumable_movements FOR DELETE TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "machine_logs_select" ON public.machine_logs FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "machine_logs_insert" ON public.machine_logs FOR INSERT TO authenticated
WITH CHECK (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "machine_logs_update" ON public.machine_logs FOR UPDATE TO authenticated
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

CREATE POLICY "machine_logs_delete" ON public.machine_logs FOR DELETE TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "attachments_select" ON public.attachments FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR (
        plant_id IS NOT NULL
        AND business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "attachments_insert" ON public.attachments FOR INSERT TO authenticated
WITH CHECK (
    auth_is_super_admin()
    OR (
        plant_id IS NOT NULL
        AND business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "attachments_update" ON public.attachments FOR UPDATE TO authenticated
USING (
    auth_is_super_admin()
    OR (
        plant_id IS NOT NULL
        AND business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
)
WITH CHECK (
    auth_is_super_admin()
    OR (
        plant_id IS NOT NULL
        AND business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "attachments_delete" ON public.attachments FOR DELETE TO authenticated
USING (
    auth_is_super_admin()
    OR (
        plant_id IS NOT NULL
        AND business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR (
        plant_id IS NOT NULL
        AND business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (
    auth_is_super_admin()
    OR (
        plant_id IS NOT NULL
        AND business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

