import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Bypass del Web Locks API de Supabase.
 *
 * Supabase JS SDK usa navigator.locks para coordinar múltiples pestañas.
 * Problema: si una pestaña tiene el lock (p.ej. refrescando el token),
 * TODAS las operaciones auth de otras pestañas quedan bloqueadas.
 *
 * Solución: deshabilitar completamente el lock. Seguro para esta app
 * porque la probabilidad de que dos pestañas modifiquen la sesión
 * simultáneamente es mínima, y en el peor caso ambas obtendrían
 * un token válido nuevo sin inconsistencias.
 */
// eslint-disable-next-line no-unused-vars
const noLock = (_name, _acquireTimeout, fn) => fn();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        lock: noLock,   // ← Evita bloqueos entre pestañas
    }
});
