import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useGame } from './GameContext';
import { useAuth } from './AuthContext';
import { supabase } from '../supabaseClient';

const DataContext = createContext();

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

export const generateSlots = (sport, category) => {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    let hours = [];

    if (sport === 'padel') {
        hours = ['09:00', '10:00', '12:00', '16:00', '18:00', '19:00', '21:00'];
    } else if (sport === 'tennis') {
        if (category === 'adults') {
            hours = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
        } else {
            hours = ['16:00', '17:00', '18:00', '19:00', '20:00'];
        }
    }

    let slots = [];
    days.forEach(day => {
        hours.forEach(hour => {
            const id = `${day.substring(0, 3).toLowerCase()}_${hour}`;
            slots.push({ id, day, hour, label: `${day} ${hour}` });
        });
    });
    return slots;
};

// ─── Parseo de slot_id ("sáb_09:00") → {id, day, hour} ──────────────────────
// Permite que los horarios que el admin crea como pista en la BD (cualquier día/hora)
// aparezcan en todas las rejillas, no solo las horas base hardcodeadas.
const ABBR_TO_DAY = { lun: 'Lunes', mar: 'Martes', 'mié': 'Miércoles', jue: 'Jueves', vie: 'Viernes', 'sáb': 'Sábado', dom: 'Domingo' };
const DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const parseSlotId = (id) => {
    if (!id || typeof id !== 'string') return null;
    const idx = id.indexOf('_');
    if (idx < 0) return null;
    const day = ABBR_TO_DAY[id.slice(0, idx)];
    const hour = id.slice(idx + 1);
    if (!day || !/^\d{2}:\d{2}$/.test(hour)) return null;
    return { id, day, hour, label: `${day} ${hour}` };
};

// ─── Fecha real del próximo <día> a las <hora> ─────────────────────────────
// Convierte un slot ("lun_10:00") en la próxima fecha real. Se guarda en matches.date
// para que los jugadores vean el día concreto (no solo "Lunes").
const DAY_INDEX = { lun: 1, mar: 2, 'mié': 3, jue: 4, vie: 5, 'sáb': 6, dom: 0 };
export const nextDateForSlot = (slotId, from = new Date()) => {
    const [d, h] = (slotId || '').split('_');
    if (!(d in DAY_INDEX) || !h) return null;
    const [hh, mm] = h.split(':').map(Number);
    const date = new Date(from);
    const diff = (DAY_INDEX[d] - date.getDay() + 7) % 7;
    date.setDate(date.getDate() + diff);
    date.setHours(hh, mm || 0, 0, 0);
    if (date <= from) date.setDate(date.getDate() + 7);
    return date;
};
export const formatMatchDate = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d)) return null;
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
};

// ─── Puntuación por deporte ────────────────────────────────────────────────
// Todas las categorías: victoria=4 · derrota=1 (+1 extra si ganó algún set → 2 total) · WO ganado=4
// Pádel extra: WO perdido con aviso >48h=0 · sin aviso=-1
// Tenis/resto:  WO perdido=0 siempre
const computePoints = (matchesData, teamId, sportName) => {
    const played = matchesData.filter(m => m.completed && (m.team1_id === teamId || m.team2_id === teamId));
    return played.reduce((acc, m) => {
        const isWin = m.winner_id === teamId;
        const isWO  = m.score === 'W.O.';
        if (isWin)  return acc + 4;                                                    // victoria: +4
        if (isWO)   return acc + (sportName === 'padel' && !m.wo_notified ? -1 : 0);  // WO perdido: 0 o -1
        return acc + 1 + (m.loser_won_set ? 1 : 0);                                   // derrota: 1 base + 1 si ganó set
    }, 0);
};

