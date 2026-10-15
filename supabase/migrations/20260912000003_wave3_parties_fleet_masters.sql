-- ==============================================================================
-- Migration: 20260912000003_wave3_parties_fleet_masters.sql
-- Wave 3: Parties (Shared Global Master), Contacts, Addresses & Fleet (Vehicles)
-- Purpose: Establishes global commercial directory of parties, locations, and transport fleet.
--          Enforces shared-fleet RLS model (plant_id NULL allowed), conflict detection,
--          and master management write protection.
-- Status: DRAFT ONLY — NOT EXECUTED
-- ==============================================================================

-- 1. PARTIES (Shared Global Catalog across all businesses)
CREATE TABLE IF NOT EXISTS public.parties (
    id VARCHAR(50) PRIMARY KEY, -- 'PAR-1', 'PAR-2'
    name VARCHAR(255) NOT NULL, -- 'TIKAM CHAND JAIN', 'MP WASTE MGT'
    party_types TEXT[] NOT NULL DEFAULT ARRAY['Client']::TEXT[], -- 'Client', 'Supplier', 'Transporter', 'Vendor', 'Service Provider'
    vendor_code VARCHAR(50),
    not_gst_payer BOOLEAN NOT NULL DEFAULT FALSE,
    gstin VARCHAR(20),
    pan VARCHAR(20),
    cin VARCHAR(50),
    primary_address TEXT,
    street1 VARCHAR(255),
    street2 VARCHAR(255),
    city VARCHAR(100),
    district VARCHAR(100),
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(20),
    primary_contact_name VARCHAR(100),
    primary_contact_phone VARCHAR(50),
    primary_email VARCHAR(150),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_parties_timestamps
BEFORE UPDATE ON public.parties
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- 2. PARTY CONTACTS (Normalized from additionalContacts multiEntry)
CREATE TABLE IF NOT EXISTS public.party_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id VARCHAR(50) NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    contact_name VARCHAR(150) NOT NULL,
    designation VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(150),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_party_contacts_timestamps
BEFORE UPDATE ON public.party_contacts
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- 3. PARTY ADDRESSES (Normalized from additionalAddresses multiEntry)
CREATE TABLE IF NOT EXISTS public.party_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id VARCHAR(50) NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
    location_name VARCHAR(150),
    address_text TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    gstin VARCHAR(20), -- Optional site-specific GSTIN
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_party_addresses_timestamps
BEFORE UPDATE ON public.party_addresses
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- 4. VEHICLES (Transport & Logistics Fleet Master)
-- Supports both plant-dedicated fleet and business-shared fleet (plant_id IS NULL)
CREATE TABLE IF NOT EXISTS public.vehicles (
    id VARCHAR(50) PRIMARY KEY, -- 'VEH-1', 'VEH-2'
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
    plant_id VARCHAR(50) REFERENCES public.plants(id) ON DELETE SET NULL, -- Nullable for business-shared fleet
    "companyId" VARCHAR(50), -- Frontend compatibility mirror
    vehicle_no VARCHAR(50) NOT NULL UNIQUE, -- 'CG04NF4358'
    party_name VARCHAR(255), -- Preserves existing text reference 'FAST LOGISTICS'
    party_id VARCHAR(50) REFERENCES public.parties(id) ON DELETE SET NULL, -- Relational link
    vehicle_type VARCHAR(100),
    capacity_mt NUMERIC(10, 2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- COMPOUND CONSTRAINTS: Ensures vehicle uniqueness per business
    CONSTRAINT uq_vehicles_id_biz UNIQUE (id, business_id),
    CONSTRAINT fk_vehicles_plant_biz FOREIGN KEY (plant_id, business_id)
        REFERENCES public.plants(id, business_id) ON DELETE SET NULL
);

CREATE TRIGGER trg_vehicles_timestamps
BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamps();

-- Authoritative vehicle derivation trigger (conflict detection & synchronization)
CREATE OR REPLACE FUNCTION trigger_vehicles_derive_business()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_plant_id VARCHAR(50);
    v_biz_id UUID;
BEGIN
    -- Conflict detection: reject diverging values
    IF NEW."companyId" IS NOT NULL AND NEW.plant_id IS NOT NULL AND NEW."companyId" <> NEW.plant_id THEN
        RAISE EXCEPTION 'Conflicting tenant identifiers: companyId (%) does not match plant_id (%)', NEW."companyId", NEW.plant_id;
    END IF;

    v_plant_id := COALESCE(NEW.plant_id, NEW."companyId");
    IF v_plant_id IS NOT NULL THEN
        SELECT business_id INTO v_biz_id FROM public.plants WHERE id = v_plant_id;
        IF v_biz_id IS NULL THEN
            RAISE EXCEPTION 'Invalid plant_id / companyId % supplied to vehicle', v_plant_id;
        END IF;
        NEW.plant_id := v_plant_id;
        NEW."companyId" := v_plant_id;
        NEW.business_id := v_biz_id;
    ELSE
        -- Shared-fleet vehicle: plant_id is NULL, verify business_id
        IF NEW.business_id IS NULL THEN
            RAISE EXCEPTION 'business_id is required for shared-fleet vehicles when plant_id is NULL';
        END IF;
        NEW.plant_id := NULL;
        NEW."companyId" := NULL;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vehicles_derive_business
BEFORE INSERT OR UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION trigger_vehicles_derive_business();

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_parties_types ON public.parties USING GIN (party_types);
CREATE INDEX IF NOT EXISTS idx_parties_name ON public.parties(name);
CREATE INDEX IF NOT EXISTS idx_parties_gstin ON public.parties(gstin);
CREATE INDEX IF NOT EXISTS idx_party_contacts_party ON public.party_contacts(party_id);
CREATE INDEX IF NOT EXISTS idx_party_addresses_party ON public.party_addresses(party_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_biz ON public.vehicles(business_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plant ON public.vehicles(plant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_no ON public.vehicles(vehicle_no);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Parties & Addresses are Shared Global Masters: Readable by all authenticated users
CREATE POLICY "parties_global_select" ON public.parties FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "parties_write_policy" ON public.parties FOR ALL TO authenticated 
USING (auth_can_manage_masters()) WITH CHECK (auth_can_manage_masters());

CREATE POLICY "party_contacts_global_select" ON public.party_contacts FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "party_contacts_write_policy" ON public.party_contacts FOR ALL TO authenticated 
USING (auth_can_manage_masters()) WITH CHECK (auth_can_manage_masters());

CREATE POLICY "party_addresses_global_select" ON public.party_addresses FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "party_addresses_write_policy" ON public.party_addresses FOR ALL TO authenticated 
USING (auth_can_manage_masters()) WITH CHECK (auth_can_manage_masters());

-- Vehicles: Shared fleet (plant_id IS NULL) accessible by any user of that business;
-- Plant-specific fleet requires both business and plant access.
CREATE POLICY "vehicles_select" ON public.vehicles FOR SELECT TO authenticated
USING (
    auth_is_super_admin()
    OR (
        business_id = ANY(auth_user_business_ids())
        AND (plant_id IS NULL OR plant_id = ANY(auth_user_plant_ids()))
    )
);

CREATE POLICY "vehicles_write" ON public.vehicles FOR ALL TO authenticated
USING (
    auth_is_super_admin()
    OR (
        auth_can_manage_masters()
        AND business_id = ANY(auth_user_business_ids())
        AND (plant_id IS NULL OR plant_id = ANY(auth_user_plant_ids()))
    )
)
WITH CHECK (
    auth_is_super_admin()
    OR (
        auth_can_manage_masters()
        AND business_id = ANY(auth_user_business_ids())
        AND (plant_id IS NULL OR plant_id = ANY(auth_user_plant_ids()))
    )
);
