# GUECHO — Billetterie Événement

Billetterie moderne pour un événement spécifique, inspirée des [Sites of the Year Awwwards](https://www.awwwards.com/websites/sites_of_the_year/).

## Stack

- **Next.js 16** (App Router)
- **PostgreSQL** via [Neon](https://neon.tech)
- **Prisma** ORM
- **FlexPaie** — paiement Mobile Money & cartes
- **GSAP** — animations immersives
- **Vercel** — déploiement

## Types de billets

| Catégorie | Tiers |
|-----------|-------|
| Spectacle | Standard, VIP, VVIP |
| Streaming | Access Streaming |

## Démarrage rapide

### 1. Variables d'environnement

```bash
cp .env.example .env
```

Configurer `DATABASE_URL` avec votre base Neon, puis les credentials FlexPaie.

### 2. Base de données

```bash
npm run db:push      # Créer les tables
npm run db:seed      # Insérer l'événement GUECHO Live 2026
```

### 3. Lancer en local

```bash
npm run dev
```

- Accueil : http://localhost:3000
- Billetterie : http://localhost:3000/evenement/guecho-live-2026

## FlexPay

Intégration conforme à la **FlexPay API v1.4** (Infoset Group) — voir `docs/docs.txt`.

| Endpoint | URL |
|----------|-----|
| Mobile Money | `POST backend.flexpay.cd/api/rest/v1/paymentService` |
| Carte bancaire | `POST cardpayment.flexpay.cd/v1/pay` (formulaire) |
| Vérification | `GET backend.flexpay.cd/api/rest/v1/check/{orderNumber}` |
| Callback | `POST /api/payments/flexpaie/webhook` |

Variables `.env` :
- `FLEXPAIE_MERCHANT` — code marchand (ex. ISSIFORUM)
- `FLEXPAIE_TOKEN` — Bearer token
- `FLEXPAIE_CALLBACK_URL` — URL callback serveur

Flux :
1. **Mobile Money** — push USSD, polling automatique toutes les 5s
2. **Carte** — redirection formulaire POST vers FlexPay
3. **Callback** — FlexPay notifie `{ code, reference, orderNumber }`

## Déploiement Vercel

1. Connecter le repo à Vercel
2. Ajouter `DATABASE_URL` (Neon) dans les variables d'environnement
3. Configurer `NEXT_PUBLIC_APP_URL` avec l'URL Vercel
4. Le build exécute `prisma generate` et `prisma migrate deploy`

## Structure

```
src/
├── app/
│   ├── api/orders/          # Création commande + paiement
│   ├── api/events/[slug]/   # Données événement
│   ├── api/payments/flexpaie/webhook/
│   ├── evenement/[slug]/    # Page billetterie
│   └── confirmation/[orderId]/
├── components/
│   ├── event/               # Hero, streaming
│   ├── landing/             # Page d'accueil
│   ├── layout/              # Header, footer
│   └── ticketing/           # Sélection, checkout
└── lib/                     # Prisma, FlexPaie, logique métier
```
