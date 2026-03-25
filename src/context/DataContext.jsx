import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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

const generateSlots = (sport, category) => {
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

export const DataProvider = ({ children }) => {
    const { sport, tennisCategory } = useGame();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [teams, setTeams] = useState([]);
    const [matches, setMatches] = useState([]);
    const [courts, setCourts] = useState({});
    const [appSettings, setAppSettings] = useState({ availability_locked: false, availability_deadline_label: '' });

    // ⚡ Declarado ANTES de los useCallback que lo usan como dependencia
    const currentSlots = useMemo(() => generateSlots(sport, tennisCategory), [sport, tennisCategory]);

    useEffect(() => {
        if (!sport) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // Construir las 3 queries
                let teamsQuery = supabase
                    .from('teams')
                    .select(`*, availability (day, hour)`)
                    .eq('sport', sport);

                let matchesQuery = supabase
                    .from('matches')
                    .select(`*, t1:team1_id (id, name), t2:team2_id (id, name)`)
                    .eq('sport', sport);

                let courtsQuery = supabase
                    .from('court_availability')
                    .select('*')
                    .eq('sport', sport);

                if (sport === 'tennis') {
                    teamsQuery   = teamsQuery.eq('category', tennisCategory);
                    matchesQuery = matchesQuery.eq('category', tennisCategory);
                    courtsQuery  = courtsQuery.eq('category', tennisCategory);
                }

                // ⚡ Ejecutar las 3 queries EN PARALELO (antes: secuencial ~1.5s → ahora ~0.5s)
                const [teamsResult, matchesResult, courtsResult] = await Promise.all([
                    teamsQuery,
                    matchesQuery,
                    courtsQuery,
                ]);

                if (teamsResult.error)   throw teamsResult.error;
                if (matchesResult.error) throw matchesResult.error;
                if (courtsResult.error)  throw courtsResult.error;

                // Calcular puntos dinámicamente desde los partidos completados
                // Ganador: 3 pts · Perdedor: 1 pt · WO ganador: 3 pts · WO perdedor: 0 pts
                const matchesData = matchesResult.data;
                setTeams(teamsResult.data.map(t => {
                    const teamMatches = matchesData.filter(m => m.completed && (m.team1_id === t.id || m.team2_id === t.id));
                    const wins = teamMatches.filter(m => m.winner_id === t.id && m.score !== 'W.O.').length;
                    const losses = teamMatches.filter(m => m.winner_id !== t.id && m.score !== 'W.O.').length;
                    const woWins = teamMatches.filter(m => m.winner_id === t.id && m.score === 'W.O.').length;
                    const computedPoints = (wins * 3) + (losses * 1) + (woWins * 3);
                    return {
                        ...t,
                        group: t.group_name,
                        matchesPlayed: teamMatches.length,
                        points: computedPoints,
                        week_off: t.week_off || false,
                        availability: Array.isArray(t.availability)
                            ? t.availability.map(a => `${a.day.substring(0, 3).toLowerCase()}_${a.hour}`)
                            : []
                    };
                }));

                setMatches(matchesResult.data.map(m => ({
                    ...m,
                    slot: m.slot_id,
                    t1: m.t1,
                    t2: m.t2
                })));

                const courtsMap = {};
                courtsResult.data.forEach(c => { courtsMap[c.slot_id] = c.available_count; });
                setCourts(courtsMap);

                // Cargar app_settings
                const { data: settingsData } = await supabase.from('app_settings').select('*');
                if (settingsData) {
                    const s = {};
                    settingsData.forEach(row => { s[row.key] = row.value; });
                    setAppSettings({
                        availability_locked: s.availability_locked === 'true',
                        availability_deadline_label: s.availability_deadline_label || ''
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

    const updateCourtCount = useCallback(async (slotId, count) => {
        try {
            const { error } = await supabase
                .from('court_availability')
                .upsert({
                    sport,
                    category: sport === 'tennis' ? tennisCategory : null,
                    slot_id: slotId,
                    available_count: count
                }, { onConflict: 'sport, category, slot_id' });
            if (error) throw error;
            setCourts(prev => ({ ...prev, [slotId]: count }));
        } catch (error) {
            console.error('Error updating court count:', error);
        }
    }, [sport, tennisCategory]);

    const saveMatchResult = async (matchId, score, winnerId) => {
        try {
            // 1. Update Match
            const { error: matchError } = await supabase
                .from('matches')
                .update({ completed: true, score, winner_id: winnerId, played: true })
                .eq('id', matchId)
                .select(); // Select to ensure we have the latest state if needed

            if (matchError) throw matchError;

            // 2. Calculate Points (Win=3, Loss=1)
            const match = matches.find(m => m.id === matchId);
            if (!match) return; // Should not happen

            const winner = match.t1.id === winnerId ? match.t1 : match.t2;
            const loser = match.t1.id === winnerId ? match.t2 : match.t1;

            // Update Winner
            const { error: winnerError } = await supabase.rpc('increment_points', {
                row_id: winner.id,
                points_to_add: 3,
                matches_to_add: 1
            });

            // Update Loser
            const { error: loserError } = await supabase.rpc('increment_points', {
                row_id: loser.id,
                points_to_add: 1,
                matches_to_add: 1
            });

            // Fallback if RPC fails or doesn't exist (Manual update - less safe for concurrency but works for demo)
            if (winnerError || loserError) {
                console.warn("RPC 'increment_points' failed, falling back to manual update", winnerError || loserError);

                // Fetch current stats
                const { data: teamsData } = await supabase.from('teams').select('id, points, matches_played').in('id', [winner.id, loser.id]);
                const winnerTeam = teamsData.find(t => t.id === winner.id);
                const loserTeam = teamsData.find(t => t.id === loser.id);

                if (winnerTeam) {
                    await supabase.from('teams').update({ points: winnerTeam.points + 3, matches_played: winnerTeam.matches_played + 1 }).eq('id', winner.id);
                }
                if (loserTeam) {
                    await supabase.from('teams').update({ points: loserTeam.points + 1, matches_played: loserTeam.matches_played + 1 }).eq('id', loser.id);
                }
            }

            // 3. Update Local State
            setMatches(prev => prev.map(m => m.id === matchId ? { ...m, completed: true, score, winner_id: winnerId } : m));
            setTeams(prev => prev.map(t => {
                if (t.id === winner.id) return { ...t, points: t.points + 3, matchesPlayed: (t.matchesPlayed || 0) + 1 };
                if (t.id === loser.id) return { ...t, points: t.points + 1, matchesPlayed: (t.matchesPlayed || 0) + 1 };
                return t;
            }));

            // --- Notificaciones de resultado ---
            try {
                const notifInserts = [];
                const resultBase = `${match.t1.name} vs ${match.t2.name} — ${score}`;
                if (match.t1.user_id) {
                    const isWin = match.t1.id === winner.id;
                    notifInserts.push({
                        user_id: match.t1.user_id,
                        match_id: matchId,
                        type: 'result_saved',
                        message: isWin
                            ? `🏆 ¡Ganado! ${resultBase}. +3 puntos.`
                            : `📊 Partido terminado: ${resultBase}. +1 punto.`
                    });
                }
                if (match.t2.user_id) {
                    const isWin = match.t2.id === winner.id;
                    notifInserts.push({
                        user_id: match.t2.user_id,
                        match_id: matchId,
                        type: 'result_saved',
                        message: isWin
                            ? `🏆 ¡Ganado! ${resultBase}. +3 puntos.`
                            : `📊 Partido terminado: ${resultBase}. +1 punto.`
                    });
                }
                if (notifInserts.length > 0) {
                    await supabase.from('notifications').insert(notifInserts);
                }
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

    const registerWalkover = async (matchId, winnerId) => {
        try {
            // 1. Update Match
            const { error: matchError } = await supabase
                .from('matches')
                .update({ completed: true, score: 'W.O.', winner_id: winnerId, played: true })
                .eq('id', matchId)
                .select();

            if (matchError) throw matchError;

            // 2. Calculate Points (Win=3, Loss=0 for WO)
            const match = matches.find(m => m.id === matchId);
            if (!match) return;

            const winner = match.t1.id === winnerId ? match.t1 : match.t2;
            // Loser gets 0 points in WO, so we only update the winner

            // Update Winner
            const { error: winnerError } = await supabase.rpc('increment_points', {
                row_id: winner.id,
                points_to_add: 3,
                matches_to_add: 1
            });

            // Fallback
            if (winnerError) {
                console.warn("RPC failed", winnerError);
                const { data: teamsData } = await supabase.from('teams').select('id, points, matches_played').eq('id', winner.id).single();
                if (teamsData) {
                    await supabase.from('teams').update({ points: teamsData.points + 3, matches_played: teamsData.matches_played + 1 }).eq('id', winner.id);
                }
            }

            // 3. Update Local State
            setMatches(prev => prev.map(m => m.id === matchId ? { ...m, completed: true, score: 'W.O.', winner_id: winnerId } : m));
            setTeams(prev => prev.map(t => {
                if (t.id === winner.id) return { ...t, points: t.points + 3, matchesPlayed: (t.matchesPlayed || 0) + 1 };
                return t;
            }));

            // --- Notificaciones de W.O. ---
            try {
                const loser = match.t1.id === winner.id ? match.t2 : match.t1;
                const notifInserts = [];
                if (winner.user_id) {
                    notifInserts.push({
                        user_id: winner.user_id,
                        match_id: matchId,
                        type: 'result_saved',
                        message: `🏆 Victoria por W.O.: ${winner.name} vs ${loser.name}. +3 puntos.`
                    });
                }
                if (loser.user_id) {
                    notifInserts.push({
                        user_id: loser.user_id,
                        match_id: matchId,
                        type: 'result_saved',
                        message: `📋 W.O. registrado: ${loser.name} no se presentó al partido vs ${winner.name}. +0 puntos.`
                    });
                }
                if (notifInserts.length > 0) {
                    await supabase.from('notifications').insert(notifInserts);
                }
            } catch (notifErr) {
                console.warn('No se pudieron enviar notificaciones de W.O.:', notifErr);
            }

        } catch (error) {
            console.error('Error registering WO:', error);
            alert('Error al registrar W.O.: ' + error.message);
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

            // --- Notificaciones a jugadores con cuenta vinculada ---
            try {
                const slots = generateSlots(sport, tennisCategory);
                const notifInserts = [];
                for (const m of newMatches) {
                    const slotDetails = slots.find(s => s.id === m.slot);
                    const timeStr = slotDetails
                        ? `${slotDetails.day} a las ${slotDetails.hour}`
                        : 'fecha por confirmar';
                    if (m.t1?.user_id) {
                        notifInserts.push({
                            user_id: m.t1.user_id,
                            type: 'match_assigned',
                            message: `🗓️ Nuevo partido: ${m.t1.name} vs ${m.t2.name} — ${timeStr}.`
                        });
                    }
                    if (m.t2?.user_id) {
                        notifInserts.push({
                            user_id: m.t2.user_id,
                            type: 'match_assigned',
                            message: `🗓️ Nuevo partido: ${m.t2.name} vs ${m.t1.name} — ${timeStr}.`
                        });
                    }
                }
                if (notifInserts.length > 0) {
                    await supabase.from('notifications').insert(notifInserts);
                }
            } catch (notifErr) {
                console.warn('No se pudieron enviar notificaciones de jornada:', notifErr);
            }

        } catch (error) {
            console.error('Error creating schedule:', error);
        }
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

            const processedTeams = teamsData.map(t => {
                const teamMatches = matches.filter(m => m.completed && (m.team1_id === t.id || m.team2_id === t.id));
                const wins = teamMatches.filter(m => m.winner_id === t.id && m.score !== 'W.O.').length;
                const losses = teamMatches.filter(m => m.winner_id !== t.id && m.score !== 'W.O.').length;
                const woWins = teamMatches.filter(m => m.winner_id === t.id && m.score === 'W.O.').length;
                return {
                    ...t,
                    group: t.group_name,
                    matchesPlayed: teamMatches.length,
                    points: (wins * 3) + (losses * 1) + (woWins * 3),
                    week_off: t.week_off || false,
                    availability: Array.isArray(t.availability)
                        ? t.availability.map(a => `${a.day.substring(0, 3).toLowerCase()}_${a.hour}`)
                        : []
                };
            });
            setTeams(processedTeams);

        } catch (error) {
            console.error('Error generating demo data:', error);
            alert('ERROR: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const clearAllData = async () => {
        try {
            setLoading(true);
            // Get all team IDs for this sport
            const { data: sportTeams } = await supabase
                .from('teams')
                .select('id')
                .eq('sport', sport);

            if (sportTeams && sportTeams.length > 0) {
                const ids = sportTeams.map(t => t.id);
                // Delete availability, then matches, then teams
                await supabase.from('availability').delete().in('team_id', ids);
            }
            await supabase.from('matches').delete().eq('sport', sport);
            const { error } = await supabase.from('teams').delete().eq('sport', sport);
            if (error) throw error;

            setTeams([]);
            setMatches([]);
        } catch (error) {
            console.error('Error clearing data:', error);
            alert('Error al limpiar los datos: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteTeam = async (teamId) => {
        try {
            await supabase.from('availability').delete().eq('team_id', teamId);
            const { error } = await supabase.from('teams').delete().eq('id', teamId);
            if (error) throw error;
            setTeams(prev => prev.filter(t => t.id !== teamId));
        } catch (error) {
            console.error('Error deleting team:', error);
            alert('Error al eliminar jugador: ' + error.message);
        }
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
                'miércoles': 'Miércoles', 'miercoles': 'Miércoles', 'miércoles': 'Miércoles',
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

            const processedTeams = teamsData.map(t => {
                const teamMatches = matches.filter(m => m.completed && (m.team1_id === t.id || m.team2_id === t.id));
                const wins = teamMatches.filter(m => m.winner_id === t.id && m.score !== 'W.O.').length;
                const losses = teamMatches.filter(m => m.winner_id !== t.id && m.score !== 'W.O.').length;
                const woWins = teamMatches.filter(m => m.winner_id === t.id && m.score === 'W.O.').length;
                return {
                    ...t,
                    group: t.group_name,
                    matchesPlayed: teamMatches.length,
                    points: (wins * 3) + (losses * 1) + (woWins * 3),
                    week_off: t.week_off || false,
                    availability: Array.isArray(t.availability)
                        ? t.availability.map(a => `${a.day.substring(0, 3).toLowerCase()}_${a.hour}`)
                        : []
                };
            });
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

    const updateAppSettings = useCallback(async (key, value) => {
        try {
            await supabase.from('app_settings').upsert({ key, value: String(value), updated_at: new Date().toISOString() });
            setAppSettings(prev => ({ ...prev, [key]: key === 'availability_locked' ? value === true || value === 'true' : value }));
        } catch (error) {
            console.error('Error updating app settings:', error);
        }
    }, []);

    // ⚡ Memoizado: los consumidores solo re-renderizan cuando los datos realmente cambian
    const value = useMemo(() => ({
        data: { teams, matches, courts },
        appSettings,
        updateData,
        updateTeamAvailability,
        updateCourtCount,
        updateWeekOff,
        updateAppSettings,
        saveMatchResult,
        postponeMatch,
        registerWalkover,
        importPlayers,
        deleteTeam,
        clearAllData,
        createSchedule,
        generateDemoData,
        loading,
        currentSlots
    }), [teams, matches, courts, appSettings, loading, currentSlots, updateTeamAvailability, updateCourtCount, updateWeekOff, updateAppSettings]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
