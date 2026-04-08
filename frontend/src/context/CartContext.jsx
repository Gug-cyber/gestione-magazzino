import { createContext, useContext, useState, useEffect } from 'react'

export const CartContext = createContext(null)

const STORAGE_KEY = 'gm_cart'

function loadCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCart(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => loadCart())

  useEffect(() => {
    saveCart(items)
  }, [items])

  function addItem(prodotto, qty = 1) {
    setItems(prev => {
      const existing = prev.find(i => i.id === prodotto.id)
      if (existing) {
        const newQty = Math.min(existing.quantita + qty, prodotto.quantita_disponibile ?? prodotto.quantita)
        return prev.map(i =>
          i.id === prodotto.id ? { ...i, quantita: newQty } : i
        )
      }
      const newQty = Math.min(qty, prodotto.quantita_disponibile ?? prodotto.quantita)
      return [...prev, {
        id: prodotto.id,
        nome: prodotto.nome,
        sku: prodotto.sku,
        prezzo_vendita: prodotto.prezzo_vendita,
        prezzo_unitario: prodotto.prezzo_unitario ?? prodotto.prezzo_vendita,
        quantita: newQty,
        foto_url: prodotto.foto_url,
        quantita_disponibile: prodotto.quantita_disponibile ?? prodotto.quantita,
        in_esaurimento: prodotto.in_esaurimento,
      }]
    })
  }

  function removeItem(id) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function updateQuantity(id, qty) {
    if (qty <= 0) {
      removeItem(id)
      return
    }
    setItems(prev =>
      prev.map(i =>
        i.id === id
          ? { ...i, quantita: Math.min(qty, i.quantita_disponibile) }
          : i
      )
    )
  }

  function clearCart() {
    setItems([])
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantita, 0)
  const totalPrice = items.reduce((sum, i) => sum + (i.prezzo_unitario ?? i.prezzo_vendita ?? 0) * i.quantita, 0)

  function isInCart(id) {
    return items.some(i => i.id === id)
  }

  function getItemQty(id) {
    const item = items.find(i => i.id === id)
    return item ? item.quantita : 0
  }

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
      isInCart,
      getItemQty,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
