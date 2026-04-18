// ⚠️ PRODUZIONE: spostare la chiamata API in un endpoint backend (es. /api/ai/chat)
// per non esporre VITE_GROQ_API_KEY nel bundle frontend.

import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SYSTEM_PROMPT = `Sei un assistente virtuale per un negozio online.
Aiuti i clienti a:
- Trovare prodotti nel catalogo per nome, categoria o codice
- Ottenere informazioni su disponibilità e prezzi
- Capire come funziona il processo di acquisto e checkout
- Ricevere assistenza su spedizioni e resi
- Rispondere a domande generali sul negozio
Rispondi sempre in italiano, in modo cordiale, conciso e professionale.
Se non conosci informazioni specifiche (es. prezzi esatti, disponibilità in tempo reale), invita il cliente a consultare la pagina prodotto o a contattare il negozio.`

export default function AIAssistantWidget() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Mostra il widget SOLO sulle pagine dello store pubblico
  const path = location.pathname
  if (!path.startsWith('/store')) {
    return null
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || isLoading) return

    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...newMessages,
          ],
          max_tokens: 1024,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        throw new Error(`Errore API: ${response.status}`)
      }

      const data = await response.json()
      const assistantContent = data.choices?.[0]?.message?.content
      if (!assistantContent) {
        throw new Error('Risposta non valida dal servizio AI.')
      }
      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }])
    } catch (err) {
      setError(err.message || 'Si è verificato un errore. Riprova.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      <style>{`
        @keyframes ai-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
        .ai-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--color-primary, #6366f1);
          animation: ai-bounce 1.2s ease-in-out infinite;
          display: inline-block;
        }
        .ai-dot:nth-child(2) { animation-delay: 0.2s; }
        .ai-dot:nth-child(3) { animation-delay: 0.4s; }
        .ai-toggle-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 24px rgba(99,102,241,0.45);
        }
      `}</style>

      <button
        className="ai-toggle-btn"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Apri assistente AI"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 10000,
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: 'none',
          background: 'var(--color-primary, #6366f1)',
          color: '#fff',
          fontSize: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
          transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        }}
      >
        💬
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Assistente Negozio"
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '24px',
            zIndex: 9999,
            width: '320px',
            height: '460px',
            borderRadius: '14px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            background: '#6366f1',
            color: '#fff',
            flexShrink: 0,
          }}>
            <span style={{ fontWeight: 600, fontSize: '14px' }}>🤖 Assistente del Negozio</span>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Chiudi chat"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '18px',
                cursor: 'pointer',
                lineHeight: 1,
                padding: '2px 4px',
                borderRadius: '4px',
                opacity: 0.85,
              }}
            >
              ×
            </button>
          </div>

          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            background: '#f8fafc',
          }}>
            {messages.length === 0 && !isLoading && (
              <div style={{
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '13px',
                marginTop: '24px',
                lineHeight: 1.5,
              }}>
                👋 Ciao! Sono qui per aiutarti.<br />
                Hai domande sui nostri prodotti o sugli ordini?
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  maxWidth: '82%',
                  padding: '8px 12px',
                  borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: msg.role === 'user' ? '#6366f1' : '#ffffff',
                  color: msg.role === 'user' ? '#fff' : '#1e293b',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '12px 12px 12px 4px',
                  background: '#ffffff',
                  display: 'flex',
                  gap: '5px',
                  alignItems: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}>
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                </div>
              </div>
            )}

            {error && (
              <div style={{
                fontSize: '12px',
                color: '#dc2626',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '8px 10px',
              }}>
                ⚠️ {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div style={{
            display: 'flex',
            gap: '8px',
            padding: '10px 12px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi un messaggio…"
              disabled={isLoading}
              style={{
                flex: 1,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                color: '#1e293b',
                fontSize: '13px',
                padding: '8px 10px',
                outline: 'none',
                minWidth: 0,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              style={{
                background: '#6366f1',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                padding: '8px 12px',
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                opacity: isLoading || !input.trim() ? 0.55 : 1,
                transition: 'opacity 0.15s',
                flexShrink: 0,
              }}
            >
              Invia
            </button>
          </div>
        </div>
      )}
    </>
  )
}