import React, { useMemo, useState } from 'react';
import { ExternalLink, RefreshCw, Waves } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const filterKeys = [
  { key: 'ALL', transKey: 'all' },
  { key: 'FLOOD', transKey: 'flood' },
  { key: 'HEAVY RAIN', transKey: 'heavy_rain' },
  { key: 'RIVERS', transKey: 'rivers' },
  { key: 'DAMS', transKey: 'dams' },
  { key: 'LANDSLIDE', transKey: 'landslide' }
];

const categoryClass = category => category?.toLowerCase().replace(/[^a-z]+/g, '-') || 'warning';

export default function NewsPanel({ articles = [], lastUpdated, loading, error, onRefresh }) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('ALL');

  const safeArticles = useMemo(() => {
    if (Array.isArray(articles)) return articles;
    if (articles && Array.isArray(articles.articles)) return articles.articles;
    return [];
  }, [articles]);

  const visibleArticles = useMemo(() => {
    if (filter === 'ALL') return safeArticles;
    return safeArticles.filter(article => {
      const category = (article.category || '').toUpperCase();
      const text = `${article.title || ''} ${article.description || ''}`.toUpperCase();
      if (filter === 'HEAVY RAIN') {
        return category.includes('RAIN') || category.includes('CLOUDBURST') || text.includes('RAIN') || text.includes('CLOUDBURST');
      }
      if (filter === 'RIVERS') {
        return category.includes('RIVER') || category.includes('WATER') || text.includes('RIVER') || text.includes('STREAM');
      }
      if (filter === 'DAMS') {
        return category.includes('DAM') || category.includes('RESERVOIR') || text.includes('DAM') || text.includes('BARRAGE');
      }
      if (filter === 'LANDSLIDE') {
        return category.includes('LANDSLIDE') || text.includes('LANDSLIDE') || text.includes('SLOPE');
      }
      if (filter === 'FLOOD') {
        return category.includes('FLOOD') || text.includes('FLOOD');
      }
      return category.includes(filter) || text.includes(filter);
    });
  }, [safeArticles, filter]);

  return (
    <section className="news-panel panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t('news_panel.eyebrow')}</span>
          <h2><Waves size={21} /> {t('news_panel.title')}</h2>
          <p>{t('news_panel.subtitle')}</p>
        </div>
        <button type="button" className="icon-button" onClick={onRefresh} title={t('news_panel.refresh_title')} disabled={loading}>
          <RefreshCw size={17} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      <div className="news-toolbar">
        <div className="news-filters" role="tablist" aria-label={t('news_panel.categories_label')}>
          {filterKeys.map(item => (
            <button key={item.key} type="button" className={filter === item.key ? 'active' : ''} onClick={() => setFilter(item.key)}>
              {t(`news_panel.filters.${item.transKey}`)}
            </button>
          ))}
        </div>
        <small>{lastUpdated ? `${t('news_panel.updated')} ${new Date(lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : t('news_panel.not_updated')}</small>
      </div>

      {loading && <div className="panel-state">{t('news_panel.loading')}</div>}
      {!loading && error && <div className="panel-state error-state">{t('news_panel.error')}</div>}
      {!loading && !error && visibleArticles.length === 0 && (
        <div className="panel-state">{t('news_panel.empty')}</div>
      )}
      {!loading && !error && visibleArticles.length > 0 && (
        <div className="news-list">
          {visibleArticles.slice(0, 6).map(article => (
            <article className="news-item" key={article.id || article.url}>
              <span className={`news-category ${categoryClass(article.category)}`}>{article.category || t('news_panel.weather_warning')}</span>
              <h3>{article.title}</h3>
              {article.description && <p>{article.description}</p>}
              <div className="news-meta">
                <span>{article.location || t('news_panel.default_country')}{article.source ? ` · ${article.source}` : ''}</span>
                <time dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleString([], { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' })}</time>
                <a href={article.url} target="_blank" rel="noreferrer">{t('news_panel.read_article')} <ExternalLink size={13} /></a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
