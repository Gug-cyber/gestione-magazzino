import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './ProductCard.css';
import { useCart } from '../hooks/useCart';
import { useToast } from '../context/ToastContext';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';
const SUCCESS_STATE_DURATION = 2000;

export default function ProductCard({ product }) {
  const { attributes } = product;
  const imageUrl = attributes.images?.data?.[0]?.attributes?.url;
  const image = imageUrl
    ? imageUrl.startsWith('http')
      ? imageUrl
      : `${STRAPI_URL}${imageUrl}`
    : null;
  const discount = attributes.discount_percentage;
  const categoryName = attributes.category?.data?.attributes?.name;
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [cartAdded, setCartAdded] = React.useState(false);
  const [shake, setShake] = React.useState(false);

  const handleQuickAction = (e, action) => {
    e.preventDefault();
    e.stopPropagation();
    if (action === 'cart') {
      if (attributes.quantity === 0) {
        showToast('Prodotto non disponibile', 'error');
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }
      addToCart(product, 1);
      setCartAdded(true);
      showToast(`${attributes.title} aggiunto al carrello!`, 'success');
      setTimeout(() => setCartAdded(false), SUCCESS_STATE_DURATION);
    } else {
      // Placeholder per future funzionalita
      console.log(`${action} clicked for product:`, attributes.title);
    }
  };

  const getStockStatus = () => {
    if (attributes.quantity === 0) {
      return { text: 'Esaurito', className: 'out-of-stock' };
    }
    if (attributes.quantity < 5) {
      return { text: `Solo ${attributes.quantity}`, className: 'low-stock' };
    }
    return { text: 'Disponibile', className: 'in-stock' };
  };

  const stockStatus = getStockStatus();

  return (
    <Link to={`/product/${attributes.slug}`} className={`product-card${shake ? ' shake' : ''}`}>
      <div className="product-image">
        {image ? (
          <img src={image} alt={attributes.title} loading="lazy" />
        ) : (
          <div className="product-image-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span>Immagine non disponibile</span>
          </div>
        )}
        
        <div className="product-badges">
          <div className="product-badges-left">
            {discount > 0 && (
              <span className="discount-badge">-{discount}%</span>
            )}
          </div>
          {attributes.condition && (
            <span className="condition-badge">{attributes.condition}</span>
          )}
        </div>

        <div className="product-quick-actions">
          <button 
            className="quick-action-btn" 
            onClick={(e) => handleQuickAction(e, 'wishlist')}
            aria-label="Aggiungi ai preferiti"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <button 
            className="quick-action-btn" 
            onClick={(e) => handleQuickAction(e, 'cart')}
            aria-label="Aggiungi al carrello"
            style={cartAdded
              ? { color: 'var(--color-success)', borderColor: 'var(--color-success)', background: 'rgba(34,197,94,0.1)' }
              : undefined}
          >
            {cartAdded ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            )}
          </button>
          <button 
            className="quick-action-btn" 
            onClick={(e) => handleQuickAction(e, 'quickview')}
            aria-label="Anteprima rapida"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="product-info">
        {categoryName && (
          <span className="product-category">{categoryName}</span>
        )}
        
        <h3 className="product-title">{attributes.title}</h3>

        <div className="product-meta">
          <div className="product-price">
            {discount > 0 && (
              <span className="original-price">{attributes.original_price?.toFixed(2)} EUR</span>
            )}
            <span className="current-price">{attributes.price?.toFixed(2)} EUR</span>
          </div>

          <span className={`product-stock ${stockStatus.className}`}>
            {stockStatus.text}
          </span>
        </div>
      </div>
    </Link>
  );
}
