import React, { useState, useEffect } from 'react';

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

  return (
    <div className="banner-container">
      {attrs.link ? (
        <a href={attrs.link} className="banner-link">
          {image && <img src={image} alt={attrs.title} className="banner-image" />}
          <div className="banner-title">{attrs.title}</div>
        </a>
      ) : (
        <div className="banner-static">
          {image && <img src={image} alt={attrs.title} className="banner-image" />}
          <div className="banner-title">{attrs.title}</div>
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
