import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import strapiAPI from '../api/strapi';

export default function Filters({ onClose, isMobile = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentCategory = searchParams.get('categoria');
  const [onlyAvailable, setOnlyAvailable] = useState(searchParams.get('disponibile') === 'true');
  const [priceMin, setPriceMin] = useState(searchParams.get('prezzo_min') || '');
  const [priceMax, setPriceMax] = useState(searchParams.get('prezzo_max') || '');
  const [collapsedGroups, setCollapsedGroups] = useState({});

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
    if (isMobile && onClose) onClose();
  };

  const handleAvailabilityToggle = () => {
    const newValue = !onlyAvailable;
    setOnlyAvailable(newValue);
    setSearchParams((prev) => {
      if (newValue) prev.set('disponibile', 'true');
      else prev.delete('disponibile');
      return prev;
    });
  };

  const handlePriceChange = () => {
    setSearchParams((prev) => {
      if (priceMin) prev.set('prezzo_min', priceMin);
      else prev.delete('prezzo_min');
      if (priceMax) prev.set('prezzo_max', priceMax);
      else prev.delete('prezzo_max');
      return prev;
    });
  };

  const clearAllFilters = () => {
    setSearchParams({});
    setOnlyAvailable(false);
    setPriceMin('');
    setPriceMax('');
  };

  const toggleGroup = (groupName) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const hasActiveFilters = currentCategory || onlyAvailable || priceMin || priceMax;

  return (
    <div className="filters">
      <div className="filters-header">
        <h2 className="filters-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Filtri
        </h2>
        {hasActiveFilters && (
          <button className="filters-clear" onClick={clearAllFilters}>
            Cancella tutto
          </button>
        )}
      </div>

      {/* Categorie */}
      <div className={`filter-group ${collapsedGroups.categories ? 'collapsed' : ''}`}>
        <div className="filter-group-header" onClick={() => toggleGroup('categories')}>
          <h3>Categorie</h3>
          <span className="filter-group-toggle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </div>
        <ul className="filter-list">
          <li>
            <button
              className={`filter-item ${!currentCategory ? 'active' : ''}`}
              onClick={() => handleCategoryClick(null)}
            >
              <span>Tutte le categorie</span>
            </button>
          </li>
          {categories?.data?.map((cat) => (
            <li key={cat.id}>
              <button
                className={`filter-item ${currentCategory === cat.attributes.slug ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat.attributes.slug)}
              >
                <span>{cat.attributes.name}</span>
                {cat.attributes.products?.data?.length > 0 && (
                  <span className="filter-count">{cat.attributes.products.data.length}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Range Prezzo */}
      <div className={`filter-group ${collapsedGroups.price ? 'collapsed' : ''}`}>
        <div className="filter-group-header" onClick={() => toggleGroup('price')}>
          <h3>Prezzo</h3>
          <span className="filter-group-toggle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </div>
        <div className="price-range">
          <div className="price-inputs">
            <input
              type="number"
              className="price-input"
              placeholder="Min"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              onBlur={handlePriceChange}
              min="0"
            />
            <span className="price-separator">-</span>
            <input
              type="number"
              className="price-input"
              placeholder="Max"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              onBlur={handlePriceChange}
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Disponibilita */}
      <div className="filter-group">
        <div className="availability-toggle">
          <span className="toggle-label">Solo disponibili</span>
          <button 
            className={`toggle-switch ${onlyAvailable ? 'active' : ''}`}
            onClick={handleAvailabilityToggle}
            aria-label="Mostra solo prodotti disponibili"
          />
        </div>
      </div>

      {/* Condizione (TCG specific) */}
      <div className={`filter-group ${collapsedGroups.condition ? 'collapsed' : ''}`}>
        <div className="filter-group-header" onClick={() => toggleGroup('condition')}>
          <h3>Condizione</h3>
          <span className="filter-group-toggle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </div>
        <ul className="filter-list">
          {['Mint', 'Near Mint', 'Excellent', 'Good', 'Played'].map((condition) => (
            <li key={condition}>
              <button className="filter-item">
                <span>{condition}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Rarita (TCG specific) */}
      <div className={`filter-group ${collapsedGroups.rarity ? 'collapsed' : ''}`}>
        <div className="filter-group-header" onClick={() => toggleGroup('rarity')}>
          <h3>Rarita</h3>
          <span className="filter-group-toggle">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </span>
        </div>
        <ul className="filter-list">
          {['Comune', 'Non Comune', 'Rara', 'Ultra Rara', 'Secret Rare'].map((rarity) => (
            <li key={rarity}>
              <button className="filter-item">
                <span>{rarity}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
