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
    grn_id UUID REFERENCES public.grn(id) ON DELETE SET NULL, -- Relational GRN linkage (Blocker 1)
    grn_ref VARCHAR(100), -- Preserves business-visible GRN reference
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    payment_terms_days INTEGER DEFAULT 30,
    -- Immutable seller snapshot at time of invoice creation
    seller_legal_name VARCHAR(255) NOT NULL,
    seller_trade_name VARCHAR(255),
    seller_gstin VARCHAR(20) NOT NULL,
    seller_address_text TEXT NOT NULL,
    seller_state VARCHAR(100) NOT NULL,
    seller_state_code VARCHAR(10) NOT NULL,
    -- Immutable buyer snapshot
    buyer_name VARCHAR(255) NOT NULL,
    buyer_gstin VARCHAR(20),
    buyer_address_text TEXT NOT NULL,
    buyer_state VARCHAR(100) NOT NULL,
    buyer_state_code VARCHAR(10),
    buyer_pan VARCHAR(20),
    -- Immutable consignee snapshot
    consignee_name VARCHAR(255),
    consignee_gstin VARCHAR(20),
    consignee_address_text TEXT,
    consignee_state VARCHAR(100),
    -- Line items & financial totals
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Preserves full itemized array schema
    taxable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    ugst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    round_off NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    balance_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    reverse_charge BOOLEAN NOT NULL DEFAULT FALSE,
    vehicle_no VARCHAR(50),
    place_of_supply VARCHAR(100),
    eway_bill_no VARCHAR(100),
    eway_bill_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Issued', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled')),
    terms_conditions TEXT,
    notes TEXT,
    financial_year VARCHAR(20) NOT NULL,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- COMPOUND CONSTRAINTS: Ensures invoice integrity within business & plant
    CONSTRAINT uq_sales_inv_id_plant UNIQUE (id, plant_id),
    CONSTRAINT uq_sales_inv_id_biz UNIQUE (id, business_id),
    CONSTRAINT uq_sales_inv_number UNIQUE (business_id, financial_year, invoice_number),
    CONSTRAINT fk_sales_inv_plant_biz FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_inv_tax_biz FOREIGN KEY (tax_identity_id, business_id)
        REFERENCES public.tax_identities(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_sales_inv_bank_biz FOREIGN KEY (bank_account_id, business_id)
        REFERENCES public.bank_accounts(id, business_id) ON DELETE SET NULL,
    CONSTRAINT fk_sales_inv_order_plant FOREIGN KEY (order_id, plant_id)
        REFERENCES public.orders(id, plant_id) ON DELETE RESTRICT,
    -- Blocker 1: Enforces GRN must belong to the exact same plant
    CONSTRAINT fk_sales_inv_grn_plant FOREIGN KEY (grn_id, plant_id)
        REFERENCES public.grn(id, plant_id) ON DELETE SET NULL
);

CREATE TRIGGER trg_sales_invoices_timestamps
BEFORE UPDATE ON public.sales_invoices
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- Auto-derivation, conflict detection & financial snapshots
CREATE OR REPLACE FUNCTION trigger_sales_invoices_derive()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_plant_id VARCHAR(50);
    v_biz_id UUID;
    v_tax_rec RECORD;
    v_order_id UUID;
    v_grn_id UUID;
