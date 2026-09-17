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
    const [recoveryMode, setRecoveryMode] = useState(false);

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

        // ⚠️ El callback de onAuthStateChange DEBE ser síncrono y no llamar a otras
        // funciones de Supabase con await dentro (getSession/from...): supabase-js
        // retiene un lock interno durante el callback y se produce un deadlock
        // (el login se quedaba "Conectando..." aunque el servidor respondía en ~200 ms).
        // Solución oficial: fijar el usuario básico al instante y enriquecer el perfil
        // FUERA del callback con setTimeout(0).
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
            if (session?.user) {
                // Usuario inmediato con rol por defecto (evita pantalla en blanco)
                setUser(prev => (prev && prev.id === session.user.id) ? prev : {
                    ...session.user, name: session.user.email, role: 'player'
                });
                setLoading(false);
                setTimeout(async () => {
                    const withProfile = await fetchProfile(session.user);
                    if (withProfile) setUser(withProfile);
                }, 0);
            } else {
                setUser(null);
                setLoading(false);
            }
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

    const register = async (name, email, password, sport, category = null, inviteCode = '') => {
        // 1) Código de invitación del club (se valida aquí para dar un mensaje claro
        //    y lo vuelve a comprobar el trigger de BD por si alguien se salta la app)
        const { data: codeOk, error: codeErr } = await supabase.rpc('check_invite_code', { p_code: inviteCode.trim() });
        if (codeErr) throw codeErr;
        if (!codeOk) { const e = new Error('INVITE_CODE_INVALID'); e.code = 'INVITE_CODE_INVALID'; throw e; }

        // 2) Los datos se pasan como metadata para que el trigger de BD
        //    cree automáticamente el perfil y equipo (bypassa RLS)
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    sport,
                    category: sport === 'tennis' ? category : null,
                    invite_code: inviteCode.trim()
                }
            }
        });
        if (error) {
            if (/database error saving new user/i.test(error.message)) { const e = new Error('INVITE_CODE_INVALID'); e.code = 'INVITE_CODE_INVALID'; throw e; }
            throw error;
        }

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

    const logout = async () => {
        setUser(null);
        // Revocar la sesión en el servidor ANTES de borrar los tokens locales
        // (antes se borraban primero y el refresh token seguía siendo válido).
        try {
            await Promise.race([
                supabase.auth.signOut({ scope: 'global' }),
                new Promise(resolve => setTimeout(resolve, 4000)),
            ]);
        } catch (e) { console.warn('[Logout] network:', e.message); }
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-') || key === 'myTeamId') localStorage.removeItem(key);
            });
        } catch { /* storage no disponible (modo privado) */ }
    };

    // Recuperación de contraseña: al abrir el enlace del email, Supabase emite PASSWORD_RECOVERY
    // y mostramos la pantalla de nueva contraseña (antes el enlace no hacía nada).
    const updatePassword = async (newPassword) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setRecoveryMode(false);
    };

    const value = {
        user,
        login,
        register,
        logout,
        resetPassword,
        updatePassword,
        recoveryMode,
        loading,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
