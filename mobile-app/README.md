# Gestione Magazzino — Mobile App

Mini-app **Next.js 15** con App Router ottimizzata per smartphone e tablet.
Contiene il componente scanner barcode/QR riutilizzabile (`BarcodeScanner`).

## Prerequisiti

- Node.js ≥ 18
- npm ≥ 9

## Installazione e avvio

```bash
cd mobile-app
npm install
npm run dev      # avvia su http://localhost:3001
```

## Build per produzione

```bash
npm run build
npm start        # serve su http://localhost:3001
```

## Struttura

```
src/
├── app/
│   ├── layout.tsx            # Root layout
│   ├── globals.css           # Stili globali
│   ├── page.tsx              # Homepage con link alle demo
│   └── scanner-demo/
│       └── page.tsx          # Demo del componente BarcodeScanner
└── components/
    └── BarcodeScanner/
        ├── BarcodeScanner.tsx       # Componente principale
        ├── BarcodeScanner.module.css
        └── index.ts                 # Export barrel
```

## Componente `BarcodeScanner`

### Props

| Prop | Tipo | Default | Descrizione |
|------|------|---------|-------------|
| `onDetected` | `(code: string) => void` | — | Callback quando un codice viene rilevato |
| `onError` | `(error: string) => void` | — | Callback per errori camera |
| `autoStart` | `boolean` | `false` | Apri lo scanner automaticamente |
| `placeholder` | `string` | `'Inserisci codice manualmente'` | Placeholder input manuale |
| `className` | `string` | — | Classe CSS aggiuntiva |

### Utilizzo

```tsx
import dynamic from 'next/dynamic'

const BarcodeScanner = dynamic(
  () => import('@/components/BarcodeScanner').then(m => m.BarcodeScanner),
  { ssr: false }
)

function MyPage() {
  const handleDetected = (code: string) => {
    console.log('Codice:', code)
  }
  return <BarcodeScanner onDetected={handleDetected} />
}
```

## Note

- Il componente funziona solo su **HTTPS** o `localhost` (requisito browser per accesso camera).
- Su iOS Safari il tag `<video>` usa `playsInline autoPlay muted` per il funzionamento corretto.
- La libreria `@zxing/browser` supporta barcode 1D (EAN-13, Code128, ecc.) e QR code.
- Il componente include sempre un fallback di **input manuale** in caso di problemi con la camera.
