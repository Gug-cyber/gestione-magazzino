import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import ProgressStepper from '../components/checkout/ProgressStepper';
import ShippingForm from '../components/checkout/ShippingForm';
import PaymentMethodSelector from '../components/checkout/PaymentMethodSelector';
import OrderSummary from '../components/checkout/OrderSummary';
import OrderConfirmationStep from '../components/checkout/OrderConfirmationStep';
import { strapiAPI } from '../api/strapi';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, totalItems, totalPrice, clearCart } = useCart();
  const { user, token } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);

  const [shippingData, setShippingData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    province: '',
    zip: '',
    country: 'Italia',
    notes: '',
  });

  const [useSameAddress, setUseSameAddress] = useState(true);
  const [billingData, setBillingData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [shippingErrors, setShippingErrors] = useState({});

  // Redirect se carrello vuoto
  useEffect(() => {
    if (items.length === 0) {
      navigate('/catalogo');
    }
  }, [items, navigate]);

  // Auto-populate email
  useEffect(() => {
    if (user?.email && !shippingData.email) {
      setShippingData((prev) => ({ ...prev, email: user.email }));
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const steps = [
    { number: 1, label: 'Carrello' },
    { number: 2, label: 'Spedizione' },
    { number: 3, label: 'Pagamento' },
    { number: 4, label: 'Conferma' },
  ];

  const validateShippingData = () => {
    const errors = {};
    if (!shippingData.firstName?.trim()) errors.firstName = 'Nome richiesto';
    if (!shippingData.lastName?.trim()) errors.lastName = 'Cognome richiesto';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!shippingData.email || !emailRegex.test(shippingData.email)) {
      errors.email = 'Email non valida';
    }

    const phoneRegex = /^[+]?[0-9\s()-]{9,}$/;
    if (!shippingData.phone || !phoneRegex.test(shippingData.phone)) {
      errors.phone = 'Telefono non valido';
    }

    if (!shippingData.address?.trim()) errors.address = 'Indirizzo richiesto';
    if (!shippingData.city?.trim()) errors.city = 'Città richiesta';

    const zipRegex = /^\d{5}$/;
    if (!shippingData.zip || !zipRegex.test(shippingData.zip)) {
      errors.zip = 'CAP non valido (5 cifre)';
    }

    if (!shippingData.province) errors.province = 'Provincia richiesta';

    setShippingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const canProceedToStep = (step) => {
    switch (step) {
      case 2:
        return items.length > 0;
      case 3:
        return validateShippingData();
      case 4:
        return paymentMethod !== '';
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep === 2 && !validateShippingData()) return;
    if (canProceedToStep(currentStep + 1)) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const calculateShippingCost = () => {
    if (totalPrice >= 50) return 0;
    const totalWeight = items.reduce((sum, item) => sum + item.quantity, 0);
    return totalWeight <= 5 ? 4.9 : 6.9;
  };

  const shippingCost = calculateShippingCost();
  const paymentFee = paymentMethod === 'cod' ? 2.0 : 0;
  const grandTotal = totalPrice + shippingCost + paymentFee;

  const handleSubmitOrder = async () => {
    if (!termsAccepted) {
      setOrderError('Devi accettare i termini e condizioni');
      return;
    }

    try {
      setIsSubmitting(true);
      setOrderError(null);

      const orderData = {
        user: user.id,
        items: items.map((item) => ({
          product: {
            id: item.product.id,
            title: item.product.attributes.title,
            price: item.product.attributes.price,
            slug: item.product.attributes.slug,
            image: item.product.attributes.images?.data?.[0]?.attributes?.url,
          },
          quantity: item.quantity,
          priceAtTime: item.product.attributes.price,
        })),
        shippingAddress: shippingData,
        billingAddress: useSameAddress ? shippingData : billingData,
        paymentMethod,
        subtotal: totalPrice,
        shippingCost,
        paymentFee,
        total: grandTotal,
        status: 'pending',
        orderNumber: `ORD-${Date.now()}-${user.id}`,
      };

      const response = await strapiAPI.createOrder(orderData, token);

      await Promise.all(
        items.map((item) =>
          strapiAPI.updateProductStock(
            item.product.id,
            item.product.attributes.quantity - item.quantity,
            token
          )
        )
      );

      clearCart();
      navigate(`/ordine-confermato/${response.data.id}`);
    } catch (error) {
      console.error('Order submission error:', error);
      const errorMessage =
        error.response?.data?.error?.message ||
        "Errore durante la creazione dell'ordine. Riprova.";
      setOrderError(errorMessage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-xl)',
            }}
          >
            <h2 style={{ marginTop: 0 }}>Riepilogo Carrello</h2>
            <p
              style={{
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--spacing-lg)',
              }}
            >
              Verifica i prodotti nel tuo carrello ({totalItems}{' '}
              {totalItems === 1 ? 'articolo' : 'articoli'})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {items.map((item) => (
                <div
                  key={item.product.id}
                  style={{
                    display: 'flex',
                    gap: 'var(--spacing-md)',
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div style={{ fontSize: 14, flex: 1 }}>
                    <strong>{item.product.attributes.title}</strong>
                    <div
                      style={{ color: 'var(--color-text-muted)', marginTop: 4 }}
                    >
                      Quantità: {item.quantity} ×{' '}
                      {item.product.attributes.price.toFixed(2)} EUR
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {(item.product.attributes.price * item.quantity).toFixed(2)} EUR
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-xl)',
            }}
          >
            <h2 style={{ marginTop: 0 }}>Dati di Spedizione</h2>
            <p
              style={{
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--spacing-lg)',
              }}
            >
              Inserisci l&apos;indirizzo di consegna
            </p>
            <ShippingForm
              data={shippingData}
              onChange={(field, value) =>
                setShippingData((prev) => ({ ...prev, [field]: value }))
              }
              errors={shippingErrors}
              useSameAddress={useSameAddress}
              onUseSameAddressChange={setUseSameAddress}
              billingData={billingData}
              onBillingChange={setBillingData}
            />
          </div>
        );

      case 3:
        return (
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-xl)',
            }}
          >
            <h2 style={{ marginTop: 0 }}>Metodo di Pagamento</h2>
            <p
              style={{
                color: 'var(--color-text-muted)',
                marginBottom: 'var(--spacing-lg)',
              }}
            >
              Seleziona come vuoi pagare
            </p>
            <PaymentMethodSelector
              selected={paymentMethod}
              onSelect={setPaymentMethod}
            />
          </div>
        );

      case 4:
        return (
          <OrderConfirmationStep
            cart={items}
            shippingData={shippingData}
            billingData={billingData}
            useSameAddress={useSameAddress}
            paymentMethod={paymentMethod}
            termsAccepted={termsAccepted}
            onTermsChange={setTermsAccepted}
            onSubmit={handleSubmitOrder}
            isSubmitting={isSubmitting}
            onEditStep={setCurrentStep}
          />
        );

      default:
        return null;
    }
  };

  if (items.length === 0) return null;

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: 'var(--spacing-xl)',
      }}
    >
      <h1 style={{ marginBottom: 'var(--spacing-md)' }}>Checkout</h1>

      {orderError && (
        <div
          style={{
            padding: 'var(--spacing-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error)',
            marginBottom: 'var(--spacing-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {orderError}
        </div>
      )}

      <ProgressStepper steps={steps} currentStep={currentStep} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 'var(--spacing-2xl)',
          marginTop: 'var(--spacing-xl)',
        }}
      >
        <div>
          {renderStepContent()}

          {currentStep < 4 && (
            <div
              style={{
                display: 'flex',
                gap: 'var(--spacing-md)',
                marginTop: 'var(--spacing-xl)',
              }}
            >
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-secondary)',
                  cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentStep === 1 ? 0.5 : 1,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Indietro
              </button>
              <button
                onClick={handleNext}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: 'var(--gradient-gold)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-background)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 14,
                  transition: 'all var(--transition-fast)',
                }}
              >
                Continua
              </button>
            </div>
          )}
        </div>

        <div style={{ position: 'sticky', top: 20, height: 'fit-content' }}>
          <OrderSummary
            items={items}
            shippingCost={shippingCost}
            paymentMethod={paymentMethod}
            totalPrice={totalPrice}
            grandTotal={grandTotal}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .checkout-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
