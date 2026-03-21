import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Save, Image as ImageIcon, X, Loader2 } from 'lucide-react';

const AdminEditor = ({ onSave, onCancel }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!title.trim() || !content.trim()) {
            setError('El título y el contenido son obligatorios.');
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('chronicles')
                .insert([
                    {
                        title,
                        content,
                        image_url: imageUrl,
                        author_id: user.id,
                        is_published: true
                    }
                ])
                .select();

            if (error) throw error;

            onSave(data[0]);
        } catch (err) {
            console.error('Error saving article:', err);
            setError('Error al guardar la noticia: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Nueva Crónica</h2>
                <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Título</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-yellow outline-none transition-all"
                        placeholder="Ej: Resumen Jornada 5..."
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Imagen (URL)</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-brand-yellow outline-none transition-all"
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                    {imageUrl && (
                        <div className="mt-2 h-32 rounded-lg overflow-hidden border border-slate-700 relative group">
                            <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-xs text-white font-bold">Vista Previa</span>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Contenido</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={10}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-yellow outline-none transition-all font-sans leading-relaxed"
                        placeholder="Escribe aquí el resumen de la jornada..."
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-brand-yellow text-brand-dark font-bold rounded-lg hover:bg-yellow-400 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Publicar
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminEditor;
