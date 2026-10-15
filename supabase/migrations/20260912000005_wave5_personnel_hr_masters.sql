-- ==============================================================================
-- Migration: 20260912000005_wave5_personnel_hr_masters.sql
-- Wave 5: Personnel (Employees) & Payroll Settings Masters
-- Purpose: Establishes personnel directory with statutory compensation parameters.
--          Enforces compound business/plant integrity, conflict detection, and dual-tenant RLS.
-- Status: DRAFT ONLY — NOT EXECUTED
-- ==============================================================================

-- 1. EMPLOYEES (Personnel Master)
CREATE TABLE IF NOT EXISTS public.employees (
    id VARCHAR(50) PRIMARY KEY, -- 'EMP-1', 'EMP-2'
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    name VARCHAR(150) NOT NULL,
    department VARCHAR(100),
    shift_name VARCHAR(100), -- Preserves existing text reference 'General Day Shift'
    shift_id VARCHAR(50) REFERENCES public.shifts(id) ON DELETE SET NULL, -- Relational link
    doj DATE,
    basic_pay NUMERIC(12, 2) DEFAULT 0.00,
    hra NUMERIC(12, 2) DEFAULT 0.00,
    allowances NUMERIC(12, 2) DEFAULT 0.00,
    pf_applicable VARCHAR(10) DEFAULT 'Yes' CHECK (pf_applicable IN ('Yes', 'No')),
    esi_applicable VARCHAR(10) DEFAULT 'No' CHECK (esi_applicable IN ('Yes', 'No')),
    advance_balance NUMERIC(12, 2) DEFAULT 0.00,
    ot_rate_per_hr NUMERIC(10, 2) DEFAULT 0.00,
    allocated_paid_leaves INTEGER DEFAULT 12,
    bank_name VARCHAR(100),
    account_no VARCHAR(50),
    ifsc_code VARCHAR(20),
    pan_no VARCHAR(20),
    aadhar_no VARCHAR(20),
    uan_no VARCHAR(30),
    esic_no VARCHAR(30),
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Terminated', 'On Leave')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- COMPOUND CONSTRAINTS: Prevent cross-plant/business reference pollution
    CONSTRAINT uq_employees_id_plant UNIQUE (id, plant_id),
    CONSTRAINT uq_employees_id_biz UNIQUE (id, business_id),
    CONSTRAINT fk_employees_plant_biz FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_employees_timestamps
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- Authoritative derivation trigger for employees (conflict detection & synchronization)
CREATE OR REPLACE FUNCTION trigger_employees_derive_business()
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
        RAISE EXCEPTION 'plant_id or companyId is required for employees';
    END IF;

    SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id / companyId % supplied to employees', v_plant_id;
    END IF;

    NEW.plant_id := v_plant_id;
    NEW."companyId" := v_plant_id;
    NEW.business_id := v_biz_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_employees_derive_business
BEFORE INSERT OR UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION trigger_employees_derive_business();

-- Add deferred foreign key from profiles to employees now that employees table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_profiles_employee'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT fk_profiles_employee FOREIGN KEY (emp_id)
        REFERENCES public.employees(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. PAYROLL SETTINGS (Statutory Compensation & Tax Configuration)
CREATE TABLE IF NOT EXISTS public.payroll_settings (
    id VARCHAR(50) PRIMARY KEY, -- 'PAYSET-1'
    business_id UUID REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) REFERENCES public.plants(id) ON DELETE CASCADE, -- NULL = global default
    working_days_basis VARCHAR(50) NOT NULL DEFAULT 'Actual Days in Month', -- 'Actual Days in Month', 'Fixed 30 Days', 'Fixed 26 Days'
    pf_employee_pct NUMERIC(5, 2) NOT NULL DEFAULT 12.00,
    pf_employer_pct NUMERIC(5, 2) NOT NULL DEFAULT 12.00,
    pf_eps_pct NUMERIC(5, 2) NOT NULL DEFAULT 8.33,
    pf_epf_pct NUMERIC(5, 2) NOT NULL DEFAULT 3.67,
    pf_wage_ceiling NUMERIC(12, 2) NOT NULL DEFAULT 15000.00,
    pf_admin_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.50,
    edli_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.50,
    esi_employee_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.75,
    esi_employer_pct NUMERIC(5, 2) NOT NULL DEFAULT 3.25,
    esi_wage_ceiling NUMERIC(12, 2) NOT NULL DEFAULT 21000.00,
    ot_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
    pt_slabs JSONB DEFAULT '[]'::jsonb, -- Professional Tax state slabs
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_payroll_settings_plant_biz FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE CASCADE
);

CREATE TRIGGER trg_payroll_settings_timestamps
BEFORE UPDATE ON public.payroll_settings
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_employees_biz ON public.employees(business_id);
CREATE INDEX IF NOT EXISTS idx_employees_plant ON public.employees(plant_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_payroll_settings_biz ON public.payroll_settings(business_id);
CREATE INDEX IF NOT EXISTS idx_payroll_settings_plant ON public.payroll_settings(plant_id);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employees_select" ON public.employees FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "employees_write" ON public.employees FOR ALL TO authenticated
USING (
    auth_is_super_admin()
    OR (
        auth_can_manage_masters()
        AND business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
)
WITH CHECK (
    auth_is_super_admin()
    OR (
        auth_can_manage_masters()
        AND business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "payroll_settings_select" ON public.payroll_settings FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR plant_id IS NULL
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "payroll_settings_admin_write" ON public.payroll_settings FOR ALL TO authenticated
USING (auth_is_super_admin()) WITH CHECK (auth_is_super_admin());
