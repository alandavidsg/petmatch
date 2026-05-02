'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Article = {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: { name: string; url: string };
};

export default function NoticiasPage() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/noticias')
      .then((res) => res.json())
      .then((data) => { setArticles(data.articles || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <button onClick={() => router.back()} className="text-gray-400 text-sm mb-6 flex items-center gap-1">
          ← Volver
        </button>

        <h1 className="text-2xl font-semibold text-[#1a1a2e] mb-2">Noticias</h1>
        <p className="text-gray-400 text-sm mb-8">Lo último sobre mascotas y adopción</p>

        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="animate-bounce text-4xl mb-4">📰</div>
            <p>Cargando noticias...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-4">📭</div>
            <p>No hay noticias disponibles por ahora</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {articles.map((article, i) => (
              <a
                key={i}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-orange-300 hover:shadow-md transition flex flex-col"
              >
                {article.image && (
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-48 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-orange-500 font-medium">{article.source.name}</span>
                    <span className="text-gray-300 text-xs">·</span>
                    <span className="text-xs text-gray-400">{formatDate(article.publishedAt)}</span>
                  </div>
                  <h2 className="text-[#1a1a2e] font-semibold text-base mb-2 leading-snug">{article.title}</h2>
                  <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">{article.description}</p>
                  <span className="inline-block mt-3 text-xs text-orange-500 font-medium">Leer más →</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
