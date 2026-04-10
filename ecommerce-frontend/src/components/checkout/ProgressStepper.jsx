import React from 'react';

export default function ProgressStepper({ steps, currentStep }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 'var(--spacing-xl)',
      }}
    >
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 14,
                background:
                  step.number < currentStep
                    ? 'var(--color-accent)'
                    : step.number === currentStep
                    ? 'var(--gradient-gold)'
                    : 'var(--color-surface-elevated)',
                color:
                  step.number <= currentStep
                    ? 'var(--color-background)'
                    : 'var(--color-text-muted)',
                border:
                  step.number === currentStep
                    ? 'none'
                    : '1px solid var(--color-border)',
                transition: 'all var(--transition-fast)',
              }}
            >
              {step.number < currentStep ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                step.number
              )}
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: step.number === currentStep ? 600 : 400,
                color:
                  step.number === currentStep
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              style={{
                flex: 1,
                height: 2,
                marginBottom: 20,
                marginInline: 'var(--spacing-sm)',
                background:
                  step.number < currentStep
                    ? 'var(--color-accent)'
                    : 'var(--color-border)',
                transition: 'background var(--transition-fast)',
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