export const DataProvider = ({ children }) => {
    const { sport, tennisCategory } = useGame();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [teams, setTeams] = useState([]);
    const [matches, setMatches] = useState([]);
    const [courts, setCourts] = useState({});
    // Metadatos por pista: { [slot_id]: { expires_at } } — expires_at ≠ null = "horario especial
    // solo esta semana" (caduca solo el lunes siguiente).
    const [courtsMeta, setCourtsMeta] = useState({});
    // Referencia siempre actualizada a matches: evita closures obsoletos cuando el admin
    // registra varios resultados seguidos (el segundo pisaba al primero hasta recargar).
    const matchesRef = useRef([]);
    useEffect(() => { matchesRef.current = matches; }, [matches]);
    const [appSettings, setAppSettings] = useState({
        availability_locked: false, availability_deadline_label: '',
        fixed_hours: [],        // horas añadidas por el admin para TODOS los días (además de las base)
        preferred_slots: [],    // horarios "preferentes": el generador los intenta primero
        last_first_group: '',   // grupo que fue primero en la última jornada PUBLICADA (rotación)
        draft_first_group: ''   // grupo que va primero en el borrador actual (se consolida al publicar)
    });

    // ⚡ Declarado ANTES de los useCallback que lo usan como dependencia
    // Universo de horarios = horas base del deporte ∪ horas fijas del admin (todos los días)
    // ∪ cualquier horario que exista como pista en la BD (especiales de esta semana, etc.).
    const currentSlots = useMemo(() => {
        const base = generateSlots(sport, tennisCategory);
        const seen = new Set(base.map(s => s.id));
        const fixed = [];
        (appSettings.fixed_hours || []).forEach(hour => {
            DAY_ORDER.forEach(day => {
                const id = `${day.substring(0, 3).toLowerCase()}_${hour}`;
                if (!seen.has(id)) { seen.add(id); fixed.push({ id, day, hour, label: `${day} ${hour}` }); }
            });
        });
        const extra = Object.keys(courts).map(parseSlotId).filter(Boolean).filter(s => !seen.has(s.id));
        extra.forEach(s => seen.add(s.id));
        // Un horario con partido pendiente nunca desaparece de la rejilla, aunque su pista
        // especial haya caducado o el admin la haya quitado: el partido sigue mostrando día/hora.
        const inUse = matches.filter(m => !m.completed).map(m => parseSlotId(m.slot || m.slot_id)).filter(Boolean).filter(s => !seen.has(s.id));
        return [...base, ...fixed, ...extra, ...inUse].sort((a, b) =>
            (DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)) || a.hour.localeCompare(b.hour)
        );
    }, [sport, tennisCategory, courts, appSettings.fixed_hours, matches]);

    // Etiqueta legible de cualquier slot ("sáb_09:00" → "Sábado a las 09:00"), también de los
    // horarios especiales que no están en las horas base.
    const slotTimeLabel = (slotId) => {
        const s = parseSlotId(slotId);
        return s ? `${s.day} a las ${s.hour}` : 'fecha por confirmar';
    };

    // Caducidad de un horario especial: la madrugada siguiente a la PRÓXIMA vez que caiga ese
    // día/hora (así vale para una jornada generada a mitad de semana: el partido del lunes
    // que viene sigue teniendo su pista hasta que se juega).
    const specialSlotExpiry = (slotId) => {
        const d = nextDateForSlot(slotId) || new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    // Horarios que un jugador puede MARCAR como disponible = solo donde hay pista (>0).
    // Si el admin aún no ha configurado ninguna pista, se ofrecen todos (para poder empezar).
    const availabilitySlots = useMemo(() => {
        const withCourts = currentSlots.filter(s => (courts[s.id] || 0) > 0);
        return withCourts.length > 0 ? withCourts : currentSlots;
    }, [currentSlots, courts]);

    // El bloqueo y el plazo de disponibilidad son POR deporte/categoría, no globales.
    // Traducimos la clave lógica a una clave física con sufijo de ámbito.
    const scopedSettingKey = useCallback((logicalKey) => {
        const suffix = sport === 'tennis' ? `tennis_${tennisCategory}` : (sport || 'padel');
        return `${logicalKey}__${suffix}`;
    }, [sport, tennisCategory]);

    useEffect(() => {
        if (!sport) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // Construir las queries (sin join embebido en teams para evitar problemas PostgREST)
                let teamsQuery = supabase
                    .from('teams')
                    .select('*')
                    .eq('sport', sport);

                let matchesQuery = supabase
                    .from('matches')
                    .select(`*, t1:team1_id (id, name, user_id), t2:team2_id (id, name, user_id)`)
                    .eq('sport', sport);

                let courtsQuery = supabase
                    .from('court_availability')
                    .select('*')
                    .eq('sport', sport)
                    // Los horarios especiales de una semana caducan solos: no se cargan los vencidos
                    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

                if (sport === 'tennis') {
                    teamsQuery   = teamsQuery.eq('category', tennisCategory);
                    matchesQuery = matchesQuery.eq('category', tennisCategory);
                    courtsQuery  = courtsQuery.eq('category', tennisCategory);
                }

                // ⚡ Ejecutar queries EN PARALELO
                const [teamsResult, matchesResult, courtsResult] = await Promise.all([
                    teamsQuery,
                    matchesQuery,
                    courtsQuery,
                ]);

                if (teamsResult.error)   throw teamsResult.error;
                if (matchesResult.error) throw matchesResult.error;
                if (courtsResult.error)  throw courtsResult.error;

                // Cargar availability por separado (evita posible ambigüedad PostgREST)
                const teamIds = teamsResult.data.map(t => t.id);
                let availabilityMap = {};
                if (teamIds.length > 0) {
                    const { data: availData } = await supabase
                        .from('availability')
                        .select('team_id, day, hour')
                        .in('team_id', teamIds);
                    if (availData) {
                        availData.forEach(a => {
                            if (!availabilityMap[a.team_id]) availabilityMap[a.team_id] = [];
                            availabilityMap[a.team_id].push(a);
                        });
                    }
                }

                // Calcular puntos dinámicamente desde partidos completados (sport-aware)
                const matchesData = matchesResult.data;
                setTeams(teamsResult.data.map(t => {
                    const played = matchesData.filter(m => m.completed && (m.team1_id === t.id || m.team2_id === t.id));
                    const teamAvail = availabilityMap[t.id] || [];
                    return {
                        ...t,
                        group: t.group_name,
                        matchesPlayed: played.length,
                        points: computePoints(matchesData, t.id, sport),
                        week_off: t.week_off || false,
                        availability: teamAvail.map(a => `${a.day.substring(0, 3).toLowerCase()}_${a.hour}`)
                    };
                }));

                setMatches(matchesResult.data.map(m => ({
                    ...m,
                    slot: m.slot_id,
                    t1: m.t1,
                    t2: m.t2
                })));

                const courtsMap = {};
                const metaMap = {};
                courtsResult.data.forEach(c => {
                    courtsMap[c.slot_id] = c.available_count;
                    metaMap[c.slot_id] = { expires_at: c.expires_at || null };
                });
                setCourts(courtsMap);
                setCourtsMeta(metaMap);

                // Cargar app_settings (claves por ámbito deporte/categoría)
                const { data: settingsData } = await supabase.from('app_settings').select('*');
                if (settingsData) {
                    const s = {};
                    settingsData.forEach(row => { s[row.key] = row.value; });
                    const suffix = sport === 'tennis' ? `tennis_${tennisCategory}` : (sport || 'padel');
                    const parseList = (raw) => { try { const v = JSON.parse(raw || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
                    setAppSettings({
                        availability_locked: s[`availability_locked__${suffix}`] === 'true',
                        availability_deadline_label: s[`availability_deadline_label__${suffix}`] || '',
                        fixed_hours: parseList(s[`fixed_hours__${suffix}`]),
                        preferred_slots: parseList(s[`preferred_slots__${suffix}`]),
                        last_first_group: s[`last_first_group__${suffix}`] || '',
                        draft_first_group: s[`draft_first_group__${suffix}`] || ''
                    });
                }

            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [sport, tennisCategory]);

    // --- Actions ---

    const updateTeamAvailability = useCallback(async (teamId, availabilitySlotIds) => {
        try {
            await supabase.from('availability').delete().eq('team_id', teamId);
            const slots = currentSlots.filter(s => availabilitySlotIds.includes(s.id));
            const inserts = slots.map(s => ({
                team_id: teamId,
                day: s.day,
                hour: s.hour
            }));
            if (inserts.length > 0) {
                await supabase.from('availability').insert(inserts);
            }
            setTeams(prev => prev.map(t => t.id === teamId ? { ...t, availability: availabilitySlotIds } : t));
        } catch (error) {
            console.error('Error updating availability:', error);
        }
    }, [currentSlots]);

    // Ref siempre actualizada de courtsMeta (para no perder/clavar caducidades al hacer upsert)
    const courtsMetaRef = useRef({});
    useEffect(() => { courtsMetaRef.current = courtsMeta; }, [courtsMeta]);

    const updateCourtCount = useCallback(async (slotId, count) => {
        try {
            // expires_at se envía SIEMPRE: si el slot es especial vigente se conserva; si es una
            // hora normal (o una especial ya caducada que el admin vuelve a usar) queda a null
            // (permanente). Antes, una fila caducada reaparecía a 0 tras recargar.
            const expires = courtsMetaRef.current[slotId]?.expires_at ?? null;
            const { error } = await supabase
                .from('court_availability')
                .upsert({
                    sport,
                    category: sport === 'tennis' ? tennisCategory : null,
                    slot_id: slotId,
                    available_count: count,
                    expires_at: expires
                }, { onConflict: 'sport, category, slot_id' });
            if (error) throw error;
            setCourts(prev => ({ ...prev, [slotId]: count }));
            setCourtsMeta(prev => ({ ...prev, [slotId]: { expires_at: expires } }));
        } catch (error) {
            console.error('Error updating court count:', error);
        }
    }, [sport, tennisCategory]);

    // ─── Recalcula points/matchesPlayed de TODOS los equipos desde la lista de
    //     partidos (única fuente de verdad). Evita divergencias entre BD y UI.
    const recomputeTeamsFromMatches = (matchesList) => {
        setTeams(prev => prev.map(t => {
            const played = matchesList.filter(m => m.completed && (m.team1_id === t.id || m.team2_id === t.id));
            return { ...t, matchesPlayed: played.length, points: computePoints(matchesList, t.id, sport) };
        }));
    };

    // loserWonSet: +1 pt al perdedor si ganó algún set (aplica a ambos deportes)
    const saveMatchResult = async (matchId, score, winnerIdRaw, loserWonSet = false) => {
        const winnerId = Number(winnerIdRaw); // el <select> devuelve texto: "12" !== 12 invertía ganador/perdedor
        try {
            const winnerPts = 4;
            const loserPts  = loserWonSet ? 2 : 1;

            // 1. Update Match (los puntos se DERIVAN de los partidos, no se escriben en teams)
            const { error: matchError } = await supabase
                .from('matches')
                // published: un resultado siempre se ve (aunque el partido fuese un borrador)
                .update({ completed: true, score, winner_id: winnerId, played: true, loser_won_set: loserWonSet, published: true })
                .eq('id', matchId)
                .select();

            if (matchError) throw matchError;

            const match = matchesRef.current.find(m => m.id === matchId);
            if (!match) return;

            const winner = match.t1.id === winnerId ? match.t1 : match.t2;
            const loser  = match.t1.id === winnerId ? match.t2 : match.t1;

            // 2. Update Local State + recálculo de puntos desde la fuente de verdad
            const updatedMatches = matchesRef.current.map(m => m.id === matchId
                ? { ...m, completed: true, score, winner_id: winnerId, loser_won_set: loserWonSet, published: true }
                : m);
            setMatches(updatedMatches);
            recomputeTeamsFromMatches(updatedMatches);

            // 3. Notificaciones
            try {
                const notifInserts = [];
                const resultBase = `${match.t1.name} vs ${match.t2.name} — ${score}`;
                const loserMsg = `📊 Partido terminado: ${resultBase}. +${loserPts} punto${loserPts !== 1 ? 's' : ''}.`;
                if (match.t1.user_id) notifInserts.push({ user_id: match.t1.user_id, match_id: matchId, type: 'result_saved', message: match.t1.id === winner.id ? `🏆 ¡Ganado! ${resultBase}. +${winnerPts} puntos.` : loserMsg });
                if (match.t2.user_id) notifInserts.push({ user_id: match.t2.user_id, match_id: matchId, type: 'result_saved', message: match.t2.id === winner.id ? `🏆 ¡Ganado! ${resultBase}. +${winnerPts} puntos.` : loserMsg });
                if (notifInserts.length > 0) await supabase.from('notifications').insert(notifInserts);
            } catch (notifErr) {
                console.warn('No se pudieron enviar notificaciones de resultado:', notifErr);
            }

        } catch (error) {
            console.error('Error saving result:', error);
            alert('Error al guardar resultado: ' + error.message);
        }
    };

    const postponeMatch = async (matchId) => {
        try {
            const { error } = await supabase
                .from('matches')
                .update({ postponed: true })
                .eq('id', matchId);

            if (error) throw error;

            setMatches(prev => prev.map(m => m.id === matchId ? { ...m, postponed: true } : m));
        } catch (error) {
            console.error('Error postponing match:', error);
            alert('Error al aplazar partido: ' + error.message);
        }
    };

    // notified: el ausente avisó con >48h → pádel: 0 pts / sin aviso → pádel: -1 pt · tenis: siempre 0
    const registerWalkover = async (matchId, winnerIdRaw, notified = false) => {
        const winnerId = Number(winnerIdRaw);
        try {
            const winnerPts = 4;
            const loserPts  = sport === 'padel' ? (notified ? 0 : -1) : 0;

            // 1. Update Match
            const { error: matchError } = await supabase
                .from('matches')
                .update({ completed: true, score: 'W.O.', winner_id: winnerId, played: true, wo_notified: notified, published: true })
                .eq('id', matchId)
                .select();

            if (matchError) throw matchError;

            const match = matchesRef.current.find(m => m.id === matchId);
            if (!match) return;

            const winner = match.t1.id === winnerId ? match.t1 : match.t2;
            const loser  = match.t1.id === winner.id ? match.t2 : match.t1;

            // 2. Update Local State + recálculo de puntos desde la fuente de verdad
            const updatedMatches = matchesRef.current.map(m => m.id === matchId
                ? { ...m, completed: true, score: 'W.O.', winner_id: winnerId, played: true, wo_notified: notified, published: true }
                : m);
            setMatches(updatedMatches);
            recomputeTeamsFromMatches(updatedMatches);

            // 3. Notificaciones
            try {
                const notifInserts = [];
                const loserPtsMsg = loserPts < 0 ? `${loserPts} punto` : loserPts === 0 ? '+0 puntos' : `+${loserPts} puntos`;
                if (winner.user_id) notifInserts.push({ user_id: winner.user_id, match_id: matchId, type: 'result_saved', message: `🏆 Victoria por W.O.: ${winner.name} vs ${loser.name}. +${winnerPts} puntos.` });
                if (loser.user_id)  notifInserts.push({ user_id: loser.user_id,  match_id: matchId, type: 'result_saved', message: `📋 W.O. registrado: ${loser.name} no se presentó vs ${winner.name}. ${loserPtsMsg}.` });
                if (notifInserts.length > 0) await supabase.from('notifications').insert(notifInserts);
            } catch (notifErr) {
                console.warn('No se pudieron enviar notificaciones de W.O.:', notifErr);
            }

        } catch (error) {
            console.error('Error registering WO:', error);
            alert('Error al registrar W.O.: ' + error.message);
        }
    };

    // ─── CRUD individual de partidos (panel admin) ───────────────────────
    // Crea un partido manual entre dos equipos en un slot concreto
    const createMatch = async ({ team1_id, team2_id, slot_id }) => {
        try {
            const insertRow = {
                team1_id,
                team2_id,
                sport,
                category: sport === 'tennis' ? tennisCategory : null,
                slot_id,
                played: false,
                postponed: false
            };
            const { data, error } = await supabase
                .from('matches')
                .insert(insertRow)
                .select(`*, t1:team1_id (id, name, user_id), t2:team2_id (id, name, user_id)`)
                .single();
            if (error) throw error;

            const processed = { ...data, slot: data.slot_id, t1: data.t1, t2: data.t2 };
            setMatches(prev => [...prev, processed]);

            // El partido nace como BORRADOR (published=false): los jugadores no lo ven ni
            // reciben aviso hasta que el admin pulsa "Publicar jornada" (publishSchedule).
            return processed;
        } catch (error) {
            console.error('Error creating match:', error);
            throw error;
        }
    };

    // Actualiza campos de un partido (slot, team1, team2). Notifica a los implicados si cambia el horario.
    const updateMatch = async (matchId, updates) => {
        try {
            const dbUpdates = {};
            if (updates.slot_id !== undefined) {
                dbUpdates.slot_id = updates.slot_id;
                // Reprogramar: nueva fecha real y se quita el estado APLAZADO
                dbUpdates.date = nextDateForSlot(updates.slot_id)?.toISOString() ?? null;
                dbUpdates.postponed = false;
            }
            if (updates.team1_id !== undefined) dbUpdates.team1_id = updates.team1_id;
            if (updates.team2_id !== undefined) dbUpdates.team2_id = updates.team2_id;

            const { data, error } = await supabase
                .from('matches')
                .update(dbUpdates)
                .eq('id', matchId)
                .select(`*, t1:team1_id (id, name, user_id), t2:team2_id (id, name, user_id)`)
                .single();
            if (error) throw error;

            const processed = { ...data, slot: data.slot_id, t1: data.t1, t2: data.t2 };
            setMatches(prev => prev.map(m => m.id === matchId ? processed : m));

            // Notificación de cambio — solo si el partido ya está publicado (un borrador se
            // retoca en silencio; el aviso saldrá al publicar).
            if (processed.published) try {
                const timeStr = slotTimeLabel(processed.slot_id);
                const notifInserts = [];
                if (processed.t1?.user_id) {
                    notifInserts.push({
                        user_id: processed.t1.user_id,
                        match_id: processed.id,
                        type: 'match_updated',
                        message: `✏️ Partido actualizado: ${processed.t1.name} vs ${processed.t2.name} — ${timeStr}.`
                    });
                }
                if (processed.t2?.user_id) {
                    notifInserts.push({
                        user_id: processed.t2.user_id,
                        match_id: processed.id,
                        type: 'match_updated',
                        message: `✏️ Partido actualizado: ${processed.t2.name} vs ${processed.t1.name} — ${timeStr}.`
                    });
                }
                if (notifInserts.length > 0) await supabase.from('notifications').insert(notifInserts);
            } catch (notifErr) {
                console.warn('No se pudo notificar actualización de partido:', notifErr);
            }

            return processed;
        } catch (error) {
            console.error('Error updating match:', error);
            throw error;
        }
    };

    // Elimina un partido y notifica a los equipos afectados
    const deleteMatch = async (matchId) => {
        try {
            const match = matches.find(m => m.id === matchId);

            // Borrar notificaciones ligadas (FK) para evitar problemas
            try {
                await supabase.from('notifications').delete().eq('match_id', matchId);
            } catch (_) { /* no-op */ }

            const { error } = await supabase.from('matches').delete().eq('id', matchId);
            if (error) throw error;

            setMatches(prev => prev.filter(m => m.id !== matchId));

            // Notificar a los equipos afectados (solo si ya estaba publicado: un borrador
            // que se elimina nunca llegó a verse)
            if (match && match.published) {
                try {
                    const notifInserts = [];
                    if (match.t1?.user_id) {
                        notifInserts.push({
                            user_id: match.t1.user_id,
                            type: 'match_cancelled',
                            message: `❌ Partido cancelado: ${match.t1.name} vs ${match.t2.name}.`
                        });
                    }
                    if (match.t2?.user_id) {
                        notifInserts.push({
                            user_id: match.t2.user_id,
                            type: 'match_cancelled',
                            message: `❌ Partido cancelado: ${match.t2.name} vs ${match.t1.name}.`
                        });
                    }
                    if (notifInserts.length > 0) await supabase.from('notifications').insert(notifInserts);
                } catch (notifErr) {
                    console.warn('No se pudo notificar cancelación:', notifErr);
                }
            }
        } catch (error) {
            console.error('Error deleting match:', error);
            throw error;
        }
    };

    const createSchedule = async (newMatches) => {
        try {
            const dbMatches = newMatches.map(m => ({
                team1_id: m.t1.id,
                team2_id: m.t2.id,
                sport,
                category: sport === 'tennis' ? tennisCategory : null,
                slot_id: m.slot,
                court: m.court != null ? String(m.court) : null,          // nº de pista asignado por el generador
                date: m.date ?? nextDateForSlot(m.slot)?.toISOString() ?? null, // fecha real del partido
                played: false,
                postponed: false
            }));
            const { data, error } = await supabase.from('matches').insert(dbMatches).select();
            if (error) throw error;
            const processedNewMatches = data.map((m, i) => ({
                ...m,
                slot: m.slot_id,
                t1: newMatches[i].t1,
                t2: newMatches[i].t2
            }));
            setMatches(prev => [...prev, ...processedNewMatches]);

            // La jornada nace en BORRADOR: sin avisos. Los jugadores la ven (y reciben la
            // notificación) cuando el admin pulsa "Publicar jornada" → publishSchedule().

        } catch (error) {
            console.error('Error creating schedule:', error);
            throw error; // que la UI lo muestre en vez de decir "Jornada generada" con la BD vacía
        }
    };

    // ─── Publicar la jornada: los borradores pasan a visibles y se avisa a los jugadores ───
    // Devuelve el nº de partidos publicados. Es idempotente (solo toca published=false).
    const publishSchedule = async () => {
        // Autoritativo en servidor: se publica lo que la BD tiene como borrador en este ámbito
        // (no lo que el estado local cree), y se avisa solo de lo que realmente cambió.
        let q = supabase.from('matches').update({ published: true })
            .eq('sport', sport).eq('published', false).eq('completed', false);
        q = sport === 'tennis' ? q.eq('category', tennisCategory) : q.is('category', null);
        const { data: published, error } = await q.select('id, slot_id, team1_id, team2_id');
        if (error) throw error;
        if (!published || published.length === 0) {
            setMatches(prev => prev.map(m => (!m.completed && !m.published) ? { ...m, published: true } : m));
            return 0;
        }
        const ids = published.map(m => m.id);
        const localById = Object.fromEntries(matchesRef.current.map(m => [m.id, m]));
        const drafts = published.map(m => ({ ...(localById[m.id] || {}), ...m, slot: m.slot_id }));
        setMatches(prev => prev.map(m => ids.includes(m.id) ? { ...m, published: true } : m));

        // Avisos a jugadores con cuenta vinculada (uno por jugador y partido). Las cuentas se
        // consultan AHORA en la BD: quien se registró después de que el admin abriera la app
        // también debe recibir su aviso (el estado local tendría su user_id a null).
        try {
            const teamIds = [...new Set(drafts.flatMap(m => [m.team1_id ?? m.t1?.id, m.team2_id ?? m.t2?.id]).filter(Boolean))];
            const { data: fresh } = await supabase.from('teams').select('id, name, user_id').in('id', teamIds);
            const byId = Object.fromEntries((fresh || []).map(t => [t.id, t]));
            const notifInserts = [];
            for (const m of drafts) {
                const t1 = byId[m.team1_id ?? m.t1?.id] || m.t1;
                const t2 = byId[m.team2_id ?? m.t2?.id] || m.t2;
                const timeStr = slotTimeLabel(m.slot || m.slot_id);
                if (t1?.user_id) notifInserts.push({ user_id: t1.user_id, match_id: m.id, type: 'match_assigned', message: `🗓️ Nuevo partido: ${t1.name} vs ${t2?.name} — ${timeStr}.` });
                if (t2?.user_id) notifInserts.push({ user_id: t2.user_id, match_id: m.id, type: 'match_assigned', message: `🗓️ Nuevo partido: ${t2.name} vs ${t1?.name} — ${timeStr}.` });
            }
            if (notifInserts.length > 0) await supabase.from('notifications').insert(notifInserts);
            // Refrescar user_id en el estado local para el resto de la sesión
            setTeams(prev => prev.map(t => byId[t.id] ? { ...t, user_id: byId[t.id].user_id } : t));
        } catch (notifErr) {
            console.warn('No se pudieron enviar notificaciones de jornada:', notifErr);
        }
        // La rotación de grupos avanza al PUBLICAR (no al generar): rehacer un borrador no
        // le quita el turno a nadie.
        if (appSettings.draft_first_group) {
            try {
                await updateAppSettings('last_first_group', appSettings.draft_first_group);
                await updateAppSettings('draft_first_group', '');
            } catch { /* no bloquea la publicación */ }
        }
        return ids.length;
    };

    // ─── Descartar TODOS los borradores del ámbito (para rehacer la jornada) ───
    // Nadie los ha visto ni ha recibido aviso, así que no se notifica nada.
    const discardDrafts = async () => {
        const drafts = matchesRef.current.filter(m => !m.published && !m.completed);
        if (drafts.length === 0) return 0;
        const ids = drafts.map(m => m.id);
        try { await supabase.from('notifications').delete().in('match_id', ids); } catch { /* no debería haber */ }
        const { error } = await supabase.from('matches').delete().in('id', ids);
        if (error) throw error;
        setMatches(prev => prev.filter(m => !ids.includes(m.id)));
        return ids.length;
    };

    // --- Helper Functions for Random Data ---
    const shuffleArray = (array) => {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    };

    const getRandomSlots = (sport, category, count) => {
        const allSlots = generateSlots(sport, category);
        const shuffled = shuffleArray(allSlots);
        return shuffled.slice(0, count);
    };

    const generateDemoData = async () => {
        if (!confirm('ATENCIÓN: Se ocultarán los datos antiguos y se generarán nuevos. ¿Continuar?')) return;

        alert('PASO 1: Preparando "Borrón y Cuenta Nueva"...');
        try {
            setLoading(true);
            if (!user) {
                alert('ERROR: No hay sesión activa. Recarga la página.');
                return;
            }

            alert(`PASO 2: Generando jugadores...`);

            // --- EXPANDED DATA POOLS ---
            const tennisNames = [
                "Djokovic", "Nadal", "Federer", "Alcaraz", "Sinner", "Medvedev", "Zverev", "Rublev", "Tsitsipas", "Ruud",
                "Dimitrov", "Hurkacz", "Fritz", "Shelton", "Rune", "Paul", "Tiafoe", "Khachanov", "Bublik", "Baez",
                "Mannarino", "Griekspoor", "Korda", "Etcheverry", "Cerundolo", "Jarry", "Musetti", "Auger-Aliassime", "Norrie", "Evans",
                "Swiatek", "Sabalenka", "Gauff", "Rybakina", "Pegula", "Jabeur", "Zheng", "Vondrousova", "Sakkari", "Muchova",
                "Ostapenko", "Krejcikova", "Kasatkina", "Samsonova", "Kudermetova", "Keys", "Kvitova", "Bencic", "Azarenka", "Haddad Maia",
                "Garcia", "Alexandrova", "Vekic", "Cirstea", "Potapova", "Kalinina", "Mertens", "Paolini", "Zhu", "Wang",
                "Murray", "Wawrinka", "Ferrer", "Berdych", "Tsonga", "Nishikori", "Raonic", "Cilic", "Thiem", "Monfils",
                "Agassi", "Sampras", "McEnroe", "Borg", "Lendl", "Connors", "Wilander", "Edberg", "Becker", "Courier",
                "Graf", "Navratilova", "Evert", "Seles", "Hingis", "Davenport", "Capriati", "Henin", "Clijsters", "Mauresmo",
                "Sharapova", "Williams", "Halep", "Muguruza", "Badosa", "Pliskova", "Kerber", "Osaka", "Andreescu", "Kenin",
                "Stephens", "Svitolina", "Wozniacki", "Konta", "Barty", "Pierce", "Sabatini", "Sanchez Vicario", "Martinez"
            ];

            const padelNames = [
                "Galán", "Lebrón", "Coello", "Tapia", "Di Nenno", "Stupaczuk", "Chingotto", "Navarro", "Tello", "Ruiz",
                "González", "Garrido", "Yanguas", "Nieto", "Sanz", "Campagnolo", "Belasteguín", "Lima", "Sanyo", "Moyano",
                "Gil", "Rico", "Augsburger", "Libaak", "Lamperti", "Díaz", "Silingo", "Belluati", "Leal", "Zapata",
                "Sans", "García", "Barahona", "Esbri", "Alonso", "Arroyo", "Capra", "Sánchez", "Semmler", "Lijó",
                "Rubio", "Benítez", "Del Castillo", "Vilariño", "Muñoz", "Ramírez", "Méndez", "Oria", "Guerrero", "Ayats",
                "Perino", "Bergamini", "Ruiz", "Osoro", "Iglesias", "Triay", "Salazar", "Sánchez", "Josemaría", "Ortega",
                "González", "Brea", "Araújo", "Riera", "Icardo", "Castelló", "Jensen", "Virseda", "Sainz", "Llaguno",
                "Marrero", "Amatriaín", "Reiter", "Nogueira", "Talaván", "Rufo", "Goenaga", "Caldera", "Saiz", "Martínez",
                "Mesa", "Guinart", "Rodríguez", "Barrera", "Caparrós", "Fassio", "Borrero", "Sharifova", "Orsi", "Lobo",
                "Bellver", "Soriano", "Martínez", "Fernández", "Collombon", "Godallier", "Piltcher", "Sussarello", "Stellato",
                "Cepero", "Mieres", "Jardim", "Lahoz", "Reca", "Nerone", "Gutiérrez", "Poggi", "Grabiel", "Santana",
                "Botello", "Ruiz", "Moreno", "Rubio", "Gutiérrez", "Marina", "Ramos", "Restivo", "Britos", "Rivera"
            ];

            const demoTeams = [];

            // 1. Tennis Adults: 32 players (4 groups x 8)
            const shuffledTennis = shuffleArray(tennisNames);
            let tennisIndex = 0;
            const adultGroups = ['Grupo 1', 'Grupo 2', 'Grupo 3', 'Grupo 4'];

            adultGroups.forEach(group => {
                for (let i = 0; i < 8; i++) {
                    if (tennisIndex < shuffledTennis.length) {
                        demoTeams.push({
                            name: shuffledTennis[tennisIndex++],
                            sport: 'tennis',
                            category: 'adults',
                            points: 0,
                            matches_played: 0,
                            group_name: group
                        });
                    }
                }
            });

            // 2. Tennis Juveniles: 24 players (4 groups x 6)
            const juvGroups = ['Grupo 1', 'Grupo 2', 'Grupo 3', 'Grupo 4'];

            juvGroups.forEach(group => {
                for (let i = 0; i < 6; i++) {
                    if (tennisIndex < shuffledTennis.length) {
                        demoTeams.push({
                            name: shuffledTennis[tennisIndex++],
                            sport: 'tennis',
                            category: 'juveniles',
                            points: 0,
                            matches_played: 0,
                            group_name: group
                        });
                    }
                }
            });

            // 3. Padel: 50 pairs (5 groups x 10)
            const shuffledPadel = shuffleArray(padelNames);
            let padelIndex = 0;
            const padelGroups = ['Grupo 1', 'Grupo 2', 'Grupo 3', 'Grupo 4', 'Grupo 5'];

            padelGroups.forEach(group => {
                for (let i = 0; i < 10; i++) {
                    let p1 = "Jugador1";
                    let p2 = "Jugador2";

                    if (padelIndex < shuffledPadel.length) p1 = shuffledPadel[padelIndex++];
                    else p1 = `Pro${padelIndex++}`;

                    if (padelIndex < shuffledPadel.length) p2 = shuffledPadel[padelIndex++];
                    else p2 = `Pro${padelIndex++}`;

                    demoTeams.push({
                        name: `${p1} / ${p2}`,
                        sport: 'padel',
                        points: 0,
                        matches_played: 0,
                        group_name: group
                    });
                }
            });

            // --- BATCH INSERTS & CAPTURE IDs ---
            const chunkSize = 50;
            let allInsertedTeams = [];

            for (let i = 0; i < demoTeams.length; i += chunkSize) {
                const chunk = demoTeams.slice(i, i + chunkSize);
                const { data, error } = await supabase.from('teams').insert(chunk).select();
                if (error) throw error;
                allInsertedTeams = [...allInsertedTeams, ...data];
            }

            // --- GENERATE AVAILABILITY USING REAL IDs ---
            const availabilityInserts = [];

            allInsertedTeams.forEach(team => {
                // Get VALID slots for this specific team's sport/category
                const validSlots = getRandomSlots(team.sport, team.category, 4);

                validSlots.forEach(slot => {
                    availabilityInserts.push({
                        team_id: team.id, // Use the REAL BigInt ID from DB
                        day: slot.day,
                        hour: slot.hour
                    });
                });
            });

            // Insert Availability in chunks
            for (let i = 0; i < availabilityInserts.length; i += chunkSize) {
                const chunk = availabilityInserts.slice(i, i + chunkSize);
                const { error } = await supabase.from('availability').insert(chunk);
                if (error) throw error;
            }

            alert(`¡ÉXITO! Se han generado ${allInsertedTeams.length} equipos nuevos y se han ocultado los antiguos.`);

            // Refresh data
            let refreshQuery = supabase
                .from('teams')
                .select(`*, availability (day, hour)`)
                .eq('sport', sport);

            if (sport === 'tennis') {
                refreshQuery = refreshQuery.eq('category', tennisCategory);
            }

            const { data: teamsData, error: fetchError } = await refreshQuery;
            if (fetchError) throw fetchError;

            const processedTeams = teamsData.map(t => ({
                ...t,
                group: t.group_name,
                matchesPlayed: matches.filter(m => m.completed && (m.team1_id === t.id || m.team2_id === t.id)).length,
                points: computePoints(matches, t.id, sport),
                week_off: t.week_off || false,
                availability: Array.isArray(t.availability)
                    ? t.availability.map(a => `${a.day.substring(0, 3).toLowerCase()}_${a.hour}`)
                    : []
            }));
            setTeams(processedTeams);

        } catch (error) {
            console.error('Error generating demo data:', error);
            alert('ERROR: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Borra SOLO el ámbito actual (deporte + categoría). Antes borraba las dos categorías de tenis a la vez.
    // Crear un jugador/pareja a mano (admin) — sin cuenta vinculada. Para quien no
    // puede o no quiere registrarse; el admin le gestiona la disponibilidad.
    const createManualTeam = async ({ name, group }) => {
        const clean = (name || '').trim();
        if (!clean) throw new Error('El nombre no puede estar vacío.');
        const insert = {
            name: clean,
            sport,
            category: sport === 'tennis' ? tennisCategory : null,
            group_name: (group || '').trim() || null,
            points: 0,
            matches_played: 0
        };
        const { data, error } = await supabase.from('teams').insert(insert).select().single();
        if (error) throw error;
        setTeams(prev => [...prev, { ...data, group: data.group_name, matchesPlayed: 0, points: 0, week_off: false, availability: [] }]);
        return data;
    };

    // Corregir un resultado ya registrado: reabre el partido para volver a introducirlo.
    const reopenMatch = async (matchId) => {
        const { error } = await supabase.from('matches')
            .update({ completed: false, played: false, winner_id: null, score: null, loser_won_set: false, wo_notified: false })
            .eq('id', matchId);
        if (error) throw error;
        const updated = matchesRef.current.map(m => m.id === matchId
            ? { ...m, completed: false, played: false, winner_id: null, score: null, loser_won_set: false, wo_notified: false }
            : m);
        setMatches(updated);
        recomputeTeamsFromMatches(updated);
    };

    // Gestión de usuarios y roles (admin) — vía RPC con salvaguardas en BD
    const listUsers = async () => {
        const { data, error } = await supabase.rpc('admin_list_users');
        if (error) throw error;
        return data || [];
    };
    const setUserRole = async (userId, role) => {
        const { error } = await supabase.rpc('set_user_role', { p_user: userId, p_role: role });
        if (error) throw error;
    };

    const clearAllData = async () => {
        try {
            setLoading(true);
            const scoped = (q) => sport === 'tennis' ? q.eq('sport', sport).eq('category', tennisCategory) : q.eq('sport', sport);
            const { data: sportTeams, error: selErr } = await scoped(supabase.from('teams').select('id'));
            if (selErr) throw selErr;
            const ids = (sportTeams || []).map(t => t.id);
            if (ids.length > 0) {
                const { error: e1 } = await supabase.from('availability').delete().in('team_id', ids);
                if (e1) throw e1;
            }
            const { error: e2 } = await scoped(supabase.from('matches').delete());
            if (e2) throw e2;
            const { error: e3 } = await scoped(supabase.from('teams').delete());
            if (e3) throw e3;
            setTeams([]);
            setMatches([]);
        } catch (error) {
            console.error('Error clearing data:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    // Un jugador con partidos NO se puede borrar (se perdería el historial de sus rivales):
    // se le da de baja (semana libre permanente) y se conserva el historial.
    const deleteTeam = async (teamId) => {
        const played = matchesRef.current.filter(m => m.team1_id === teamId || m.team2_id === teamId).length;
        if (played > 0) {
            const err = new Error(`Este jugador tiene ${played} partido${played !== 1 ? 's' : ''} registrado${played !== 1 ? 's' : ''} y no se puede borrar sin perder el historial. Márcalo como "semana libre" para darlo de baja del generador.`);
            err.code = 'HAS_MATCHES';
            throw err;
        }
        const { error: e1 } = await supabase.from('availability').delete().eq('team_id', teamId);
        if (e1) throw e1;
        const { error } = await supabase.from('teams').delete().eq('id', teamId);
        if (error) throw error;
        setTeams(prev => prev.filter(t => t.id !== teamId));
    };

    const importPlayers = async (playersData) => {
        try {
            setLoading(true);
            const teamsToInsert = playersData.map(p => ({
                name: p.name,
                group_name: p.group || 'General',
                sport: sport,
                category: sport === 'tennis' ? tennisCategory : null,
                points: 0,
                matches_played: 0
            }));

            // 1. Insert Teams
            const { data: insertedTeams, error: insertError } = await supabase
                .from('teams')
                .insert(teamsToInsert)
                .select();

            if (insertError) throw insertError;

            // 2. Process Availability
            const availabilityInserts = [];

            // Map normalizado de días (con y sin tilde)
            const dayNormMap = {
                'lunes': 'Lunes', 'martes': 'Martes',
                'miércoles': 'Miércoles', 'miercoles': 'Miércoles',
                'jueves': 'Jueves', 'viernes': 'Viernes',
                'sábado': 'Sábado', 'sabado': 'Sábado',
                'domingo': 'Domingo'
            };

            insertedTeams.forEach((team, index) => {
                const rawAvailability = playersData[index].availability; // "Lunes 10:00, Martes 12:00"
                if (rawAvailability) {
                    const slots = rawAvailability.split(',').map(s => s.trim());
                    slots.forEach(slotStr => {
                        const parts = slotStr.trim().split(/\s+/);
                        if (parts.length >= 2) {
                            const dayKey = parts[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                            const dayNormKey = parts[0].toLowerCase();
                            const hour = parts[1];
                            const normalizedDay = dayNormMap[dayNormKey] || dayNormMap[dayKey];
                            if (normalizedDay) {
                                availabilityInserts.push({
                                    team_id: team.id,
                                    day: normalizedDay,
                                    hour: hour
                                });
                            }
                        }
                    });
                }
            });

            if (availabilityInserts.length > 0) {
                const { error: availError } = await supabase.from('availability').insert(availabilityInserts);
                if (availError) console.warn("Error inserting availability:", availError);
            }

            // 3. Refresh Data
            // Re-fetch to update UI
            let refreshQuery = supabase.from('teams').select(`*, availability (day, hour)`).eq('sport', sport);
            if (sport === 'tennis') refreshQuery = refreshQuery.eq('category', tennisCategory);

            const { data: teamsData, error: fetchError } = await refreshQuery;
            if (fetchError) throw fetchError;

            const processedTeams = teamsData.map(t => ({
                ...t,
                group: t.group_name,
                matchesPlayed: matches.filter(m => m.completed && (m.team1_id === t.id || m.team2_id === t.id)).length,
                points: computePoints(matches, t.id, sport),
                week_off: t.week_off || false,
                availability: Array.isArray(t.availability)
                    ? t.availability.map(a => `${a.day.substring(0, 3).toLowerCase()}_${a.hour}`)
                    : []
            }));
            setTeams(processedTeams);

            alert(`Importación completada: ${insertedTeams.length} jugadores añadidos.`);

        } catch (error) {
            console.error('Error importing players:', error);
            alert('Error al importar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const updateData = (newData) => {
        if (newData.courts) {
            Object.entries(newData.courts).forEach(([id, count]) => updateCourtCount(id, count));
        }
    };

    const updateWeekOff = useCallback(async (teamId, weekOff) => {
        try {
            const { error } = await supabase.from('teams').update({ week_off: weekOff }).eq('id', teamId);
            if (error) throw error;
            setTeams(prev => prev.map(t => t.id === teamId ? { ...t, week_off: weekOff } : t));
        } catch (error) {
            console.error('Error updating week_off:', error);
        }
    }, []);

    // Asignar / cambiar el grupo de un jugador (solo admin — protegido por trigger en BD)
    const updateTeamGroup = useCallback(async (teamId, group) => {
        try {
            const value = group && group.trim() ? group.trim() : null;
            const { error } = await supabase.from('teams').update({ group_name: value }).eq('id', teamId);
            if (error) throw error;
            setTeams(prev => prev.map(t => t.id === teamId ? { ...t, group_name: value, group: value } : t));
        } catch (error) {
            console.error('Error updating team group:', error);
        }
    }, []);

    // Ajustes por ámbito (deporte/categoría). Las listas se guardan como JSON.
    const SCOPED_SETTINGS = ['availability_locked', 'availability_deadline_label', 'fixed_hours', 'preferred_slots', 'last_first_group', 'draft_first_group'];
    const updateAppSettings = useCallback(async (key, value) => {
        try {
            const physicalKey = SCOPED_SETTINGS.includes(key) ? scopedSettingKey(key) : key;
            const stored = Array.isArray(value) ? JSON.stringify(value) : String(value);
            const { error } = await supabase.from('app_settings').upsert({ key: physicalKey, value: stored, updated_at: new Date().toISOString() });
            if (error) throw error;
            setAppSettings(prev => ({ ...prev, [key]: key === 'availability_locked' ? value === true || value === 'true' : value }));
        } catch (error) {
            console.error('Error updating app settings:', error);
            throw error;
        }
    }, [scopedSettingKey]);

    // ─── Pistas: horas fijas, horarios especiales de una semana y horas preferentes ───
    const pendingUsingHour = (hour) => matchesRef.current.filter(m => !m.completed && (m.slot || m.slot_id || '').endsWith(`_${hour}`));
    const pendingUsingSlot = (slotId) => matchesRef.current.filter(m => !m.completed && (m.slot || m.slot_id) === slotId);

    // Añade una hora a la rejilla de TODOS los días (permanente). Las pistas se ponen luego con + / −.
    const addFixedHour = useCallback(async (hour) => {
        const list = [...new Set([...(appSettings.fixed_hours || []), hour])].sort();
        await updateAppSettings('fixed_hours', list);
    }, [appSettings.fixed_hours, updateAppSettings]);

    // Quita una hora fija de todos los días y borra sus pistas. Falla si hay partidos pendientes a esa hora.
    const removeFixedHour = useCallback(async (hour) => {
        const inUse = pendingUsingHour(hour);
        if (inUse.length > 0) throw new Error(`Hay ${inUse.length} partido(s) pendiente(s) a las ${hour}. Registra o cambia esos partidos antes de quitar la hora.`);
        const { error } = await supabase.from('court_availability').delete()
            .eq('sport', sport)
            .filter('category', sport === 'tennis' ? 'eq' : 'is', sport === 'tennis' ? tennisCategory : null)
            .like('slot_id', `%_${hour}`);
        if (error) throw error;
        const list = (appSettings.fixed_hours || []).filter(h => h !== hour);
        await updateAppSettings('fixed_hours', list);
        setCourts(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => !id.endsWith(`_${hour}`))));
        setCourtsMeta(prev => Object.fromEntries(Object.entries(prev).filter(([id]) => !id.endsWith(`_${hour}`))));
        const pref = (appSettings.preferred_slots || []).filter(id => !id.endsWith(`_${hour}`));
        if (pref.length !== (appSettings.preferred_slots || []).length) await updateAppSettings('preferred_slots', pref);
    }, [appSettings.fixed_hours, appSettings.preferred_slots, updateAppSettings, sport, tennisCategory]);

    // Horario especial SOLO ESTA SEMANA en un día concreto: caduca el lunes siguiente.
    const addSpecialSlot = useCallback(async (slotId, count) => {
        const expires = specialSlotExpiry(slotId).toISOString();
        const { error } = await supabase.from('court_availability').upsert({
            sport, category: sport === 'tennis' ? tennisCategory : null,
            slot_id: slotId, available_count: count, expires_at: expires
        }, { onConflict: 'sport, category, slot_id' });
        if (error) throw error;
        setCourts(prev => ({ ...prev, [slotId]: count }));
        setCourtsMeta(prev => ({ ...prev, [slotId]: { expires_at: expires } }));
    }, [sport, tennisCategory]);

    // Borra un horario (especial o extra de un día). Falla si hay partidos pendientes en él.
    const removeSlot = useCallback(async (slotId) => {
        const inUse = pendingUsingSlot(slotId);
        if (inUse.length > 0) throw new Error(`Hay ${inUse.length} partido(s) pendiente(s) en ese horario. Cámbialos antes de quitarlo.`);
        const { error } = await supabase.from('court_availability').delete()
            .eq('sport', sport).eq('slot_id', slotId)
            .filter('category', sport === 'tennis' ? 'eq' : 'is', sport === 'tennis' ? tennisCategory : null);
        if (error) throw error;
        setCourts(prev => { const n = { ...prev }; delete n[slotId]; return n; });
        setCourtsMeta(prev => { const n = { ...prev }; delete n[slotId]; return n; });
        const pref = (appSettings.preferred_slots || []).filter(id => id !== slotId);
        if (pref.length !== (appSettings.preferred_slots || []).length) await updateAppSettings('preferred_slots', pref);
    }, [sport, tennisCategory, appSettings.preferred_slots, updateAppSettings]);

    // Marca / desmarca un horario como preferente para el generador.
    const togglePreferredSlot = useCallback(async (slotId) => {
        const cur = appSettings.preferred_slots || [];
        const list = cur.includes(slotId) ? cur.filter(id => id !== slotId) : [...cur, slotId];
        await updateAppSettings('preferred_slots', list);
    }, [appSettings.preferred_slots, updateAppSettings]);

    // ⚡ Memoizado: los consumidores solo re-renderizan cuando los datos realmente cambian
    const value = useMemo(() => ({
        data: { teams, matches, courts, courtsMeta },
        appSettings,
        updateData,
        updateTeamAvailability,
        updateCourtCount,
        updateWeekOff,
        updateTeamGroup,
        updateAppSettings,
        saveMatchResult,
        postponeMatch,
        registerWalkover,
        createMatch,
        updateMatch,
        deleteMatch,
        reopenMatch,
        createManualTeam,
        importPlayers,
        deleteTeam,
        clearAllData,
        createSchedule,
        publishSchedule,
        discardDrafts,
        addFixedHour,
        removeFixedHour,
        addSpecialSlot,
        removeSlot,
        togglePreferredSlot,
        generateDemoData,
        listUsers,
        setUserRole,
        loading,
        currentSlots,
        availabilitySlots
    }), [teams, matches, courts, courtsMeta, appSettings, loading, currentSlots, availabilitySlots, updateTeamAvailability, updateCourtCount, updateWeekOff, updateTeamGroup, updateAppSettings, addFixedHour, removeFixedHour, addSpecialSlot, removeSlot, togglePreferredSlot]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
