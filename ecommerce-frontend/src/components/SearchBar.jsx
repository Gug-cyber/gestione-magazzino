import React, { useState } from 'react';

export default function SearchBar({ value = '', onSearch }) {
  const [query, setQuery] = useState(value);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <div className="search-input-wrapper">
        <svg 
          className="search-icon" 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Cerca carte, espansioni, rarita..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="search-button">
          Cerca
        </button>
      </div>
    </form>
  );
}
