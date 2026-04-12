import { createContext, useContext, useState } from 'react'

const translations = {
  it: {
    // Navbar
    nav_products: 'Prodotti',
    nav_cart: 'Carrello',

    // StorePage
    store_subtitle: 'Scopri la nostra selezione di carte, giochi e collezioni',
    store_product_count_one: 'prodotto',
    store_product_count_many: 'prodotti',
    store_unavailable_title: 'Store temporaneamente non disponibile',
    store_unavailable_msg: 'Torneremo presto. Grazie per la pazienza.',
    filter_search_placeholder: 'Cerca prodotti...',
    filter_all_categories: 'Tutte le categorie',
    filter_available_only: 'Solo disponibili',
    error_loading_products: 'Errore nel caricamento dei prodotti.',
    no_products_found: 'Nessun prodotto trovato',
    remove_filters: 'Rimuovi filtri',
    loading: 'Caricamento…',
    load_more: 'Carica altri prodotti',
    banner_discover: 'Scopri →',

    // StoreCartPage
    cart_empty_title: 'Il tuo carrello è vuoto',
    cart_empty_msg: 'Sfoglia il nostro catalogo e aggiungi i prodotti che preferisci.',
    continue_shopping: 'Continua lo shopping',
    continue_shopping_back: '← Continua lo shopping',
    cart_confirm_clear: 'Sei sicuro di voler svuotare il carrello?',
    cart_title: '🛒 Carrello',
    cart_item_one: 'articolo',
    cart_item_many: 'articoli',
    order_summary: 'Riepilogo ordine',
    items_label: 'Articoli',
    total_label: 'Totale',
    proceed_to_order: "Procedi all'ordine →",
    clear_cart: '🗑 Svuota carrello',
    remove_from_cart: 'Rimuovi dal carrello',
    decrease_quantity: 'Diminuisci quantità',
    increase_quantity: 'Aumenta quantità',

    // StoreProductPage
    error_product_not_found: 'Prodotto non trovato o non disponibile.',
    error_loading_product: 'Errore nel caricamento del prodotto.',
    back_to_store: '← Torna allo store',
    store_breadcrumb: 'Store',

    // ProductInfo
    out_of_stock_btn: '✕ Prodotto esaurito',
    added_to_cart_btn: '✓ Aggiunto al carrello!',
    add_again_btn: (qty) => `🛒 Aggiungi ancora (${qty} nel carrello)`,
    add_to_cart_btn: '🛒 Aggiungi al carrello',
    go_to_cart: 'Vai al carrello →',
    description_title: 'Descrizione',
    no_description: 'Nessuna descrizione disponibile.',

    // ProductCard
    badge_out_of_stock: 'Esaurito',
    badge_low_stock: 'In esaurimento',
    badge_only_n: (n) => `Solo ${n} rimasti`,
    card_not_available: 'Non disponibile',
    card_in_cart: (qty) => `Nel carrello (${qty})`,
    card_add: '+ Aggiungi',

    // StockBadge
    stock_out: 'Esaurito',
    stock_low: 'In esaurimento',
    stock_only_n: (n) => `Solo ${n} disponibili`,
    stock_available: 'Disponibile',

    // StoreCheckoutPage — steps
    step_personal: 'Dati personali',
    step_shipping: 'Spedizione',
    step_payment: 'Pagamento',
    step_summary: 'Riepilogo',
    step_confirm: 'Conferma',

    // Checkout shipping options
    shipping_pickup: 'Ritiro in negozio',
    shipping_standard: 'Spedizione standard',
    shipping_express: 'Spedizione express',
    shipping_free: 'Gratuito',
    shipping_standard_days: '3-5 giorni lavorativi',
    shipping_express_days: '1-2 giorni lavorativi',

    // Checkout payment options
    payment_card: 'Carta di credito/debito',
    payment_store: 'Pagamento in negozio',
    payment_store_detail: 'Paga al momento del ritiro',

    // Checkout page
    checkout_unavailable_title: 'Checkout non disponibile al momento',
    checkout_unavailable_msg: 'Il servizio di acquisto è temporaneamente sospeso.',
    back_to_store_plain: 'Torna allo store',
    cart_empty_checkout: 'Il carrello è vuoto',
    back_to_cart: '← Torna al carrello',
    checkout_title: 'Checkout',
    personal_and_shipping: 'Dati personali & spedizione',
    field_full_name: 'Nome e Cognome *',
    field_email: 'Email *',
    field_phone: 'Telefono',
    field_address: 'Indirizzo',
    field_city: 'Città',
    field_zip: 'CAP',
    field_notes: "Note sull'ordine",
    field_notes_placeholder: 'Eventuali note o istruzioni...',
    next_btn: 'Avanti →',
    back_btn: '← Indietro',
    choose_shipping: 'Scegli il metodo di spedizione',
    choose_payment: 'Scegli il metodo di pagamento',
    no_payment_methods: '⚠️ Nessun metodo di pagamento disponibile al momento. Riprova più tardi.',
    card_number: 'Numero carta',
    card_holder: 'Nome del titolare',
    card_expiry: 'Data scadenza',
    card_data_notice: 'I dati della carta non vengono memorizzati né elaborati.',
    redirect_notice: (label) => `Verrai reindirizzato a ${label} per completare il pagamento dopo la conferma.`,
    negozio_payment_notice: 'Potrai pagare direttamente in negozio al momento del ritiro. Nessun addebito online.',
    edit_btn: '← Modifica',
    sending: 'Invio in corso...',
    confirm_order: 'Conferma ordine ✓',
    summary_products: (n, one, many) => `Prodotti (${n} ${n === 1 ? one : many})`,
    subtotal_products: 'Subtotale prodotti',
    shipping_label_row: 'Spedizione & pagamento',
    shipping_method_label: 'Metodo spedizione',
    payment_method_label: 'Metodo pagamento',
    shipping_details: 'Dati di spedizione',
    field_name_label: 'Nome',
    field_email_label: 'Email',
    field_phone_label: 'Telefono',
    field_address_label: 'Indirizzo',
    field_notes_label: 'Note',
    final_total: 'Totale finale',
    order_confirmed: 'Ordine confermato!',
    order_number: (num) => `Numero ordine: ${num}`,
    order_error_title: "Errore nell'ordine",
    retry_btn: '← Riprova',
    store_back_btn: 'Torna allo store',

    // Validation
    validation_name_required: 'Il nome è obbligatorio.',
    validation_email_required: "L'email è obbligatoria.",
    validation_email_invalid: 'Inserisci un indirizzo email valido.',
  },

  en: {
    // Navbar
    nav_products: 'Products',
    nav_cart: 'Cart',

    // StorePage
    store_subtitle: 'Discover our selection of cards, games and collections',
    store_product_count_one: 'product',
    store_product_count_many: 'products',
    store_unavailable_title: 'Store temporarily unavailable',
    store_unavailable_msg: "We'll be back soon. Thank you for your patience.",
    filter_search_placeholder: 'Search products...',
    filter_all_categories: 'All categories',
    filter_available_only: 'Available only',
    error_loading_products: 'Error loading products.',
    no_products_found: 'No products found',
    remove_filters: 'Remove filters',
    loading: 'Loading…',
    load_more: 'Load more products',
    banner_discover: 'Discover →',

    // StoreCartPage
    cart_empty_title: 'Your cart is empty',
    cart_empty_msg: 'Browse our catalog and add the products you prefer.',
    continue_shopping: 'Continue shopping',
    continue_shopping_back: '← Continue shopping',
    cart_confirm_clear: 'Are you sure you want to clear the cart?',
    cart_title: '🛒 Cart',
    cart_item_one: 'item',
    cart_item_many: 'items',
    order_summary: 'Order summary',
    items_label: 'Items',
    total_label: 'Total',
    proceed_to_order: 'Proceed to order →',
    clear_cart: '🗑 Clear cart',
    remove_from_cart: 'Remove from cart',
    decrease_quantity: 'Decrease quantity',
    increase_quantity: 'Increase quantity',

    // StoreProductPage
    error_product_not_found: 'Product not found or unavailable.',
    error_loading_product: 'Error loading product.',
    back_to_store: '← Back to store',
    store_breadcrumb: 'Store',

    // ProductInfo
    out_of_stock_btn: '✕ Out of stock',
    added_to_cart_btn: '✓ Added to cart!',
    add_again_btn: (qty) => `🛒 Add again (${qty} in cart)`,
    add_to_cart_btn: '🛒 Add to cart',
    go_to_cart: 'Go to cart →',
    description_title: 'Description',
    no_description: 'No description available.',

    // ProductCard
    badge_out_of_stock: 'Out of stock',
    badge_low_stock: 'Low stock',
    badge_only_n: (n) => `Only ${n} left`,
    card_not_available: 'Not available',
    card_in_cart: (qty) => `In cart (${qty})`,
    card_add: '+ Add',

    // StockBadge
    stock_out: 'Out of stock',
    stock_low: 'Low stock',
    stock_only_n: (n) => `Only ${n} available`,
    stock_available: 'Available',

    // StoreCheckoutPage — steps
    step_personal: 'Personal data',
    step_shipping: 'Shipping',
    step_payment: 'Payment',
    step_summary: 'Summary',
    step_confirm: 'Confirmation',

    // Checkout shipping options
    shipping_pickup: 'Store pickup',
    shipping_standard: 'Standard shipping',
    shipping_express: 'Express shipping',
    shipping_free: 'Free',
    shipping_standard_days: '3-5 business days',
    shipping_express_days: '1-2 business days',

    // Checkout payment options
    payment_card: 'Credit/debit card',
    payment_store: 'Pay in store',
    payment_store_detail: 'Pay at the time of pickup',

    // Checkout page
    checkout_unavailable_title: 'Checkout not available at the moment',
    checkout_unavailable_msg: 'The purchase service is temporarily suspended.',
    back_to_store_plain: 'Back to store',
    cart_empty_checkout: 'Cart is empty',
    back_to_cart: '← Back to cart',
    checkout_title: 'Checkout',
    personal_and_shipping: 'Personal data & shipping',
    field_full_name: 'Full name *',
    field_email: 'Email *',
    field_phone: 'Phone',
    field_address: 'Address',
    field_city: 'City',
    field_zip: 'ZIP code',
    field_notes: 'Order notes',
    field_notes_placeholder: 'Any notes or instructions...',
    next_btn: 'Next →',
    back_btn: '← Back',
    choose_shipping: 'Choose shipping method',
    choose_payment: 'Choose payment method',
    no_payment_methods: '⚠️ No payment methods available at the moment. Please try again later.',
    card_number: 'Card number',
    card_holder: 'Cardholder name',
    card_expiry: 'Expiry date',
    card_data_notice: 'Card data is not stored or processed.',
    redirect_notice: (label) => `You will be redirected to ${label} to complete the payment after confirmation.`,
    negozio_payment_notice: 'You can pay directly in store at the time of pickup. No online charge.',
    edit_btn: '← Edit',
    sending: 'Sending...',
    confirm_order: 'Confirm order ✓',
    summary_products: (n, one, many) => `Products (${n} ${n === 1 ? one : many})`,
    subtotal_products: 'Products subtotal',
    shipping_label_row: 'Shipping & payment',
    shipping_method_label: 'Shipping method',
    payment_method_label: 'Payment method',
    shipping_details: 'Shipping details',
    field_name_label: 'Name',
    field_email_label: 'Email',
    field_phone_label: 'Phone',
    field_address_label: 'Address',
    field_notes_label: 'Notes',
    final_total: 'Final total',
    order_confirmed: 'Order confirmed!',
    order_number: (num) => `Order number: ${num}`,
    order_error_title: 'Order error',
    retry_btn: '← Retry',
    store_back_btn: 'Back to store',

    // Validation
    validation_name_required: 'Name is required.',
    validation_email_required: 'Email is required.',
    validation_email_invalid: 'Enter a valid email address.',
  },
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem('store_lang') || 'it'
    } catch {
      return 'it'
    }
  })

  function setLanguage(newLang) {
    try {
      localStorage.setItem('store_lang', newLang)
    } catch {}
    setLang(newLang)
  }

  function t(key, ...args) {
    const val = translations[lang]?.[key] ?? translations['it']?.[key] ?? key
    if (typeof val === 'function') return val(...args)
    return val
  }

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
