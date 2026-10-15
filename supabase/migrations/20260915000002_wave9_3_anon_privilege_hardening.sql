-- ==============================================================================
-- Migration: 20260915000002_wave9_3_anon_privilege_hardening.sql
-- Description: Hardening DCL - Remove Unnecessary Relation Privileges from 'anon'
-- Target: Schema public relations and future table default privileges
-- Safety: Pure DCL (Data Control Language). No schema alterations, no data changes.
-- ==============================================================================

BEGIN;

-- 1. REVOKE CURRENT RELATION PRIVILEGES FROM ROLE 'anon' IN SCHEMA public
-- Removes all table-level privileges (MAINTAIN, REFERENCES, TRIGGER, TRUNCATE)
-- across all 37 base tables and 2 compatibility views.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;

-- 2. NEUTRALIZE FUTURE DEFAULT RELATION PRIVILEGES FOR ROLE 'anon' IN SCHEMA public
-- Prevents new relations created by role 'postgres' from automatically receiving
-- MAINTAIN, REFERENCES, TRIGGER, or TRUNCATE privileges for role 'anon'.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON TABLES FROM anon;

COMMIT;
