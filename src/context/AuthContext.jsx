import React, { createContext, useContext, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (sessionUser) => {
        if (!sessionUser) return null;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', sessionUser.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                // Perfil no encontrado — se usa role por defecto
            }

            return {
                ...sessionUser,
                ...data,
                name: data?.full_name || sessionUser.email,
                role: data?.role || 'player'
            };
        } catch {
            return sessionUser;
        }
    };

    React.useEffect(() => {
        const getSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    const userWithProfile = await fetchProfile(session.user);
                    setUser(userWithProfile);
                }
            } catch {
                // Error silencioso — la app seguirá en estado no autenticado
            } finally {
                setLoading(false);
            }
        };

        getSession();

        // Timeout de seguridad: si Supabase tarda demasiado, desbloquea la app
        const timeout = setTimeout(() => {
            setLoading(prev => (prev ? false : prev));
        }, 5000);

        // Escuchar cambios de sesión (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const userWithProfile = await fetchProfile(session.user);
                setUser(userWithProfile);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    const login = async (email, password) => {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Tiempo de espera agotado. Verifica tu conexión.')), 30000)
        );

        const loginPromise = supabase.auth.signInWithPassword({ email, password });
        const { data, error } = await Promise.race([loginPromise, timeoutPromise]);

        if (error) throw error;
        return data;
    };

    const register = async (name, email, password, sport, category = null) => {
        // 1. Create auth user — same 30s timeout as login
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Tiempo de espera agotado. Verifica tu conexión.')), 30000)
        );

        const signUpPromise = supabase.auth.signUp({ email, password });
        const { data, error } = await Promise.race([signUpPromise, timeoutPromise]);
        if (error) throw error;

        const userId = data.user?.id;
        if (!userId) throw new Error('No se pudo crear el usuario.');

        // Supabase puede requerir confirmación de email:
        // si data.session es null, el usuario existe pero necesita confirmar.
        if (!data.session) {
            // Aun así intentamos crear el perfil y el equipo (puede que falle por RLS)
            // pero no bloqueamos al usuario — el registro se considera exitoso.
        }

        // 2. Create profile (no-fatal: si falla por RLS o confirmación pendiente, no rompe)
        try {
            await supabase
                .from('profiles')
                .upsert({ id: userId, full_name: name, role: 'player' }, { onConflict: 'id' });
        } catch (e) {
            console.warn('[Register] Profile insert failed (non-fatal):', e.message);
        }

        // 3. Create team linked to this user (no-fatal)
        try {
            await supabase
                .from('teams')
                .insert({
                    name,
                    sport,
                    category: sport === 'tennis' ? category : null,
                    group_name: null,
                    points: 0,
                    matches_played: 0,
                    user_id: userId
                });
        } catch (e) {
            console.warn('[Register] Team insert failed (non-fatal):', e.message);
        }

        // Si requiere confirmación de email, avisamos con un error especial
        if (!data.session) {
            const confirmError = new Error('CONFIRM_EMAIL');
            confirmError.needsConfirmation = true;
            throw confirmError;
        }

        return data;
    };

    const logout = () => {
        // Limpiar estado local inmediatamente (sin esperar a Supabase)
        setUser(null);
        // Limpiar tokens de localStorage
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-')) localStorage.removeItem(key);
            });
        } catch (_) {}
        // Fire-and-forget — no bloqueamos la UI esperando la red
        supabase.auth.signOut().catch(e => console.warn('[Logout] network:', e.message));
    };

    const value = {
        user,
        login,
        register,
        logout,
        loading,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
