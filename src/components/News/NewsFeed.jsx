import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import ArticleCard from './ArticleCard';
import ArticleDetail from './ArticleDetail';
import AdminEditor from './AdminEditor';
import { Loader2, Newspaper, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NewsFeed = ({ onBack }) => {
    const { user } = useAuth();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [selectedArticleId, setSelectedArticleId] = useState(null);

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        try {
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), 8000)
            );
            const query = supabase
                .from('chronicles')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false });

            const { data, error } = await Promise.race([query, timeout]);

            if (error) {
                console.warn('Error fetching chronicles:', error);
                setArticles(MOCK_ARTICLES);
            } else if (data && data.length > 0) {
                setArticles(data);
            } else {
                setArticles(MOCK_ARTICLES);
            }
        } catch (err) {
            console.warn('Chronicles fetch failed, using mock data:', err.message);
            setArticles(MOCK_ARTICLES);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = (newArticle) => {
        setArticles([newArticle, ...articles]);
        setShowEditor(false);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin text-brand-yellow" size={32} />
            </div>
        );
    }

    // Detail View
    if (selectedArticleId) {
        return (
            <ArticleDetail
                articleId={selectedArticleId}
                onBack={() => setSelectedArticleId(null)}
            />
        );
    }

    // List View
    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2 mr-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                    )}
                    <div className="p-3 bg-brand-red/10 rounded-xl">
                        <Newspaper className="text-brand-red" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Crónica Semanal</h1>
                        <p className="text-slate-400 text-sm">Resumen de la jornada y novedades</p>
                    </div>
                </div>

                {user?.role === 'admin' && !showEditor && (
                    <button
                        onClick={() => setShowEditor(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-yellow text-brand-dark font-bold rounded-lg hover:bg-yellow-400 transition-all shadow-lg shadow-brand-yellow/20"
                    >
                        <Plus size={20} /> Nueva Noticia
                    </button>
                )}
            </div>

            {showEditor && (
                <div className="mb-8">
                    <AdminEditor onSave={handleSave} onCancel={() => setShowEditor(false)} />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {articles.map(article => (
                    <ArticleCard
                        key={article.id}
                        article={article}
                        onClick={(a) => setSelectedArticleId(a.id)}
                    />
                ))}
            </div>
        </div>
    );
};

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

export default NewsFeed;
