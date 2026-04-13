import React from 'react';

const steps = [
  {
    number: 1,
    title: 'Inviaci le carte',
    description: 'Foto o lista: bastano pochi minuti per farci avere tutto il necessario.',
  },
  {
    number: 2,
    title: 'Analisi',
    description: 'Valutiamo condizioni, rarità e mercato attuale per ogni carta.',
  },
  {
    number: 3,
    title: 'Offerta',
    description: 'Ricevi una proposta chiara, dettagliata e senza nessun impegno.',
  },
  {
    number: 4,
    title: 'Spedizione',
    description: 'Ti guidiamo passo dopo passo per spedire in modo sicuro.',
  },
  {
    number: 5,
    title: 'Pagamento',
    description: 'Confermi e ricevi il pagamento rapidamente, senza attese.',
  },
];

const guarantees = [
  'Nessun obbligo',
  'Massima trasparenza',
  'Supporto continuo',
];

export default function ValuationProcess() {
  return (
    <section className="valuation-section">
      <div className="valuation-container">
        <div className="valuation-header">
          <h2 className="valuation-title">Come funziona la valutazione</h2>
          <p className="valuation-subtitle">
            Un processo semplice e trasparente in cinque passi
          </p>
        </div>

        <div className="valuation-grid">
          {steps.map((step) => (
            <div key={step.number} className="valuation-card">
              <span className="valuation-step-number">{step.number}</span>
              <h3 className="valuation-step-title">{step.title}</h3>
              <p className="valuation-step-description">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="valuation-guarantees">
          {guarantees.map((item) => (
            <span key={item} className="valuation-guarantee-item">
              <svg
                className="valuation-check-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
