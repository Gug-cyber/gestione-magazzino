import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import strapiAPI from '../api/strapi';
import ProductGrid from '../components/ProductGrid.jsx';
import Filters from '../components/Filters.jsx';
import SearchBar from '../components/SearchBar.jsx';

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const categoria = searchParams.get('categoria');

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, categoria],
    queryFn: () => {
      const filters = { publishedAt: { $notNull: true } };
      if (search) {
        filters.title = { $containsi: search };
      }
      if (categoria) {
        filters['category'] = { slug: { $eq: categoria } };
      }
      return strapiAPI.getProducts({
        filters,
        pagination: { limit: 24 },
        sort: ['createdAt:desc'],
      });
    },
  });

  const handleSearch = (value) => {
    setSearch(value);
    setSearchParams((prev) => {
      if (value) prev.set('q', value);
      else prev.delete('q');
      return prev;
    });
  };

  return (
    <div className="catalog-page">
      <div className="catalog-header">
        <h1>Catalogo Prodotti</h1>
        <SearchBar value={search} onSearch={handleSearch} />
      </div>

      <div className="catalog-layout">
        <aside className="catalog-sidebar">
          <Filters />
        </aside>

        <div className="catalog-main">
          {isLoading ? (
            <p>Caricamento prodotti...</p>
          ) : data?.data?.length === 0 ? (
            <p>Nessun prodotto trovato.</p>
          ) : (
            <ProductGrid products={data?.data || []} />
          )}
        </div>
      </div>
    </div>
  );
}
