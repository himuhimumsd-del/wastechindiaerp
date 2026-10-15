-- ==============================================================================
-- ECOMANAGE ERP: PURGE OPERATIONAL DATA (BULLETPROOF CLEAN SLATE)
-- Purpose: Safely deletes all transactional/demo data in exact foreign key order.
-- Checks table existence before deleting, avoiding 'relation does not exist' errors.
-- Masters (Plants, Units, Items, Parties, Vehicles, Employees) remain untouched.
-- ==============================================================================

DO $$ 
BEGIN
    -- 1. Invoices
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sales_invoices') THEN
        DELETE FROM public.sales_invoices;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vendor_invoices') THEN
        DELETE FROM public.vendor_invoices;
    END IF;

    -- 2. Receiving & Goods Receipt
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'grn_items') THEN
        DELETE FROM public.grn_items;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'grn') THEN
        DELETE FROM public.grn;
    END IF;

    -- 3. Gate Security & Logistics Trips
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gate_entries') THEN
        DELETE FROM public.gate_entries;
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trips') THEN
        DELETE FROM public.trips;
    END IF;

    -- 4. Commercial Orders (PO Issued & PO Received)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orders') THEN
        DELETE FROM public.orders;
    END IF;

    RAISE NOTICE 'Operational data purged successfully!';
END $$;

-- Verification: Check that operational tables are empty
SELECT 
    (SELECT COUNT(*) FROM public.orders) AS remaining_orders,
    (SELECT COUNT(*) FROM public.trips) AS remaining_trips,
    (SELECT COUNT(*) FROM public.grn) AS remaining_grn,
    (SELECT COUNT(*) FROM public.sales_invoices) AS remaining_invoices;