BEGIN
    IF NEW."companyId" IS NOT NULL AND NEW.plant_id IS NOT NULL AND NEW."companyId" <> NEW.plant_id THEN
        RAISE EXCEPTION 'Conflicting tenant identifiers: companyId (%) does not match plant_id (%)', NEW."companyId", NEW.plant_id;
    END IF;

    v_plant_id := COALESCE(NEW.plant_id, NEW."companyId");
    IF v_plant_id IS NULL THEN
        RAISE EXCEPTION 'plant_id or companyId is required for sales invoices';
    END IF;

    SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id / companyId % supplied to sales invoice', v_plant_id;
    END IF;

    NEW.plant_id := v_plant_id;
    NEW."companyId" := v_plant_id;
    NEW.business_id := v_biz_id;

    -- Snapshot seller tax identity if not explicitly populated
    IF NEW.seller_gstin IS NULL OR NEW.seller_legal_name IS NULL THEN
        SELECT legal_name, trade_name, gstin, registered_address, state_name, state_code
        INTO v_tax_rec
        FROM public.tax_identities
        WHERE id = NEW.tax_identity_id AND business_id = v_biz_id;

        IF v_tax_rec IS NOT NULL THEN
            NEW.seller_legal_name := COALESCE(NEW.seller_legal_name, v_tax_rec.legal_name);
            NEW.seller_trade_name := COALESCE(NEW.seller_trade_name, v_tax_rec.trade_name);
            NEW.seller_gstin := COALESCE(NEW.seller_gstin, v_tax_rec.gstin);
            NEW.seller_address_text := COALESCE(NEW.seller_address_text, v_tax_rec.registered_address);
            NEW.seller_state := COALESCE(NEW.seller_state, v_tax_rec.state_name);
            NEW.seller_state_code := COALESCE(NEW.seller_state_code, v_tax_rec.state_code);
        END IF;
    END IF;

    -- Auto-resolve order_id from po_ref if omitted
    IF NEW.order_id IS NULL AND NEW.po_ref IS NOT NULL THEN
        SELECT id INTO v_order_id FROM public.orders 
        WHERE po_number = NEW.po_ref AND plant_id = v_plant_id LIMIT 1;
        NEW.order_id := v_order_id;
    END IF;

    -- Auto-resolve grn_id from grn_ref if omitted
    IF NEW.grn_id IS NULL AND NEW.grn_ref IS NOT NULL THEN
        SELECT id INTO v_grn_id FROM public.grn 
        WHERE grn_number = NEW.grn_ref AND plant_id = v_plant_id LIMIT 1;
        NEW.grn_id := v_grn_id;
    END IF;

    -- Legal invoice protection: Once issued, statutory details cannot be modified
    IF TG_OP = 'UPDATE' AND OLD.status IN ('Issued', 'Paid') AND NEW.status <> 'Cancelled' THEN
        IF NEW.invoice_number <> OLD.invoice_number OR NEW.invoice_date <> OLD.invoice_date OR NEW.financial_year <> OLD.financial_year
           OR NEW.buyer_gstin <> OLD.buyer_gstin OR NEW.seller_gstin <> OLD.seller_gstin
           OR NEW.taxable_amount <> OLD.taxable_amount OR NEW.cgst_amount <> OLD.cgst_amount
           OR NEW.sgst_amount <> OLD.sgst_amount OR NEW.igst_amount <> OLD.igst_amount
           OR NEW.total_amount <> OLD.total_amount THEN
            RAISE EXCEPTION 'Cannot modify financial or statutory details of an Issued or Paid invoice (%)', OLD.invoice_number;
        END IF;
    END IF;

    -- Compute balance amount
    NEW.balance_amount := NEW.total_amount - NEW.paid_amount;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sales_invoices_derive
BEFORE INSERT OR UPDATE ON public.sales_invoices
FOR EACH ROW EXECUTE FUNCTION trigger_sales_invoices_derive();

-- 2. VENDOR INVOICES (Inward Supplier Bills & Expense Tracking)
CREATE TABLE IF NOT EXISTS public.vendor_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_invoice_no VARCHAR(100) NOT NULL,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    party_id VARCHAR(50) NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES public.orders(id) ON DELETE RESTRICT, -- Inward Purchase PO linkage
    po_issued_ref VARCHAR(100),
    grn_id UUID REFERENCES public.grn(id) ON DELETE SET NULL, -- Relational GRN linkage (Blocker 1)
    grn_ref VARCHAR(100),
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    taxable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    balance_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending Approval' CHECK (status IN ('Pending Approval', 'Approved', 'Paid', 'Partially Paid', 'Disputed', 'Rejected')),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    attachment_url TEXT,
    financial_year VARCHAR(20),
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- COMPOUND CONSTRAINTS: Ensures vendor invoice integrity within business & plant
    CONSTRAINT uq_vendor_inv_id_plant UNIQUE (id, plant_id),
    CONSTRAINT uq_vendor_inv_id_biz UNIQUE (id, business_id),
    CONSTRAINT uq_vendor_inv_number UNIQUE (business_id, party_id, vendor_invoice_no),
    CONSTRAINT fk_vendor_inv_plant_biz FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_vendor_inv_order_plant FOREIGN KEY (order_id, plant_id)
        REFERENCES public.orders(id, plant_id) ON DELETE RESTRICT,
    -- Blocker 1: Enforces GRN must belong to the exact same plant
    CONSTRAINT fk_vendor_inv_grn_plant FOREIGN KEY (grn_id, plant_id)
        REFERENCES public.grn(id, plant_id) ON DELETE SET NULL
);

