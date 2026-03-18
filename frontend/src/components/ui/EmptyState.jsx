function EmptyState({ icon = '📭', title = 'Nessun dato', description, action }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      color: '#6b7280',
    }}>
      <div style={{ fontSize: '3rem', marginBottom: '12px', opacity: 0.6 }}>{icon}</div>
      <div style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>{title}</div>
      {description && (
        <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '16px', maxWidth: '320px' }}>
          {description}
        </div>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}

export default EmptyState
