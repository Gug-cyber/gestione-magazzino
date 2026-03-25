import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import strapiAPI from '../api/strapi';

export default function StaticPage() {
  const { slug } = useParams();

  const { data: page, isLoading, isError } = useQuery({
    queryKey: ['static-page', slug],
    queryFn: () => strapiAPI.getStaticPage(slug),
  });

  if (isLoading) return <p className="page-loading">Caricamento...</p>;
  if (isError || !page) return <p className="page-error">Pagina non trovata.</p>;

  const attrs = page.attributes;

  return (
    <div className="static-page">
      <h1>{attrs.title}</h1>
      <div
        className="static-page-content"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(attrs.content) }}
      />
    </div>
  );
}