CREATE TRIGGER trg_vendor_invoices_timestamps
BEFORE UPDATE ON public.vendor_invoices
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

CREATE OR REPLACE FUNCTION trigger_vendor_invoices_derive()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_plant_id VARCHAR(50);
    v_biz_id UUID;
    v_order_id UUID;
    v_grn_id UUID;
BEGIN
    IF NEW."companyId" IS NOT NULL AND NEW.plant_id IS NOT NULL AND NEW."companyId" <> NEW.plant_id THEN
        RAISE EXCEPTION 'Conflicting tenant identifiers: companyId (%) does not match plant_id (%)', NEW."companyId", NEW.plant_id;
    END IF;

    v_plant_id := COALESCE(NEW.plant_id, NEW."companyId");
    IF v_plant_id IS NULL THEN
        RAISE EXCEPTION 'plant_id or companyId is required for vendor invoices';
    END IF;

    SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id / companyId % supplied to vendor invoice', v_plant_id;
    END IF;

    NEW.plant_id := v_plant_id;
    NEW."companyId" := v_plant_id;
    NEW.business_id := v_biz_id;

    -- Auto-resolve order_id from po_issued_ref if omitted
    IF NEW.order_id IS NULL AND NEW.po_issued_ref IS NOT NULL THEN
        SELECT id INTO v_order_id FROM public.orders 
        WHERE po_number = NEW.po_issued_ref AND plant_id = v_plant_id LIMIT 1;
        NEW.order_id := v_order_id;
    END IF;

    -- Auto-resolve grn_id from grn_ref if omitted
    IF NEW.grn_id IS NULL AND NEW.grn_ref IS NOT NULL THEN
        SELECT id INTO v_grn_id FROM public.grn 
        WHERE grn_number = NEW.grn_ref AND plant_id = v_plant_id LIMIT 1;
        NEW.grn_id := v_grn_id;
    END IF;

    NEW.balance_amount := NEW.total_amount - NEW.paid_amount;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vendor_invoices_derive
BEFORE INSERT OR UPDATE ON public.vendor_invoices
FOR EACH ROW EXECUTE FUNCTION trigger_vendor_invoices_derive();

-- 3. ATTENDANCE (Daily Personnel Attendance & Shift Operations)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emp_id VARCHAR(50) NOT NULL,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Present', 'Absent', 'Half Day', 'Leave', 'Holiday', 'Weekly Off')),
    shift_id VARCHAR(50) REFERENCES public.shifts(id) ON DELETE SET NULL,
    shift_name VARCHAR(100),
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    work_hours NUMERIC(4, 2) DEFAULT 0.00,
    ot_hours NUMERIC(4, 2) DEFAULT 0.00,
    remarks TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- COMPOUND CONSTRAINTS: Ensures employee and attendance record belong to the same plant
    CONSTRAINT uq_attendance_emp_date UNIQUE (emp_id, attendance_date),
    CONSTRAINT fk_attendance_plant_biz FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_attendance_emp_plant FOREIGN KEY (emp_id, plant_id)
        REFERENCES public.employees(id, plant_id) ON DELETE RESTRICT
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
        -- Auto-lookup plant from employee master
        SELECT plant_id INTO v_plant_id FROM public.employees WHERE id = NEW.emp_id;
    END IF;

    IF v_plant_id IS NULL THEN
        RAISE EXCEPTION 'Could not resolve plant_id for employee % in attendance', NEW.emp_id;
    END IF;

    SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id % resolved for attendance', v_plant_id;
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

