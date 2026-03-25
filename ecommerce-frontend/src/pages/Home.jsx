import React from 'react';
import { useQuery } from '@tanstack/react-query';
import strapiAPI from '../api/strapi';
import Banner from '../components/Banner.jsx';
import ProductGrid from '../components/ProductGrid.jsx';

export default function Home() {
  const { data: banners } = useQuery({
    queryKey: ['banners'],
    queryFn: strapiAPI.getBanners
  });

  const { data: featured } = useQuery({
    queryKey: ['featured-products'],
    queryFn: strapiAPI.getFeaturedProducts
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: strapiAPI.getCategories
  });

  return (
    <div className="home-page">
      {/* Banner carousel */}
      {banners?.data && <Banner banners={banners.data} />}

      {/* Prodotti in evidenza */}
      <section className="featured-section">
        <h2>🔥 Prodotti in Evidenza</h2>
        {featured?.data && <ProductGrid products={featured.data} />}
      </section>

      {/* Categorie popolari */}
      <section className="categories-section">
        <h2>🎯 Categorie Popolari</h2>
        <div className="categories-grid">
          {categories?.data?.map((cat) => (
            <a
              key={cat.id}
              href={`/catalogo?categoria=${cat.attributes.slug}`}
              className="category-card"
            >
              {cat.attributes.name}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
