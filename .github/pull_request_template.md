## 📝 Descrizione
<!-- Descrivi le modifiche apportate -->

## 🔗 Issue correlata
<!-- Collega l'issue: "Closes #NNN" oppure "Refs #NNN" -->

## ✅ Checklist
- [ ] I test locali passano
- [ ] Ho aggiornato la documentazione se necessario
- [ ] Il codice segue le convenzioni del progetto

## 🤖 Note per il sistema CI/CD
<!-- Lasciare vuoto: il sistema CI/CD gestirà automaticamente test, fix e merge -->
> La pipeline eseguirà automaticamente:
> - Test funzionali (pytest backend + jest frontend)
> - Scansione di sicurezza (Bandit + Safety + CodeQL + Trivy)
> - Auto-merge se tutti i test passano ✅
> - Apertura issue assegnata a @copilot se i test falliscono ❌
