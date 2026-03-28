export const CORRIERI = [
  { value: 'Ritiro in negozio', label: 'Ritiro in negozio', url: () => null },
  { value: 'BRT',              label: 'BRT',              url: (n) => `https://www.brt.it/privati/spedizioni/tracking#${n}` },
  { value: 'DHL',              label: 'DHL',              url: (n) => `https://www.dhl.com/it-it/home/tracking.html?tracking-id=${n}` },
  { value: 'SDA',              label: 'SDA',              url: (n) => `https://www.sda.it/it/it/tools/traccia-la-tua-spedizione.html#${n}` },
  { value: 'GLS',              label: 'GLS',              url: (n) => `https://gls-group.eu/IT/it/ricerca-spedizioni.html?match=${n}` },
  { value: 'Poste Italiane',   label: 'Poste Italiane',   url: (n) => `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${n}` },
  { value: 'UPS',              label: 'UPS',              url: (n) => `https://www.ups.com/track?loc=it_IT&tracknum=${n}` },
  { value: 'FedEx',            label: 'FedEx',            url: (n) => `https://www.fedex.com/fedextrack/?trknbr=${n}` },
  { value: 'Nexive',           label: 'Nexive',           url: (n) => `https://www.nexive.it/strumenti/traccia-spedizione?barcode=${n}` },
  { value: 'Amazon Logistics', label: 'Amazon Logistics', url: (n) => `https://track.amazon.it/tracking/${n}` },
  { value: 'TNT',              label: 'TNT',              url: (n) => `https://www.tnt.com/express/it_it/site/tracking.html?searchType=CON&cons=${n}` },
  { value: 'InPost',           label: 'InPost',           url: (n) => `https://inpost.it/tracking?number=${n}` },
  { value: 'Altro',            label: 'Altro',            url: () => null },
]

export function getTrackingUrl(corriereValue, trackingNumber) {
  const corriere = CORRIERI.find(c => c.value === corriereValue)
  if (!corriere || !trackingNumber) return null
  return corriere.url(trackingNumber)
}