import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import strapiAPI from '../api/strapi';
import Banner from '../components/Banner.jsx';
import ProductGrid from '../components/ProductGrid.jsx';

// Icone per categorie TCG
const categoryIcons = {
  pokemon: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="3"/>
      <line x1="2" y1="12" x2="9" y2="12"/>
      <line x1="15" y1="12" x2="22" y2="12"/>
    </svg>
  ),
  magic: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  yugioh: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>
  ),
  default: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  )
};

export default function Home() {
  const { data: banners } = useQuery({
    queryKey: ['banners'],
    queryFn: strapiAPI.getBanners
  });

  const { data: featured, isLoading: featuredLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: strapiAPI.getFeaturedProducts
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: strapiAPI.getCategories
  });

  const getCategoryIcon = (slug) => {
    const normalizedSlug = slug?.toLowerCase() || '';
    if (normalizedSlug.includes('pokemon')) return categoryIcons.pokemon;
    if (normalizedSlug.includes('magic') || normalizedSlug.includes('mtg')) return categoryIcons.magic;
    if (normalizedSlug.includes('yugioh') || normalizedSlug.includes('yu-gi-oh')) return categoryIcons.yugioh;
    return categoryIcons.default;
  };

  return (
    <div className="home-page">
      {/* Hero Banner */}
      {banners?.data && banners.data.length > 0 ? (
        <Banner banners={banners.data} />
      ) : (
        <div className="banner-container" style={{ background: 'linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-elevated) 100%)' }}>
          <div className="banner-content" style={{ position: 'relative', background: 'transparent', padding: 'var(--spacing-2xl)' }}>
            <span style={{ 
              display: 'inline-block', 
              padding: '6px 12px', 
              background: 'var(--color-accent-subtle)', 
              color: 'var(--color-accent)', 
              borderRadius: 'var(--radius-full)', 
              fontSize: '12px', 
              fontWeight: 600,
              marginBottom: 'var(--spacing-md)'
            }}>
              Nuovo arrivo
            </span>
            <h1 className="banner-title" style={{ fontSize: '42px', marginBottom: 'var(--spacing-sm)' }}>
              Scopri le ultime espansioni
            </h1>
            <p className="banner-subtitle" style={{ maxWidth: '500px' }}>
              Carte rare, booster box e tanto altro per completare la tua collezione
            </p>
            <Link to="/catalogo" className="banner-cta">
              Esplora il catalogo
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* Categorie Popolari */}
      <section className="categories-section">
        <div className="section-header">
          <h2>Esplora per categoria</h2>
          <Link to="/catalogo" className="view-all">
            Vedi tutte
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        </div>
        <div className="categories-grid">
          {categories?.data?.map((cat) => (
            <Link
              key={cat.id}
              to={`/catalogo?categoria=${cat.attributes.slug}`}
              className="category-card"
            >
              <div className="category-icon">
                {getCategoryIcon(cat.attributes.slug)}
              </div>
              <span className="category-name">{cat.attributes.name}</span>
              {cat.attributes.products?.data?.length > 0 && (
                <span className="category-count">
                  {cat.attributes.products.data.length} prodotti
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Prodotti in Evidenza */}
      <section className="featured-section">
        <div className="section-header">
          <h2>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" style={{ marginRight: '8px' }}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            In evidenza
          </h2>
          <Link to="/catalogo" className="view-all">
            Vedi tutti
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        </div>
        {featuredLoading ? (
          <div className="page-loading">
            <div className="loading-spinner" />
          </div>
        ) : featured?.data && featured.data.length > 0 ? (
          <ProductGrid products={featured.data} />
        ) : (
          <div className="empty-state" style={{ padding: 'var(--spacing-xl)' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>Nessun prodotto in evidenza al momento</p>
          </div>
        )}
      </section>

      {/* CTA Banner */}
      <section style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--spacing-2xl)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 'var(--spacing-md)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-accent-subtle)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--color-accent)'
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <h3 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Resta aggiornato</h3>
        <p style={{ color: 'var(--color-text-muted)', maxWidth: '400px', margin: 0 }}>
          Iscriviti alla newsletter per ricevere offerte esclusive e novita sulle ultime espansioni
        </p>
        <form style={{ display: 'flex', gap: 'var(--spacing-sm)', width: '100%', maxWidth: '400px', marginTop: 'var(--spacing-sm)' }}>
          <input
            type="email"
            placeholder="La tua email"
            style={{
              flex: 1,
              padding: '14px 16px',
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button 
            type="submit" 
            className="btn-primary"
            style={{ padding: '14px 24px', flexShrink: 0 }}
          >
            Iscriviti
          </button>
        </form>
      </section>
    </div>
  );
}
