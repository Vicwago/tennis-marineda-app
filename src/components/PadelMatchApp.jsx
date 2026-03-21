import React, { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { Calendar, Trophy, Users, Activity, RefreshCw, MapPin, FileSpreadsheet, Upload, ChevronDown, ChevronRight, Clock, LogOut, Home, User, Settings, Menu, X, Newspaper, Bell, MessageSquare, BarChart2, History } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationsPanel from './NotificationsPanel';
import MatchChat from './MatchChat';

// --- UI Components ---
const Card = ({ children, className = "" }) => (
    <div className={`rounded-xl overflow-hidden ${className}`} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {children}
    </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, size = "md" }) => {
    const baseStyle = "rounded-lg font-medium transition-all flex items-center gap-2 justify-center disabled:opacity-50 disabled:cursor-not-allowed";
    const sizes = {
        sm: "px-2 py-1 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base"
    };
    const variants = {
        primary: "bg-brand-red text-white hover:bg-brand-dark shadow-sm shadow-brand-red/20",
        secondary: "text-white hover:opacity-90",
        outline: "border border-brand-red text-brand-red hover:bg-red-500/10",
        success: "bg-emerald-600 text-white hover:bg-emerald-700",
        ghost: "bg-transparent hover:opacity-90",
        danger: "text-red-400 hover:text-red-300"
    };
    return (
        <button onClick={onClick} className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`} disabled={disabled}>
            {children}
        </button>
    );
};

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// --- Sub-components ---

const ImportModal = ({ importText, setImportText, setShowImportModal, handleBulkImport }) => (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
        <div className="rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-hi)' }}>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <FileSpreadsheet style={{ color: 'var(--cyan)' }} /> Importar desde Sheets/Excel
            </h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>
                Copia las celdas en tu hoja de cálculo (Ctrl+C) y pégalas aquí (Ctrl+V).
            </p>
            <textarea
                className="cyber-input w-full h-48 p-3 text-xs font-mono"
                placeholder={`Formato recomendado:\nColumna A: Nombre\nColumna B: Grupo (Opcional)\nColumna C: Disponibilidad\n\nEjemplo:\nNadal\tGrupo A\tLunes 10:00, Martes 12:00`}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-4">
                <button className="btn-cyber-outline px-4 py-2 text-sm rounded-lg" onClick={() => setShowImportModal(false)}>Cancelar</button>
                <Button variant="success" onClick={handleBulkImport}>Procesar e Importar</Button>
            </div>
        </div>
    </div>
);

const CourtsView = memo(({ sport, tennisCategory, isAdmin, currentSlots, courtAvailability, fillDailyCourts, updateCourtCount }) => {
    const [expandedDay, setExpandedDay] = useState(DAYS[0]);
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)' }}>
                <div className="p-2 rounded-lg" style={{ background: 'rgba(0,212,255,0.12)', color: 'var(--cyan)' }}>
                    <MapPin size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-white">Disponibilidad de Pistas</h3>
                    <p className="text-sm" style={{ color: 'var(--text-2)' }}>
                        Gestiona los cupos disponibles por hora.
                        {sport === 'tennis' ? (tennisCategory === 'adults' ? ' (Turnos de 2h)' : ' (Turnos de 1h)') : ' (Turnos de 90min)'}
                    </p>
                </div>
            </div>

            <div className="grid gap-3">
                {DAYS.map(day => (
                    <div key={day} className="rounded-xl overflow-hidden transition-shadow" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <div
                            className="p-4 flex justify-between items-center cursor-pointer transition-colors"
                            style={{ background: 'rgba(255,255,255,0.02)' }}
                            onClick={() => setExpandedDay(expandedDay === day ? null : day)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-8 rounded-full" style={{ background: expandedDay === day ? '#E53935' : 'rgba(255,255,255,0.1)' }}></div>
                                <h4 className="font-bold text-white text-lg">{day}</h4>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: 'rgba(0,212,255,0.08)', color: 'var(--cyan)', border: '1px solid rgba(0,212,255,0.15)' }}>
                                    {currentSlots.filter(s => s.day === day).reduce((acc, curr) => acc + (courtAvailability[curr.id] || 0), 0)} cupos
                                </span>
                                {expandedDay === day ? <ChevronDown size={20} style={{ color: 'var(--text-3)' }} /> : <ChevronRight size={20} style={{ color: 'var(--text-3)' }} />}
                            </div>
                        </div>

                        {expandedDay === day && (
                            <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
                                {isAdmin && (
                                    <div className="flex justify-end mb-4 gap-2 items-center p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Relleno Rápido:</span>
                                        <button onClick={() => fillDailyCourts(day, 0)} className="text-xs px-3 py-1.5 rounded-md font-medium transition-colors" style={{ background: 'rgba(229,57,53,0.1)', color: '#E53935', border: '1px solid rgba(229,57,53,0.2)' }}>Vaciar</button>
                                        <button onClick={() => fillDailyCourts(day, sport === 'padel' ? 3 : 7)} className="text-xs px-3 py-1.5 rounded-md font-medium transition-colors" style={{ background: 'rgba(0,212,255,0.08)', color: 'var(--cyan)', border: '1px solid rgba(0,212,255,0.15)' }}>Llenar</button>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {currentSlots.filter(s => s.day === day).map(slot => (
                                        <div key={slot.id} className="flex justify-between items-center p-3 rounded-lg transition-colors" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                                            <span className="text-sm font-mono font-bold text-white">{slot.hour}</span>
                                            <div className="flex items-center gap-2">
                                                {isAdmin && <button onClick={() => updateCourtCount(slot.id, -1)} className="w-8 h-8 flex items-center justify-center rounded-lg font-bold transition-colors" style={{ background: 'rgba(229,57,53,0.1)', color: '#E53935', border: '1px solid rgba(229,57,53,0.2)' }}>-</button>}
                                                <span className="w-8 text-center font-bold text-lg" style={{ color: (courtAvailability[slot.id] || 0) === 0 ? '#ff6b6b' : 'var(--cyan)' }}>
                                                    {courtAvailability[slot.id] || 0}
                                                </span>
                                                {isAdmin && <button onClick={() => updateCourtCount(slot.id, 1)} className="w-8 h-8 flex items-center justify-center rounded-lg font-bold transition-colors" style={{ background: 'rgba(0,255,135,0.08)', color: '#00ff87', border: '1px solid rgba(0,255,135,0.2)' }}>+</button>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
});

const TeamsView = memo(({ teams, isAdmin, setShowImportModal, editingTeamId, setEditingTeamId, editingDay, setEditingDay, currentSlots, toggleAvailability, selectedAvailability, saveTeamAvailability, startEditing, generateDemoData, onDeleteTeam }) => {
    const [selectedGroup, setSelectedGroup] = useState('Todos');
    // ⚡ useMemo: no recalcular en cada render del padre
    const groups = useMemo(() => ['Todos', ...new Set(teams.map(t => t.group).filter(Boolean))].sort(), [teams]);
    const filteredTeams = useMemo(
        () => selectedGroup === 'Todos' ? teams : teams.filter(t => t.group === selectedGroup),
        [teams, selectedGroup]
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(255,193,7,0.1)', color: '#FFC107' }}>
                        <Users size={24} />
                    </div>
                    <h2 className="font-bold text-xl text-white">Parejas / Jugadores</h2>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <select
                        value={selectedGroup}
                        onChange={(e) => setSelectedGroup(e.target.value)}
                        className="cyber-input text-sm rounded-lg p-2.5 flex-1 md:w-48"
                    >
                        {groups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    {isAdmin && (
                        <>
                            <Button variant="secondary" size="sm" onClick={generateDemoData} title="Generar datos de prueba">
                                <RefreshCw size={18} />
                            </Button>
                            <Button variant="success" size="sm" onClick={() => setShowImportModal(true)} title="Importar Excel">
                                <Upload size={18} />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredTeams.map(team => (
                    <Card key={team.id} className="p-5 relative hover:shadow-md transition-shadow group">
                        {editingTeamId === team.id ? (
                            <div className="animate-in fade-in duration-200">
                                <div className="flex justify-between items-center mb-4 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
                                    <h4 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#E53935' }}>Editando Disponibilidad</h4>
                                    <div className="flex gap-1">
                                        {DAYS.map(d => (
                                            <button
                                                key={d}
                                                onClick={() => setEditingDay(d)}
                                                className="w-7 h-7 flex items-center justify-center rounded-md text-[10px] font-bold transition-all"
                                                style={editingDay === d
                                                    ? { background: '#E53935', color: 'white' }
                                                    : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-3)' }}
                                            >
                                                {d.substring(0, 1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl mb-4 min-h-[120px]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                                    <div className="grid grid-cols-3 gap-2">
                                        {currentSlots.filter(s => s.day === editingDay).map(slot => (
                                            <button
                                                key={slot.id}
                                                onClick={() => toggleAvailability(slot.id)}
                                                className="text-xs py-2 rounded-lg border transition-all font-medium"
                                                style={selectedAvailability.includes(slot.id)
                                                    ? { background: 'rgba(229,57,53,0.3)', color: 'white', border: '1px solid rgba(229,57,53,0.5)', transform: 'scale(1.05)' }
                                                    : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                                            >
                                                {slot.hour}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button variant="secondary" size="sm" onClick={() => setEditingTeamId(null)}>Cancelar</Button>
                                    <Button variant="primary" size="sm" onClick={() => saveTeamAvailability(team.id)}>Guardar Cambios</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-between items-start">
                                <div className="w-full">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ background: 'rgba(229,57,53,0.2)', border: '1px solid rgba(229,57,53,0.3)' }}>
                                                {team.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <h3 className="font-bold text-white text-base">{team.name}</h3>
                                        </div>
                                        {team.group && <span className="text-[10px] px-2 py-1 rounded-full font-bold" style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,212,255,0.2)' }}>{team.group}</span>}
                                    </div>

                                    <div className="flex gap-3 text-xs mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-3)' }}>Partidos</span>
                                            <span className="font-bold text-white">{team.matchesPlayed}</span>
                                        </div>
                                        <div className="w-px" style={{ background: 'var(--border)' }}></div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-3)' }}>Puntos</span>
                                            <span className="font-bold" style={{ color: '#E53935' }}>{team.points}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Disponibilidad:</span>
                                        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-hidden">
                                            {team.availability.length === 0
                                                ? <span className="text-xs italic px-2 py-1 rounded" style={{ color: 'var(--text-3)', background: 'rgba(255,255,255,0.04)' }}>Sin disponibilidad registrada</span>
                                                : team.availability.slice(0, 8).map(s => {
                                                    const slot = currentSlots.find(ts => ts.id === s);
                                                    return (
                                                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(0,212,255,0.08)', color: 'var(--cyan)', border: '1px solid rgba(0,212,255,0.15)' }}>
                                                            {slot?.day.substring(0, 3)} {slot?.hour}
                                                        </span>
                                                    );
                                                })
                                            }
                                            {team.availability.length > 8 && <span className="text-[10px] self-center" style={{ color: 'var(--text-3)' }}>+{team.availability.length - 8} más</span>}
                                        </div>
                                    </div>
                                </div>
                                {isAdmin && (
                                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                        <button
                                            onClick={() => startEditing(team)}
                                            className="p-2 rounded-full transition-all"
                                            style={{ color: 'var(--text-3)' }}
                                            onMouseEnter={e => { e.currentTarget.style.color = '#E53935'; e.currentTarget.style.background = 'rgba(229,57,53,0.1)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = ''; }}
                                            title="Editar Disponibilidad"
                                        >
                                            <Settings size={16} />
                                        </button>
                                        <button
                                            onClick={() => { if (confirm(`¿Eliminar a "${team.name}"? Esta acción no se puede deshacer.`)) onDeleteTeam(team.id); }}
                                            className="p-2 rounded-full transition-all"
                                            style={{ color: 'var(--text-3)' }}
                                            onMouseEnter={e => { e.currentTarget.style.color = '#ff4444'; e.currentTarget.style.background = 'rgba(255,68,68,0.1)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = ''; }}
                                            title="Eliminar Jugador"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
});

const MyAvailabilityView = memo(({ teams, currentSlots }) => {
    const { updateTeamAvailability } = useData();
    const { user } = useAuth();
    const [myTeamId, setMyTeamId] = useState(localStorage.getItem('myTeamId') || '');
    const [selectedAvailability, setSelectedAvailability] = useState([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Auto-identificación: si el usuario tiene equipo vinculado, lo detectamos automáticamente
    useEffect(() => {
        if (user?.id && !myTeamId && teams.length > 0) {
            const linkedTeam = teams.find(t => t.user_id === user.id);
            if (linkedTeam) {
                const idStr = String(linkedTeam.id);
                setMyTeamId(idStr);
                localStorage.setItem('myTeamId', idStr);
                setSelectedAvailability(linkedTeam.availability || []);
            }
        }
    }, [user?.id, teams, myTeamId]);

    // Load availability when team is selected
    useEffect(() => {
        if (myTeamId) {
            const team = teams.find(t => t.id === parseInt(myTeamId));
            if (team) {
                // Only update from source if we don't have unsaved changes or if we just switched teams
                if (!hasUnsavedChanges) {
                    const newAvail = team.availability || [];
                    // Avoid infinite loop by checking if value actually changed
                    if (JSON.stringify(selectedAvailability) !== JSON.stringify(newAvail)) {
                        // eslint-disable-next-line
                        setSelectedAvailability(newAvail);
                    }
                }
            }
        }
    }, [myTeamId, teams, hasUnsavedChanges]);

    const handleTeamChange = (e) => {
        setMyTeamId(e.target.value);
        setHasUnsavedChanges(false);
        localStorage.setItem('myTeamId', e.target.value);
        const team = teams.find(t => t.id === parseInt(e.target.value));
        if (team) setSelectedAvailability(team.availability || []);
    };

    const toggleSlot = (slotId) => {
        setHasUnsavedChanges(true);
        if (selectedAvailability.includes(slotId)) {
            setSelectedAvailability(prev => prev.filter(id => id !== slotId));
        } else {
            setSelectedAvailability(prev => [...prev, slotId]);
        }
    };

    const save = () => {
        if (!myTeamId) return;
        updateTeamAvailability(parseInt(myTeamId), selectedAvailability);
        setHasUnsavedChanges(false);
        alert('¡Disponibilidad guardada correctamente!');
    };

    if (!myTeamId) {
        return (
            <div className="max-w-md mx-auto mt-10 p-8 rounded-2xl text-center animate-in fade-in zoom-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-hi)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--cyan)' }}>
                    <User size={32} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Identifícate</h2>
                <p className="mb-4" style={{ color: 'var(--text-2)' }}>Para gestionar tu disponibilidad, primero dinos quién eres.</p>

                {user && teams.length === 0 && (
                    <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ color: 'var(--cyan)', background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.2)' }}>
                        Tu equipo está registrado en otro deporte. Navega al deporte correcto desde el menú lateral.
                    </p>
                )}

                {teams.length > 0 && (
                    <select
                        value={myTeamId}
                        onChange={handleTeamChange}
                        className="cyber-input w-full p-3 rounded-xl"
                    >
                        <option value="">Selecciona tu nombre...</option>
                        {teams.sort((a, b) => a.name.localeCompare(b.name)).map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                )}
            </div>
        );
    }

    const team = teams.find(t => t.id === parseInt(myTeamId));

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(229,57,53,0.8), rgba(229,57,53,0.5))', border: '1px solid rgba(229,57,53,0.4)' }}>
                        {team?.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Hola, <span className="text-brand-gradient">{team?.name}</span></h2>
                        <p className="text-sm" style={{ color: 'var(--text-2)' }}>Gestiona tus horarios para esta semana.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setMyTeamId('')} className="text-sm underline transition-colors" style={{ color: 'var(--text-3)' }}>Cambiar Usuario</button>
                    {hasUnsavedChanges && (
                        <span className="text-xs font-bold px-2 py-1 rounded-full animate-pulse" style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>Cambios sin guardar</span>
                    )}
                    <Button onClick={save} disabled={!hasUnsavedChanges} className={hasUnsavedChanges ? 'animate-bounce-subtle' : ''}>
                        Guardar Disponibilidad
                    </Button>
                </div>
            </div>

            <div className="p-6 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {DAYS.map(day => (
                        <div key={day} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                            <div className="p-3 font-bold text-white text-center" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border)' }}>
                                {day}
                            </div>
                            <div className="p-3 grid grid-cols-2 gap-2">
                                {currentSlots.filter(s => s.day === day).map(slot => (
                                    <button
                                        key={slot.id}
                                        onClick={() => toggleSlot(slot.id)}
                                        className="text-xs py-2 px-1 rounded-lg border transition-all font-medium"
                                        style={selectedAvailability.includes(slot.id)
                                            ? { background: 'rgba(229,57,53,0.3)', color: 'white', border: '1px solid rgba(229,57,53,0.5)', transform: 'scale(1.05)' }
                                            : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                                    >
                                        {slot.hour}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

const ScheduleView = memo(({ matches, isAdmin, generateWeeklySchedule, generationLog, currentSlots, submitResult, postponeMatch, registerWalkover, onChatClick }) => {
    const activeMatches = useMemo(() => matches.filter(m => !m.completed), [matches]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {isAdmin && (
                <div className="p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(229,57,53,0.15) 0%, rgba(229,57,53,0.05) 100%)', border: '1px solid rgba(229,57,53,0.3)' }}>
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" style={{ background: 'rgba(229,57,53,0.05)' }}></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-bold flex items-center gap-3 mb-1 text-white"><RefreshCw style={{ color: '#FFC107' }} /> Generador de Jornada</h2>
                        <p className="text-sm max-w-md" style={{ color: 'var(--text-2)' }}>
                            El algoritmo cruzará automáticamente parejas con horarios compatibles y pistas disponibles, evitando repeticiones.
                        </p>
                    </div>
                    <Button onClick={generateWeeklySchedule} className="bg-brand-red hover:bg-brand-dark text-white border-none shadow-lg shadow-brand-red/30 w-full md:w-auto py-3 px-6 relative z-10">
                        Generar Nueva Jornada
                    </Button>
                </div>
            )}

            {generationLog && (
                <div className="p-4 text-sm rounded-xl flex items-start gap-3" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B' }}>
                    <Activity className="shrink-0 mt-0.5" size={18} />
                    {generationLog}
                </div>
            )}

            <div className="space-y-4">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                    <Calendar style={{ color: '#E53935' }} size={20} /> Partidos Pendientes
                </h3>

                {activeMatches.length === 0 && (
                    <div className="text-center py-16 rounded-2xl" style={{ border: '2px dashed var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)' }}>
                            <Calendar size={32} />
                        </div>
                        <p className="font-medium" style={{ color: 'var(--text-2)' }}>No hay partidos programados para esta semana.</p>
                        {isAdmin && <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Utiliza el generador para crear nuevos enfrentamientos.</p>}
                    </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                    {activeMatches.map(match => {
                        const slotDetails = currentSlots.find(s => s.id === match.slot);
                        return (
                            <Card key={match.id} className={`flex flex-col overflow-hidden transition-all`} style={{ borderLeft: `3px solid ${match.postponed ? '#F59E0B' : '#E53935'}` }}>
                                <div className="flex flex-row h-full">
                                    <div className="p-4 flex flex-col justify-center items-center min-w-[100px]" style={{ background: 'rgba(255,255,255,0.03)', borderRight: '1px solid var(--border)' }}>
                                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{slotDetails?.day.substring(0, 3)}</span>
                                        <span className="text-xl font-bold text-white">{slotDetails?.hour}</span>
                                        {match.postponed && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-2" style={{ color: '#F59E0B', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>APLAZADO</span>}
                                    </div>
                                    <div className="p-4 flex-1 flex flex-col justify-center">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex-1 text-right pr-3">
                                                <span className="font-bold text-white block leading-tight">{match.t1.name}</span>
                                            </div>
                                            <div className="text-[10px] font-bold text-white rounded-full w-7 h-7 flex items-center justify-center shrink-0" style={{ background: 'rgba(229,57,53,0.3)', border: '1px solid rgba(229,57,53,0.5)' }}>VS</div>
                                            <div className="flex-1 text-left pl-3">
                                                <span className="font-bold text-white block leading-tight">{match.t2.name}</span>
                                            </div>
                                        </div>

                                        {isAdmin ? (
                                            <div className="p-2 rounded-lg flex flex-wrap gap-2 items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                                                <input id={`score-${match.id}`} placeholder="6-3 6-4" className="cyber-input w-24 px-2 text-sm h-8 text-center" />
                                                <select id={`winner-${match.id}`} className="cyber-input text-sm px-2 h-8 w-32 cursor-pointer">
                                                    <option value="">Ganador...</option>
                                                    <option value={match.t1.id}>{match.t1.name}</option>
                                                    <option value={match.t2.id}>{match.t2.name}</option>
                                                </select>
                                                <Button size="sm" onClick={() => {
                                                    const score = document.getElementById(`score-${match.id}`).value;
                                                    const winner = document.getElementById(`winner-${match.id}`).value;
                                                    if (score && winner) submitResult(match.id, score, winner);
                                                }}>OK</Button>

                                                <div className="w-px h-6 mx-1" style={{ background: 'var(--border)' }}></div>

                                                <Button size="sm" variant="ghost" className="font-medium" style={{ color: '#F59E0B' }} onClick={() => postponeMatch(match.id)}>
                                                    Aplazar
                                                </Button>

                                                <div className="w-px h-6 mx-1" style={{ background: 'var(--border)' }}></div>

                                                <Button size="sm" variant="ghost" className="font-medium" style={{ color: 'var(--text-3)' }} title="Walkover / Retirada" onClick={() => {
                                                    const winner = document.getElementById(`winner-${match.id}`).value;
                                                    if (!winner) {
                                                        alert("Selecciona primero quién ha ganado (el que SÍ se presentó).");
                                                        return;
                                                    }
                                                    registerWalkover(match.id, winner);
                                                }}>
                                                    W.O.
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="text-center">
                                                <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ color: 'var(--text-3)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}>
                                                    {match.postponed ? 'Pendiente de reprogramación' : 'Partido por jugar'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            <div className="px-4 py-2 flex items-center justify-end" style={{ borderTop: '1px solid var(--border)' }}>
                                <button
                                    onClick={() => onChatClick && onChatClick(match)}
                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                                    style={{ color: 'var(--text-3)', border: '1px solid var(--border)' }}
                                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--cyan)'; e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'; e.currentTarget.style.background = 'rgba(0,212,255,0.06)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = ''; }}
                                >
                                    <MessageSquare size={14} /> Chat del Partido
                                </button>
                            </div>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

// --- HistoryView ---
const HistoryView = memo(({ matches, currentSlots }) => {
    const completedMatches = useMemo(
        () => [...matches].filter(m => m.completed).sort((a, b) => b.id - a.id),
        [matches]
    );

    if (completedMatches.length === 0) {
        return (
            <div className="text-center py-16 rounded-2xl animate-in fade-in" style={{ border: '2px dashed var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)' }}>
                    <History size={32} />
                </div>
                <p className="font-medium" style={{ color: 'var(--text-2)' }}>No hay resultados registrados aún.</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Los partidos completados aparecerán aquí.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="p-2 rounded-lg" style={{ background: 'rgba(229,57,53,0.12)', color: '#E53935' }}>
                    <History size={24} />
                </div>
                <div>
                    <h2 className="font-bold text-xl text-white">Historial de Resultados</h2>
                    <p className="text-sm" style={{ color: 'var(--text-2)' }}>{completedMatches.length} partido{completedMatches.length !== 1 ? 's' : ''} jugado{completedMatches.length !== 1 ? 's' : ''}</p>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {completedMatches.map(match => {
                    const slotDetails = currentSlots.find(s => s.id === match.slot);
                    const isWO = match.score === 'W.O.';
                    const winner = match.winner_id === match.t1.id ? match.t1 : match.t2;
                    const loser = match.winner_id === match.t1.id ? match.t2 : match.t1;
                    return (
                        <Card key={match.id} className="p-5 relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,255,135,0.5), transparent)' }} />
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-3)' }}>
                                    {slotDetails ? `${slotDetails.day.substring(0, 3)} ${slotDetails.hour}` : 'Sin hora'}
                                </span>
                                <div className="flex items-center gap-2">
                                    {isWO && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>W.O.</span>}
                                    <div className="p-1.5 rounded-lg" style={{ background: 'rgba(0,255,135,0.1)', color: '#00ff87', border: '1px solid rgba(0,255,135,0.2)' }}>
                                        <Trophy size={14} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'rgba(0,255,135,0.06)', border: '1px solid rgba(0,255,135,0.15)' }}>
                                    <div className="flex items-center gap-2">
                                        <Trophy size={12} style={{ color: '#00ff87' }} />
                                        <span className="font-bold text-white text-sm">{winner.name}</span>
                                    </div>
                                    <span className="font-bold text-sm" style={{ color: '#00ff87' }}>{match.score}</span>
                                </div>
                                <div className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                                    <span className="text-sm" style={{ color: 'var(--text-2)' }}>{loser.name}</span>
                                    <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>—</span>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
});

// --- StatsView ---
const StatsView = memo(({ matches, teams, isAdmin }) => {
    const { user } = useAuth();
    const [selectedTeamId, setSelectedTeamId] = useState(() => {
        const stored = localStorage.getItem('myTeamId');
        return stored ? parseInt(stored) : null;
    });

    // Auto-identificación: si el usuario tiene equipo vinculado, lo detectamos automáticamente
    useEffect(() => {
        if (user?.id && !selectedTeamId && teams.length > 0) {
            const linkedTeam = teams.find(t => t.user_id === user.id);
            if (linkedTeam) {
                setSelectedTeamId(linkedTeam.id);
                localStorage.setItem('myTeamId', String(linkedTeam.id));
            }
        }
    }, [user?.id, teams, selectedTeamId]);

    const completedMatches = useMemo(() => matches.filter(m => m.completed), [matches]);
    const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.name.localeCompare(b.name)), [teams]);
    const myTeam = useMemo(() => teams.find(t => t.id === selectedTeamId), [teams, selectedTeamId]);

    const getStats = (teamId) => {
        if (!teamId) return null;
        const teamMatches = completedMatches.filter(m => m.t1.id === teamId || m.t2.id === teamId);
        const wins = teamMatches.filter(m => m.winner_id === teamId && m.score !== 'W.O.').length;
        const losses = teamMatches.filter(m => m.winner_id !== teamId && m.score !== 'W.O.').length;
        const woWins = teamMatches.filter(m => m.winner_id === teamId && m.score === 'W.O.').length;
        const woLosses = teamMatches.filter(m => m.winner_id !== teamId && m.score === 'W.O.').length;
        const total = teamMatches.length;
        const winRate = total > 0 ? Math.round(((wins + woWins) / total) * 100) : 0;
        const sorted = [...teamMatches].sort((a, b) => b.id - a.id);
        let streak = 0;
        let streakType = null;
        for (const m of sorted) {
            const isWin = m.winner_id === teamId;
            if (streakType === null) { streakType = isWin ? 'W' : 'L'; streak = 1; }
            else if ((streakType === 'W') === isWin) streak++;
            else break;
        }
        return { total, wins, losses, woWins, woLosses, winRate, streak, streakType };
    };

    const stats = getStats(selectedTeamId);

    const StatCard = ({ icon, label, value, color = 'var(--cyan)' }) => (
        <div className="p-4 rounded-xl text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex justify-center mb-2" style={{ color }}>{icon}</div>
            <div className="text-2xl font-bold text-white mb-1">{value}</div>
            <div className="text-xs uppercase tracking-wider font-bold" style={{ color: 'var(--text-3)' }}>{label}</div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="p-2 rounded-lg" style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--cyan)' }}>
                    <BarChart2 size={24} />
                </div>
                <div>
                    <h2 className="font-bold text-xl text-white">Estadísticas</h2>
                    <p className="text-sm" style={{ color: 'var(--text-2)' }}>Rendimiento individual por jugador o pareja.</p>
                </div>
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>
                    {isAdmin ? 'Seleccionar jugador / pareja' : 'Tu equipo'}
                </label>
                <select
                    value={selectedTeamId || ''}
                    onChange={e => {
                        const val = e.target.value ? parseInt(e.target.value) : null;
                        setSelectedTeamId(val);
                        if (!isAdmin && val) localStorage.setItem('myTeamId', String(val));
                    }}
                    className="cyber-input w-full p-3 rounded-xl"
                >
                    <option value="">Selecciona un jugador / pareja...</option>
                    {sortedTeams.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>

            {!selectedTeamId && (
                <div className="text-center py-12 rounded-2xl" style={{ border: '2px dashed var(--border)' }}>
                    <BarChart2 size={40} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
                    <p style={{ color: 'var(--text-2)' }}>Selecciona un jugador para ver sus estadísticas.</p>
                </div>
            )}

            {stats && myTeam && (
                <>
                    <div className="p-4 rounded-xl flex items-center gap-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-hi)' }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg text-white shrink-0" style={{ background: 'linear-gradient(135deg, rgba(229,57,53,0.7), rgba(229,57,53,0.4))', border: '1px solid rgba(229,57,53,0.4)' }}>
                            {myTeam.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-white">{myTeam.name}</h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {stats.total > 0 && (
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={
                                        stats.streakType === 'W'
                                            ? { background: 'rgba(0,255,135,0.15)', color: '#00ff87', border: '1px solid rgba(0,255,135,0.3)' }
                                            : { background: 'rgba(229,57,53,0.15)', color: '#ff6b6b', border: '1px solid rgba(229,57,53,0.3)' }
                                    }>
                                        {stats.streakType === 'W' ? '▲' : '▼'} Racha de {stats.streak} {stats.streakType === 'W' ? 'victorias' : 'derrotas'}
                                    </span>
                                )}
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(229,57,53,0.1)', color: '#E53935', border: '1px solid rgba(229,57,53,0.2)' }}>
                                    {myTeam.points} pts
                                </span>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-3xl font-bold" style={{ color: stats.winRate >= 60 ? '#00ff87' : stats.winRate >= 40 ? '#FFC107' : '#ff6b6b' }}>
                                {stats.winRate}%
                            </div>
                            <div className="text-xs" style={{ color: 'var(--text-3)' }}>% victorias</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard icon={<Activity size={22} />} label="Partidos" value={stats.total} color="var(--cyan)" />
                        <StatCard icon={<Trophy size={22} />} label="Victorias" value={stats.wins + stats.woWins} color="#00ff87" />
                        <StatCard icon={<X size={22} />} label="Derrotas" value={stats.losses + stats.woLosses} color="#ff6b6b" />
                        <StatCard icon={<BarChart2 size={22} />} label="W.O. ganados" value={stats.woWins} color="#F59E0B" />
                    </div>
                    {stats.total === 0 && (
                        <p className="text-center py-6" style={{ color: 'var(--text-3)' }}>Este jugador/pareja aún no tiene partidos completados.</p>
                    )}

                    {stats.total > 0 && (
                        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                            <div className="p-4 font-bold text-white text-sm uppercase tracking-wider" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)', color: 'var(--text-2)' }}>
                                Últimos partidos
                            </div>
                            {[...completedMatches.filter(m => m.t1.id === selectedTeamId || m.t2.id === selectedTeamId)]
                                .sort((a, b) => b.id - a.id)
                                .slice(0, 10)
                                .map(m => {
                                    const isWin = m.winner_id === selectedTeamId;
                                    const opponent = m.t1.id === selectedTeamId ? m.t2 : m.t1;
                                    const isWO = m.score === 'W.O.';
                                    return (
                                        <div key={m.id} className="flex items-center justify-between px-4 py-3 transition-colors" style={{ borderBottom: '1px solid var(--border)' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                                    style={isWin
                                                        ? { background: 'rgba(0,255,135,0.15)', color: '#00ff87', border: '1px solid rgba(0,255,135,0.3)' }
                                                        : { background: 'rgba(229,57,53,0.15)', color: '#ff6b6b', border: '1px solid rgba(229,57,53,0.3)' }}>
                                                    {isWin ? 'G' : 'P'}
                                                </div>
                                                <span className="text-sm text-white">vs {opponent.name}</span>
                                                {isWO && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>W.O.</span>}
                                            </div>
                                            <span className="text-sm font-mono font-bold" style={{ color: isWin ? '#00ff87' : 'var(--text-3)' }}>{m.score}</span>
                                        </div>
                                    );
                                })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
});

// --- CalendarView ---
const CalendarView = memo(({ matches, currentSlots }) => {
    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(229,57,53,0.12)', color: '#E53935' }}>
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h2 className="font-bold text-xl text-white">Calendario Semanal</h2>
                        <p className="text-sm" style={{ color: 'var(--text-2)' }}>Vista de todos los partidos por día.</p>
                    </div>
                </div>
                <div className="hidden md:flex gap-3">
                    {[{ label: 'Pendiente', color: '#E53935', bg: 'rgba(229,57,53,0.1)' }, { label: 'Aplazado', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' }, { label: 'Completado', color: '#00ff87', bg: 'rgba(0,255,135,0.1)' }].map(item => (
                        <div key={item.label} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ background: item.bg, color: item.color, border: `1px solid ${item.color}40` }}>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }}></div>
                            {item.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* Desktop calendar grid */}
            <div className="hidden md:grid grid-cols-7 gap-2">
                {DAYS.map(day => {
                    const daySlots = currentSlots.filter(s => s.day === day);
                    const dayMatches = matches.filter(m => daySlots.some(s => s.id === m.slot));
                    return (
                        <div key={day} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', minHeight: 120 }}>
                            <div className="p-2.5 text-center text-xs font-bold uppercase tracking-wider" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border)', color: dayMatches.length > 0 ? 'white' : 'var(--text-3)' }}>
                                {day.substring(0, 3)}
                                {dayMatches.length > 0 && (
                                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(229,57,53,0.2)', color: '#E53935' }}>
                                        {dayMatches.length}
                                    </span>
                                )}
                            </div>
                            <div className="p-2 space-y-1.5">
                                {dayMatches.length === 0 ? (
                                    <div className="flex items-center justify-center py-6">
                                        <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>Sin partidos</span>
                                    </div>
                                ) : (
                                    dayMatches
                                        .sort((a, b) => {
                                            const sA = currentSlots.find(s => s.id === a.slot);
                                            const sB = currentSlots.find(s => s.id === b.slot);
                                            return (sA?.hour || '').localeCompare(sB?.hour || '');
                                        })
                                        .map(match => {
                                            const slot = currentSlots.find(s => s.id === match.slot);
                                            const sc = match.completed ? '#00ff87' : match.postponed ? '#F59E0B' : '#E53935';
                                            const sb = match.completed ? 'rgba(0,255,135,0.07)' : match.postponed ? 'rgba(245,158,11,0.07)' : 'rgba(229,57,53,0.07)';
                                            return (
                                                <div key={match.id} className="p-2 rounded-lg" style={{ background: sb, border: `1px solid ${sc}30` }}>
                                                    <div className="text-[10px] font-mono font-bold mb-1" style={{ color: sc }}>{slot?.hour}</div>
                                                    <div className="text-[10px] font-medium text-white leading-tight truncate">{match.t1.name}</div>
                                                    <div className="text-[10px] text-center my-0.5" style={{ color: 'var(--text-3)' }}>vs</div>
                                                    <div className="text-[10px] font-medium text-white leading-tight truncate">{match.t2.name}</div>
                                                    {match.completed && match.score && (
                                                        <div className="text-[10px] text-center mt-1 font-bold" style={{ color: '#00ff87' }}>{match.score}</div>
                                                    )}
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Mobile: list by day */}
            <div className="md:hidden space-y-3">
                {DAYS.map(day => {
                    const daySlots = currentSlots.filter(s => s.day === day);
                    const dayMatches = matches.filter(m => daySlots.some(s => s.id === m.slot));
                    if (dayMatches.length === 0) return null;
                    return (
                        <div key={day} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                            <div className="p-3 font-bold text-white text-sm" style={{ background: 'rgba(229,57,53,0.1)', borderBottom: '1px solid var(--border)' }}>
                                {day} <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-2)' }}>({dayMatches.length} partido{dayMatches.length !== 1 ? 's' : ''})</span>
                            </div>
                            <div className="p-3 space-y-2">
                                {dayMatches
                                    .sort((a, b) => {
                                        const sA = currentSlots.find(s => s.id === a.slot);
                                        const sB = currentSlots.find(s => s.id === b.slot);
                                        return (sA?.hour || '').localeCompare(sB?.hour || '');
                                    })
                                    .map(match => {
                                        const slot = currentSlots.find(s => s.id === match.slot);
                                        const sc = match.completed ? '#00ff87' : match.postponed ? '#F59E0B' : '#E53935';
                                        return (
                                            <div key={match.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ border: `1px solid ${sc}25`, background: `${sc}08` }}>
                                                <span className="text-sm font-mono font-bold w-14 shrink-0" style={{ color: sc }}>{slot?.hour}</span>
                                                <div className="flex-1 min-w-0 text-sm">
                                                    <span className="font-medium text-white">{match.t1.name}</span>
                                                    <span className="text-xs mx-1.5" style={{ color: 'var(--text-3)' }}>vs</span>
                                                    <span className="font-medium text-white">{match.t2.name}</span>
                                                </div>
                                                {match.completed && <span className="text-xs font-bold shrink-0" style={{ color: '#00ff87' }}>{match.score}</span>}
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        </div>
                    );
                })}
                {matches.length === 0 && (
                    <div className="text-center py-12 rounded-2xl" style={{ border: '2px dashed var(--border)' }}>
                        <Calendar size={32} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
                        <p style={{ color: 'var(--text-2)' }}>No hay partidos programados.</p>
                    </div>
                )}
            </div>
        </div>
    );
});

export default function Dashboard({ onNavigate, currentPath }) {
    const { user, logout } = useAuth();
    const { sport, setSport, setRole, tennisCategory, setTennisCategory } = useGame();
    const { data, currentSlots, updateTeamAvailability, updateCourtCount, saveMatchResult, createSchedule, generateDemoData, postponeMatch, registerWalkover, importPlayers, deleteTeam } = useData();
    const { unreadCount } = useNotifications();

    // Navigation State
    const [activeTab, setActiveTab] = useState('home'); // home, schedule, teams, standings, courts, availability, history, stats, calendar
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Overlay State
    const [chatMatch, setChatMatch] = useState(null);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfilesModal, setShowProfilesModal] = useState(false);

    // Local Data State
    const [selectedAvailability, setSelectedAvailability] = useState([]);
    const [editingTeamId, setEditingTeamId] = useState(null);
    const [editingDay, setEditingDay] = useState('Lunes');
    const [generationLog, setGenerationLog] = useState("");
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState("");

    // Derived Data
    const teams = data?.teams || [];
    const matches = data?.matches || [];
    const courtAvailability = data?.courts || {};
    const isAdmin = user?.role === 'admin';
    const isTennis = sport === 'tennis';

    // Initialize Role from Auth
    useEffect(() => {
        if (user) {
            setRole(user.role);
        }
    }, [user, setRole]);

    // Scroll active tab into view when it changes
    const tabsNavRef = useRef(null);
    useEffect(() => {
        if (!tabsNavRef.current) return;
        const activeBtn = tabsNavRef.current.querySelector('[data-tab="' + activeTab + '"]');
        if (activeBtn) activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, [activeTab]);

    // Initialize Courts
    useEffect(() => {
        if (currentSlots.length > 0 && Object.keys(courtAvailability).length === 0 && sport) {
            // const maxCourts = sport === 'padel' ? 3 : 7;
            // Unused let initialCourts removed
            // const initialCourts = currentSlots.reduce((acc, slot) => ({ ...acc, [slot.id]: maxCourts }), {});
            // updateData({ courts: initialCourts }); // Skipped for now
        }
    }, [currentSlots, courtAvailability, sport]);

    // --- Actions ---

    const handleBulkImport = () => {
        if (!importText.trim()) return;

        // Parse text
        const lines = importText.trim().split('\n');
        const players = lines.map(line => {
            // Split by tab (Excel copy) or comma
            const parts = line.includes('\t') ? line.split('\t') : line.split(',');
            return {
                name: parts[0]?.trim(),
                group: parts[1]?.trim(),
                availability: parts[2]?.trim() // Expected: "Lunes 10:00, Martes 12:00"
            };
        }).filter(p => p.name); // Filter empty lines

        if (players.length === 0) {
            alert("No se detectaron datos válidos.");
            return;
        }

        if (confirm(`¿Importar ${players.length} jugadores?`)) {
            importPlayers(players);
            setShowImportModal(false);
            setImportText("");
        }
    };

    // ⚡ useCallback: handlers estables para que los sub-componentes memoizados no re-renderizen
    const toggleAvailability = useCallback((slotId) => {
        setSelectedAvailability(prev =>
            prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
        );
    }, []);

    const saveTeamAvailability = useCallback((teamId) => {
        setSelectedAvailability(prev => {
            updateTeamAvailability(teamId, prev);
            return [];
        });
        setEditingTeamId(null);
    }, [updateTeamAvailability]);

    const startEditing = useCallback((team) => {
        setEditingTeamId(team.id);
        setSelectedAvailability(team.availability || []);
        setEditingDay('Lunes');
    }, []);

    const updateCourtCountHandler = useCallback((slotId, delta) => {
        if (!isAdmin) return;
        const maxCourts = sport === 'padel' ? 3 : 7;
        const currentCount = courtAvailability[slotId] || 0;
        const newCount = Math.max(0, Math.min(maxCourts, currentCount + delta));
        updateCourtCount(slotId, newCount);
    }, [isAdmin, sport, courtAvailability, updateCourtCount]);

    const fillDailyCourts = useCallback((day, count) => {
        if (!isAdmin) return;
        currentSlots.filter(s => s.day === day).forEach(s => {
            updateCourtCount(s.id, count);
        });
    }, [isAdmin, currentSlots, updateCourtCount]);

    const generateWeeklyScheduleHandler = useCallback(() => {
        if (!isAdmin) return;
        let schedule = [];
        let availableTeams = [...teams];
        let scheduledTeamIds = new Set();
        let weeklyCourts = { ...courtAvailability };
        const matchHistory = {};
        matches.forEach(m => { matchHistory[`${m.t1.id}-${m.t2.id}`] = true; matchHistory[`${m.t2.id}-${m.t1.id}`] = true; });
        let possibleMatchups = [];
        for (let i = 0; i < availableTeams.length; i++) {
            for (let j = i + 1; j < availableTeams.length; j++) {
                const t1 = availableTeams[i];
                const t2 = availableTeams[j];
                if (matchHistory[`${t1.id}-${t2.id}`]) continue;
                if (t1.group && t2.group && t1.group !== t2.group) continue;
                const validSlots = t1.availability.filter(slot => t2.availability.includes(slot) && (weeklyCourts[slot] || 0) > 0);
                if (validSlots.length > 0) {
                    possibleMatchups.push({ t1, t2, validSlots, difficulty: validSlots.length });
                }
            }
        }
        possibleMatchups.sort((a, b) => a.difficulty - b.difficulty);
        possibleMatchups.forEach(match => {
            if (!scheduledTeamIds.has(match.t1.id) && !scheduledTeamIds.has(match.t2.id)) {
                const finalSlot = match.validSlots.find(slot => (weeklyCourts[slot] || 0) > 0);
                if (finalSlot) {
                    schedule.push({ t1: match.t1, t2: match.t2, slot: finalSlot });
                    scheduledTeamIds.add(match.t1.id);
                    scheduledTeamIds.add(match.t2.id);
                    weeklyCourts[finalSlot]--;
                }
            }
        });

        createSchedule(schedule);

        const unassigned = teams.filter(t => !scheduledTeamIds.has(t.id));
        setGenerationLog(`Jornada generada: ${schedule.length} partidos. Sin jugar: ${unassigned.length} parejas.`);
        setActiveTab('schedule');
    }, [isAdmin, teams, matches, courtAvailability, createSchedule]);

    const submitResultHandler = useCallback((matchId, score, winnerId) => {
        if (!isAdmin) return;
        saveMatchResult(matchId, score, winnerId);
    }, [isAdmin, saveMatchResult]);

    const postponeMatchHandler = useCallback((matchId) => {
        if (!isAdmin) return;
        if (confirm("¿Seguro que quieres aplazar este partido?")) {
            postponeMatch(matchId);
        }
    }, [isAdmin, postponeMatch]);

    const registerWalkoverHandler = useCallback((matchId, winnerId) => {
        if (!isAdmin) return;
        if (confirm("¿Confirmar victoria por W.O. (Walkover)?\nEl ganador recibirá 3 puntos y el perdedor 0.")) {
            registerWalkover(matchId, winnerId);
        }
    }, [isAdmin, registerWalkover]);

    const renderContent = () => {
        if (!sport) {
            // Home / Dashboard Landing — versión enriquecida
            const hours = new Date().getHours();
            const greeting = hours < 12 ? 'Buenos días' : hours < 20 ? 'Buenas tardes' : 'Buenas noches';
            const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

            return (
                <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 space-y-8">

                    {/* ── Saludo personalizado ── */}
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-widest mb-1 capitalize" style={{ color: 'var(--text-3)' }}>{dateStr}</p>
                            <h2 className="text-3xl font-bold text-white">
                                {greeting}, <span className="text-brand-gradient">{user?.name?.split(' ')[0]}</span> 👋
                            </h2>
                            <p className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>
                                {isAdmin ? 'Panel de gestión · Escuela de Tenis Marineda' : 'Tu espacio de resultados y partidos'}
                            </p>
                        </div>
                        {isAdmin && (
                            <span className="hidden md:flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                                style={{ background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.3)', color: '#E53935' }}>
                                ⚡ Admin
                            </span>
                        )}
                    </div>

                    {/* ── Tarjetas de deporte (CTA principal) ── */}
                    <div className="grid md:grid-cols-2 gap-5">
                        {/* Pádel */}
                        <div
                            onClick={() => { setSport('padel'); setActiveTab(isAdmin ? 'schedule' : 'availability'); }}
                            className="rounded-2xl cursor-pointer relative overflow-hidden group transition-all duration-200"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                            onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(229,57,53,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(229,57,53,0.12)'; }}
                            onMouseLeave={e => { e.currentTarget.style.border = '1px solid var(--border)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                        >
                            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, transparent, rgba(229,57,53,0.8), transparent)' }} />
                            <div className="p-7">
                                <div className="flex items-start justify-between mb-5">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                                        style={{ background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.25)' }}>🏓</div>
                                    <span className="text-xs font-bold px-2 py-1 rounded-full"
                                        style={{ background: 'rgba(229,57,53,0.12)', color: '#E53935', border: '1px solid rgba(229,57,53,0.25)' }}>
                                        Liga activa
                                    </span>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-1">Pádel</h3>
                                <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>Torneos por parejas, jornadas semanales y ranking en tiempo real.</p>
                                <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#E53935' }}>
                                    {isAdmin ? 'Ver jornada' : 'Ver mis partidos'} <ChevronRight size={14} />
                                </div>
                            </div>
                        </div>

                        {/* Tenis */}
                        <div
                            onClick={() => { setSport('tennis'); setActiveTab(isAdmin ? 'schedule' : 'availability'); }}
                            className="rounded-2xl cursor-pointer relative overflow-hidden transition-all duration-200"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                            onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(255,193,7,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,193,7,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.border = '1px solid var(--border)'; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                        >
                            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,193,7,0.7), transparent)' }} />
                            <div className="p-7">
                                <div className="flex items-start justify-between mb-5">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                                        style={{ background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.2)' }}>🎾</div>
                                    <div className="flex gap-1.5">
                                        <span className="text-xs font-bold px-2 py-1 rounded-full"
                                            style={{ background: 'rgba(255,193,7,0.1)', color: '#FFC107', border: '1px solid rgba(255,193,7,0.25)' }}>Adultos</span>
                                        <span className="text-xs font-bold px-2 py-1 rounded-full"
                                            style={{ background: 'rgba(255,193,7,0.07)', color: '#FFC107', border: '1px solid rgba(255,193,7,0.2)' }}>Juveniles</span>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-1">Tenis</h3>
                                <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>Escuela por categorías, rankings individuales y estadísticas detalladas.</p>
                                <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#FFC107' }}>
                                    {isAdmin ? 'Ver jornada' : 'Ver mis partidos'} <ChevronRight size={14} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Funcionalidades destacadas ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { emoji: '📅', title: 'Jornadas auto.', desc: 'Genera el calendario semanal en un clic.', action: () => { setSport('padel'); setActiveTab('schedule'); } },
                            { emoji: '🏆', title: 'Rankings', desc: 'Clasificaciones actualizadas en tiempo real.', action: () => { setSport('padel'); setActiveTab('standings'); } },
                            { emoji: '📊', title: 'Estadísticas', desc: 'Victorias, rachas y rendimiento personal.', action: () => { setSport('padel'); setActiveTab('stats'); } },
                            { emoji: '📰', title: 'Noticias', desc: 'Últimas novedades de la escuela.', action: () => onNavigate && onNavigate('/noticias') },
                        ].map(f => (
                            <button
                                key={f.title}
                                onClick={f.action}
                                className="rounded-xl p-4 text-left transition-all"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                                onMouseEnter={e => { e.currentTarget.style.border = '1px solid rgba(0,212,255,0.3)'; e.currentTarget.style.background = 'rgba(0,212,255,0.04)'; }}
                                onMouseLeave={e => { e.currentTarget.style.border = '1px solid var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
                            >
                                <div className="text-2xl mb-2">{f.emoji}</div>
                                <p className="font-bold text-white text-xs mb-0.5">{f.title}</p>
                                <p className="text-xs leading-tight" style={{ color: 'var(--text-3)' }}>{f.desc}</p>
                            </button>
                        ))}
                    </div>

                    {/* ── Panel de admin ── */}
                    {isAdmin && (
                        <div className="rounded-2xl p-5" style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.18)' }}>
                            <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--cyan)' }}>
                                <Settings size={14} /> Acciones rápidas de administración
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { label: '🏓 Jugadores Pádel', action: () => { setSport('padel'); setActiveTab('teams'); } },
                                    { label: '🎾 Jugadores Tenis', action: () => { setSport('tennis'); setActiveTab('teams'); } },
                                    { label: '📅 Generar Jornada Pádel', action: () => { setSport('padel'); setActiveTab('schedule'); } },
                                    { label: '📅 Generar Jornada Tenis', action: () => { setSport('tennis'); setActiveTab('schedule'); } },
                                    { label: '🏆 Rankings', action: () => { setSport('padel'); setActiveTab('standings'); } },
                                ].map(a => (
                                    <button
                                        key={a.label}
                                        onClick={a.action}
                                        className="text-xs font-medium px-3 py-2 rounded-lg transition-all"
                                        style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-2)' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.18)'; e.currentTarget.style.color = 'white'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,212,255,0.08)'; e.currentTarget.style.color = 'var(--text-2)'; }}
                                    >
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // Sport Selected View
        return (
            <div className="max-w-6xl mx-auto">
                {activeTab === 'availability' && <MyAvailabilityView teams={teams} currentSlots={currentSlots} />}
                {activeTab === 'schedule' && <ScheduleView matches={matches} isAdmin={isAdmin} generateWeeklySchedule={generateWeeklyScheduleHandler} generationLog={generationLog} currentSlots={currentSlots} submitResult={submitResultHandler} postponeMatch={postponeMatchHandler} registerWalkover={registerWalkoverHandler} onChatClick={(match) => setChatMatch(match)} />}
                {activeTab === 'teams' && <TeamsView teams={teams} isAdmin={isAdmin} setShowImportModal={setShowImportModal} editingTeamId={editingTeamId} setEditingTeamId={setEditingTeamId} editingDay={editingDay} setEditingDay={setEditingDay} currentSlots={currentSlots} toggleAvailability={toggleAvailability} selectedAvailability={selectedAvailability} saveTeamAvailability={saveTeamAvailability} startEditing={startEditing} generateDemoData={generateDemoData} onDeleteTeam={deleteTeam} />}
                {activeTab === 'courts' && <CourtsView sport={sport} tennisCategory={tennisCategory} isAdmin={isAdmin} currentSlots={currentSlots} courtAvailability={courtAvailability} fillDailyCourts={fillDailyCourts} updateCourtCount={updateCourtCountHandler} />}
                {activeTab === 'history' && <HistoryView matches={matches} currentSlots={currentSlots} />}
                {activeTab === 'stats' && <StatsView matches={matches} teams={teams} isAdmin={isAdmin} />}
                {activeTab === 'calendar' && <CalendarView matches={matches} currentSlots={currentSlots} />}
                {activeTab === 'standings' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        {[...new Set(teams.map(t => t.group || 'General').filter(Boolean))].sort().map(group => {
                            const groupTeams = teams.filter(t => (t.group || 'General') === group).sort((a, b) => b.points - a.points);
                            const topPlayer = groupTeams[0];

                            return (
                                <div key={group} className="space-y-4">
                                    {/* Highlight Top Player */}
                                    {topPlayer && (
                                        <div className="p-0.5 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(255,193,7,0.5), rgba(255,193,7,0.1), transparent)' }}>
                                            <div className="p-4 rounded-2xl flex items-center gap-4" style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,193,7,0.2)' }}>
                                                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shadow-lg" style={{ background: 'rgba(255,193,7,0.2)', border: '1px solid rgba(255,193,7,0.4)', color: '#FFC107' }}>
                                                    <Trophy size={24} />
                                                </div>
                                                <div>
                                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#FFC107' }}>Líder del Grupo {group}</span>
                                                    <h3 className="text-lg font-bold text-white">{topPlayer.name}</h3>
                                                </div>
                                                <div className="ml-auto text-right">
                                                    <span className="block text-2xl font-bold" style={{ color: '#FFC107' }}>{topPlayer.points}</span>
                                                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>Puntos</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <Card className="overflow-hidden">
                                        <div className="p-4 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)' }}>
                                            <Trophy style={{ color: 'var(--cyan)' }} size={20} />
                                            <h3 className="font-bold text-white">{group}</h3>
                                        </div>

                                        {/* Mobile View */}
                                        <div className="block md:hidden">
                                            {groupTeams.map((t, i) => (
                                                <div key={t.id} className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-400 text-black shadow-md' :
                                                            i === 1 ? 'bg-slate-500 text-white shadow-sm' :
                                                                i === 2 ? 'bg-amber-700 text-white shadow-sm' :
                                                                    ''
                                                            }`} style={i > 2 ? { background: 'rgba(255,255,255,0.08)', color: 'var(--text-2)' } : {}}>
                                                            {i + 1}
                                                        </div>
                                                        <div>
                                                            <span className="font-medium text-white block">{t.name}</span>
                                                            <span className="text-[10px] flex items-center gap-1">
                                                                {i < 2 ? <span style={{ color: '#00ff87' }}>▲ Subiendo</span> : <span style={{ color: 'var(--text-3)' }}>— Estable</span>}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="font-bold text-lg" style={{ color: '#E53935' }}>{t.points} pts</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Desktop View */}
                                        <table className="w-full text-sm text-left hidden md:table">
                                            <thead className="text-xs font-bold tracking-wider uppercase" style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
                                                <tr>
                                                    <th className="p-4 w-16 text-center">Pos</th>
                                                    <th className="p-4">Pareja / Jugador</th>
                                                    <th className="p-4 text-center">Tendencia</th>
                                                    <th className="p-4 text-center">PJ</th>
                                                    <th className="p-4 text-center">Puntos</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {groupTeams.map((t, i) => (
                                                    <tr key={t.id} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                                                        <td className="p-4 text-center">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mx-auto ${i === 0 ? 'bg-yellow-400 text-black shadow-md' :
                                                                i === 1 ? 'bg-slate-500 text-white shadow-sm' :
                                                                    i === 2 ? 'bg-amber-700 text-white shadow-sm' : ''
                                                                }`} style={i > 2 ? { background: 'rgba(255,255,255,0.08)', color: 'var(--text-2)' } : {}}>
                                                                {i + 1}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 font-medium text-white">{t.name}</td>
                                                        <td className="p-4 text-center">
                                                            {i < 2 ? (
                                                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(0,255,135,0.1)', color: '#00ff87', border: '1px solid rgba(0,255,135,0.2)' }}>
                                                                    ▲ Subiendo
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                                                                    — Estable
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-center font-mono" style={{ color: 'var(--text-2)' }}>{t.matchesPlayed || 0}</td>
                                                        <td className="p-4 text-center font-bold text-lg" style={{ color: '#E53935' }}>{t.points}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </Card>
                                </div>
                            );
                        })}
                        {teams.length === 0 && <div className="text-center py-12" style={{ color: 'var(--text-3)' }}>No hay jugadores registrados en el ranking.</div>}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen font-sans text-white flex" style={{ background: 'var(--bg-deepest)' }}>
            {showImportModal && <ImportModal importText={importText} setImportText={setImportText} setShowImportModal={setShowImportModal} handleBulkImport={handleBulkImport} />}
            {chatMatch && <MatchChat match={chatMatch} onClose={() => setChatMatch(null)} />}

            {/* Notificaciones mobile (bottom sheet) */}
            {showNotifications && (
                <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowNotifications(false)}>
                    <div className="w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <NotificationsPanel onClose={() => setShowNotifications(false)} />
                    </div>
                </div>
            )}

            {/* Modal selector de Perfiles (admin) */}
            {showProfilesModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} onClick={() => setShowProfilesModal(false)}>
                    <div className="rounded-2xl p-6 max-w-sm w-full shadow-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-hi)' }} onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Users size={20} style={{ color: 'var(--cyan)' }} /> Gestión de Perfiles
                            </h3>
                            <button onClick={() => setShowProfilesModal(false)} style={{ color: 'var(--text-3)' }}><X size={18} /></button>
                        </div>
                        <p className="text-sm mb-5" style={{ color: 'var(--text-2)' }}>Selecciona el deporte para gestionar jugadores y parejas.</p>
                        <div className="space-y-3">
                            <button
                                onClick={() => { setSport('padel'); setActiveTab('teams'); setShowProfilesModal(false); }}
                                className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all"
                                style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.25)', color: 'white' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(229,57,53,0.2)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(229,57,53,0.1)'}
                            >
                                <span className="text-2xl">🏓</span>
                                <div>
                                    <p className="font-bold">Parejas de Pádel</p>
                                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>Gestionar parejas, grupos y disponibilidad</p>
                                </div>
                            </button>
                            <button
                                onClick={() => { setSport('tennis'); setActiveTab('teams'); setShowProfilesModal(false); }}
                                className="w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all"
                                style={{ background: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.2)', color: 'white' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,193,7,0.15)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,193,7,0.08)'}
                            >
                                <span className="text-2xl">🎾</span>
                                <div>
                                    <p className="font-bold">Jugadores de Tenis</p>
                                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>Adultos y Juveniles — disponibilidad y grupos</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar (Desktop) */}
            <aside className="hidden md:flex flex-col w-64 fixed h-full z-20" style={{ background: 'var(--bg-nav)', borderRight: '1px solid var(--border)' }}>
                <div className="p-6 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="w-10 h-10 rounded-xl p-1.5 shrink-0" style={{ background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.3)' }}>
                        <img src="/src/assets/logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h1 className="font-bold leading-none text-white">Escuela</h1>
                        <span className="text-xs font-bold" style={{ color: 'var(--cyan)' }}>Marineda</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <button
                        onClick={() => setSport(null)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                        style={!sport && (!currentPath || currentPath === '/') ? { background: 'linear-gradient(135deg, rgba(229,57,53,0.25), rgba(229,57,53,0.1))', border: '1px solid rgba(229,57,53,0.4)', color: 'white' } : { color: 'var(--text-3)' }}
                        onMouseEnter={e => { if (!(!sport && (!currentPath || currentPath === '/'))) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white'; } }}
                        onMouseLeave={e => { if (!(!sport && (!currentPath || currentPath === '/'))) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-3)'; } }}
                    >
                        <Home size={20} /> Inicio
                    </button>

                    <button
                        onClick={() => onNavigate && onNavigate('/noticias')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                        style={currentPath === '/noticias' ? { background: 'linear-gradient(135deg, rgba(229,57,53,0.25), rgba(229,57,53,0.1))', border: '1px solid rgba(229,57,53,0.4)', color: 'white' } : { color: 'var(--text-3)' }}
                        onMouseEnter={e => { if (currentPath !== '/noticias') { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white'; } }}
                        onMouseLeave={e => { if (currentPath !== '/noticias') { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-3)'; } }}
                    >
                        <Newspaper size={20} /> Noticias
                    </button>





                    <div className="pt-4 pb-2 px-4 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Deportes</div>

                    <button
                        onClick={() => { setSport('padel'); setActiveTab(isAdmin ? 'schedule' : 'availability'); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                        style={sport === 'padel' ? { background: 'rgba(229,57,53,0.15)', borderLeft: '3px solid #E53935', color: 'white', paddingLeft: '13px' } : { color: 'var(--text-3)' }}
                        onMouseEnter={e => { if (sport !== 'padel') { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white'; } }}
                        onMouseLeave={e => { if (sport !== 'padel') { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-3)'; } }}
                    >
                        <Activity size={20} /> Pádel
                    </button>
                    <button
                        onClick={() => { setSport('tennis'); setActiveTab(isAdmin ? 'schedule' : 'availability'); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                        style={sport === 'tennis' ? { background: 'rgba(255,193,7,0.12)', borderLeft: '3px solid #FFC107', color: 'white', paddingLeft: '13px' } : { color: 'var(--text-3)' }}
                        onMouseEnter={e => { if (sport !== 'tennis') { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white'; } }}
                        onMouseLeave={e => { if (sport !== 'tennis') { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-3)'; } }}
                    >
                        <Activity size={20} /> Tenis
                    </button>

                    {isAdmin && (
                        <>
                            <div className="pt-4 pb-2 px-4 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Administración</div>
                            <button
                                onClick={() => setShowProfilesModal(true)}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all" style={{ color: 'var(--text-3)' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-3)'; }}
                            >
                                <Users size={20} /> Perfiles
                            </button>
                        </>
                    )}

                    <div className="pt-4 pb-2 px-4 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>Personal</div>
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(v => !v)}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                            style={showNotifications ? { background: 'linear-gradient(135deg, rgba(229,57,53,0.25), rgba(229,57,53,0.1))', border: '1px solid rgba(229,57,53,0.4)', color: 'white' } : { color: 'var(--text-3)' }}
                            onMouseEnter={e => { if (!showNotifications) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white'; } }}
                            onMouseLeave={e => { if (!showNotifications) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-3)'; } }}
                        >
                            <div className="relative">
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: '#E53935' }}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </div>
                            Notificaciones
                            {unreadCount > 0 && (
                                <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(229,57,53,0.2)', color: '#E53935' }}>
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                        {showNotifications && (
                            <div className="fixed left-64 top-20 z-50 ml-2">
                                <NotificationsPanel onClose={() => setShowNotifications(false)} />
                            </div>
                        )}
                    </div>
                </nav>







                <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3 mb-3 px-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0"
                            style={{ background: 'linear-gradient(135deg, rgba(229,57,53,0.8), rgba(229,57,53,0.5))', border: '1px solid rgba(229,57,53,0.4)' }}>
                            {user?.name?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                            <p className="text-xs capitalize" style={{ color: 'var(--cyan)' }}>{user?.role}</p>
                        </div>
                    </div>
                    <button onClick={logout} className="w-full flex items-center gap-2 justify-center px-4 py-2 rounded-lg transition-all text-sm"
                        style={{ background: 'rgba(229,57,53,0.08)', border: '1px solid rgba(229,57,53,0.2)', color: 'var(--text-2)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(229,57,53,0.2)'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(229,57,53,0.08)'; e.currentTarget.style.color = 'var(--text-2)'; }}
                    >
                        <LogOut size={16} /> Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 md:ml-64 flex flex-col min-h-screen">

                {/* Mobile Header */}
                <header className="md:hidden p-4 flex justify-between items-center sticky top-0 z-30"
                    style={{ background: 'rgba(6,13,26,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg p-1" style={{ background: 'rgba(229,57,53,0.15)', border: '1px solid rgba(229,57,53,0.3)' }}>
                            <img src="/src/assets/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="font-bold text-white">Marineda</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowNotifications(v => !v)}
                            className="relative p-2 rounded-lg transition-colors"
                            style={{ color: 'var(--text-2)' }}
                        >
                            <Bell size={22} />
                            {unreadCount > 0 && (
                                <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: '#E53935' }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="transition-colors p-1" style={{ color: 'var(--text-2)' }}>
                            {isMobileMenuOpen ? <X /> : <Menu />}
                        </button>
                    </div>
                </header>

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 z-20 pt-20 px-4 space-y-3" style={{ background: 'var(--bg-nav)', backdropFilter: 'blur(16px)' }}>
                        <button onClick={() => { setSport(null); setIsMobileMenuOpen(false); }} className="w-full p-4 rounded-xl text-left font-bold text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}>Inicio</button>
                        <button onClick={() => { setSport('padel'); setActiveTab(isAdmin ? 'schedule' : 'availability'); setIsMobileMenuOpen(false); }} className="w-full p-4 rounded-xl text-left font-bold text-white" style={{ background: 'rgba(229,57,53,0.1)', border: '1px solid rgba(229,57,53,0.3)' }}>🏓 Pádel</button>
                        <button onClick={() => { setSport('tennis'); setActiveTab(isAdmin ? 'schedule' : 'availability'); setIsMobileMenuOpen(false); }} className="w-full p-4 rounded-xl text-left font-bold text-white" style={{ background: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.25)' }}>🎾 Tenis</button>
                        <button onClick={logout} className="w-full p-4 rounded-xl text-left font-bold mt-6" style={{ background: 'rgba(229,57,53,0.08)', border: '1px solid rgba(229,57,53,0.2)', color: '#ff6b6b' }}>Cerrar Sesión</button>
                    </div>
                )}

                {/* Top Bar (Contextual) */}
                {sport && (
                    <div className="sticky top-0 md:top-0 z-10 px-6 py-3 flex items-center justify-between"
                        style={{ background: 'rgba(6,13,26,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
                        <div className="flex items-center gap-4">
                            <h2 className="text-lg font-bold text-white capitalize flex items-center gap-2">
                                <span style={{ color: sport === 'padel' ? '#E53935' : '#FFC107' }}>
                                    {sport === 'padel' ? '🏓' : '🎾'}
                                </span>
                                {sport === 'padel' ? 'Pádel' : 'Tenis'}
                                {isTennis && (
                                    <select
                                        value={tennisCategory}
                                        onChange={(e) => setTennisCategory(e.target.value)}
                                        className="text-xs rounded px-2 py-1 font-bold outline-none cursor-pointer ml-2 cyber-input"
                                        style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                                    >
                                        <option value="adults">Adultos</option>
                                        <option value="juveniles">Juveniles</option>
                                    </select>
                                )}
                            </h2>
                        </div>

                        {/* Sub-navigation Tabs */}
                        <div ref={tabsNavRef} className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', scrollbarWidth: 'none' }}>
                            {!isAdmin && (
                                <button
                                    data-tab="availability"
                                    onClick={() => setActiveTab('availability')}
                                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                                    style={activeTab === 'availability'
                                        ? { background: 'linear-gradient(135deg, rgba(229,57,53,0.3), rgba(229,57,53,0.15))', color: 'white', border: '1px solid rgba(229,57,53,0.4)' }
                                        : { color: 'var(--text-3)' }}
                                >
                                    Mi Disponibilidad
                                </button>
                            )}
                            <button
                                data-tab="schedule"
                                onClick={() => setActiveTab('schedule')}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                                style={activeTab === 'schedule'
                                    ? { background: 'linear-gradient(135deg, rgba(229,57,53,0.3), rgba(229,57,53,0.15))', color: 'white', border: '1px solid rgba(229,57,53,0.4)' }
                                    : { color: 'var(--text-3)' }}
                            >
                                Jornada
                            </button>
                            <button
                                data-tab="teams"
                                onClick={() => setActiveTab('teams')}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                                style={activeTab === 'teams'
                                    ? { background: 'linear-gradient(135deg, rgba(229,57,53,0.3), rgba(229,57,53,0.15))', color: 'white', border: '1px solid rgba(229,57,53,0.4)' }
                                    : { color: 'var(--text-3)' }}
                            >
                                Parejas
                            </button>
                            <button
                                data-tab="standings"
                                onClick={() => setActiveTab('standings')}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                                style={activeTab === 'standings'
                                    ? { background: 'linear-gradient(135deg, rgba(229,57,53,0.3), rgba(229,57,53,0.15))', color: 'white', border: '1px solid rgba(229,57,53,0.4)' }
                                    : { color: 'var(--text-3)' }}
                            >
                                Ranking
                            </button>
                            <button
                                data-tab="history"
                                onClick={() => setActiveTab('history')}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                                style={activeTab === 'history'
                                    ? { background: 'linear-gradient(135deg, rgba(229,57,53,0.3), rgba(229,57,53,0.15))', color: 'white', border: '1px solid rgba(229,57,53,0.4)' }
                                    : { color: 'var(--text-3)' }}
                            >
                                Historial
                            </button>
                            <button
                                data-tab="stats"
                                onClick={() => setActiveTab('stats')}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                                style={activeTab === 'stats'
                                    ? { background: 'linear-gradient(135deg, rgba(229,57,53,0.3), rgba(229,57,53,0.15))', color: 'white', border: '1px solid rgba(229,57,53,0.4)' }
                                    : { color: 'var(--text-3)' }}
                            >
                                Estadísticas
                            </button>
                            <button
                                data-tab="calendar"
                                onClick={() => setActiveTab('calendar')}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                                style={activeTab === 'calendar'
                                    ? { background: 'linear-gradient(135deg, rgba(229,57,53,0.3), rgba(229,57,53,0.15))', color: 'white', border: '1px solid rgba(229,57,53,0.4)' }
                                    : { color: 'var(--text-3)' }}
                            >
                                Calendario
                            </button>
                            {isAdmin && (
                                <button
                                    data-tab="courts"
                                    onClick={() => setActiveTab('courts')}
                                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                                    style={activeTab === 'courts'
                                        ? { background: 'linear-gradient(135deg, rgba(229,57,53,0.3), rgba(229,57,53,0.15))', color: 'white', border: '1px solid rgba(229,57,53,0.4)' }
                                        : { color: 'var(--text-3)' }}
                                >
                                    Pistas
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <main className="p-6 flex-1 overflow-y-auto" style={{ background: 'var(--bg-deepest)' }}>
                    {renderContent()}
                </main>
            </div>
        </div >
    );
}
