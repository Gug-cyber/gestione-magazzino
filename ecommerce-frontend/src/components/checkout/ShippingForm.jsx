import React from 'react';

const PROVINCES = [
  'AG','AL','AN','AO','AR','AP','AT','AV','BA','BT','BL','BN','BG','BI','BO',
  'BZ','BS','BR','CA','CL','CB','CI','CE','CT','CZ','CH','CO','CS','CR','KR',
  'CN','EN','FM','FE','FI','FG','FC','FR','GE','GO','GR','IM','IS','SP','AQ',
  'LT','LE','LC','LI','LO','LU','MC','MN','MS','MT','ME','MI','MO','MB','NA',
  'NO','NU','OG','OT','OR','PD','PA','PR','PV','PG','PU','PE','PC','PI','PT',
  'PN','PZ','PO','RG','RA','RC','RE','RI','RN','RM','RO','SA','VS','SS','SV',
  'SI','SR','SO','TA','TE','TR','TO','OT','TP','TN','TV','TS','UD','VA','VE',
  'VB','VC','VR','VV','VI','VT'
];

function FormField({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--color-text-secondary)',
        }}
      >
        {label}
      </label>
      {children}
      {error && (
        <span style={{ fontSize: 12, color: 'var(--color-error)' }}>{error}</span>
      )}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', error }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        padding: '10px 12px',
        background: 'var(--color-surface-elevated)',
        border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        color: 'var(--color-text-primary)',
        fontSize: 14,
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
      }}
    />
  );
}

export default function ShippingForm({
  data,
  onChange,
  errors,
  useSameAddress,
  onUseSameAddressChange,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--spacing-md)',
        }}
      >
        <FormField label="Nome *" error={errors.firstName}>
          <Input
            value={data.firstName}
            onChange={(v) => onChange('firstName', v)}
            placeholder="Mario"
            error={errors.firstName}
          />
        </FormField>
        <FormField label="Cognome *" error={errors.lastName}>
          <Input
            value={data.lastName}
            onChange={(v) => onChange('lastName', v)}
            placeholder="Rossi"
            error={errors.lastName}
          />
        </FormField>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--spacing-md)',
        }}
      >
        <FormField label="Email *" error={errors.email}>
          <Input
            type="email"
            value={data.email}
            onChange={(v) => onChange('email', v)}
            placeholder="mario@esempio.it"
            error={errors.email}
          />
        </FormField>
        <FormField label="Telefono *" error={errors.phone}>
          <Input
            type="tel"
            value={data.phone}
            onChange={(v) => onChange('phone', v)}
            placeholder="+39 333 1234567"
            error={errors.phone}
          />
        </FormField>
      </div>

      <FormField label="Indirizzo *" error={errors.address}>
        <Input
          value={data.address}
          onChange={(v) => onChange('address', v)}
          placeholder="Via Roma 1"
          error={errors.address}
        />
      </FormField>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gap: 'var(--spacing-md)',
        }}
      >
        <FormField label="Città *" error={errors.city}>
          <Input
            value={data.city}
            onChange={(v) => onChange('city', v)}
            placeholder="Milano"
            error={errors.city}
          />
        </FormField>
        <FormField label="CAP *" error={errors.zip}>
          <Input
            value={data.zip}
            onChange={(v) => onChange('zip', v)}
            placeholder="20100"
            error={errors.zip}
          />
        </FormField>
        <FormField label="Provincia *" error={errors.province}>
          <select
            value={data.province}
            onChange={(e) => onChange('province', e.target.value)}
            style={{
              padding: '10px 12px',
              background: 'var(--color-surface-elevated)',
              border: `1px solid ${errors.province ? 'var(--color-error)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)',
              color: data.province ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              fontSize: 14,
              outline: 'none',
              width: '100%',
              cursor: 'pointer',
            }}
          >
            <option value="">--</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Paese">
        <Input
          value={data.country}
          onChange={(v) => onChange('country', v)}
          placeholder="Italia"
        />
      </FormField>

      <FormField label="Note aggiuntive">
        <textarea
          value={data.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          placeholder="Istruzioni per la consegna..."
          rows={3}
          style={{
            padding: '10px 12px',
            background: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-primary)',
            fontSize: 14,
            outline: 'none',
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
      </FormField>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          cursor: 'pointer',
          fontSize: 14,
          color: 'var(--color-text-secondary)',
        }}
      >
        <input
          type="checkbox"
          checked={useSameAddress}
          onChange={(e) => onUseSameAddressChange(e.target.checked)}
          style={{ width: 16, height: 16, cursor: 'pointer' }}
        />
        Usa lo stesso indirizzo per la fatturazione
      </label>
    </div>
  );
}
