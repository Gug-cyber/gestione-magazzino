import React from 'react';
import ProductCard from './ProductCard.jsx';

export default function ProductGrid({ products }) {
  if (!products || products.length === 0) {
    return <p>Nessun prodotto disponibile.</p>;
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
