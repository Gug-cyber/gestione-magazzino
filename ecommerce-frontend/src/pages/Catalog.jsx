import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import storeAPI from '../api/store';
import ProductGrid from '../components/ProductGrid.jsx';
import Filters from '../components/Filters.jsx';
import SearchBar from '../components/SearchBar.jsx';
import FloatingCartButton from '../components/FloatingCartButton.jsx';

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [currentSort, setCurrentSort] = useState('newest');

  const categoriaId = searchParams.get('categoria_id') ? parseInt(searchParams.get('categoria_id')) : null;
  const disponibile = searchParams.get('disponibile') === 'true';
  const prezzoMin = searchParams.get('prezzo_min') ? parseFloat(searchParams.get('prezzo_min')) : null;
  const prezzoMax = searchParams.get('prezzo_max') ? parseFloat(searchParams.get('prezzo_max')) : null;

  const { data: prodotti, isLoading } = useQuery({
    queryKey: ['products', search, categoriaId, disponibile],
    queryFn: () => {
      const params = {};
      if (search) params.search = search;
      if (categoriaId != null) params.categoria_id = categoriaId;
      if (disponibile) params.disponibili_only = true;
      return storeAPI.getStoreProdotti(params);
    },
  });

  const filteredProducts = useMemo(() => {
    if (!prodotti) return [];
    let result = prodotti;
    if (prezzoMin != null) result = result.filter(p => p.prezzo_vendita != null && p.prezzo_vendita >= prezzoMin);
    if (prezzoMax != null) result = result.filter(p => p.prezzo_vendita != null && p.prezzo_vendita <= prezzoMax);
    if (currentSort === 'price-asc') result = [...result].sort((a, b) => (a.prezzo_vendita || 0) - (b.prezzo_vendita || 0));
    else if (currentSort === 'price-desc') result = [...result].sort((a, b) => (b.prezzo_vendita || 0) - (a.prezzo_vendita || 0));
    else if (currentSort === 'name-asc') result = [...result].sort((a, b) => a.nome.localeCompare(b.nome));
    else if (currentSort === 'name-desc') result = [...result].sort((a, b) => b.nome.localeCompare(a.nome));
    return result;
  }, [prodotti, prezzoMin, prezzoMax, currentSort]);

  const handleSearch = (value) => {
    setSearch(value);
    setSearchParams((prev) => {
      if (value) prev.set('q', value);
      else prev.delete('q');
      return prev;
    });
  };

  const sortOptions = [
    { value: 'newest', label: 'Piu recenti' },
    { value: 'price-asc', label: 'Prezzo: basso-alto' },
    { value: 'price-desc', label: 'Prezzo: alto-basso' },
    { value: 'name-asc', label: 'Nome: A-Z' },
    { value: 'name-desc', label: 'Nome: Z-A' },
  ];

  const handleSort = (value) => {
    setCurrentSort(value);
    setSortOpen(false);
  };

  const productCount = filteredProducts.length;

  return (
    <div className="catalog-page">
      {/* Header */}
      <div className="catalog-header">
        <div className="catalog-title-row">
          <h1>Catalogo</h1>
          <span className="catalog-results-count">
            {productCount} {productCount === 1 ? 'prodotto' : 'prodotti'}
          </span>
        </div>

        <div className="catalog-toolbar">
          <SearchBar value={search} onSearch={handleSearch} />
          
          {/* Mobile Filter Button */}
          <button 
            className="mobile-filter-btn"
            onClick={() => setFilterDrawerOpen(true)}
            style={{ display: 'none' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filtri
          </button>

          {/* Sort Dropdown */}
          <div className="sort-dropdown">
            <button className="sort-button" onClick={() => setSortOpen(!sortOpen)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="4" y1="12" x2="16" y2="12"/>
                <line x1="4" y1="18" x2="12" y2="18"/>
              </svg>
              {sortOptions.find(o => o.value === currentSort)?.label}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {sortOpen && (
              <div className="sort-options">
                {sortOptions.map(option => (
                  <button
                    key={option.value}
                    className={`sort-option ${currentSort === option.value ? 'active' : ''}`}
                    onClick={() => handleSort(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="catalog-layout">
        {/* Sidebar Filters */}
        <aside className="catalog-sidebar">
          <Filters />
        </aside>

        {/* Products Grid */}
        <div className="catalog-main">
          {isLoading ? (
            <div className="page-loading">
              <div className="loading-spinner" />
              <p>Caricamento prodotti...</p>
            </div>
          ) : productCount === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <h3>Nessun prodotto trovato</h3>
              <p>Prova a modificare i filtri o la ricerca</p>
            </div>
          ) : (
            <ProductGrid products={filteredProducts} />
          )}
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {filterDrawerOpen && (
        <>
          <div 
            className="filter-drawer-overlay open"
            onClick={() => setFilterDrawerOpen(false)}
          />
          <div className="filter-drawer open">
            <div className="filter-drawer-header">
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Filtri</h2>
              <button 
                className="filter-drawer-close"
                onClick={() => setFilterDrawerOpen(false)}
                aria-label="Chiudi filtri"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="filter-drawer-content">
              <Filters onClose={() => setFilterDrawerOpen(false)} isMobile={true} />
            </div>
          </div>
        </>
      )}

      {/* Close sort dropdown when clicking outside */}
      {sortOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          onClick={() => setSortOpen(false)}
        />
      )}

      {/* Mobile floating cart button */}
      <FloatingCartButton />
    </div>
  );
}
