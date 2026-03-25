import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import strapiAPI from '../api/strapi';

export default function Filters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentCategory = searchParams.get('categoria');

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: strapiAPI.getCategories,
  });

  const handleCategoryClick = (slug) => {
    setSearchParams((prev) => {
      if (slug) prev.set('categoria', slug);
      else prev.delete('categoria');
      return prev;
    });
  };

  return (
    <div className="filters">
      <h3>Categorie</h3>
      <ul className="filter-list">
        <li>
          <button
            className={`filter-item ${!currentCategory ? 'active' : ''}`}
            onClick={() => handleCategoryClick(null)}
          >
            Tutte le categorie
          </button>
        </li>
        {categories?.data?.map((cat) => (
          <li key={cat.id}>
            <button
              className={`filter-item ${currentCategory === cat.attributes.slug ? 'active' : ''}`}
              onClick={() => handleCategoryClick(cat.attributes.slug)}
            >
              {cat.attributes.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