-- 4. PAYROLL LEDGER (Monthly Salary Calculation & Statutory Ledger)
CREATE TABLE IF NOT EXISTS public.payroll_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emp_id VARCHAR(50) NOT NULL,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2000),
    payable_days NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    present_days NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    paid_leaves NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    unpaid_leaves NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    weekly_offs NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    holidays NUMERIC(4, 1) NOT NULL DEFAULT 0.0,
    ot_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    -- Earnings
    basic_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    hra_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    allowances_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    ot_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    gross_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    -- Deductions
    pf_employee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    pf_employer_epf NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    pf_employer_eps NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    pf_admin_charges NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    esi_employee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    esi_employer NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    pt_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    advance_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    other_deductions NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Processed', 'Approved', 'Paid')),
    payment_mode VARCHAR(50), -- 'Bank Transfer', 'Cheque', 'Cash'
    payment_date DATE,
    transaction_ref VARCHAR(100),
    remarks TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- COMPOUND CONSTRAINTS: Ensures payroll record matches employee plant and avoids duplicates
    CONSTRAINT uq_payroll_emp_month UNIQUE (emp_id, month, year),
    CONSTRAINT fk_payroll_plant_biz FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_payroll_emp_plant FOREIGN KEY (emp_id, plant_id)
        REFERENCES public.employees(id, plant_id) ON DELETE RESTRICT
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
        SELECT plant_id INTO v_plant_id FROM public.employees WHERE id = NEW.emp_id;
    END IF;

    IF v_plant_id IS NULL THEN
        RAISE EXCEPTION 'Could not resolve plant_id for employee % in payroll ledger', NEW.emp_id;
    END IF;

    SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id % resolved for payroll ledger', v_plant_id;
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

-- 5. CONSUMABLE MOVEMENTS (Plant Storeroom Stock Transactions)
CREATE TABLE IF NOT EXISTS public.consumable_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_number VARCHAR(100) NOT NULL,
    consumable_id VARCHAR(50) NOT NULL,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN ('Stock In (Purchase)', 'Issue to Machine', 'Issue to Plant', 'Adjustment', 'Return')),
    movement_date DATE NOT NULL,
    qty NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(12, 2) DEFAULT 0.00,
    total_cost NUMERIC(12, 2) DEFAULT 0.00,
    machine_id VARCHAR(50), -- Nullable if not machine-specific
    issued_to VARCHAR(150),
    remarks TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- COMPOUND CONSTRAINTS: Ensures consumable and machine belong to the exact same plant
    CONSTRAINT fk_con_mov_plant_biz FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_con_mov_item_plant FOREIGN KEY (consumable_id, plant_id)
        REFERENCES public.consumables(id, plant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_con_mov_mach_plant FOREIGN KEY (machine_id, plant_id)
        REFERENCES public.machinery(id, plant_id) ON DELETE SET NULL
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
        SELECT plant_id INTO v_plant_id FROM public.consumables WHERE id = NEW.consumable_id;
    END IF;

    IF v_plant_id IS NULL THEN
        RAISE EXCEPTION 'Could not resolve plant_id for consumable %', NEW.consumable_id;
    END IF;

    SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id % resolved for consumable movement', v_plant_id;
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

-- 6. MACHINE LOGS (Operational Runtime & Maintenance Logs)
CREATE TABLE IF NOT EXISTS public.machine_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id VARCHAR(50) NOT NULL,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    log_date DATE NOT NULL,
    hours_run NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    fuel_consumed_litres NUMERIC(8, 2) DEFAULT 0.00,
    units_consumed_kwh NUMERIC(8, 2) DEFAULT 0.00,
    maintenance_performed TEXT,
    breakdown_hours NUMERIC(5, 2) DEFAULT 0.00,
    operator_emp_id VARCHAR(50),
    remarks TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- COMPOUND CONSTRAINTS: Ensures machine and operator belong to the exact same plant
    CONSTRAINT fk_mach_logs_plant_biz FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_mach_logs_mach_plant FOREIGN KEY (machine_id, plant_id)
        REFERENCES public.machinery(id, plant_id) ON DELETE RESTRICT,
    CONSTRAINT fk_mach_logs_emp_plant FOREIGN KEY (operator_emp_id, plant_id)
        REFERENCES public.employees(id, plant_id) ON DELETE SET NULL
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
        SELECT plant_id INTO v_plant_id FROM public.machinery WHERE id = NEW.machine_id;
    END IF;

    IF v_plant_id IS NULL THEN
        RAISE EXCEPTION 'Could not resolve plant_id for machine %', NEW.machine_id;
    END IF;

    SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id % resolved for machine log', v_plant_id;
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

-- 7. ATTACHMENTS (File Storage Metadata & Record Attachments)
CREATE TABLE IF NOT EXISTS public.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) REFERENCES public.plants(id) ON DELETE CASCADE,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    entity_type VARCHAR(50) NOT NULL, -- 'orders', 'sales_invoices', 'trips', 'gate_entries', 'employees', etc.
    entity_id VARCHAR(100) NOT NULL, -- Relational key to the parent entity
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    uploaded_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_attachments_plant_biz FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION trigger_attachments_derive_business()
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
    IF v_plant_id IS NOT NULL THEN
        SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
        IF v_biz_id IS NULL THEN
            RAISE EXCEPTION 'Invalid plant_id % resolved for attachment', v_plant_id;
        END IF;
        NEW.plant_id := v_plant_id;
        NEW."companyId" := v_plant_id;
        NEW.business_id := v_biz_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attachments_derive_business
