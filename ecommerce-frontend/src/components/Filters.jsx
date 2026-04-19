import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import storeAPI from '../api/store';

export default function Filters({ onClose, isMobile = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentCategoryId = searchParams.get('categoria_id') ? parseInt(searchParams.get('categoria_id')) : null;
  const [onlyAvailable, setOnlyAvailable] = useState(searchParams.get('disponibile') === 'true');
  const [priceMin, setPriceMin] = useState(searchParams.get('prezzo_min') || '');
  const [priceMax, setPriceMax] = useState(searchParams.get('prezzo_max') || '');
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  const { data: categorieTree } = useQuery({
    queryKey: ['categorieTree'],
    queryFn: storeAPI.getCategorieTree,
  });

  const handleCategoryClick = (id) => {
    setSearchParams((prev) => {
      if (id != null) prev.set('categoria_id', String(id));
      else prev.delete('categoria_id');
      return prev;
    });
    if (isMobile && onClose) onClose();
  };

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  const hasActiveFilters = currentCategoryId != null || onlyAvailable || priceMin || priceMax;

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
              className={`filter-item ${currentCategoryId == null ? 'active' : ''}`}
              onClick={() => handleCategoryClick(null)}
            >
              <span>Tutte le categorie</span>
            </button>
          </li>
          {categorieTree?.map((cat) => (
            <React.Fragment key={cat.id}>
              <li>
                <button
                  className={`filter-item category-level-1 ${currentCategoryId === cat.id ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(cat.id)}
                >
                  <span>{cat.nome}</span>
                  {cat.figli?.length > 0 && (
                    <span
                      className="category-expand-toggle"
                      onClick={(e) => toggleExpand(cat.id, e)}
                      aria-label={expandedCategories.has(cat.id) ? 'Comprimi' : 'Espandi'}
                    >
                      {expandedCategories.has(cat.id) ? '▾' : '▸'}
                    </span>
                  )}
                </button>
              </li>
              {expandedCategories.has(cat.id) && cat.figli?.map((sub) => (
                <React.Fragment key={sub.id}>
                  <li>
                    <button
                      className={`filter-item category-level-2 ${currentCategoryId === sub.id ? 'active' : ''}`}
                      onClick={() => handleCategoryClick(sub.id)}
                    >
                      <span>{sub.nome}</span>
                      {sub.figli?.length > 0 && (
                        <span
                          className="category-expand-toggle"
                          onClick={(e) => toggleExpand(sub.id, e)}
                          aria-label={expandedCategories.has(sub.id) ? 'Comprimi' : 'Espandi'}
                        >
                          {expandedCategories.has(sub.id) ? '▾' : '▸'}
                        </span>
                      )}
                    </button>
                  </li>
                  {expandedCategories.has(sub.id) && sub.figli?.map((tipo) => (
                    <li key={tipo.id}>
                      <button
                        className={`filter-item category-level-3 ${currentCategoryId === tipo.id ? 'active' : ''}`}
                        onClick={() => handleCategoryClick(tipo.id)}
                      >
                        <span>{tipo.nome}</span>
                      </button>
                    </li>
                  ))}
                </React.Fragment>
              ))}
            </React.Fragment>
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
