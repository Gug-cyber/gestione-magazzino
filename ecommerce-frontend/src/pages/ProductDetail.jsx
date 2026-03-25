import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import strapiAPI from '../api/strapi';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';

export default function ProductDetail() {
  const { slug } = useParams();

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => strapiAPI.getProduct(slug),
  });

  if (isLoading) return <p className="page-loading">Caricamento...</p>;
  if (isError || !product) return <p className="page-error">Prodotto non trovato.</p>;

  const attrs = product.attributes;
  const images = attrs.images?.data || [];
  const discount = attrs.discount_percentage;

  return (
    <div className="product-detail-page">
      <div className="product-detail-images">
        {images.length > 0 ? (
          images.map((img) => (
            <img
              key={img.id}
              src={`${STRAPI_URL}${img.attributes.url}`}
              alt={attrs.title}
              className="product-detail-image"
            />
          ))
        ) : (
          <div className="product-detail-no-image">Nessuna immagine</div>
        )}
      </div>

      <div className="product-detail-info">
        <h1>{attrs.title}</h1>

        <div className="product-detail-price">
          {discount > 0 && (
            <span className="original-price">€{attrs.original_price}</span>
          )}
          <span className="current-price">€{attrs.price}</span>
          {discount > 0 && (
            <span className="discount-badge">-{discount}%</span>
          )}
        </div>

        {attrs.quantity < 5 && attrs.quantity > 0 && (
          <p className="low-stock">⚠️ Solo {attrs.quantity} rimasti!</p>
        )}
        {attrs.quantity === 0 && (
          <p className="out-of-stock">❌ Non disponibile</p>
        )}

        {attrs.sku && <p className="product-sku">SKU: {attrs.sku}</p>}

        {attrs.description && (
          <div
            className="product-description"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(attrs.description) }}
          />
        )}
      </div>
    </div>
  );
}
