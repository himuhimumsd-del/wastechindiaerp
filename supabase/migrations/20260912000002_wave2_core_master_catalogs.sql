-- ==============================================================================
-- Migration: 20260912000002_wave2_core_master_catalogs.sql
-- Wave 2: Core Master Catalogs (Global Masters, Shifts, Templates, Signatures)
-- Purpose: Establishes shared units, order types, items, shifts, print templates, and settings.
--          Protects global master write permissions using auth_can_manage_masters().
-- Status: DRAFT ONLY — NOT EXECUTED
-- ==============================================================================

-- 1. UNITS (Global Master Catalog)
CREATE TABLE IF NOT EXISTS public.units (
    id VARCHAR(50) PRIMARY KEY, -- 'UNT-1', 'UNT-2'
    name VARCHAR(50) NOT NULL UNIQUE, -- 'MT', 'litre', 'Trip', 'Nos.', 'Kg'
    description VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_units_timestamps
BEFORE UPDATE ON public.units
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- 2. PO TYPES (Global Master Catalog)
CREATE TABLE IF NOT EXISTS public.po_types (
    id VARCHAR(50) PRIMARY KEY, -- 'POT-1', 'POT-2'
    name VARCHAR(100) NOT NULL UNIQUE, -- 'Material', 'Transport', 'Service', 'Fixed Asset'
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_po_types_timestamps
BEFORE UPDATE ON public.po_types
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- 3. ITEMS (Global Master Catalog)
CREATE TABLE IF NOT EXISTS public.items (
    id VARCHAR(50) PRIMARY KEY, -- 'ITM-1', 'ITM-2'
    name VARCHAR(255) NOT NULL UNIQUE, -- 'Transport', 'RDF', 'PLASTIC WASTE', etc.
    hsn_code VARCHAR(50) NOT NULL, -- '996511', '3825'
    description TEXT,
    default_unit_id VARCHAR(50) REFERENCES public.units(id) ON DELETE RESTRICT,
    cgst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    sgst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    igst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    ugst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_items_timestamps
BEFORE UPDATE ON public.items
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- 4. SHIFTS (Work Shifts Master)
CREATE TABLE IF NOT EXISTS public.shifts (
    id VARCHAR(50) PRIMARY KEY, -- 'SH-1'
    plant_id VARCHAR(50) REFERENCES public.plants(id) ON DELETE CASCADE, -- NULL = all plants
    name VARCHAR(100) NOT NULL, -- 'General Day Shift'
    start_time TIME NOT NULL, -- '09:00'
    end_time TIME NOT NULL, -- '18:00'
    grace_period_mins INTEGER NOT NULL DEFAULT 15,
    min_hours_full_day NUMERIC(4, 2) NOT NULL DEFAULT 8.00,
    min_hours_half_day NUMERIC(4, 2) NOT NULL DEFAULT 4.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_shifts_timestamps
BEFORE UPDATE ON public.shifts
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- 5. DOCUMENT TEMPLATES (Terms & Conditions, Print Headers)
CREATE TABLE IF NOT EXISTS public.document_templates (
    id VARCHAR(50) PRIMARY KEY, -- 'TMP-1'
    plant_id VARCHAR(50) REFERENCES public.plants(id) ON DELETE CASCADE, -- Optional plant override
    name VARCHAR(150) NOT NULL, -- 'Standard LR Terms'
    applicable_type VARCHAR(100) NOT NULL, -- 'Lorry Receipt (LR)', 'Delivery Challan (DC)'
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_templates_timestamps
BEFORE UPDATE ON public.document_templates
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- 6. SIGNATURES (Authorized Digital Signatories)
CREATE TABLE IF NOT EXISTS public.signatures (
    id VARCHAR(50) PRIMARY KEY, -- 'SIGN-1'
    plant_id VARCHAR(50) REFERENCES public.plants(id) ON DELETE CASCADE, -- Optional plant linkage
    auth_name VARCHAR(150) NOT NULL, -- 'Director A'
    sign_image_url TEXT, -- URL in Supabase Storage
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_signatures_timestamps
BEFORE UPDATE ON public.signatures
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- 7. SYSTEM SETTINGS (Global Application Parameters)
CREATE TABLE IF NOT EXISTS public.system_settings (
    id VARCHAR(50) PRIMARY KEY, -- 'SET-1'
    default_plant_lat NUMERIC(10, 7) DEFAULT 21.2514,
    default_plant_lng NUMERIC(10, 7) DEFAULT 81.6296,
    default_geofence_radius INTEGER DEFAULT 500,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. INDEXES
CREATE INDEX IF NOT EXISTS idx_items_hsn ON public.items(hsn_code);
CREATE INDEX IF NOT EXISTS idx_shifts_plant ON public.shifts(plant_id);
CREATE INDEX IF NOT EXISTS idx_templates_plant ON public.document_templates(plant_id);
CREATE INDEX IF NOT EXISTS idx_signatures_plant ON public.signatures(plant_id);

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Shared Global Masters: All authenticated users can SELECT
CREATE POLICY "units_global_select" ON public.units FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "units_admin_write" ON public.units FOR ALL TO authenticated 
USING (auth_can_manage_masters()) WITH CHECK (auth_can_manage_masters());

CREATE POLICY "po_types_global_select" ON public.po_types FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "po_types_admin_write" ON public.po_types FOR ALL TO authenticated 
USING (auth_can_manage_masters()) WITH CHECK (auth_can_manage_masters());

CREATE POLICY "items_global_select" ON public.items FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "items_admin_write" ON public.items FOR ALL TO authenticated 
USING (auth_can_manage_masters()) WITH CHECK (auth_can_manage_masters());

-- Shifts: Accessible if global (plant_id IS NULL) or matching user's authorized plants
CREATE POLICY "shifts_select" ON public.shifts FOR SELECT TO authenticated
USING (auth_is_super_admin() OR plant_id IS NULL OR plant_id = ANY(auth_user_plant_ids()));

CREATE POLICY "shifts_write" ON public.shifts FOR ALL TO authenticated
USING (auth_can_manage_masters()) WITH CHECK (auth_can_manage_masters());

-- Templates & Signatures
CREATE POLICY "templates_select" ON public.document_templates FOR SELECT TO authenticated
USING (auth_is_super_admin() OR plant_id IS NULL OR plant_id = ANY(auth_user_plant_ids()));

CREATE POLICY "templates_write" ON public.document_templates FOR ALL TO authenticated
USING (auth_can_manage_masters()) WITH CHECK (auth_can_manage_masters());

CREATE POLICY "signatures_select" ON public.signatures FOR SELECT TO authenticated
USING (auth_is_super_admin() OR plant_id IS NULL OR plant_id = ANY(auth_user_plant_ids()));

CREATE POLICY "signatures_write" ON public.signatures FOR ALL TO authenticated
USING (auth_can_manage_masters()) WITH CHECK (auth_can_manage_masters());

-- System Settings
CREATE POLICY "system_settings_select" ON public.system_settings FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "system_settings_admin_write" ON public.system_settings FOR ALL TO authenticated
USING (auth_is_super_admin()) WITH CHECK (auth_is_super_admin());
