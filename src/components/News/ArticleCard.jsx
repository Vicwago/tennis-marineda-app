import React from 'react';
import { Calendar, User, ArrowRight } from 'lucide-react';

const ArticleCard = ({ article, onClick }) => {
    return (
        <div
            className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-brand-yellow transition-all cursor-pointer group"
            onClick={() => onClick(article)}
        >
            {article.image_url && (
                <div className="h-48 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-60"></div>
                    <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                </div>
            )}

            <div className="p-5">
                <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                    <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        <span>{new Date(article.created_at).toLocaleDateString()}</span>
                    </div>
                    {article.author && (
                        <div className="flex items-center gap-1">
                            <User size={14} />
                            <span>{article.author}</span>
                        </div>
                    )}
                </div>

                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-yellow transition-colors">
                    {article.title}
                </h3>

                <p className="text-slate-400 text-sm line-clamp-3 mb-4">
                    {article.content}
                </p>

                <div className="flex items-center text-brand-yellow text-sm font-medium">
                    Leer más <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
        </div>
    );
};

export default ArticleCard;
