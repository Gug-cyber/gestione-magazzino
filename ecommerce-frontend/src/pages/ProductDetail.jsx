import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import strapiAPI from '../api/strapi';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';

export default function ProductDetail() {
  const { slug } = useParams();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => strapiAPI.getProduct(slug),
  });

  if (isLoading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
        <p>Caricamento prodotto...</p>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3>Prodotto non trovato</h3>
        <p>Il prodotto che cerchi non esiste o non e piu disponibile</p>
        <Link to="/catalogo" className="btn-primary" style={{ marginTop: 'var(--spacing-md)', display: 'inline-flex' }}>
          Torna al catalogo
        </Link>
      </div>
    );
  }

  const attrs = product.attributes;
  const images = attrs.images?.data || [];
  const discount = attrs.discount_percentage;
  const categoryName = attrs.category?.data?.attributes?.name;

  const getStockStatus = () => {
    if (attrs.quantity === 0) {
      return { text: 'Esaurito', className: 'out-of-stock', available: false };
    }
    if (attrs.quantity < 5) {
      return { text: `Solo ${attrs.quantity} disponibili`, className: 'low-stock', available: true };
    }
    return { text: 'Disponibile', className: 'in-stock', available: true };
  };

  const stockStatus = getStockStatus();

  const handleAddToCart = () => {
    console.log('Add to cart:', { product: attrs.title, quantity });
  };

  const handleAddToWishlist = () => {
    console.log('Add to wishlist:', attrs.title);
  };

  return (
    <div className="product-detail-page">
      {/* Images */}
      <div className="product-detail-images">
        <div className="product-detail-main-image">
          {images.length > 0 ? (
            <img
              src={`${STRAPI_URL}${images[selectedImage].attributes.url}`}
              alt={attrs.title}
            />
          ) : (
            <div className="product-detail-no-image">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span>Immagine non disponibile</span>
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', overflowX: 'auto' }}>
            {images.map((img, index) => (
              <button
                key={img.id}
                onClick={() => setSelectedImage(index)}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: index === selectedImage 
                    ? '2px solid var(--color-accent)' 
                    : '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  padding: 0,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                <img
                  src={`${STRAPI_URL}${img.attributes.url}`}
                  alt={`${attrs.title} - ${index + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="product-detail-info">
        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)' }}>
          <Link to="/" style={{ color: 'inherit' }}>Home</Link>
          <span>/</span>
          <Link to="/catalogo" style={{ color: 'inherit' }}>Catalogo</Link>
          {categoryName && (
            <>
              <span>/</span>
              <Link to={`/catalogo?categoria=${attrs.category?.data?.attributes?.slug}`} style={{ color: 'inherit' }}>
                {categoryName}
              </Link>
            </>
          )}
        </nav>

        {/* Category Badge */}
        {categoryName && (
          <span style={{
            display: 'inline-block',
            padding: '4px 10px',
            background: 'var(--color-accent-subtle)',
            color: 'var(--color-accent)',
            borderRadius: 'var(--radius-full)',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: 'var(--spacing-sm)'
          }}>
            {categoryName}
          </span>
        )}

        <h1>{attrs.title}</h1>

        {/* Price */}
        <div className="product-detail-price">
          {discount > 0 && (
            <span className="original-price">{attrs.original_price?.toFixed(2)} EUR</span>
          )}
          <span className="current-price">{attrs.price?.toFixed(2)} EUR</span>
          {discount > 0 && (
            <span className="discount-badge" style={{ marginLeft: 'var(--spacing-sm)' }}>
              -{discount}%
            </span>
          )}
        </div>

        {/* Stock Status */}
        <div style={{ marginTop: 'var(--spacing-md)' }}>
          <span className={`product-stock ${stockStatus.className}`} style={{ fontSize: '14px' }}>
            {stockStatus.text}
          </span>
        </div>

        {/* SKU */}
        {attrs.sku && (
          <p className="product-sku">SKU: {attrs.sku}</p>
        )}

        {/* Quantity & Actions */}
        {stockStatus.available && (
          <div style={{ marginTop: 'var(--spacing-lg)' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: 'var(--spacing-sm)' }}>
              Quantita
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                -
              </button>
              <span style={{
                width: '60px',
                textAlign: 'center',
                fontSize: '16px',
                fontWeight: 600
              }}>
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(Math.min(attrs.quantity, quantity + 1))}
                style={{
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                +
              </button>
            </div>

            <div className="product-actions">
              <button className="btn-primary" onClick={handleAddToCart}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1"/>
                  <circle cx="20" cy="21" r="1"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                </svg>
                Aggiungi al carrello
              </button>
              <button className="btn-secondary" onClick={handleAddToWishlist} aria-label="Aggiungi ai preferiti">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Description */}
        {attrs.description && (
          <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-xl)', borderTop: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>Descrizione</h3>
            <div
              className="product-description"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(attrs.description) }}
            />
          </div>
        )}

        {/* Shipping Info */}
        <div style={{ 
          marginTop: 'var(--spacing-xl)', 
          padding: 'var(--spacing-md)', 
          background: 'var(--color-surface)', 
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '14px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            <span>Spedizione gratuita sopra i 50 EUR</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '14px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>Consegna in 2-4 giorni lavorativi</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '14px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            <span>Reso gratuito entro 14 giorni</span>
          </div>
        </div>
      </div>
    </div>
  );
}
