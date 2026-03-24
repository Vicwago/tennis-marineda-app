import React, { useState, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { Save, Image as ImageIcon, X, Loader2, Upload } from 'lucide-react';

const AdminEditor = ({ onSave, onCancel }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileRef = useRef(null);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Local preview instantly
        setImagePreview(URL.createObjectURL(file));

        setUploading(true);
        setError('');
        try {
            const ext = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from('news-images')
                .upload(fileName, file, { upsert: false });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('news-images')
                .getPublicUrl(fileName);

            setImageUrl(data.publicUrl);
        } catch (err) {
            setError('Error al subir la imagen: ' + err.message);
            setImagePreview('');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = () => {
        setImageUrl('');
        setImagePreview('');
        if (fileRef.current) fileRef.current.value = '';
    };

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
                .insert([{
                    title,
                    content,
                    image_url: imageUrl,
                    author_id: user.id,
                    is_published: true
                }])
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
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Imagen</label>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={handleImageUpload}
                    />

                    {!imagePreview ? (
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            className="w-full h-28 rounded-lg border-2 border-dashed border-slate-600 hover:border-slate-400 flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-50"
                            style={{ background: 'rgba(255,255,255,0.02)' }}
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="animate-spin text-slate-400" size={24} />
                                    <span className="text-xs text-slate-400">Subiendo imagen...</span>
                                </>
                            ) : (
                                <>
                                    <Upload className="text-slate-400" size={24} />
                                    <span className="text-sm text-slate-400">Haz clic para subir una imagen</span>
                                    <span className="text-xs text-slate-600">JPG, PNG, WEBP o GIF · máx 5 MB</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="relative h-40 rounded-lg overflow-hidden border border-slate-700 group">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                                    style={{ background: 'rgba(255,255,255,0.2)' }}
                                >
                                    <ImageIcon size={14} className="inline mr-1" />Cambiar
                                </button>
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                                    style={{ background: 'rgba(220,38,38,0.7)' }}
                                >
                                    <X size={14} className="inline mr-1" />Quitar
                                </button>
                            </div>
                            {uploading && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <Loader2 className="animate-spin text-white" size={28} />
                                </div>
                            )}
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
                        disabled={loading || uploading}
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
