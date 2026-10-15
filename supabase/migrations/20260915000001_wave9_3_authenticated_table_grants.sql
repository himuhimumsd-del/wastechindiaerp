-- ==============================================================================
-- Migration: 20260915000001_wave9_3_authenticated_table_grants.sql
-- Description: Least-Privilege Table Grants for Role 'authenticated'
-- Target: PostgREST API Gateway & Application Execution
-- Safety: Pure DCL (Data Control Language). No schema alterations, no data mutations.
-- ==============================================================================

-- 1. SCHEMA USAGE PRIVILEGE
-- Ensures the authenticated role can resolve object identifiers within public schema.
GRANT USAGE ON SCHEMA public TO authenticated;

-- ==============================================================================
-- CATEGORY 1: SELECT + INSERT + UPDATE + DELETE (Full Lifecycle Tables)
-- Note: Row Level Security (RLS) policies remain 100% authoritative.
-- Write operations on administrative tables are strictly gated by auth_is_super_admin()
-- or auth_can_manage_masters().
-- ==============================================================================

-- 1.1 System & Foundation Tables (Admin mutation gated by RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_identities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_business_access TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_plant_access TO authenticated;

-- 1.2 Global Master Catalogs (Mutation gated by auth_can_manage_masters)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.po_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signatures TO authenticated;

-- 1.3 Commercial, Master & Operational Tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.party_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.party_addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machinery TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consumables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payroll_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grn TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grn_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attachments TO authenticated;

-- ==============================================================================
-- CATEGORY 2: SELECT + INSERT + UPDATE (Non-Deletable Operational & Financial Tables)
-- Deletion is strictly forbidden at both DAC and RLS levels to preserve audit integrity.
-- ==============================================================================

GRANT SELECT, UPDATE ON public.system_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sales_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.vendor_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.trips TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.gate_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payroll_ledger TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.machine_logs TO authenticated;

-- ==============================================================================
-- CATEGORY 3: SELECT + INSERT (Strictly Append-Only Audit & Movement Ledgers)
-- Records are immutable once written; updates and deletions are strictly barred.
-- ==============================================================================

GRANT SELECT, INSERT ON public.consumable_movements TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;

-- ==============================================================================
-- CATEGORY 4: VIEWS (CamelCase Compatibility Interfaces)
-- Read-only projections backed by INSTEAD OF triggers for commercial orders.
-- ==============================================================================

GRANT SELECT ON public.view_po_received TO authenticated;
GRANT SELECT ON public.view_po_issued TO authenticated;

-- ==============================================================================
-- EXPLICIT RESTRICTION SUMMARY (DEFENSE-IN-DEPTH)
-- Role 'anon': ZERO table privileges granted.
-- Role 'authenticated': Access strictly filtered at runtime by active RLS policies.
-- ==============================================================================
