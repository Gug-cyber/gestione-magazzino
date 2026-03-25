import React from 'react';
import { Link } from 'react-router-dom';
import './ProductCard.css';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';

export default function ProductCard({ product }) {
  const { attributes } = product;
  const imageUrl = attributes.images?.data?.[0]?.attributes?.url;
  const image = imageUrl
    ? imageUrl.startsWith('http')
      ? imageUrl
      : `${STRAPI_URL}${imageUrl}`
    : null;
  const discount = attributes.discount_percentage;

  return (
    <Link to={`/product/${attributes.slug}`} className="product-card">
      <div className="product-image">
        {image ? (
          <img src={image} alt={attributes.title} />
        ) : (
          <div className="product-image-placeholder">📦</div>
        )}
        {discount > 0 && (
          <span className="discount-badge">-{discount}%</span>
        )}
      </div>

      <div className="product-info">
        <h3 className="product-title">{attributes.title}</h3>

        <div className="product-price">
          {discount > 0 && (
            <span className="original-price">€{attributes.original_price}</span>
          )}
          <span className="current-price">€{attributes.price}</span>
        </div>

        {attributes.quantity < 5 && attributes.quantity > 0 && (
          <span className="low-stock">Solo {attributes.quantity} rimasti</span>
        )}
        {attributes.quantity === 0 && (
          <span className="out-of-stock">Non disponibile</span>
        )}
      </div>
    </Link>
  );
}