BEFORE INSERT OR UPDATE ON public.attachments
FOR EACH ROW EXECUTE FUNCTION trigger_attachments_derive_business();

-- 8. AUDIT LOGS (Application Activity & Security Audit Trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    plant_id VARCHAR(50) REFERENCES public.plants(id) ON DELETE SET NULL,
    "companyId" VARCHAR(50),
    user_id UUID,
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL, -- 'LOGIN', 'CREATE_ORDER', 'ISSUE_INVOICE', 'VOID_INVOICE', etc.
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    details JSONB,
    before_state JSONB,
    after_state JSONB,
    ip_address VARCHAR(50),
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
    v_plant_id := COALESCE(NEW.plant_id, NEW."companyId");
    IF v_plant_id IS NOT NULL THEN
        SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
        IF v_biz_id IS NOT NULL THEN
            NEW.plant_id := v_plant_id;
            NEW."companyId" := v_plant_id;
            NEW.business_id := v_biz_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_logs_derive_business
BEFORE INSERT ON public.audit_logs
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
CREATE INDEX IF NOT EXISTS idx_payroll_plant_month ON public.payroll_ledger(plant_id, year, month);

CREATE INDEX IF NOT EXISTS idx_consumable_mov_biz ON public.consumable_movements(business_id);
CREATE INDEX IF NOT EXISTS idx_consumable_mov_plant ON public.consumable_movements(plant_id);

CREATE INDEX IF NOT EXISTS idx_machine_logs_biz ON public.machine_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_machine_logs_plant ON public.machine_logs(plant_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_biz ON public.audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_plant ON public.audit_logs(plant_id);

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumable_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- SALES INVOICES: Strict dual-tenant read/write. No hard DELETE permitted.
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

-- VENDOR INVOICES
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

-- ATTENDANCE
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

-- PAYROLL LEDGER
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

-- CONSUMABLE MOVEMENTS
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

-- MACHINE LOGS
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

-- ATTACHMENTS
CREATE POLICY "attachments_select" ON public.attachments FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR (
        plant_id IS NULL AND business_id = ANY(auth_user_business_ids())
    )
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "attachments_insert" ON public.attachments FOR INSERT TO authenticated
WITH CHECK (
    auth_is_super_admin()
    OR (
        plant_id IS NULL AND business_id = ANY(auth_user_business_ids())
    )
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "attachments_update" ON public.attachments FOR UPDATE TO authenticated
USING (
    auth_is_super_admin()
    OR (
        plant_id IS NULL AND business_id = ANY(auth_user_business_ids())
    )
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
)
WITH CHECK (
    auth_is_super_admin()
    OR (
        plant_id IS NULL AND business_id = ANY(auth_user_business_ids())
    )
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "attachments_delete" ON public.attachments FOR DELETE TO authenticated
USING (
    auth_is_super_admin()
    OR (
        plant_id IS NULL AND business_id = ANY(auth_user_business_ids())
    )
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

-- AUDIT LOGS: Append-only ledger. No DELETE or UPDATE policy exists.
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
