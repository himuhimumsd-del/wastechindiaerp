/**
 * EcoManage ERP — Supabase Client Foundation (Wave 9.1)
 *
 * Controlled initialization module for the official Supabase JavaScript client.
 *
 * STRICT SAFETY RULES:
 * 1. Read-only initialization only.
 * 2. Only public anonymous access is permitted; never use administrative credentials.
 * 3. Never performs database reads, writes, auth operations, or storage uploads.
 * 4. Never alters existing in-memory application state or UI behavior.
 * 5. Fails clearly with actionable console diagnostic when unconfigured.
 */

(function (global) {
    'use strict';

    // =========================================================================
    // 1. ISOLATED CREDENTIAL CONFIGURATION
    // =========================================================================
    // Replace these placeholder values with your verified Supabase Project URL
    // and Public Anon Key when connecting to a live Supabase environment.
    const SUPABASE_CONFIG = {
        url: 'https://hwhqcayutqtuevwanbnq.supabase.co',
        anonKey: 'sb_publishable_d1yVc95G6wJbUkXcgpARlw_rOt5gpZA'
    };

    // =========================================================================
    // 2. CLIENT INSTANTIATION & VALIDATION
    // =========================================================================
    let clientInstance = null;
    let isInitialized = false;

    function isValidUrl(urlString) {
        try {
            const parsed = new URL(urlString);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }

    function isConfigured(config) {
        if (!config || !config.url || !config.anonKey) return false;
        if (config.url.includes('placeholder.supabase.co') || config.anonKey.includes('placeholder-anon-key')) return false;
        if (!isValidUrl(config.url)) return false;
        return true;
    }

    // Check if the official Supabase JS SDK is loaded
    if (!global.supabase || typeof global.supabase.createClient !== 'function') {
        console.warn(
            '[Supabase Client Foundation] Official @supabase/supabase-js library is not loaded or unavailable on window.supabase. Client initialization deferred.'
        );
    } else if (isConfigured(SUPABASE_CONFIG)) {
        try {
            clientInstance = global.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true
                }
            });
            isInitialized = true;
            console.info('[Supabase Client Foundation] Client instance initialized successfully.');
        } catch (initErr) {
            console.error('[Supabase Client Foundation] Error during createClient instantiation:', initErr);
        }
    } else {
        console.warn(
            '[Supabase Client Foundation] Supabase credentials are not yet configured (using placeholders). ' +
            'Client instance is set to null. Live persistence is inactive.'
        );
    }

    // =========================================================================
    // 3. CONTROLLED GLOBAL EXPOSURE
    // =========================================================================
    // Expose client instance and status accessor for downstream integration modules
    global.supabaseClient = clientInstance;
    global.isSupabaseConfigured = function () {
        return isConfigured(SUPABASE_CONFIG);
    };
    global.getSupabaseClient = function () {
        return clientInstance;
    };

})(typeof window !== 'undefined' ? window : this);
