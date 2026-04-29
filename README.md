# Hive.tn MVP

Hive.tn est organise autour d'une architecture modulaire plus lisible, tout en conservant les routes et les fonctionnalites existantes du MVP crowdfunding.

## Ce qui a change

- Backend structure autour de `backend/src/app.js`, `backend/src/server.js`, `backend/src/routes/index.js` et `backend/src/modules/*`
- Middlewares globaux centralises dans `backend/src/middlewares`
- Scripts ponctuels regroupes sous `backend/scripts/*`
- Frontend organise autour de `front/src/app`, `front/src/modules` et `front/src/shared`
- Services API et utilitaires transverses factorises dans des emplacements partages
- Nettoyage des wrappers obsoletes, des fichiers de test/resultat isoles et des artefacts a ne pas versionner

## Verification effectuee

- `front`: `npm run build` reussi
- `backend`: verification syntaxique des fichiers modifies avec `node --check`

## Structure de reference

- `backend/src/modules/auth|campaigns|comments|admin|support|notifications|payments|pledges|saved`
- `backend/src/middlewares`
- `backend/src/routes/index.js`
- `backend/scripts/database`
- `backend/scripts/admin`
- `backend/scripts/tests-manual`
- `front/src/app`
- `front/src/modules/auth|campaigns|profile|support|admin|payments`
- `front/src/shared`

## Hygiene du repo

- `node_modules/`, `dist/` et `.vite/` sont ignores
- `backend/uploads/` reste disponible localement mais n'est plus considere comme code a versionner
- Les anciens scripts backend a la racine ont ete soit regroupes, soit supprimes quand ils etaient devenus redondants

## Docs

- Architecture detaillee: [front/architecture.md](./front/architecture.md)

## Stripe test mode local

- Copiez `backend/.env.example` vers `backend/.env` et renseignez `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` et `STRIPE_CURRENCY`
- Copiez `front/.env.example` vers `front/.env` si besoin; `VITE_STRIPE_PUBLISHABLE_KEY` reste optionnelle pour cette version basee sur l'URL Checkout hebergee
- Lancez le backend sur `http://localhost:5000` puis le frontend sur `http://localhost:5173`
- En local, utilisez Stripe CLI pour relayer les webhooks vers `POST http://localhost:5000/api/payments/webhook`
- Gardez uniquement des cles `sk_test_...` et `pk_test_...` pour cette integration
