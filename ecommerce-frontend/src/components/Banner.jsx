import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';

export default function Banner({ banners }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (!banners || banners.length === 0) return null;

  const banner = banners[current];
  const attrs = banner.attributes;
  const imageUrl = attrs.image?.data?.attributes?.url;
  const image = imageUrl
    ? imageUrl.startsWith('http')
      ? imageUrl
      : `${STRAPI_URL}${imageUrl}`
    : null;

  const BannerContent = () => (
    <>
      {image && (
        <img 
          src={image} 
          alt={attrs.title} 
          className="banner-image" 
        />
      )}
      <div className="banner-overlay" />
      <div className="banner-content">
        {attrs.subtitle && (
          <span style={{ 
            display: 'inline-block', 
            padding: '6px 14px', 
            background: 'rgba(201,168,76,0.15)',
            border: '1px solid rgba(201,168,76,0.3)',
            color: 'var(--color-accent)', 
            borderRadius: 'var(--radius-full)', 
            fontSize: '12px', 
            fontWeight: 600,
            marginBottom: 'var(--spacing-md)',
            width: 'fit-content'
          }}>
            {attrs.subtitle}
          </span>
        )}
        <h2 className="banner-title">{attrs.title}</h2>
        {attrs.description && (
          <p className="banner-subtitle">{attrs.description}</p>
        )}
        {attrs.link && (
          <span className="banner-cta" style={{ width: 'fit-content' }}>
            Scopri di piu
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
          </span>
        )}
      </div>
    </>
  );

  return (
    <div className="banner-container" style={{ minHeight: '340px', position: 'relative' }}>
      {attrs.link ? (
        <Link to={attrs.link} className="banner-link" style={{ display: 'block', position: 'relative' }}>
          <BannerContent />
        </Link>
      ) : (
        <div className="banner-static" style={{ position: 'relative' }}>
          <BannerContent />
        </div>
      )}

      {banners.length > 1 && (
        <div className="banner-dots">
          {banners.map((_, i) => (
            <button
              key={i}
              className={`banner-dot ${i === current ? 'active' : ''}`}
              onClick={() => setCurrent(i)}
              aria-label={`Banner ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
