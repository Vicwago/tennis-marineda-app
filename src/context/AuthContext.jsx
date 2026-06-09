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
        const checkSession = async () => {
            try {
                // Máximo 3s para comprobar sesión — si Supabase está dormido
                // mostramos el login inmediatamente; onAuthStateChange
                // gestionará el auto-login cuando despierte
                const result = await Promise.race([
                    (async () => {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session?.user) return null;
                        return await fetchProfile(session.user);
                    })(),
                    new Promise(resolve => setTimeout(() => resolve(null), 3000))
                ]);
                if (result) setUser(result);
            } catch {
                // Silent
            } finally {
                setLoading(false);
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const userWithProfile = await fetchProfile(session.user);
                setUser(userWithProfile);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email, password) => {
        // Tope de 20s: si Supabase está dormido (free tier) y no responde,
        // fallamos con un error claro en vez de dejar el botón girando para siempre.
        const signIn = supabase.auth.signInWithPassword({ email, password });
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('LOGIN_TIMEOUT')), 20000)
        );
        const { data, error } = await Promise.race([signIn, timeout]);
        if (error) throw error;
        return data;
    };

    const resetPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: window.location.origin + '/'
        });
        if (error) throw error;
    };

    const register = async (name, email, password, sport, category = null) => {
        // Los datos se pasan como metadata para que el trigger de BD
        // cree automáticamente el perfil y equipo (bypassa RLS)
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    sport,
                    category: sport === 'tennis' ? category : null
                }
            }
        });
        if (error) throw error;

        const userId = data.user?.id;
        if (!userId) throw new Error('No se pudo crear el usuario.');

        // El trigger handle_new_user() ya creó perfil + equipo en la BD

        // Si el email está auto-confirmado → cuenta lista, ir a login
        if (data.user?.email_confirmed_at) {
            return data;
        }

        // Si no hay sesión y el email NO está confirmado → requiere confirmación
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
        resetPassword,
        loading,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
