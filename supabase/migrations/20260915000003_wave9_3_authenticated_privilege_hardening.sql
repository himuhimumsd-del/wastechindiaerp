-- ==============================================================================
-- Migration: 20260915000003_wave9_3_authenticated_privilege_hardening.sql
-- Description: Hardening DCL - Strip Unwanted DDL/Maintenance Privileges from 'authenticated'
-- Target: Schema public relations and future table default privileges
-- Safety: Pure DCL (Data Control Language). No schema alterations, no data changes.
-- ==============================================================================

BEGIN;

-- 1. REVOKE UNWANTED DDL/MAINTENANCE PRIVILEGES FROM ROLE 'authenticated' IN SCHEMA public
-- Removes MAINTAIN, REFERENCES, TRIGGER, and TRUNCATE across all 37 base tables and 2 views.
-- Preserves all approved DML privileges: SELECT (39), INSERT (36), UPDATE (35), DELETE (27).
REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE
ON ALL TABLES IN SCHEMA public
FROM authenticated;

-- 2. NEUTRALIZE FUTURE DEFAULT RELATION PRIVILEGES FOR ROLE 'authenticated' IN SCHEMA public
-- Prevents new relations created by role 'postgres' from automatically granting
-- MAINTAIN, REFERENCES, TRIGGER, or TRUNCATE to role 'authenticated'.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE MAINTAIN, REFERENCES, TRIGGER, TRUNCATE
ON TABLES
FROM authenticated;

COMMIT;
