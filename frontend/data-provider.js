/**
 * EcoManage ERP — Data Provider & Persistence Adapter Foundation (Wave 9.2)
 *
 * This module establishes the non-destructive abstraction layer between
 * the in-memory ERP frontend state and the verified Supabase database schema.
 *
 * STRICT SAFETY RULES:
 * 1. Read-only specification and mapping contract only.
 * 2. ZERO database queries, mutations, auth, or storage calls.
 * 3. Does not alter existing UI, forms, state.data, or calculations.
 * 4. Explicitly distinguishes frontend human-readable IDs from DB UUIDs.
 * 5. Composite modules spanning multiple tables are explicitly marked and getTableName() returns null.
 * 6. Allow-list based mapping: unmapped/unknown fields are never passed through.
 */

(function (global) {
    'use strict';

    // =========================================================================
    // 1. ERROR MODEL
    // =========================================================================
    class DataProviderError extends Error {
        constructor({ code, message, moduleKey = null, field = null, retryable = false }) {
            super(message);
            this.name = 'DataProviderError';
            this.code = code;
            this.moduleKey = moduleKey;
            this.field = field;
            this.retryable = retryable;
        }
    }

    // =========================================================================
    // 2. MODULE DEFINITION REGISTRY (28 Modules)
    // =========================================================================
    const MODULE_REGISTRY = {
        // --- Core / System / Foundation ---
        companyMaster: {
            moduleKey: 'companyMaster',
            persistenceType: 'composite',
            tableNames: ['businesses', 'plants', 'tax_identities', 'bank_accounts'],
            primaryKey: 'id',
            documentKey: 'code',
            frontendIdStrategy: 'Manual / Prefix string (e.g. COMP-1)',
            databaseIdStrategy: 'plants.id (VARCHAR(50)), businesses.id (UUID), tax_identities.id (UUID), bank_accounts.id (UUID)',
            mappingStatus: 'composite-specification-ready'
        },
        systemSettings: {
            moduleKey: 'systemSettings',
            persistenceType: 'single',
            tableName: 'system_settings',
            primaryKey: 'id',
            documentKey: 'id',
            frontendIdStrategy: 'Singleton / Prefix string (e.g. SET-1)',
            databaseIdStrategy: 'UUID / singleton row',
            mappingStatus: 'verified'
        },
        templatesMaster: {
            moduleKey: 'templatesMaster',
            persistenceType: 'single',
            tableName: 'document_templates',
            primaryKey: 'id',
            documentKey: 'name',
            frontendIdStrategy: 'Prefix string (e.g. TMP-1)',
            databaseIdStrategy: 'UUID',
            mappingStatus: 'verified'
        },
        signatureMaster: {
            moduleKey: 'signatureMaster',
            persistenceType: 'single',
            tableName: 'authorized_signatories',
            primaryKey: 'id',
            documentKey: 'authName',
            frontendIdStrategy: 'Prefix string (e.g. SIGN-1)',
            databaseIdStrategy: 'UUID',
            mappingStatus: 'verified'
        },
        machineryMaster: {
            moduleKey: 'machineryMaster',
            persistenceType: 'single',
            tableName: 'machinery',
            primaryKey: 'id',
            documentKey: 'code',
            frontendIdStrategy: 'Prefix string (e.g. MAC-1)',
            databaseIdStrategy: 'VARCHAR(50) (id, plant_id compound)',
            mappingStatus: 'verified'
        },
        consumablesMaster: {
            moduleKey: 'consumablesMaster',
            persistenceType: 'single',
            tableName: 'consumables',
            primaryKey: 'id',
            documentKey: 'code',
            frontendIdStrategy: 'Prefix string (e.g. CON-1)',
            databaseIdStrategy: 'VARCHAR(50) (id, plant_id compound)',
            mappingStatus: 'verified'
        },
        consumableLogs: {
            moduleKey: 'consumableLogs',
            persistenceType: 'single',
            tableName: 'consumable_movements',
            primaryKey: 'id',
            documentKey: 'movement_number',
            frontendIdStrategy: 'Prefix string (e.g. CL-1)',
            databaseIdStrategy: 'UUID (id), movement_number (VARCHAR(100))',
            mappingStatus: 'verified'
        },
        machineLogs: {
            moduleKey: 'machineLogs',
            persistenceType: 'single',
            tableName: 'machine_logs',
            primaryKey: 'id',
            documentKey: 'id',
            frontendIdStrategy: 'Prefix string (e.g. ML-1)',
            databaseIdStrategy: 'UUID (id)',
            mappingStatus: 'verified'
        },
        vehicleMaster: {
            moduleKey: 'vehicleMaster',
            persistenceType: 'single',
            tableName: 'fleet_vehicles',
            primaryKey: 'id',
            documentKey: 'vehicle_registration_number',
            frontendIdStrategy: 'Prefix string (e.g. VEH-1)',
            databaseIdStrategy: 'UUID (id), vehicle_registration_number (VARCHAR(50))',
            mappingStatus: 'verified'
        },
        itemMaster: {
            moduleKey: 'itemMaster',
            persistenceType: 'single',
            tableName: 'items',
            primaryKey: 'id',
            documentKey: 'item_code',
            frontendIdStrategy: 'Prefix string (e.g. ITM-1)',
            databaseIdStrategy: 'UUID (id), item_code (VARCHAR(50))',
            mappingStatus: 'verified'
        },
        unitMaster: {
            moduleKey: 'unitMaster',
            persistenceType: 'single',
            tableName: 'units_of_measure',
            primaryKey: 'id',
            documentKey: 'unit_code',
            frontendIdStrategy: 'Prefix string (e.g. UOM-1)',
            databaseIdStrategy: 'UUID (id), unit_code (VARCHAR(20))',
            mappingStatus: 'verified'
        },
        poTypeMaster: {
            moduleKey: 'poTypeMaster',
            persistenceType: 'single',
            tableName: 'order_types',
            primaryKey: 'id',
            documentKey: 'type_name',
            frontendIdStrategy: 'Prefix string (e.g. POT-1)',
            databaseIdStrategy: 'UUID (id), type_name (VARCHAR(50))',
            mappingStatus: 'verified'
        },
        partiesMaster: {
            moduleKey: 'partiesMaster',
            persistenceType: 'composite',
            tableNames: ['parties', 'party_addresses', 'party_tax_profiles'],
            primaryKey: 'id',
            documentKey: 'vendorCode',
            frontendIdStrategy: 'Prefix string (e.g. CUST-1, SUP-1)',
            databaseIdStrategy: 'parties.id (VARCHAR(50)), party_addresses.id (UUID), party_tax_profiles.id (UUID)',
            mappingStatus: 'composite-specification-ready'
        },
        employees: {
            moduleKey: 'employees',
            persistenceType: 'single',
            tableName: 'employees',
            primaryKey: 'id',
            documentKey: 'employee_code',
            frontendIdStrategy: 'Prefix string (e.g. EMP-1)',
            databaseIdStrategy: 'VARCHAR(50) (id, plant_id compound)',
            mappingStatus: 'verified'
        },
        shiftsMaster: {
            moduleKey: 'shiftsMaster',
            persistenceType: 'single',
            tableName: 'shifts',
            primaryKey: 'id',
            documentKey: 'shift_code',
            frontendIdStrategy: 'Prefix string (e.g. SHF-1)',
            databaseIdStrategy: 'VARCHAR(50) (id, plant_id compound)',
            mappingStatus: 'verified'
        },
        payrollSettings: {
            moduleKey: 'payrollSettings',
            persistenceType: 'single',
            tableName: 'payroll_settings',
            primaryKey: 'id',
            documentKey: 'id',
            frontendIdStrategy: 'Singleton string (e.g. PRS-1)',
            databaseIdStrategy: 'UUID (business_id compound)',
            mappingStatus: 'verified'
        },
        usersMaster: {
            moduleKey: 'usersMaster',
            persistenceType: 'composite',
            tableNames: [
                'profiles',
                'user_plant_access',
                'user_business_access',
                'auth.users'
            ],
            primaryKey: 'id',
            documentKey: 'username',
            frontendIdStrategy: 'Prefix string (e.g. USER-001)',
            databaseIdStrategy:
                'profiles.id (UUID references auth.users), profiles.legacy_user_id (VARCHAR(50))',
            mappingStatus: 'composite-specification-ready'
        },
        rolesMaster: {
            moduleKey: 'rolesMaster',
            persistenceType: 'composite',
            tableNames: [
                'roles',
                'role_permissions'
            ],
            primaryKey: 'id',
            documentKey: 'role_name',
            frontendIdStrategy: 'Prefix string (e.g. ROLE-ADMIN)',
            databaseIdStrategy:
                'roles.id (VARCHAR(50)), role_permissions.id (UUID)',
            mappingStatus: 'composite-specification-ready'
        },
        poReceived: {
            moduleKey: 'poReceived',
            persistenceType: 'single',
            tableName: 'orders',
            primaryKey: 'id',
            documentKey: 'order_number',
            frontendIdStrategy: 'Prefix string (e.g. PO-REC-101)',
            databaseIdStrategy: 'UUID (id), order_number (VARCHAR(100)), order_nature = Sales Order',
            mappingStatus: 'verified'
        },
        poIssued: {
            moduleKey: 'poIssued',
            persistenceType: 'single',
            tableName: 'orders',
            primaryKey: 'id',
            documentKey: 'order_number',
            frontendIdStrategy: 'Prefix string (e.g. PO-ISS-201)',
            databaseIdStrategy: 'UUID (id), order_number (VARCHAR(100)), order_nature = Purchase Order',
            mappingStatus: 'verified'
        },
        trips: {
            moduleKey: 'trips',
            persistenceType: 'single',
            tableName: 'trips',
            primaryKey: 'id',
            documentKey: 'trip_number',
            frontendIdStrategy: 'Numeric / string (e.g. 36422655)',
            databaseIdStrategy: 'UUID (id), trip_number (VARCHAR(100))',
            mappingStatus: 'verified'
        },
        gateVerification: {
            moduleKey: 'gateVerification',
            persistenceType: 'single',
            tableName: 'gate_entries',
            primaryKey: 'id',
            documentKey: 'entry_number',
            frontendIdStrategy: 'Prefix string (e.g. GATEV-01)',
            databaseIdStrategy: 'UUID (id), entry_number (VARCHAR(100))',
            mappingStatus: 'verified'
        },
        grn: {
            moduleKey: 'grn',
            persistenceType: 'composite',
            tableNames: ['grn', 'grn_items'],
            primaryKey: 'id',
            documentKey: 'grn_number',
            frontendIdStrategy: 'Prefix string (e.g. GRN-101)',
            databaseIdStrategy: 'grn.id (UUID), grn_number (VARCHAR(100)), grn_items.id (UUID)',
            mappingStatus: 'composite-specification-ready'
        },
        invoices: {
            moduleKey: 'invoices',
            persistenceType: 'single',
            tableName: 'sales_invoices',
            primaryKey: 'id',
            documentKey: 'invoice_number',
            frontendIdStrategy: 'Manual / sequence string (e.g. INV-1)',
            databaseIdStrategy: 'UUID (id), invoice_number (VARCHAR(100))',
            mappingStatus: 'verified'
        },
        receivedInvoice: {
            moduleKey: 'receivedInvoice',
            persistenceType: 'single',
            tableName: 'vendor_invoices',
            primaryKey: 'id',
            documentKey: 'vendor_invoice_no',
            frontendIdStrategy: 'Manual / sequence string (e.g. VINV-1)',
            databaseIdStrategy: 'UUID (id), vendor_invoice_no (VARCHAR(100))',
            mappingStatus: 'verified'
        },
        attendance: {
            moduleKey: 'attendance',
            persistenceType: 'single',
            tableName: 'attendance',
            primaryKey: 'id',
            documentKey: 'id',
            frontendIdStrategy: 'Prefix string (e.g. ATT-1)',
            databaseIdStrategy: 'UUID (id)',
            mappingStatus: 'verified'
        },
        payrollLedger: {
            moduleKey: 'payrollLedger',
            persistenceType: 'single',
            tableName: 'payroll_ledger',
            primaryKey: 'id',
            documentKey: 'id',
            frontendIdStrategy: 'Prefix string (e.g. PAY-1)',
            databaseIdStrategy: 'UUID (id)',
            mappingStatus: 'verified'
        },
        auditLogs: {
            moduleKey: 'auditLogs',
            persistenceType: 'single',
            tableName: 'audit_logs',
            primaryKey: 'id',
            documentKey: 'id',
            frontendIdStrategy: 'Prefix string (e.g. AUD-01)',
            databaseIdStrategy: 'UUID (id)',
            mappingStatus: 'verified'
        }
    };

    // =========================================================================
    // 3. EXPLICIT FIELD MAPPING CONTRACTS (Verified High-Priority Modules)
    // =========================================================================
    const FIELD_MAPPINGS = {
        // 1. Sales Invoices (invoices -> sales_invoices)
        invoices: {
            id: { dbField: 'invoice_number', note: 'Frontend id maps to invoice_number; DB PK id is UUID' },
            client: { dbField: 'party_id', note: 'Relational party foreign key' },
            poRef: { dbField: 'po_ref', note: 'Preserves PO contract reference string' },
            grnRef: { dbField: 'grn_ref', note: 'Preserves GRN document reference string' },
            date: { dbField: 'invoice_date', note: 'ISO Date string' },
            dueDate: { dbField: 'due_date', note: 'Calculated or input due date' },
            paymentTermsDays: { dbField: 'payment_terms_days', note: 'Integer days' },
            amount: { dbField: 'taxable_amount', note: 'Numeric base amount' },
            cgstAmount: { dbField: 'cgst_amount', note: 'Numeric tax amount' },
            sgstAmount: { dbField: 'sgst_amount', note: 'Numeric tax amount' },
            igstAmount: { dbField: 'igst_amount', note: 'Numeric tax amount' },
            totalAmount: { dbField: 'total_amount', note: 'Final gross invoice amount' },
            paidAmount: { dbField: 'paid_amount', note: 'Recorded collections' },
            balanceAmount: { dbField: 'balance_amount', note: 'Computed balance' },
            financialYear: { dbField: 'financial_year', note: 'FY code (e.g. FY 2024-25)' },
            companyId: { dbField: 'companyId', note: 'Frontend plant context mirror' },
            status: {
                dbField: 'status',
                statusMapping: 'requires explicit business-rule approval',
                frontendValues: ['Proforma', 'Generated', 'Paid', 'Overdue'],
                databaseValues: ['Draft', 'Issued', 'Paid', 'Partially Paid', 'Overdue', 'Cancelled']
            }
        },

        // 2. Received Invoices (receivedInvoice -> vendor_invoices)
        receivedInvoice: {
            id: { dbField: 'vendor_invoice_no', note: 'Frontend id maps to vendor_invoice_no; DB PK is UUID' },
            vendor: { dbField: 'party_id', note: 'Relational vendor foreign key' },
            poRef: { dbField: 'po_issued_ref', note: 'Preserves issued PO reference' },
            grnRef: { dbField: 'grn_ref', note: 'Preserves received GRN reference' },
            date: { dbField: 'invoice_date', note: 'ISO Date string' },
            dueDate: { dbField: 'due_date', note: 'Payment due date' },
            vendorInvoiceNumber: { dbField: 'vendor_invoice_no', note: 'Explicit vendor invoice string' },
            amount: { dbField: 'taxable_amount', note: 'Numeric taxable base' },
            totalAmount: { dbField: 'total_amount', note: 'Gross invoice total' },
            paidAmount: { dbField: 'paid_amount', note: 'Recorded vendor payments' },
            balanceAmount: { dbField: 'balance_amount', note: 'Remaining vendor balance' },
            financialYear: { dbField: 'financial_year', note: 'FY code' },
            companyId: { dbField: 'companyId', note: 'Frontend plant context mirror' },
            status: {
                dbField: 'status',
                statusMapping: 'requires explicit business-rule approval',
                frontendValues: ['Pending', 'Paid', 'Overdue'],
                databaseValues: ['Pending Approval', 'Approved', 'Paid', 'Partially Paid', 'Disputed', 'Rejected']
            }
        },

        // 3. Attendance (attendance -> attendance)
        attendance: {
            empId: { dbField: 'emp_id', note: 'Employee code foreign key' },
            date: { dbField: 'attendance_date', note: 'Date of attendance' },
            totalHours: { dbField: 'work_hours', note: 'Total worked hours' },
            otHours: { dbField: 'ot_hours', note: 'Overtime hours' },
            shiftId: { dbField: 'shift_id', note: 'Assigned shift ID' },
            shiftName: { dbField: 'shift_name', note: 'Assigned shift label' },
            checkIn: { dbField: 'check_in', note: 'Timestamptz punch in' },
            checkOut: { dbField: 'check_out', note: 'Timestamptz punch out' },
            remarks: { dbField: 'remarks', note: 'Attendance notes' },
            companyId: { dbField: 'companyId', note: 'Frontend plant context mirror' },
            status: {
                dbField: 'status',
                statusMapping: 'requires explicit business-rule approval',
                frontendValues: ['Present', 'Half-Day', 'Late', 'Absent'],
                databaseValues: ['Present', 'Absent', 'Half Day', 'Leave', 'Holiday', 'Weekly Off']
            }
        },

        // 4. Payroll Ledger (payrollLedger -> payroll_ledger)
        payrollLedger: {
            empId: { dbField: 'emp_id', note: 'Employee reference' },
            payableDays: { dbField: 'payable_days', note: 'Number of payable days' },
            presentDays: { dbField: 'present_days', note: 'Present days count' },
            grossEarned: { dbField: 'gross_salary', note: 'Gross earned salary' },
            pfDeduction: { dbField: 'pf_employee', note: 'Employee PF deduction' },
            esiDeduction: { dbField: 'esi_employee', note: 'Employee ESI deduction' },
            ptDeduction: { dbField: 'pt_deduction', note: 'Professional Tax deduction' },
            advance: { dbField: 'advance_deduction', note: 'Loan/advance deduction' },
            totalDeductions: { dbField: 'total_deductions', note: 'Aggregated deductions' },
            netSalary: { dbField: 'net_salary', note: 'Net payable salary' },
            companyId: { dbField: 'companyId', note: 'Frontend plant context mirror' },
            monthYear: {
                dbField: ['month', 'year'],
                note: 'Frontend string YYYY-MM maps to month INTEGER (1-12) and year INTEGER (>= 2000)'
            },
            status: {
                dbField: 'status',
                statusMapping: 'requires explicit business-rule approval',
                frontendValues: ['Draft', 'Reviewed', 'Approved', 'Paid'],
                databaseValues: ['Draft', 'Processed', 'Approved', 'Paid']
            }
        },

        // 5. Consumable Logs (consumableLogs -> consumable_movements)
        consumableLogs: {
            id: { dbField: 'movement_number', note: 'Frontend CL-X maps to movement_number; DB PK is UUID' },
            consumable: { dbField: 'consumable_id', note: 'Foreign key to consumables(id)' },
            date: { dbField: 'movement_date', note: 'Date of inventory movement' },
            quantity: { dbField: 'qty', note: 'Movement quantity' },
            pricePerUnit: { dbField: 'unit_price', note: 'Price per unit' },
            totalAmount: { dbField: 'total_cost', note: 'Total movement cost' },
            machine: { dbField: 'machine_id', note: 'Foreign key to machinery(id)' },
            issuedTo: { dbField: 'issued_to', note: 'Employee reference string' },
            remarks: { dbField: 'remarks', note: 'Movement notes' },
            companyId: { dbField: 'companyId', note: 'Frontend plant context mirror' },
            movementType: {
                dbField: 'movement_type',
                statusMapping: 'requires explicit business-rule approval',
                frontendValues: ['Purchased (In)', 'Issued (Out)'],
                databaseValues: ['Stock In (Purchase)', 'Issue to Machine', 'Issue to Plant', 'Adjustment', 'Return']
            }
        },

        // 6. Machine Logs (machineLogs -> machine_logs)
        machineLogs: {
            machine: { dbField: 'machine_id', note: 'Foreign key to machinery(id)' },
            date: { dbField: 'log_date', note: 'Date of log' },
            runningHours: { dbField: 'hours_run', note: 'Hours of machine operation' },
            dieselConsumed: { dbField: 'fuel_consumed_litres', note: 'Litres of fuel used' },
            elecUsed: { dbField: 'units_consumed_kwh', note: 'Electricity units consumed' },
            remarks: { dbField: 'remarks', note: 'Operator observations' },
            operator: { dbField: 'operator_emp_id', note: 'Employee reference' },
            companyId: { dbField: 'companyId', note: 'Frontend plant context mirror' }
        },

        // 7. Audit Logs (auditLogs -> audit_logs)
        auditLogs: {
            moduleKey: { dbField: 'entity_type', note: 'Source module name / entity table' },
            recordId: { dbField: 'entity_id', note: 'Affected record identifier' },
            action: { dbField: 'action', note: 'Create, Update, Delete' },
            details: { dbField: 'details', note: 'Human-readable action description' },
            rawSnapshot: {
                statusMapping: 'requires explicit business-rule approval',
                note: 'Unresolved: Frontend rawSnapshot is not automatically coerced into before_state or after_state without explicit business-rule approval.'
            },
            userRole: {
                dbField: 'user_email',
                statusMapping: 'requires explicit business-rule approval',
                note: 'Unresolved: username vs authenticated email'
            },
            companyId: { dbField: 'companyId', note: 'Frontend plant context mirror' }
        }
    };

    // =========================================================================
    // 4. RELATIONAL RESOLUTION PLACEHOLDER CONTRACT
    // =========================================================================
    // These functions define the future relational resolution interface.
    // They are intentionally placeholders that perform ZERO network or DB operations.
    const RelationalResolvers = {
        resolvePartyId: function (partyCodeOrName) {
            return { resolved: false, reason: 'Relational resolution placeholder — no database query executed.' };
        },
        resolveVehicleId: function (vehicleNo) {
            return { resolved: false, reason: 'Relational resolution placeholder — no database query executed.' };
        },
        resolveEmployeeId: function (empCode) {
            return { resolved: false, reason: 'Relational resolution placeholder — no database query executed.' };
        },
        resolveMachineId: function (machineCodeOrName) {
            return { resolved: false, reason: 'Relational resolution placeholder — no database query executed.' };
        },
        resolveConsumableId: function (consumableCode) {
            return { resolved: false, reason: 'Relational resolution placeholder — no database query executed.' };
        },
        resolveOrderId: function (poNumber) {
            return { resolved: false, reason: 'Relational resolution placeholder — no database query executed.' };
        },
        resolveGrnId: function (grnNumber) {
            return { resolved: false, reason: 'Relational resolution placeholder — no database query executed.' };
        },
        resolvePlantId: function (companyId) {
            return { resolved: false, reason: 'Relational resolution placeholder — no database query executed.' };
        },
        resolveBusinessId: function (companyId) {
            return { resolved: false, reason: 'Relational resolution placeholder — no database query executed.' };
        }
    };

    // =========================================================================
    // 5. PUBLIC DATA PROVIDER API
    // =========================================================================
    const WasteTechDataProvider = {
        /**
         * Checks whether the underlying Supabase client is configured.
         * Returns false when placeholder credentials are in use.
         */
        isReady: function () {
            return typeof global.isSupabaseConfigured === 'function' && global.isSupabaseConfigured();
        },

        /**
         * Returns the active Supabase client instance or null.
         */
        getClient: function () {
            return typeof global.getSupabaseClient === 'function' ? global.getSupabaseClient() : null;
        },

        /**
         * Retrieves the explicit metadata definition for a module.
         */
        getModuleDefinition: function (moduleKey) {
            return MODULE_REGISTRY[moduleKey] || null;
        },

        /**
         * Returns the verified database table name for single-table modules.
         * For composite modules spanning multiple tables, strictly returns null.
         */
        getTableName: function (moduleKey) {
            const def = MODULE_REGISTRY[moduleKey];
            if (!def) return null;
            if (def.persistenceType === 'composite') return null;
            return def.tableName || null;
        },

        /**
         * Returns the verified primary key column for a module.
         */
        getPrimaryKey: function (moduleKey) {
            const def = MODULE_REGISTRY[moduleKey];
            return def ? def.primaryKey : 'id';
        },

        /**
         * Returns the business document identifier column for a module.
         */
        getDocumentKey: function (moduleKey) {
            const def = MODULE_REGISTRY[moduleKey];
            return def ? def.documentKey : null;
        },

        /**
         * Maps a frontend in-memory object to its database column representation.
         * STRICT ALLOW-LIST: Only explicitly mapped database fields are emitted.
         * Unmapped / unknown fields are safely ignored and NEVER passed through.
         * Pure in-memory transformation: performs ZERO database operations.
         */
        mapToDatabase: function (moduleKey, record) {
            if (!record) return null;
            const mapping = FIELD_MAPPINGS[moduleKey];
            if (!mapping) {
                // If module has no explicit allow-list specification, emit empty object
                return {};
            }

            const dbRow = {};
            for (const [fKey, mapRule] of Object.entries(mapping)) {
                // Only process rules with a valid dbField definition
                if (!mapRule || !mapRule.dbField) continue;

                // FINAL SAFETY GUARD: Mappings requiring explicit approval must NOT be emitted
                if (mapRule.statusMapping === 'requires explicit business-rule approval') {
                    continue;
                }

                const fVal = record[fKey];
                if (fVal === undefined) continue;

                if (typeof mapRule.dbField === 'string') {
                    dbRow[mapRule.dbField] = fVal;
                } else if (Array.isArray(mapRule.dbField)) {
                    // Special multi-field decomposition (e.g. monthYear -> month, year)
                    if (fKey === 'monthYear' && typeof fVal === 'string') {
                        const parts = fVal.split('-');
                        if (parts.length === 2) {
                            dbRow.year = parseInt(parts[0], 10);
                            dbRow.month = parseInt(parts[1], 10);
                        }
                    }
                }
            }

            return dbRow;
        },

        /**
         * Maps a database row back into the frontend in-memory representation.
         * STRICT ALLOW-LIST: Only known frontend fields are populated.
         * Pure in-memory transformation: performs ZERO database operations.
         */
        mapFromDatabase: function (moduleKey, row) {
            if (!row) return null;
            const mapping = FIELD_MAPPINGS[moduleKey];
            if (!mapping) return {};

            const record = {};
            // Build inverted lookup for standard single-field mappings
            const inverted = {};
            for (const [fKey, rule] of Object.entries(mapping)) {
                // Safety guard: Approval-gated mappings are metadata-only
                if (rule.statusMapping === 'requires explicit business-rule approval') {
                    continue;
                }
                if (typeof rule.dbField === 'string') {
                    inverted[rule.dbField] = fKey;
                }
            }

            for (const [dKey, dVal] of Object.entries(row)) {
                const fKey = inverted[dKey];
                if (fKey) {
                    record[fKey] = dVal;
                }
            }

            // Special re-composition (e.g. month, year -> monthYear)
            if (moduleKey === 'payrollLedger' && row.year !== undefined && row.month !== undefined) {
                const mStr = String(row.month).padStart(2, '0');
                record.monthYear = `${row.year}-${mStr}`;
            }

            return record;
        },

        /**
         * Prepares a record for database insertion/update validation.
         */
        normalizeForDatabase: function (moduleKey, record) {
            return this.mapToDatabase(moduleKey, record);
        },

        /**
         * Normalizes a database row for consumption by existing frontend views.
         */
        normalizeFromDatabase: function (moduleKey, row) {
            return this.mapFromDatabase(moduleKey, row);
        },

        // Relational resolver interface placeholders
        resolvers: RelationalResolvers,

        // Expose error class for caller inspection
        DataProviderError: DataProviderError
    };

    // =========================================================================
    // 6. GLOBAL EXPOSURE
    // =========================================================================
    global.WasteTechDataProvider = WasteTechDataProvider;

})(typeof window !== 'undefined' ? window : this);
