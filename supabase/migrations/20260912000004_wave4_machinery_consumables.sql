-- ==============================================================================
-- Migration: 20260912000004_wave4_machinery_consumables.sql
-- Wave 4: Plant Equipment (Machinery) & Consumables / Spares
-- Purpose: Establishes operational machinery and plant storeroom inventory catalogs.
--          Enforces compound business/plant integrity, conflict detection, and derivation.
-- Status: DRAFT ONLY — NOT EXECUTED
-- ==============================================================================

-- 1. MACHINERY (Plant Equipment Master)
CREATE TABLE IF NOT EXISTS public.machinery (
    id VARCHAR(50) PRIMARY KEY, -- 'MAC-1', 'MAC-2'
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    name VARCHAR(255) NOT NULL, -- 'Shredder X1', 'DG Set 125 KVA'
    type VARCHAR(100) NOT NULL, -- 'Shredder', 'Conveyor', 'DG Set (Generator)', 'Loader/Excavator', 'Baler', 'Crusher', 'Other'
    fuel_type VARCHAR(50) NOT NULL, -- 'Diesel', 'Electric', 'Hybrid'
    capacity VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Under Maintenance', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- COMPOUND CONSTRAINTS: Prevent cross-plant/business reference pollution
    CONSTRAINT uq_machinery_id_plant UNIQUE (id, plant_id),
    CONSTRAINT uq_machinery_id_biz UNIQUE (id, business_id),
    CONSTRAINT fk_machinery_plant_biz FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_machinery_timestamps
BEFORE UPDATE ON public.machinery
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- Authoritative derivation trigger for machinery (conflict detection & synchronization)
CREATE OR REPLACE FUNCTION trigger_machinery_derive_business()
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
        RAISE EXCEPTION 'plant_id or companyId is required for machinery';
    END IF;

    SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id / companyId % supplied to machinery', v_plant_id;
    END IF;

    NEW.plant_id := v_plant_id;
    NEW."companyId" := v_plant_id;
    NEW.business_id := v_biz_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_machinery_derive_business
BEFORE INSERT OR UPDATE ON public.machinery
FOR EACH ROW EXECUTE FUNCTION trigger_machinery_derive_business();

-- 2. CONSUMABLES (Consumables, Spares & Tool Inventory Master)
CREATE TABLE IF NOT EXISTS public.consumables (
    id VARCHAR(50) PRIMARY KEY, -- 'CON-1', 'CON-2'
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) NOT NULL REFERENCES public.plants(id) ON DELETE RESTRICT,
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    name VARCHAR(255) NOT NULL, -- 'Shredder Blade Set'
    category VARCHAR(100) NOT NULL, -- 'Spare Part', 'Consumable', 'Tool', 'Safety Equipment', 'Other'
    unit_id VARCHAR(50) REFERENCES public.units(id) ON DELETE RESTRICT, -- 'UNT-4' / 'Nos.'
    reorder_level NUMERIC(10, 2) DEFAULT 0,
    last_price NUMERIC(12, 2) DEFAULT 0.00,
    current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Discontinued')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- COMPOUND CONSTRAINTS: Prevent cross-plant/business reference pollution
    CONSTRAINT uq_consumables_id_plant UNIQUE (id, plant_id),
    CONSTRAINT uq_consumables_id_biz UNIQUE (id, business_id),
    CONSTRAINT fk_consumables_plant_biz FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_consumables_timestamps
BEFORE UPDATE ON public.consumables
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- Authoritative derivation trigger for consumables (conflict detection & synchronization)
CREATE OR REPLACE FUNCTION trigger_consumables_derive_business()
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
        RAISE EXCEPTION 'plant_id or companyId is required for consumables';
    END IF;

    SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
    IF v_biz_id IS NULL THEN
        RAISE EXCEPTION 'Invalid plant_id / companyId % supplied to consumables', v_plant_id;
    END IF;

    NEW.plant_id := v_plant_id;
    NEW."companyId" := v_plant_id;
    NEW.business_id := v_biz_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_consumables_derive_business
BEFORE INSERT OR UPDATE ON public.consumables
FOR EACH ROW EXECUTE FUNCTION trigger_consumables_derive_business();

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_machinery_biz ON public.machinery(business_id);
CREATE INDEX IF NOT EXISTS idx_machinery_plant ON public.machinery(plant_id);
CREATE INDEX IF NOT EXISTS idx_consumables_biz ON public.consumables(business_id);
CREATE INDEX IF NOT EXISTS idx_consumables_plant ON public.consumables(plant_id);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.machinery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "machinery_select" ON public.machinery FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "machinery_write" ON public.machinery FOR ALL TO authenticated
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

CREATE POLICY "consumables_select" ON public.consumables FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND plant_id = ANY(auth_user_plant_ids())
    )
);

CREATE POLICY "consumables_write" ON public.consumables FOR ALL TO authenticated
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
