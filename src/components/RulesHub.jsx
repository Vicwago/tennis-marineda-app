import React, { useState } from 'react';
import { Book, ChevronDown, ChevronRight, HelpCircle, Info } from 'lucide-react';

const RulesHub = () => {
    const [activeTab, setActiveTab] = useState('rules'); // rules, faq
    const [expandedFaq, setExpandedFaq] = useState(null);

    return (
        <div className="max-w-4xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-brand-dark/10 rounded-xl">
                    <Info className="text-brand-dark" size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Normativa e Información</h1>
                    <p className="text-slate-400 text-sm">Reglas del club y preguntas frecuentes</p>
                </div>
            </div>

            <div className="flex gap-4 mb-6 border-b border-slate-700">
                <button
                    onClick={() => setActiveTab('rules')}
                    className={`pb-3 px-2 font-bold text-sm transition-all ${activeTab === 'rules' ? 'text-brand-yellow border-b-2 border-brand-yellow' : 'text-slate-400 hover:text-white'}`}
                >
                    Normativa General
                </button>
                <button
                    onClick={() => setActiveTab('faq')}
                    className={`pb-3 px-2 font-bold text-sm transition-all ${activeTab === 'faq' ? 'text-brand-yellow border-b-2 border-brand-yellow' : 'text-slate-400 hover:text-white'}`}
                >
                    Preguntas Frecuentes
                </button>
            </div>

            {activeTab === 'rules' && (
                <div className="space-y-6 text-slate-300">
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Book size={20} className="text-brand-red" /> 1. Sistema de Puntuación
                        </h3>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Cada partido ganado otorga <strong className="text-white">3 puntos</strong>.</li>
                            <li>Cada partido perdido otorga <strong className="text-white">1 punto</strong> (por participación).</li>
                            <li>La no presentación (W.O.) otorga <strong className="text-white">0 puntos</strong> al perdedor y 3 al ganador.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Book size={20} className="text-brand-red" /> 2. Reservas y Horarios
                        </h3>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Los partidos deben jugarse en los horarios asignados por la organización.</li>
                            <li>Si una pareja no puede asistir, debe notificarlo con al menos 24h de antelación para reprogramar.</li>
                            <li>Los partidos aplazados deben recuperarse antes del final de la fase de grupos.</li>
                        </ul>
                    </div>

                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Book size={20} className="text-brand-red" /> 3. Ascensos y Descensos
                        </h3>
                        <p className="mb-2">Al final de cada fase:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Los <strong className="text-green-400">2 primeros</strong> de cada grupo ascienden al grupo superior.</li>
                            <li>Los <strong className="text-red-400">2 últimos</strong> descienden al grupo inferior.</li>
                            <li>En caso de empate a puntos, se tendrá en cuenta el enfrentamiento directo y luego la diferencia de sets/juegos.</li>
                        </ul>
                    </div>
                </div>
            )}

            {activeTab === 'faq' && (
                <div className="space-y-4">
                    {FAQS.map((faq, index) => (
                        <div key={index} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                            <button
                                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                                className="w-full p-4 flex justify-between items-center text-left hover:bg-slate-700/50 transition-colors"
                            >
                                <span className="font-bold text-white flex items-center gap-3">
                                    <HelpCircle size={18} className="text-brand-yellow" />
                                    {faq.question}
                                </span>
                                {expandedFaq === index ? <ChevronDown className="text-slate-400" /> : <ChevronRight className="text-slate-400" />}
                            </button>
                            {expandedFaq === index && (
                                <div className="p-4 pt-0 text-slate-300 text-sm leading-relaxed border-t border-slate-700/50 mt-2">
                                    {faq.answer}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const FAQS = [
    {
        question: "¿Cómo puedo cambiar mi disponibilidad?",
        answer: "Entra en la sección de tu deporte (Pádel o Tenis), ve a la pestaña 'Disponibilidad', selecciona tu nombre y marca las horas en las que puedes jugar. Recuerda guardar los cambios."
    },
    {
        question: "¿Qué pasa si llueve?",
        answer: "Si las pistas están impracticables, la organización avisará con antelación para suspender la jornada. Los partidos se reprogramarán automáticamente."
    },
    {
        question: "¿Puedo cambiar de compañero a mitad de temporada?",
        answer: "Solo en casos de lesión justificada y con aprobación de la organización. El nuevo compañero debe tener un nivel similar para no desvirtuar la competición."
    },
    {
        question: "¿Dónde veo mis próximos partidos?",
        answer: "En la pantalla principal de tu deporte, bajo la sección 'Partidos Pendientes'. También puedes ver el calendario completo en la pestaña 'Jornada'."
    }
];

export default RulesHub;
