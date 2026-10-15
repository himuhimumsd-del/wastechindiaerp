-- ==============================================================================
-- Migration: 20260912000001_wave1_system_access_foundation.sql
-- Wave 1: System, Multi-Business, Tax Identity, Plant, and Access Foundation
-- Purpose: Establishes the 4-tier domain hierarchy, access tables, hardened
--          security-definer helper functions (created AFTER tables exist),
--          companyId compatibility alias, and administrative write policies.
-- Status: DRAFT ONLY — NOT EXECUTED
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. GENERIC TIMESTAMP TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION trigger_set_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 3. TIER 1: BUSINESSES (Legal Corporate Entities)
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    legal_name VARCHAR(255) NOT NULL,
    pan VARCHAR(20) NOT NULL,
    cin VARCHAR(50),
    fy_start_month VARCHAR(20) NOT NULL DEFAULT 'April',
    logo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_businesses_timestamps
BEFORE UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- 4. TIER 1B: BANK ACCOUNTS (Corporate Bank Accounts)
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    bank_name VARCHAR(100) NOT NULL,
    account_no VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    branch_name VARCHAR(100),
    account_type VARCHAR(50) NOT NULL DEFAULT 'Current',
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Enforces compound uniqueness so child tables can prove ownership
    CONSTRAINT uq_bank_accounts_business UNIQUE (id, business_id)
);

CREATE TRIGGER trg_bank_accounts_timestamps
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- 5. TIER 2: TAX IDENTITIES (State GST Registrations)
CREATE TABLE IF NOT EXISTS public.tax_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    gstin VARCHAR(20) NOT NULL UNIQUE,
    state_code VARCHAR(10) NOT NULL,
    state_name VARCHAR(100) NOT NULL,
    registered_trade_name VARCHAR(255),
    registered_office_address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Enforces compound uniqueness for multi-tenant compound foreign keys
    CONSTRAINT uq_tax_identities_business UNIQUE (id, business_id)
);

CREATE TRIGGER trg_tax_identities_timestamps
BEFORE UPDATE ON public.tax_identities
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- 6. TIER 3: PLANTS (Physical Operating Facilities / Sites)
CREATE TABLE IF NOT EXISTS public.plants (
    id VARCHAR(50) PRIMARY KEY, -- Preserves 'COMP-1', 'COMP-2' for 100% frontend compatibility
    "companyId" VARCHAR(50) GENERATED ALWAYS AS (id) STORED, -- PostgREST compatibility alias
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    tax_identity_id UUID NOT NULL,
    default_bank_account_id UUID,
    plant_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    spcb_auth VARCHAR(100),
    epr_reg_no VARCHAR(100),
    physical_address TEXT NOT NULL,
    plant_lat NUMERIC(10, 7),
    plant_lng NUMERIC(10, 7),
    geofence_radius INTEGER NOT NULL DEFAULT 500,
    geofence_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    attendance_selfie_required BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Enforces plant uniqueness within business
    CONSTRAINT uq_plants_business UNIQUE (id, business_id),
    -- COMPOUND FOREIGN KEYS: Mathematically guarantees plant cannot use a GSTIN or Bank of another business
    CONSTRAINT fk_plants_tax_identity FOREIGN KEY (tax_identity_id, business_id)
        REFERENCES public.tax_identities(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_plants_bank_account FOREIGN KEY (default_bank_account_id, business_id)
        REFERENCES public.bank_accounts(id, business_id) ON DELETE SET NULL
);

CREATE TRIGGER trg_plants_timestamps
BEFORE UPDATE ON public.plants
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- 7. ROLES & PERMISSIONS
CREATE TABLE IF NOT EXISTS public.roles (
    id VARCHAR(50) PRIMARY KEY, -- 'ROLE-ADMIN', 'ROLE-MANAGER', 'ROLE-GUARD'
    role_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id VARCHAR(50) NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    module_key VARCHAR(50) NOT NULL,
    can_view BOOLEAN NOT NULL DEFAULT FALSE,
    can_add BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_role_permissions UNIQUE (role_id, module_key)
);

-- 8. PROFILES (Supabase Auth User Extends)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    legacy_user_id VARCHAR(50) UNIQUE, -- 'USER-001', 'USER-002'
    username VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150),
    emp_id VARCHAR(50), -- Linked employee badge/id (deferred FK attached in Wave 5)
    role_id VARCHAR(50) NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    default_plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_timestamps
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- Privilege escalation protection trigger on profiles
CREATE OR REPLACE FUNCTION trigger_profiles_protect_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT (SELECT EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.id = auth.uid() AND p.role_id = 'ROLE-ADMIN' AND p.status = 'Active'
    )) THEN
        IF NEW.role_id IS DISTINCT FROM OLD.role_id 
           OR NEW.status IS DISTINCT FROM OLD.status 
           OR NEW.default_plant_id IS DISTINCT FROM OLD.default_plant_id THEN
            RAISE EXCEPTION 'Access Denied: Only Super Administrators can modify user roles, account status, or plant bindings.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_protect_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION trigger_profiles_protect_role();

-- 9. USER ACCESS MAPPING (Multi-Business & Multi-Plant Scopes)
CREATE TABLE IF NOT EXISTS public.user_business_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_business UNIQUE (user_id, business_id)
);

CREATE TABLE IF NOT EXISTS public.user_plant_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_plant UNIQUE (user_id, plant_id)
);

