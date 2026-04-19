import Link from 'next/link'
import styles from './page.module.css'

export default function HomePage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span className={styles.titleIcon}>📦</span>
          Gestione Magazzino
        </h1>
        <p className={styles.subtitle}>
          Mini-app mobile per operazioni di magazzino
        </p>
      </header>

      <nav className={styles.nav}>
        <Link href="/scanner-demo" className={styles.navLink}>
          <div className={styles.cardActive}>
            <span className={styles.cardIcon}>📷</span>
            <div className={styles.cardContent}>
              <div className={styles.cardTitle}>Scanner Demo</div>
              <div className={styles.cardDescription}>
                Testa il componente scanner barcode/QR
              </div>
            </div>
            <span className={styles.cardArrow}>→</span>
          </div>
        </Link>

        <div className={styles.cardDisabled}>
          <span className={styles.cardIcon}>📥</span>
          <div className={styles.cardContent}>
            <div className={styles.cardTitle}>Carico Fornitura</div>
            <div className={styles.cardDescription}>Prossimamente</div>
          </div>
          <span className={styles.cardBadge}>Soon</span>
        </div>

        <div className={styles.cardDisabled}>
          <span className={styles.cardIcon}>🛒</span>
          <div className={styles.cardContent}>
            <div className={styles.cardTitle}>Nuovo Ordine</div>
            <div className={styles.cardDescription}>Prossimamente</div>
          </div>
          <span className={styles.cardBadge}>Soon</span>
        </div>

        <div className={styles.cardDisabled}>
          <span className={styles.cardIcon}>📊</span>
          <div className={styles.cardContent}>
            <div className={styles.cardTitle}>Inventario</div>
            <div className={styles.cardDescription}>Prossimamente</div>
          </div>
          <span className={styles.cardBadge}>Soon</span>
        </div>
      </nav>

      <footer className={styles.footer}>
        <p className={styles.footerText}>
          Versione 1.0.0 &bull; Mobile App
        </p>
      </footer>
    </main>
  )
}
