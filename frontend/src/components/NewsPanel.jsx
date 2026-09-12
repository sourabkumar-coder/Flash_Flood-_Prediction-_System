import React, { useMemo, useState } from 'react';
import { ExternalLink, RefreshCw, Waves } from 'lucide-react';

const filters = ['All', 'Flood', 'Heavy Rain', 'Rivers', 'Dams', 'Landslide'];
const categoryClass = category => category?.toLowerCase().replace(/[^a-z]+/g, '-') || 'warning';

export default function NewsPanel({ articles = [], lastUpdated, loading, error, onRefresh }) {
  const [filter, setFilter] = useState('All');

  const safeArticles = useMemo(() => {
    if (Array.isArray(articles)) return articles;
    if (articles && Array.isArray(articles.articles)) return articles.articles;
    return [];
  }, [articles]);

  const visibleArticles = useMemo(() => {
    if (filter === 'All') return safeArticles;
    return safeArticles.filter(article => {
      const category = (article.category || '').toUpperCase();
      const text = `${article.title || ''} ${article.description || ''}`.toUpperCase();
      const f = filter.toUpperCase();
      if (f === 'HEAVY RAIN') {
        return category.includes('RAIN') || category.includes('CLOUDBURST') || text.includes('RAIN') || text.includes('CLOUDBURST');
      }
      if (f === 'RIVERS') {
        return category.includes('RIVER') || category.includes('WATER') || text.includes('RIVER') || text.includes('STREAM');
      }
      if (f === 'DAMS') {
        return category.includes('DAM') || category.includes('RESERVOIR') || text.includes('DAM') || text.includes('BARRAGE');
      }
      if (f === 'LANDSLIDE') {
        return category.includes('LANDSLIDE') || text.includes('LANDSLIDE') || text.includes('SLOPE');
      }
      if (f === 'FLOOD') {
        return category.includes('FLOOD') || text.includes('FLOOD');
      }
      return category.includes(f) || text.includes(f);
    });
  }, [safeArticles, filter]);

  return (
    <section className="news-panel panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">EXTERNAL INTELLIGENCE</span>
          <h2><Waves size={21} /> Disaster &amp; Water News</h2>
          <p>Flood, rainfall and water-level reports near the active location.</p>
        </div>
        <button type="button" className="icon-button" onClick={onRefresh} title="Refresh disaster news" disabled={loading}>
          <RefreshCw size={17} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      <div className="news-toolbar">
        <div className="news-filters" role="tablist" aria-label="News categories">
          {filters.map(item => (
            <button key={item} type="button" className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
        <small>{lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Not updated'}</small>
      </div>

      {loading && <div className="panel-state">Loading relevant disaster reports...</div>}
      {!loading && error && <div className="panel-state error-state">News temporarily unavailable.</div>}
      {!loading && !error && visibleArticles.length === 0 && (
        <div className="panel-state">No recent flood, rainfall or water-related news found.</div>
      )}
      {!loading && !error && visibleArticles.length > 0 && (
        <div className="news-list">
          {visibleArticles.slice(0, 6).map(article => (
            <article className="news-item" key={article.id || article.url}>
              <span className={`news-category ${categoryClass(article.category)}`}>{article.category || 'WEATHER WARNING'}</span>
              <h3>{article.title}</h3>
              {article.description && <p>{article.description}</p>}
              <div className="news-meta">
                <span>{article.location || 'India'}{article.source ? ` · ${article.source}` : ''}</span>
                <time dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleString([], { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })}</time>
                <a href={article.url} target="_blank" rel="noreferrer">Read article <ExternalLink size={13} /></a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