-- 10. SECURITY-DEFINER HELPER FUNCTIONS (Created strictly AFTER referenced tables exist)
-- These execute with definer rights to inspect roles/memberships safely without recursive RLS checks.

CREATE OR REPLACE FUNCTION auth_is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role_id = 'ROLE-ADMIN'
          AND p.status = 'Active'
    );
$$;

CREATE OR REPLACE FUNCTION auth_can_manage_masters()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role_id IN ('ROLE-ADMIN', 'ROLE-MANAGER')
          AND p.status = 'Active'
    );
$$;

CREATE OR REPLACE FUNCTION auth_user_business_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        array_agg(uba.business_id),
        ARRAY[]::UUID[]
    )
    FROM public.user_business_access uba
    WHERE uba.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION auth_user_plant_ids()
RETURNS VARCHAR(50)[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        array_agg(upa.plant_id),
        ARRAY[]::VARCHAR(50)[]
    )
    FROM public.user_plant_access upa
    WHERE upa.user_id = auth.uid();
$$;

-- Secure function privileges: revoke excessive rights from PUBLIC
REVOKE EXECUTE ON FUNCTION auth_is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_is_super_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION auth_can_manage_masters() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_can_manage_masters() TO authenticated;

REVOKE EXECUTE ON FUNCTION auth_user_business_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_user_business_ids() TO authenticated;

REVOKE EXECUTE ON FUNCTION auth_user_plant_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_user_plant_ids() TO authenticated;

-- 11. INDEXES FOR PERFORMANCE & RLS
CREATE INDEX IF NOT EXISTS idx_plants_business ON public.plants(business_id);
CREATE INDEX IF NOT EXISTS idx_plants_tax ON public.plants(tax_identity_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_business ON public.bank_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_tax_identities_business ON public.tax_identities(business_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_profiles_plant ON public.profiles(default_plant_id);
CREATE INDEX IF NOT EXISTS idx_user_biz_access_user ON public.user_business_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plant_access_user ON public.user_plant_access(user_id);

-- 12. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_business_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plant_access ENABLE ROW LEVEL SECURITY;

-- Policies for businesses
CREATE POLICY "businesses_select_policy" ON public.businesses
FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR id = ANY(auth_user_business_ids())
);

CREATE POLICY "businesses_admin_write" ON public.businesses
FOR ALL TO authenticated
USING (auth_is_super_admin())
WITH CHECK (auth_is_super_admin());

-- Policies for bank_accounts
CREATE POLICY "bank_accounts_select_policy" ON public.bank_accounts
FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR business_id = ANY(auth_user_business_ids())
);

CREATE POLICY "bank_accounts_admin_write" ON public.bank_accounts
FOR ALL TO authenticated
USING (auth_is_super_admin())
WITH CHECK (auth_is_super_admin());

-- Policies for tax_identities
CREATE POLICY "tax_identities_select_policy" ON public.tax_identities
FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR business_id = ANY(auth_user_business_ids())
);

CREATE POLICY "tax_identities_admin_write" ON public.tax_identities
FOR ALL TO authenticated
USING (auth_is_super_admin())
WITH CHECK (auth_is_super_admin());

-- Policies for plants
CREATE POLICY "plants_select_policy" ON public.plants
FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR id = ANY(auth_user_plant_ids())
);

CREATE POLICY "plants_admin_write" ON public.plants
FOR ALL TO authenticated
USING (auth_is_super_admin())
WITH CHECK (auth_is_super_admin());

-- Policies for roles and permissions (Readable by all authenticated; writeable by super-admin)
CREATE POLICY "roles_select_policy" ON public.roles
FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "roles_admin_write" ON public.roles
FOR ALL TO authenticated 
USING (auth_is_super_admin()) 
WITH CHECK (auth_is_super_admin());

CREATE POLICY "role_perms_select_policy" ON public.role_permissions
FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "role_perms_admin_write" ON public.role_permissions
FOR ALL TO authenticated 
USING (auth_is_super_admin()) 
WITH CHECK (auth_is_super_admin());

-- Policies for profiles
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR id = auth.uid()
    OR default_plant_id = ANY(auth_user_plant_ids())
);

CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE TO authenticated
USING (auth_is_super_admin() OR id = auth.uid())
WITH CHECK (auth_is_super_admin() OR id = auth.uid());

CREATE POLICY "profiles_admin_insert_delete" ON public.profiles
FOR ALL TO authenticated 
USING (auth_is_super_admin()) 
WITH CHECK (auth_is_super_admin());

-- Policies for user access mappings (Admin-only modification)
CREATE POLICY "user_biz_access_select" ON public.user_business_access
FOR SELECT TO authenticated
USING (auth_is_super_admin() OR user_id = auth.uid());

CREATE POLICY "user_biz_access_admin_write" ON public.user_business_access
FOR ALL TO authenticated
USING (auth_is_super_admin())
WITH CHECK (auth_is_super_admin());

CREATE POLICY "user_plant_access_select" ON public.user_plant_access
FOR SELECT TO authenticated
USING (auth_is_super_admin() OR user_id = auth.uid());

CREATE POLICY "user_plant_access_admin_write" ON public.user_plant_access
FOR ALL TO authenticated
USING (auth_is_super_admin())
WITH CHECK (auth_is_super_admin());
