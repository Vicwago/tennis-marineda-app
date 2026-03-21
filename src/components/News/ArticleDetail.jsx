import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, User, Share2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const ArticleDetail = ({ articleId, onBack }) => {
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchArticle = async () => {
            if (!articleId) return;

            try {
                const { data, error } = await supabase
                    .from('chronicles')
                    .select('*')
                    .eq('id', articleId)
                    .single();

                if (error) throw error;
                setArticle(data);
            } catch (err) {
                console.error('Error fetching article:', err);
                // Fallback for demo if ID matches mock data
                const mock = MOCK_ARTICLES.find(a => a.id === articleId);
                if (mock) setArticle(mock);
            } finally {
                setLoading(false);
            }
        };

        fetchArticle();
    }, [articleId]);

    if (loading) return <div className="p-8 text-center text-slate-400">Cargando noticia...</div>;
    if (!article) return <div className="p-8 text-center text-red-400">Noticia no encontrada</div>;

    return (
        <div className="max-w-3xl mx-auto bg-slate-900 min-h-screen pb-20">
            {/* Header Image */}
            <div className="relative h-64 md:h-80 w-full">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900"></div>
                <img
                    src={article.image_url || 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=800&auto=format&fit=crop'}
                    alt={article.title}
                    className="w-full h-full object-cover -z-10"
                />
                <button
                    onClick={onBack}
                    className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-brand-red transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
            </div>

            {/* Content */}
            <div className="px-6 -mt-12 relative z-10">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
                        <div className="flex items-center gap-1">
                            <Calendar size={16} />
                            <span>{new Date(article.created_at).toLocaleDateString()}</span>
                        </div>
                        {article.author_name && (
                            <div className="flex items-center gap-1">
                                <User size={16} />
                                <span>{article.author_name}</span>
                            </div>
                        )}
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-6 leading-tight">
                        {article.title}
                    </h1>

                    <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {article.content}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-700 flex justify-end">
                        <button className="flex items-center gap-2 text-brand-yellow hover:text-white transition-colors">
                            <Share2 size={20} />
                            <span>Compartir</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Duplicate mock data for fallback
const MOCK_ARTICLES = [
    {
        id: '1',
        title: 'Resumen Jornada 5: Sorpresas en el Grupo 1',
        content: 'Una semana llena de emociones donde los favoritos han sufrido para mantener sus posiciones. Destacamos el partido entre...',
        image_url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=800&auto=format&fit=crop',
        created_at: new Date().toISOString(),
        author: 'Admin'
    },
    {
        id: '2',
        title: 'Torneo de Navidad: Inscripciones Abiertas',
        content: 'Ya puedes apuntarte al tradicional torneo de Navidad. Plazas limitadas para todas las categorías. ¡No te quedes fuera!',
        image_url: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?q=80&w=800&auto=format&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        author: 'Dirección'
    }
];

export default ArticleDetail;
