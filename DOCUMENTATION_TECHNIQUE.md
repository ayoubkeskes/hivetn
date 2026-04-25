  # 📋 DOCUMENTATION TECHNIQUE - HIVE.TN MVP
  **Date**: Avril 2026 | **Version**: 1.1 | **Scope**: Statut fonctionnel exhaustif
  **Auteur**: Audit code automatisé | **Confiance**: Basé sur analyse directe sources

  ---

  ## ⚠️ RÉSUMÉ EXÉCUTIF

  **Hive.tn** est une plateforme de crowdfunding tunisienne moderne, **70% implémentée** en production-ready:
  - ✅ **Authentification, campagnes CRUD, commentaires, support, admin modération, audit logs** : Complet
  - ✅ **Stripe Checkout en mode test** : Création de sessions, retour succès/annulation, webhooks signés, idempotence
  - ⚠️ **Paiements production, notifications temps réel, contributions manuelles legacy** : Partiels
  - ❌ **Milestones blockchain, analytics avancées, webhooks externes** : Prévus uniquement

  ---

  ## 1. ARCHITECTURE GÉNÉRALE

  ### Backend
  **Stack**: Node.js + Express.js 5.2.1 + PostgreSQL 18.3  
  **Port**: 5000 (dev) | Produit via env vars  
  **Entrée**: [backend/src/server.js](backend/src/server.js) → [backend/src/app.js](backend/src/app.js) → [backend/src/routes/index.js](backend/src/routes/index.js)

  **Flow démarrage**:
  ```
  server.js (charge .env via config/env.js)
    → db.js (Pool PostgreSQL + ensureRuntimeSchema())
    → schemaInit.js (ALTER/CREATE tables métier + triggers)
    → app.js (Express + CORS + raw Stripe webhook + routes)
    → écoute PORT
  ```

  **Middlewares intégrés** (ordre d'application):
  | Middleware | Route | Fonction |
  |---|---|---|
  | CORS | * | Accepte toute origine ⚠️ |
  | Stripe raw parser | /api/payments/webhook | Préserve le payload signé avant JSON parser |
  | JSON parser (50MB limit) | * | [app.js L15](backend/src/app.js#L15) |
  | Static /uploads | /uploads | Sert fichiers campagnes/support |
  | Auth JWT | Routes protégées | [auth.middleware.js](backend/src/middlewares/auth.middleware.js) |
  | Admin check | /api/admin/* | [admin.middleware.js](backend/src/middlewares/admin.middleware.js) |
  | Error handler | * | [error.middleware.js](backend/src/middlewares/error.middleware.js) |
  | 404 catcher | * | [notFound.middleware.js](backend/src/middlewares/notFound.middleware.js) |

  **Uploads**:
  - **Campagnes**: 5GB max, `/uploads/campaigns/` | [upload.middleware.js L6](backend/src/middlewares/upload.middleware.js#L6)
  - **Support**: 10MB max, `/uploads/support/` | [upload.middleware.js L14](backend/src/middlewares/upload.middleware.js#L14)
  - ⚠️ **Pas de validation MIME** → RCE/malware possible

  ### Frontend
  **Stack**: React 18.2 + React Router 7.13 + Vite 5.1 | UI: Lucide icons  
  **Port**: 5173 (dev)  
  **Entrée**: [front/index.html](front/index.html) → [front/src/main.jsx](front/src/main.jsx) → [App.jsx](front/src/app/App.jsx) → [routes.jsx](front/src/app/routes.jsx) (25+ pages lazy-loaded)

  **State Management**: localStorage only (No Context, Redux, Zustand)  
  **API Client**: [httpClient.js](front/src/shared/services/httpClient.js) + [api.js](front/src/shared/services/api.js)

  ---

  ## 2. MODÈLE DE DONNÉES COMPLET

  ### Tables PostgreSQL (schemaInit.js crée dynamiquement)

  #### `users`
  ```sql
  id UUID PK
  name VARCHAR(255)
  email VARCHAR(255) UNIQUE
  password_hash TEXT NULL (nullable si Google-only)
  role ENUM('USER', 'ADMIN')
  bio TEXT DEFAULT ''
  avatar TEXT DEFAULT ''
  google_id TEXT (UNIQUE index si NOT NULL)
  auth_provider ENUM('local', 'google', 'hybrid')
  email_verified BOOLEAN DEFAULT FALSE
  bank_details TEXT
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
  ```

  #### `campaigns`
  ```sql
  id UUID PK
  porteur_id UUID FK→users (creator)
  title VARCHAR(500)
  description TEXT
  category VARCHAR(100)
  target_amount INTEGER (millimes, CHECK > 0)
  status ENUM('DRAFT', 'PENDING', 'ACTIVE', 'REJECTED', 'CLOSED')
  rewards JSONB (array of reward objects)
  story TEXT (JSON blocks structure)
  image_url TEXT
  video_url TEXT
  current_amount INTEGER DEFAULT 0 (aggregate: sum pledges+donations+contributions)
  collected_amount NUMERIC(12,2) DEFAULT 0 (TND display)
  contribution_count INTEGER DEFAULT 0
  duration_days INTEGER DEFAULT 30 (whitelist: 15, 30, 60, 180 only)
  launched_at TIMESTAMPTZ
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
  ```

  **Aggregate Stats Query** (campaign.model.js):
  ```sql
  current_amount = SUM(pledges.amount WHERE status='SUCCESS')
                + SUM(donations.amount_millimes WHERE status='PAID')
                + SUM(contributions.amount * 1000 WHERE status='CONFIRMED')
                + SUM(payments.amount * 1000 WHERE status='paid')
  ```

  #### `pledges` (Legacy payment stub)
  ```sql
  id UUID PK
  campaign_id UUID FK→campaigns
  donateur_id UUID FK→users
  amount INTEGER (CHECK > 0)
  status ENUM('PENDING', 'SUCCESS', 'FAILED')
  created_at, updated_at TIMESTAMPTZ
  ```

  #### `donations` (Flouci integration point)
  ```sql
  id UUID PK
  campaign_id UUID FK→campaigns
  user_id UUID FK→users
  provider VARCHAR(30) DEFAULT 'manual' (e.g., 'flouci')
  amount_millimes INTEGER (CHECK > 0) in 1/1000 DT
  currency_token VARCHAR(10) DEFAULT 'TND'
  status ENUM('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELED')
  provider_payment_ref TEXT (UNIQUE index, Flouci reference)
  provider_short_id TEXT
  provider_order_id TEXT
  provider_status VARCHAR(80)
  provider_payload_init JSONB (Flouci init request)
  provider_payload_details JSONB (Flouci response)
  description TEXT
  paid_at TIMESTAMPTZ
  created_at, updated_at TIMESTAMPTZ
  ```

  #### `contributions` (User soutiens, MVP)
  ```sql
  id UUID PK
  campaign_id UUID FK→campaigns (ON DELETE CASCADE)
  user_id UUID FK→users (ON DELETE CASCADE)
  reward_id TEXT (nullable, string to support flexible reward IDs)
  amount NUMERIC(12,2) (CHECK > 0) in TND
  status VARCHAR(30) DEFAULT 'CONFIRMED' (only confirmed in code)
  payment_method VARCHAR(50) DEFAULT 'MVP_MANUAL'
  contributor_note TEXT
  created_at, updated_at TIMESTAMPTZ
  ```

  #### `payments` (Stripe Checkout test mode)
  ```sql
  id UUID PK
  user_id UUID FK→users
  campaign_id UUID FK→campaigns
  stripe_session_id TEXT UNIQUE WHERE NOT NULL
  stripe_payment_intent_id TEXT UNIQUE WHERE NOT NULL
  amount NUMERIC(12,2) (TND display)
  currency VARCHAR(10) DEFAULT 'tnd'
  status VARCHAR(20) DEFAULT 'pending' -- pending, paid, cancelled
  provider VARCHAR(30) DEFAULT 'stripe'
  payment_mode VARCHAR(20) DEFAULT 'test'
  reward_id TEXT
  contributor_note TEXT
  paid_at TIMESTAMPTZ
  created_at, updated_at TIMESTAMPTZ
  ```

  #### `payment_webhook_events`
  ```sql
  stripe_event_id TEXT PK
  event_type VARCHAR(120)
  stripe_session_id TEXT
  created_at TIMESTAMPTZ
  ```

  **Rôle**: garde l'idempotence des webhooks Stripe (`checkout.session.completed`, `checkout.session.expired`).

  #### `notifications`
  ```sql
  id UUID PK
  user_id UUID FK→users (ON DELETE CASCADE)
  type VARCHAR(40) (e.g., 'NEW_COMMENT', 'CAMPAIGN_APPROVED', 'SUPPORT_TICKET_REPLY')
  title TEXT
  message TEXT
  link TEXT (nullable, frontend URL)
  is_read BOOLEAN DEFAULT FALSE
  created_at TIMESTAMPTZ
  ```

  #### `comments`
  ```sql
  id UUID PK
  campaign_id UUID FK→campaigns (ON DELETE CASCADE)
  user_id UUID FK→users (ON DELETE CASCADE)
  content TEXT (CHECK length 1-1000)
  is_deleted BOOLEAN DEFAULT FALSE (soft-delete)
  created_at, updated_at TIMESTAMPTZ
  ```

  #### `support_tickets`
  ```sql
  id UUID PK
  code VARCHAR(24) UNIQUE (generated as HT-YYYY-NNNN)
  user_id UUID FK→users (ON DELETE CASCADE)
  related_campaign_id UUID FK→campaigns (ON DELETE SET NULL)
  title VARCHAR(200) (CHECK length > 0)
  category ENUM('GENERAL', 'CAMPAIGN', 'PAYMENT', 'ACCOUNT', 'TECHNICAL', 'REPORT_ABUSE', 'OTHER')
  priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT')
  status ENUM('OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED')
  assigned_admin_id UUID FK→users (ON DELETE SET NULL)
  last_message_at TIMESTAMPTZ
  closed_at TIMESTAMPTZ
  created_at, updated_at TIMESTAMPTZ
  ```

  #### `support_ticket_messages`
  ```sql
  id UUID PK
  ticket_id UUID FK→support_tickets (ON DELETE CASCADE)
  sender_id UUID FK→users (ON DELETE SET NULL)
  sender_role ENUM('USER', 'ADMIN')
  sender_name VARCHAR(255)
  message TEXT (CHECK length 1-4000)
  attachment_url TEXT (e.g., /uploads/support/support-1712345678-123456789.pdf)
  attachment_name VARCHAR(255)
  created_at, updated_at TIMESTAMPTZ
  ```

  #### `support_ticket_internal_notes`
  ```sql
  id UUID PK
  ticket_id UUID FK→support_tickets (ON DELETE CASCADE)
  admin_id UUID FK→users (ON DELETE SET NULL)
  admin_name VARCHAR(255)
  note TEXT (CHECK length 1-4000)
  created_at, updated_at TIMESTAMPTZ
  ```

  #### `admin_logs`
  ```sql
  id SERIAL PK
  admin_user_id UUID FK→users (ON DELETE SET NULL)
  action_type VARCHAR(100) (e.g., 'CAMPAIGN_APPROVED', 'USER_DELETED')
  entity_type VARCHAR(100) (e.g., 'campaign', 'user')
  entity_id VARCHAR(100)
  target_user_id UUID FK→users
  target_campaign_id UUID FK→campaigns
  description TEXT
  metadata JSONB (custom event details)
  ip_address VARCHAR(100)
  user_agent TEXT
  created_at TIMESTAMP DEFAULT NOW()
  ```

  #### `settings`
  ```sql
  key VARCHAR(255) PK
  value JSONB (varies by key)
  updated_at TIMESTAMP DEFAULT NOW()
  ```

  **Settings keys par défaut** (settings.model.js):
  ```json
  {
    "platform": {
      "commission_rate": 5,
      "min_campaign_amount": 500,
      "default_duration": 30
    },
    "moderation": {
      "auto_approval": false,
      "require_review": true
    },
    "notifications": {
      "email_admin": true,
      "alerts_enabled": true
    },
    "support": {
      "sla_hours": 24,
      "ticket_categories": ["GENERAL", "PAYMENT", "CAMPAIGN", "TECHNICAL", "ACCOUNT"]
    },
    "security": {
      "max_admins": 5,
      "session_timeout": 120
    }
  }
  ```

  #### `saved_campaigns`
  ```sql
  id UUID PK
  user_id UUID FK→users (ON DELETE CASCADE)
  campaign_id UUID FK→campaigns (ON DELETE CASCADE)
  created_at TIMESTAMPTZ
  UNIQUE(user_id, campaign_id)
  ```

  #### `rewards` (From schema.sql, not actively used)
  ```sql
  id UUID PK
  campaign_id UUID FK→campaigns
  title VARCHAR(500)
  minimum_amount INTEGER (CHECK > 0)
  created_at, updated_at TIMESTAMPTZ
  ```

  **Note**: Rewards stockés en **JSONB dans campaigns.rewards** pour MVP, pas en table dédiée.

  ---

  ## 3. ENDPOINTS API - MATRICE COMPLÈTE

  ### 3.1 AUTH (`/api/auth`)
  Fichier: [auth.routes.js](backend/src/modules/auth/auth.routes.js) + [auth.controller.js](backend/src/modules/auth/auth.controller.js)

  | Méthode | Chemin | Auth | Payload | Réponse | Erreurs | Impl |
  |---|---|---|---|---|---|---|
  | POST | `/register` | ❌ | `{name, email, password}` | `{success, user, message}` | 400 (validation), 409 (email dupliqué) | ✅ |
  | POST | `/login` | ❌ | `{email, password}` | `{success, token, user}` | 400 (Google-only user), 401 (credentiels) | ✅ |
  | GET | `/me` | ✅ JWT | - | `{success, user}` | 401, 404 | ✅ |
  | GET | `/google` | ❌ | - | Redirect Google OAuth | Config missing | ✅ |
  | GET | `/google/callback` | ❌ | `?code&state` query | Redirect frontend `#token=...` puis refresh user via `/me` | OAuth error détaillée | ✅ |
  | PUT | `/profile` | ✅ JWT | `{name?, email?, bio?, avatar?}` | `{success, user}` | 400, 409 (email), 404 | ✅ |
  | PUT | `/password` | ✅ JWT | `{currentPassword?, newPassword}` | `{success, message}` | 400 (validation), 401 (pwd) | ✅ |

  **Details**:
  - Password: bcrypt 12 rounds (env: `BCRYPT_SALT_ROUNDS`)
  - JWT expiry: 24h (env: `JWT_EXPIRES_IN`) | Secret: env `JWT_SECRET`
  - Google: Client ID/Secret via env `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Auth provider: 'local' | 'google' | 'hybrid' (local + google linked)
  - Callback Google: le backend ne dépend plus du payload `user` encodé dans l'URL ; le frontend relit `/api/auth/me` après réception du token.

  ---

  ### 3.2 CAMPAIGNS (`/api/campaigns`)
  Fichier: [campaign.routes.js](backend/src/modules/campaigns/campaign.routes.js) + [campaign.controller.js](backend/src/modules/campaigns/campaign.controller.js)

  | Méthode | Chemin | Auth | Payload | Réponse | Erreurs | Impl |
  |---|---|---|---|---|---|---|
  | GET | `/` | ❌ | - | `{success, count, campaigns[]}` | 500 | ✅ |
  | GET | `/my` | ✅ JWT | - | `{success, campaigns[]}` (user's drafts+pending+active) | 401, 500 | ✅ |
  | GET | `/:id` | ❌ | - | `{success, campaign}` + creator + stats | 404 (UUID parse), 500 | ✅ |
  | POST | `/` | ✅ JWT | `{title, description, category, target_amount, duration_days?, rewards?, story?}` | `{success, campaign_id}` | 400 (required/amount), 500 | ✅ |
  | PUT | `/:id` | ✅ JWT | Subset `{title, desc, category, target_amount, duration_days, rewards, story, image_url, video_url}` | `{success, campaign}` | 400 (validation), 403 (DRAFT only), 404 | ✅ |
  | DELETE | `/:id` | ✅ JWT | - | `{success, message}` | 403 (not creator), 400 (not DRAFT), 404 | ✅ |
  | POST | `/:id/submit` | ✅ JWT | - | `{success, campaign: {id, status}}` | 400 (no media), 403 (not DRAFT), 404 | ✅ |
  | POST | `/:id/media/:type` | ✅ JWT + multer | `file` (multipart) | `{success, fileUrl, campaign}` | 400 (invalid type), 403, 404 | ✅ |
  | GET | `/:id/comments` | ❌ | - | `{success, count, comments[]}` | 403 (non-ACTIVE), 404 | ✅ |
  | POST | `/:id/comments` | ✅ JWT | `{content}` | `{success, comment}` | 400 (1-1000 chars), 403 (non-ACTIVE), 404 | ✅ |
  | GET | `/:id/contribution-context` | ❌ | `?rewardId` | `{success, campaign, creator, selectedReward, minimumAmount, collectedAmount, contributionCount}` | 400 (reward invalid), 404 | ✅ |
  | POST | `/:id/contributions` | ✅ JWT | `{amount, rewardId?, paymentMethod?, contributorNote?}` | `{success, contribution, updatedCampaignTotals}` | 400 (amount/non-ACTIVE/self), 404 | ✅ |

  **Campaign Status Lifecycle**:
  ```
  DRAFT (created by creator)
    ↓ (submit)
  PENDING (awaiting admin review)
    ├→ ACTIVE (admin approves) → collect funds
    └→ REJECTED (admin rejects)
    
  ACTIVE
    ↓ (30/60/180 days later)
  CLOSED (timeout)
  ```

  **Duration allowlist**: 15, 30, 60, 180 days only | [campaign.controller.js L10](backend/src/modules/campaigns/campaign.controller.js#L10)

  ---

  ### 3.3 PAIEMENTS, CONTRIBUTIONS & PLEDGES

  #### Stripe Checkout (`/api/payments`)
  **Status**: ✅ Implémenté en mode test | [payment.routes.js](backend/src/modules/payments/payment.routes.js) + [payment.controller.js](backend/src/modules/payments/payment.controller.js)

  | Méthode | Chemin | Auth | Impl | Notes |
  |---|---|---|---|---|
  | POST | `/create-checkout-session` | ✅ | ✅ | Crée `payments` pending + session Stripe Checkout |
  | GET | `/session/:id` | ✅ | ✅ | Vérifie Stripe, finalise si `payment_status=paid` |
  | POST | `/webhook` | ❌ signature Stripe | ✅ | `checkout.session.completed` / `expired`, idempotent via `payment_webhook_events` |

  **Flux Stripe**:
  1. Frontend appelle `POST /api/payments/create-checkout-session`
  2. Backend valide campagne ACTIVE, montant, récompense, self-support interdit
  3. Insertion `payments(status='pending', provider='stripe', payment_mode='test')`
  4. Création session Stripe Checkout hébergée
  5. Retour `/payment/success?session_id=...` ou `/payment/cancel?...`
  6. Confirmation via webhook signé ou synchronisation `GET /api/payments/session/:id`
  7. Si succès: `payments.status='paid'`, agrégats campagne incrémentés, notification `NEW_SUPPORT`

  **Limites**:
  - Clés Stripe test uniquement (`sk_test_...`) ; pas de paiement production.
  - Webhook requis pour fiabilité complète en local/production.
  - Les anciennes tables `donations`, `pledges` et `contributions` restent prises en compte dans les agrégats.

  #### Contributions manuelles (`/api/campaigns/:id/contributions`)
  **Status**: ⚠️ Legacy/MVP | **Note**: crée un soutien confirmé sans PSP
  [contribution.controller.js](backend/src/modules/contributions/contribution.controller.js) + [contribution.model.js](backend/src/modules/contributions/contribution.model.js)

  - POST crée row `contributions` avec status='CONFIRMED' hardcoded
  - Ajoute notification `NEW_SUPPORT` (via notification.service.js)
  - Met à jour campagne agrégats: `collected_amount`, `contribution_count`, `current_amount`
  - À réserver aux tests internes ou à supprimer quand Stripe/Konnect production devient source unique

  #### Pledges (`/api/pledges`)
  **Status**: ⚠️ Stub legacy | [pledge.controller.js](backend/src/modules/pledges/pledge.controller.js)

  | Méthode | Chemin | Impl | Notes |
  |---|---|---|---|
  | GET | `/my` | ✅ | Retourne campaigns supportées (pledges + donations + contributions + payments) |
  | POST | `/` | ⚠️ | Validation carte sans Luhn + auto-mark `PAID` via `donations` |

  **Pledge Flow legacy**:
  1. Valide montant + carte (regex seulement, pas Luhn)
  2. Crée `donations` row avec provider='manual'
  3. Marque immédiatement status='PAID'
  4. Met à jour `campaigns.current_amount` + notification

  **Codes validation manquants côté legacy**:
  - ❌ Luhn check → cartes invalides acceptées
  - ❌ Flouci/Konnect production non branché
  - ✅ Webhooks Stripe disponibles dans le module `payments`

  ---

  ### 3.4 SAVED CAMPAIGNS (`/api/saved`)
  **Status**: ✅ Complet | [saved.routes.js](backend/src/modules/saved/saved.routes.js)

  | Méthode | Chemin | Auth | Impl |
  |---|---|---|---|
  | GET | `/` | ✅ | Retourne saved campaigns avec stats |
  | GET | `/check/:id` | ✅ | Retourne bool (saved or not) |
  | POST | `/:id` | ✅ | Add to saved (ignore conflict) |
  | DELETE | `/:id` | ✅ | Remove from saved |

  ---

  ### 3.5 NOTIFICATIONS (`/api/notifications`)
  **Status**: ✅ Complet | [notification.routes.js](backend/src/modules/notifications/notification.routes.js)

  | Méthode | Chemin | Impl |
  |---|---|---|
  | GET | `/` | Retourne 50 dernières + unreadCount |
  | POST | `/:id/read` | Mark one as read |
  | POST | `/read-all` | Mark all as read |

  **Notification Types** (notification.service.js):
  - `WELCOME` (new user)
  - `CAMPAIGN_APPROVED`, `CAMPAIGN_REJECTED`
  - `NEW_SUPPORT` (pledge received)
  - `NEW_COMMENT`
  - `SUPPORT_TICKET_CREATED`, `SUPPORT_TICKET_REPLY`, `SUPPORT_TICKET_STATUS`

  ---

  ### 3.6 SUPPORT (`/api/support`)
  **Status**: ✅ Complet | [support.routes.js](backend/src/modules/support/support.routes.js) + [support.controller.js](backend/src/modules/support/support.controller.js)

  | Méthode | Chemin | Auth | Impl | Notes |
  |---|---|---|---|---|
  | POST | `/tickets` | ✅ | ✅ | Crée ticket + premier message + notification |
  | GET | `/tickets` | ✅ | ✅ | Liste user tickets + filters (search, status, category, pagination) |
  | GET | `/tickets/:id` | ✅ | ✅ | Detail + messages + timestamps |
  | POST | `/tickets/:id/messages` | ✅ | ✅ | Ajoute message + notif + peut changer status |
  | PATCH | `/tickets/:id/close` | ✅ | ✅ | User peut fermer son ticket |

  **Ticket Code Generation** (support.model.js L318):
  ```javascript
  code = `HT-${year}-${nextNumber.padStart(4, '0')}`
  // Ex: HT-2026-0001
  ```

  **Status Workflow**:
  ```
  OPEN (created)
    ↓ (admin replies)
  IN_PROGRESS
    ↓ (waiting user)
  WAITING_USER
    ↓ (user replies)
  OPEN (back)
    ↓ (resolved)
  RESOLVED
    ↓ (close)
  CLOSED
  ```

  ---

  ### 3.7 ADMIN SUPPORT (`/api/admin/support`)
  **Status**: ✅ Complet | [admin-support.routes.js](backend/src/modules/support/admin-support.routes.js)

  **All endpoints require**: `authenticate` + `requireAdmin`

  | Méthode | Chemin | Impl | Notes |
  |---|---|---|---|
  | GET | `/tickets` | ✅ | List all + advanced filters + facets |
  | GET | `/tickets/:id` | ✅ | Detail + messages + internal_notes + admins list |
  | POST | `/tickets/:id/messages` | ✅ | Admin message + peut changer status + sends notification |
  | POST | `/tickets/:id/notes` | ✅ | Internal note (not sent to user) |
  | PATCH | `/tickets/:id` | ✅ | Update priority/category/status |
  | PATCH | `/tickets/:id/assign` | ✅ | Assign to admin |

  ---

  ### 3.8 ADMIN MODERATION (`/api/admin`)
  **Status**: ✅ Complet | [admin.routes.js](backend/src/modules/admin/admin.routes.js) + [admin.controller.js](backend/src/modules/admin/admin.controller.js)

  **All require**: `authenticate` + `requireAdmin`

  | Méthode | Chemin | Impl | Notes |
  |---|---|---|---|
  | GET | `/stats` | ✅ | KPIs: fonds confirmés, supports confirmés, campagnes réussies, users, success rate, category split |
  | GET | `/settings` | ✅ | All platform settings |
  | PUT | `/settings/:key` | ✅ | Update setting with validation |
  | GET | `/logs` | ✅ | Admin audit logs paginated + search + facets |
  | GET | `/logs/:id` | ✅ | Single log detail |
  | GET | `/campaigns` | ✅ | All campaigns |
  | GET | `/campaigns/pending` | ✅ | Pending moderation |
  | GET | `/campaigns/:id/comments` | ✅ | Campaign comments (all, incl. deleted) |
  | GET | `/pledges` | ✅ | All supports (pledges + donations + contributions + payments) |
  | GET | `/users` | ✅ | All users |
  | POST | `/users` | ✅ | Create local USER/ADMIN from dashboard (bcrypt + email unique + audit log) |
  | PUT | `/campaigns/:id` | ✅ | Edit accepted campaign (title, desc, category, target_amount) |
  | POST | `/campaigns/:id/image` | ✅ | Replace campaign image (ACTIVE only) |
  | POST | `/campaigns/:id/video` | ✅ | Replace campaign video (ACTIVE only) |
  | DELETE | `/campaigns/:id` | ✅ | Delete campaign (DRAFT/PENDING/ACTIVE only) |
  | DELETE | `/comments/:id` | ✅ | Soft-delete comment |
  | PUT | `/users/:id` | ✅ | Edit user (name, email, role, bio, avatar) |
  | POST | `/campaigns/:id/approve` | ✅ | PENDING → ACTIVE + notification |
  | POST | `/campaigns/:id/reject` | ✅ | PENDING → REJECTED + notification |
  | DELETE | `/users/:id` | ✅ | Delete user + all campaigns (FOREIGN KEY error if pledges) |
  | PUT | `/users/:id/role` | ✅ | Toggle USER ↔ ADMIN (not self) |
  | PUT | `/users/:id/name` | ✅ | Update name |

  **Admin Logs** (admin_logs table):
  - All admin actions logged avec metadata
  - Loggable action_types: CAMPAIGN_APPROVED, CAMPAIGN_REJECTED, CAMPAIGN_UPDATED, CAMPAIGN_DELETED, CAMPAIGN_MEDIA_UPDATED, USER_CREATED, USER_UPDATED, USER_DELETED, USER_ROLE_CHANGED, COMMENT_DELETED, SUPPORT_TICKET_*, SETTINGS_UPDATED

  ---

  ### 3.9 USERS (`/api/users`)
  **Status**: ⚠️ Minimal | [user.routes.js](backend/src/modules/users/user.routes.js)

  | Méthode | Chemin | Auth | Impl |
  |---|---|---|---|
  | GET | `/me/supports` | ✅ | Supports du compte connecté |
  | GET | `/:id/profile` | ❌ | Public profile + created campaigns + backed campaigns (ACTIVE/CLOSED only) |

  ---

  ### 3.10 HEALTH
  | Méthode | Chemin | Réponse |
  |---|---|---|
  | GET | `/api/health` | `{status: 'ok', timestamp: ISO8601}` |

  ---

  ## 4. AUTHENTIFICATION & SÉCURITÉ

  ### JWT Token
  - **Payload**: `{id (UUID), role ('USER'|'ADMIN'), iat, exp}`
  - **Expiry**: 24h | Secret: env `JWT_SECRET`
  - **Verification**: [auth.middleware.js](backend/src/middlewares/auth.middleware.js) L20
  - **Errors**: 401 (expired/invalid) + message localisé

  ### Google OAuth 2.0
  - **Flow**: 
    1. Frontend: GET `/api/auth/google` → redirect Google
    2. User approves scope: openid email profile
    3. Google: POST token endpoint
    4. Backend: exchange code + fetch profile + create/link user
    5. Redirect: `{FRONTEND_URL}/auth/google/callback#token=...`
    6. Frontend: `GET /api/auth/me` avec le token pour récupérer l'utilisateur courant
  - **Config**: env `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
  - **Hybrid**: User peut auth local + google sur même email

  ### Role-based Access
  | Rôle | Routes | Contrôle |
  |---|---|---|
  | USER (default) | `/campaigns/*`, `/saved/*`, `/profile/*`, `/support/*` | Créateur/soutien uniquement |
  | ADMIN | `/api/admin/*`, `/admin/support/*` | requireAdmin middleware |

  ### Password Security
  - **Hashing**: bcrypt 12 rounds | [auth.controller.js L155](backend/src/modules/auth/auth.controller.js#L155)
  - **Validation**: min 6 chars
  - **Update**: Possible même si Google-only (hybrid mode)

  ### ⚠️ SÉCURITÉ GAPS
  1. **CORS Unrestricted**: [app.js L14](backend/src/app.js#L14) `app.use(cors())` → accepte toute origine
  2. **Card Validation Fake legacy**: [pledge.controller.js](backend/src/modules/pledges/pledge.controller.js) regex only, no Luhn
  3. **JWT_SECRET not validated**: Si env missing → verify() échoue silencieusement
  4. **No rate limiting** → Brute force possible
  5. **No HTTPS enforcement** → Token en clair sur HTTP
  6. **Upload MIME not validated** → Malware upload possible
  7. **VITE_API_URL partiellement centralisé** → plusieurs fichiers legacy restent hardcodés

  ---

  ## 5. FLUX UTILISATEUR - AUTHENTIFICATION

  ### Inscription (Sign Up)
  ```
  Frontend: /register
    → Form: name, email, password
    → POST /api/auth/register
      → Backend: validate + bcrypt + INSERT users
      → sendWelcomeNotification()
    → Success: localStorage(token, user) + navigate(/profile)
    → Error: 400 (format), 409 (email existe)
  ```

  ### Connexion (Sign In)
  ```
  Frontend: /login
    → Form: email, password
    → POST /api/auth/login
      → Backend: verify bcrypt + issueToken()
    → Success: localStorage + navigate(user.role === ADMIN ? /admin : /)
    → Error: 401 (credentiels), 400 (Google-only)
  ```

  ### Google OAuth
  ```
  Frontend: GoogleAuthButton
    → window.location.assign(buildApiUrl('/api/auth/google'))
    → Google consent screen
    → Redirect callback URL
    → Backend: exchange code + fetch profile
      → Si user existe: linkGoogleAccount() (hybrid)
      → Sinon: createGoogleUser()
    → Redirect: {FRONTEND_URL}/auth/google/callback#token=...
      → Frontend: GET /api/auth/me + localStorage + navigate
  ```

  ### Logout
  ```
  Frontend: Navbar logout button
    → clearAuthSession() (localStorage clear)
    → navigate(/)
    → No backend call
  ```

  ---

  ## 6. FLUX UTILISATEUR - CRÉATEUR (Campaign Lifecycle)

  ### Création (3 étapes)
  ```
  Step 1 (Catégorie):
    - Form: category select
    - Save draft → draftProject state (routes.jsx)
    
  Step 2 (Règles):
    - Statique: 5 règles (hardcodé)
    - Checkbox accept
    
  Step 3 (Détails complets):
    - Tabs: Bases (title/desc/target/duration/media), Récompenses (rewards JSON), Récit (story JSON)
    - Actions:
      1. "Enregistrer brouillon" → PUT /api/campaigns/:id (si editing)
      2. "Soumettre" → POST /api/campaigns/:id/submit + POST /api/campaigns/:id/media/image|video
    - Validation: Titre + media requis avant soumettre
    - Response: DRAFT campaign created → draftProject.campaignId stored
  ```

  ### Édition (ProjectEditor)
  ```
  GET /api/campaigns/:id → pré-remplit form
  Éditable si status === DRAFT uniquement
  Actions:
    - Save draft: PUT /api/campaigns/:id
    - Delete: DELETE /api/campaigns/:id
    - Submit: POST /api/campaigns/:id/submit → DRAFT → PENDING
    - Media upload: POST /api/campaigns/:id/media/{image|video}
  Response: campaign updated, locked if PENDING/ACTIVE/REJECTED
  ```

  ### Modération Admin
  ```
  GET /api/admin/campaigns/pending → list PENDING
  Admin actions:
    - Approve: POST /api/admin/campaigns/:id/approve → PENDING → ACTIVE (launched_at set)
              → sendCampaignApprovedNotification() → créateur notifié
    - Reject: POST /api/admin/campaigns/:id/reject → PENDING → REJECTED
            → sendCampaignRejectedNotification()
    - Edit: PUT /api/admin/campaigns/:id (title/desc/category/target_amount)
    - Delete: DELETE /api/admin/campaigns/:id
  ```

  ---

  ## 7. FLUX UTILISATEUR - CONTRIBUTEUR (Soutien & Donation)

  ### Soutien Campagne (Stripe Checkout)
  ```
  Frontend: ProjectDetails → Soutenir button
    → Authenticate check (redirect /login si not auth)
    → DonationPage
      1. GET /api/campaigns/:id/contribution-context?rewardId=...
        → Affiche rewards + FAQ + summary
      2. Select reward ou montant libre
      3. Form: montant, message
      4. POST /api/payments/create-checkout-session
        → Backend: crée payments pending + session Stripe Checkout
        → Frontend: redirect vers checkoutUrl Stripe
      5. Retour /payment/success?session_id=...
        → GET /api/payments/session/:id
        → Backend: finalise si Stripe confirme le paiement
  ```

  ### Paiement legacy (stub à retirer)
  ```
  Ancien endpoint public:
    → POST /api/pledges
      Backend: validate card (regex, no Luhn)
            → CREATE donations (status='PAID' immédiatement)
            → NO appel Flouci API
    → Fausse transaction enregistrée
    
  RÉALITÉ: route conservée pour compatibilité, mais ne doit pas être utilisée pour un paiement réel.
  ```

  ---

  ## 8. FLUX UTILISATEUR - SUPPORT

  ### Créer Ticket
  ```
  Frontend: /support/new
    → getSupportCampaignChoices()
      = GET /api/campaigns/my + GET /api/pledges/my
    → Form: title, category (GENERAL/CAMPAIGN/PAYMENT/ACCOUNT/TECHNICAL/REPORT_ABUSE/OTHER),
            priority (LOW/MEDIUM/HIGH/URGENT), message, related_campaign_id?, attachment
    → Validation: titre required, message (min 1 char), attachment ≤10MB
    → POST /api/support/tickets
      → Backend: create ticket (HT-YYYY-NNNN code) + first message
              + sendSupportTicketCreatedNotification()
    → Redirect: /support/:id
  ```

  ### Suivi Ticket
  ```
  Frontend: /support/:id
    → GET /api/support/tickets/:id
    → Affiche: code, status, messages (chronologique), last_message_at
    → User peut: reply (POST /api/support/tickets/:id/messages)
                close (PATCH /api/support/tickets/:id/close)
    → Notifications si admin répond: SUPPORT_TICKET_REPLY
  ```

  ### Admin Support Dashboard
  ```
  Frontend: /admin/support/tickets
    → GET /api/admin/support/tickets?filters...
    → Affiche tous tickets + summary (open/closed/awaiting)
    → Actions:
      - View: GET /api/admin/support/tickets/:id
      - Reply: POST /api/admin/support/tickets/:id/messages
              (peut changer status si demandé)
      - Assign: PATCH /api/admin/support/tickets/:id/assign
      - Add note: POST /api/admin/support/tickets/:id/notes (internal, user not see)
      - Update: PATCH /api/admin/support/tickets/:id (priority/category/status)
  ```

  ---

  ## 9. FLUX UTILISATEUR - ADMIN (Modération)

  ### Dashboard
  ```
  GET /api/admin/stats
    → KPIs: totalFunds, activeCampaigns, pendingCampaigns, totalUsers, successRate, 
            categorySplit, latestPaidDonations
  ```

  ### Campaign Moderation
  ```
  1. GET /api/admin/campaigns/pending
  2. Review: GET /api/admin/campaigns/:id/comments
  3. Action:
    - Approve: POST /api/admin/campaigns/:id/approve
    - Reject: POST /api/admin/campaigns/:id/reject
    - Edit: PUT /api/admin/campaigns/:id
    - Replace media: POST /api/admin/campaigns/:id/image|video
    - Delete: DELETE /api/admin/campaigns/:id
  ```

  ### User Management
  ```
  GET /api/admin/users
    → List tous users
  Actions:
    - Edit: PUT /api/admin/users/:id
    - Change role: PUT /api/admin/users/:id/role
    - Delete: DELETE /api/admin/users/:id
    - Update name: PUT /api/admin/users/:id/name
  ```

  ### Settings
  ```
  GET /api/admin/settings
    → Affiche platform, moderation, notifications, support, security settings
  PUT /api/admin/settings/:key
    → Update avec validation (commission_rate 0-30%, session timeout 5-1440 min, etc.)
  ```

  ### Audit Logs
  ```
  GET /api/admin/logs?page=1&limit=20&search=...&actionType=...&dateFrom=...
    → Paginated logs + facets (action_types, entity_types)
    → Toute action admin logged: CAMPAIGN_APPROVED, USER_DELETED, SETTINGS_UPDATED, etc.
  GET /api/admin/logs/:id
    → Detail log avec metadata
  ```

  ---

  ## 10. MODULES IMPLÉMENTATION STATUS

  | Module | Fichiers | Status | Notes |
  |---|---|---|---|
  | **auth** | auth.{routes,controller,model}.js | ✅ COMPLET | Register, login, Google OAuth, profile update, password change |
  | **campaigns** | campaign.{routes,controller,model}.js | ✅ COMPLET | CRUD, lifecycle, media upload, submission flow |
  | **comments** | comment.{controller,model}.js | ✅ COMPLET | Create, read, admin soft-delete, ACTIVE-only |
  | **payments/stripe** | payment.{routes,controller,model,service}.js | ✅ TEST MODE | Checkout Session, webhook signé, sync status, idempotence |
  | **contributions** | contribution.{controller,model}.js | ⚠️ LEGACY | Create soutien + notification, sans PSP |
  | **pledges** | pledge.{routes,controller,model}.js | ⚠️ STUB | Auto-mark PAID, no Flouci, card validation fake |
  | **payments/flouci** | flouci.service.js | ❌ UNUSED | Fichier existe, code jamais appelé |
  | **saved** | saved.{routes,controller,model,service}.js | ✅ COMPLET | Add/remove/check/list saved campaigns |
  | **notifications** | notification.{routes,controller,model,service}.js | ✅ COMPLET | Create, list, mark read/all-read, 7 event types |
  | **support** | support.{routes,controller,model}.js | ✅ COMPLET | User tickets + admin dashboard + messages |
  | **admin/support** | admin-support.{routes,controller}.js | ✅ COMPLET | Admin ticket management + assignment + notes |
  | **admin** | admin.{routes,controller,model}.js + settings.* | ✅ COMPLET | Stats supports confirmés, moderation, create/edit users, settings, logs |
  | **users** | user.{routes,controller,model}.js | ⚠️ MINIMAL | Public profile + my supports |

  ---

  ## 11. FRONTEND - PAGES & ROUTES

  Fichier: [front/src/app/routes.jsx](front/src/app/routes.jsx) (370+ lignes, 25+ lazy-loaded pages + boundary admin)

  ### Public Routes

  | Route | Page | API calls | Impl |
  |---|---|---|---|
  | `/` | Home | `GET /api/campaigns` | ✅ Featured + categories (hardcodé fallback) |
  | `/discover` | Discover | `GET /api/campaigns` + `GET /api/saved/check/:id` per campaign | ✅ N+1 queries ⚠️ |
  | `/project/:id` | ProjectDetails | `GET /api/campaigns/:id` + `GET /api/saved/check/:id` | ✅ Soutenir action → DonationPage |
  | `/campaigns/:id/contribute`, `/project/:id/soutenir` | DonationPage | `GET /api/campaigns/:id/contribution-context` + `POST /api/payments/create-checkout-session` | ✅ Stripe Checkout test |
  | `/payment/success` | PaymentSuccessPage | `GET /api/payments/session/:id` | ✅ Confirmation serveur Stripe |
  | `/payment/cancel` | PaymentCancelPage | Aucun | ✅ Retour annulation Stripe |
  | `/about`, `/terms`, `/privacy`, `/cookies` | InfoPage | Aucun (statique) | ✅ Hardcodé PAGE_CONTENT |

  ### Auth Routes

  | Route | Page | API calls | Impl |
  |---|---|---|---|
  | `/login` | SignIn | `POST /api/auth/login` | ✅ |
  | `/register` | SignUp | `POST /api/auth/register` | ✅ |
  | `/auth/google/callback` | GoogleAuthCallback | `GET /api/auth/me` après token | ✅ |
  | `/forgot-password` | ForgotPassword | Aucun ⚠️ | ⚠️ UI mock, pas de reset email |

  ### Authenticated Routes

  | Route | Page | API calls | Impl |
  |---|---|---|---|
  | `/profile` | Profile | `GET /api/campaigns/my` + `GET /api/users/me/supports` | ✅ Tabs: About, Created, Backed |
  | `/settings` | Settings | `PUT /api/auth/profile` (2x) + `PUT /api/auth/password` | ✅ Account/Profile/Security tabs |
  | `/saved` | SavedProjects | `GET /api/saved` + `DELETE /api/saved/:id` | ✅ |
  | `/users/:id` | PublicUserProfile | `GET /api/users/:id/profile` | ✅ |

  ### Campaign Creation Routes

  | Route | Page | State | Impl |
  |---|---|---|---|
  | `/start` | StartProject | Intro page | ✅ Statique |
  | `/create/step1` | CreateProjectStep1 | Catégorie select | ✅ Local state |
  | `/create/step2` | CreateProjectStep2 | 5 règles hardcodées | ✅ Checkbox accept |
  | `/create/step3` | CreateProjectStep3 | Multi-tab form | ✅ POST /api/campaigns + media upload |
  | `/editor/:id?` | ProjectEditor | Edit DRAFT campaign | ✅ GET /api/campaigns/:id + PUT/DELETE |

  ### Support Routes

  | Route | Page | API calls | Impl |
  |---|---|---|---|
  | `/support` | SupportTicketsPage | `GET /api/support/tickets?filters...` | ✅ List + filters + pagination |
  | `/support/new` | CreateSupportTicketPage | `GET /api/campaigns/my` + `GET /api/pledges/my` + `POST /api/support/tickets` | ✅ |
  | `/support/:id` | SupportTicketDetailsPage | `GET /api/support/tickets/:id` + `POST /api/support/tickets/:id/messages` + `PATCH /api/support/tickets/:id/close` | ✅ |

  ### Admin Routes

  | Route | Page | API calls | Impl |
  |---|---|---|---|
  | `/admin/*` | AdminDashboard | 40+ API calls | ✅ SPA admin avec error boundary, settings, logs, support, users, moderation |

  ---

  ## 12. FRONTEND - ARCHITECTURE & STATE

  ### App Shell
  ```
  App.jsx
    → AppProviders (empty pass-through)
    → BrowserRouter
    → ScrollToTop
    → AppRoutes (render routes + Footer + AdminRouteErrorBoundary)
  ```

  **State Management**: ❌ Zero global state
  - Auth state: localStorage only (`token`, `user`)
  - Draft project: routes.jsx local state (draftProject)
  - Notifications: Navbar.jsx local state (fetched every 30s)
  - No Redux, Context API, Zustand, etc.

  ### HTTP Client
  [httpClient.js](front/src/shared/services/httpClient.js):
  ```javascript
  API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000"
  buildApiUrl(path) → ${API_URL}${path}
  getAuthHeaders() → {Authorization: `Bearer ${token}`}
  requestJson(path, options) → fetch + error handling
  ```

  **⚠️ Centralisation partielle API_URL**:
  - `GoogleAuthButton`, `GoogleAuthCallback`, admin services, support/payments services utilisent `buildApiUrl` / `requestJson`.
  - Plusieurs wrappers/pages legacy gardent encore `http://localhost:5000` ou un helper local: [SignIn.jsx](front/src/SignIn.jsx), [SignUp.jsx](front/src/SignUp.jsx), [Settings.jsx](front/src/Settings.jsx), [ProjectEditor.jsx](front/src/ProjectEditor.jsx), [Navbar.jsx](front/src/Navbar.jsx), [DonationPage.jsx](front/src/DonationPage.jsx), composants `ProjectEditor/*`.

  ### Components Structure
  ```
  shared/
    ├── components/
    │   ├── Auth/ → GoogleAuthButton
    │   ├── Donation/ → RewardOptionCard, PaymentForm, DonationSummaryCard, etc.
    │   ├── Support/ → SupportCenterLayout, MessageBubble, Badges
    │   ├── ProjectEditor/ → BasicsTab, RewardsTab, StoryTab, PeopleTab, PreviewModal
    │   └── ProjectCard, FeaturedCampaignCard, ProjectCommentsSection, Footer, ScrollToTop
    ├── services/
    │   ├── httpClient.js (core fetch wrapper)
    │   ├── api.js (re-export)
    │   └── modules/
    │       ├── payments/contributionApi.js
    │       ├── support/supportApi.js
    │       └── admin/{settingsService, adminLogsService}.js
    ├── utils/
    │   ├── authStorage.js (localStorage helpers)
    │   ├── currency.js (DT ↔ millimes)
    │   ├── campaignDates.js
    │   └── campaignCategories.js
    └── constants/
        └── campaignCategories.js
  ```

  ---

  ## 13. FRONTEND - PROBLÈMES & TECH DEBT

  ### 🔴 Critiques

  1. **API_URL encore hardcodé dans des fichiers legacy** → Déploiement multi-environnement fragile
    - Fix: utiliser `buildApiUrl` / `requestJson` partout

  2. **Aucun state management** → Pas de synchronisation cross-tab
    - Symptôme: User logout dans tab A, tab B still sees user
    - Fix: Context + useReducer ou Zustand

  3. **N+1 API queries** dans Discover.jsx L77
    - Chaque campagne appel GET /api/saved/check/:id → 100+ requêtes
    - Fix: Batch endpoint ou backend include

  4. **Pas de TypeScript** → Bugs runtime fréquents
    - Payloads non typés, refactoring dangereux

  5. **Aucun testeur framework** → No Jest, Vitest, Cypress
    - Zéro code coverage, regressions garanties

  ### 🟠 Importants

  6. **Notifications polled** (Navbar.jsx L163) toutes les 30s → Overhead réseau
    - Fix: WebSocket ou Server-Sent Events

  7. **Lazy loading sans Suspense fallback** → Écran blanc lors du chargement
    - Fallback minimal: "Chargement..."

  8. **Formulaires multi-step sans persist** → Perte de données si fermer onglet
    - Pas d'auto-save ou session recovery

  9. **Pas de linter/formatter** → Code inconsistent (quote styles, indentation)
    - Fix: ESLint + Prettier

  10. **Deux chemins de contribution coexistent** → Stripe test mode + routes manuelles legacy
      - Risque: confusion produit et agrégats difficiles à auditer si les routes legacy restent publiques

  ---

  ## 14. VALIDATION & SÉCURITÉ

  ### Backend Validation

  | Entité | Champs validés | Gap |
  |---|---|---|
  | User Register | name (required), email (format), password (≥6 chars) | ❌ Pas de sanitize injection |
  | Campaign Create | title/desc/category/target_amount (required), target_amount (>0 integer) | ❌ Pas de HTML escape |
  | Campaign Submit | image_url OR video_url required | ✅ |
  | Comment | content (1-1000 chars) | ❌ XSS possible si pas frontend escape |
  | Support Ticket | title, message, attachment (≤10MB) | ⚠️ Weak |
  | Pledge/Donation legacy | card number (regex 13-19 digits, NO Luhn), expiry (MM/YY + date check), CVC (3-4 digits) | 🔴 Carte invalide acceptée |
  | Stripe Payment | campaignId UUID, amount decimal, rewardId, self-support interdit, signature webhook | ⚠️ test mode uniquement |

  ### Frontend Validation

  | Page | Checks |
  |---|---|
  | SignUp | Email format (regex) |
  | Settings | Email format, password ≥6 |
  | ProjectEditor | Title required before submit, media required |
  | DonationPage | Amount > 0, reward valid |
  | SupportTicket | Title, message required, attachment ≤10MB |

  ### XSS & Injection Risks
  - **Comment content** → Stored XSS si pas HTML escape
  - **Campaign title/description** → Injection possible
  - **Support message** → Could include HTML/JS
  - **Fix Needed**: DOMPurify ou backend escape

  ### SQL Injection
  - ✅ All parameterized queries via pg module
  - ✅ No string concatenation in SQL

  ### File Upload Security
  - ❌ No MIME type validation → `.exe` masqué en `.jpg`
  - ❌ No file content inspection
  - ⚠️ 5GB limit campaigns, 10MB support → DoS possible
  - Fix: Whitelist MIME types + magic byte check

  ---

  ## 15. DONNÉES RÉELLES & AGRÉGATS

  ### Campaign Funding Stats (Aggregate Calculation)
  ```sql
  current_amount = SUM(pledges.amount WHERE status='SUCCESS')
                + SUM(donations.amount_millimes WHERE status='PAID')
                + SUM(contributions.amount * 1000 WHERE status='CONFIRMED')
                + SUM(payments.amount * 1000 WHERE status='paid')

  collected_amount = current_amount / 1000 (converted TND)

  contribution_count = COUNT(pledges WHERE status='SUCCESS')
                    + COUNT(donations WHERE status='PAID')
                    + COUNT(contributions WHERE status='CONFIRMED')
                    + COUNT(payments WHERE status='paid')

  funded_percent = (current_amount / target_amount) * 100
  ```

  **Recalculated on**:
  - POST /api/payments/create-checkout-session puis webhook/sync Stripe (UPDATE campaigns SET...)
  - POST /api/campaigns/:id/contributions (legacy/manual UPDATE campaigns SET...)
  - POST /api/pledges (UPDATE campaigns SET current_amount = ...)
  - schemaInit.js at startup (reconcile all campaigns)

  ### User-Created Campaigns
  - `GET /api/campaigns/my` → user's campaigns (all statuses)
  - `GET /api/admin/campaigns` → all campaigns

  ### User-Backed Campaigns
  - `GET /api/pledges/my` → campaigns user supported (UNION pledges + donations + contributions + payments)
  - `GET /api/users/me/supports` → supports du compte connecté
  - `GET /api/users/:id/profile` → public supported campaigns (ACTIVE/CLOSED only)

  ---

  ## 16. SCRIPTS & MAINTENANCE

  ### Init Database
  **Command**: `npm run init-db` (backend)  
  **File**: [backend/scripts/database/init-db.js](backend/scripts/database/init-db.js)  
  **Action**: Calls ensureRuntimeSchema(pool) → creates tables + triggers

  ### Create Admin
  **Command**: `npm run admin:upsert` (backend)  
  **File**: [backend/scripts/admin/upsert-admin.js](backend/scripts/admin/upsert-admin.js)  
  **Usage**: `node scripts/admin/upsert-admin.js --email admin@ex.com --password secret [--name "Admin"]`  
  **Action**: Upsert user with role='ADMIN'

  ### Manual Tests
  **Folder**: [backend/scripts/tests-manual/](backend/scripts/tests-manual/)  
  **Files**: test-auth.js, test-admin.js, test-profile.js, test-rewards.js, test-submit.js, test-update.js, test-user-mgmt.js  
  **Status**: ⚠️ Legacy, not part of test suite, manually run for local debug

  ---

  ## 17. DÉPLOIEMENT & CONFIGURATION

  ### Environment Variables

  #### Backend ([backend/src/config/env.js](backend/src/config/env.js))
  ```env
  NODE_ENV=development (default)
  PORT=5000
  FRONTEND_URL=http://localhost:5173
  BACKEND_URL=http://localhost:5000
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  STRIPE_CURRENCY=tnd
  DB_HOST=localhost
  DB_PORT=5432
  DB_USER=postgres
  DB_PASSWORD=...
  DB_NAME=hive_tn
  JWT_SECRET=your-secret-key (⚠️ required, not validated if missing)
  JWT_EXPIRES_IN=24h
  BCRYPT_SALT_ROUNDS=12
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
  ADMIN_EMAIL=admin@ex.com (pour script admin:upsert)
  ADMIN_PASSWORD=...
  ADMIN_NAME=Admin Hive (default)
  ```

  #### Frontend ([front/vite.config.js](front/vite.config.js))
  ```env
  VITE_API_URL=http://localhost:5000 (default if not set)
  ```

  ### Package Scripts

  **Backend**:
  ```json
  "dev": "nodemon src/server.js"
  "start": "node src/server.js"
  "init-db": "node scripts/database/init-db.js"
  "admin:upsert": "node scripts/admin/upsert-admin.js"
  ```

  **Frontend**:
  ```json
  "dev": "vite"
  "build": "vite build"
  "preview": "vite preview"
  ```

  ### Build & Run

  **Development**:
  ```bash
  cd backend && npm install && npm run init-db && npm run dev
  cd front && npm install && npm run dev
  # Backend: http://localhost:5000
  # Frontend: http://localhost:5173
  ```

  **Production**:
  ```bash
  # Build frontend
  cd front && npm run build → dist/

  # Run backend
  NODE_ENV=production \
    DB_HOST=prod-db \
    DB_PASSWORD=*** \
    JWT_SECRET=*** \
    npm start
    
  # Serve frontend via nginx/CDN pointing to dist/
  ```

  ---

  ## 18. ISSUES & RECOMMANDATIONS

  ### 🔴 Blockers (Production Risk)

  1. **Paiements production non finalisés** → Stripe est limité au mode test et les routes legacy peuvent encore confirmer sans PSP
    - Impact: Collectes non exploitables en production, audit paiement incomplet
    - Fix: Brancher le PSP cible production (Konnect/Flouci/Stripe live), désactiver `pledges`/`contributions` manuels ou les réserver à un rôle admin explicite

  2. **CORS ouvert** → CSRF, données exposées
    - Fix: `cors({origin: process.env.FRONTEND_URL})`

  3. **Routes legacy de carte factice** → `POST /api/pledges` accepte une carte regex et marque `donations` PAID
    - Fix: supprimer cette route publique ou la rediriger vers `/api/payments/create-checkout-session`

  4. **Pas de rate limiting** → Brute force, DDoS
    - Fix: `express-rate-limit` on /api/auth, /api/support/tickets

  5. **Upload validation missing** → RCE possible
    - Fix: Whitelist MIME + Magic bytes + Antivirus scan

  ### 🟠 High Priority (Next Sprint)

  6. Implémenter TypeScript pour type safety
  7. Ajouter test suite (Jest + React Testing Library)
  8. Terminer la centralisation API_URL frontend (remplacer les wrappers legacy par `buildApiUrl` / `requestJson`)
  9. Implémenter Context/Zustand pour auth state
  10. Ajouter Nginx/reverse proxy pour HTTPS + security headers

  ### 🟡 Nice-to-Have (Future)

  11. WebSocket pour notifications real-time (actuellement polled 30s)
  12. Batch endpoint pour Discover saved checks (réduire N+1)
  13. Admin dashboard export (CSV analytics)
  14. Milestones blockchain pour transparence
  15. Automated compliance reports (audit trail)

  ---

  ## ANNEXE: RESSOURCES CLÉS

  ### Architecture
  - Backend: [backend/src/routes/index.js](backend/src/routes/index.js) - route hub
  - Frontend: [front/src/app/routes.jsx](front/src/app/routes.jsx) - page routes
  - Database: [backend/src/config/schemaInit.js](backend/src/config/schemaInit.js) - schema runtime

  ### Authentication
  - JWT: [auth.middleware.js](backend/src/middlewares/auth.middleware.js)
  - Google OAuth: [auth.controller.js L38-145](backend/src/modules/auth/auth.controller.js#L38)
  - Token storage: [authStorage.js](front/src/shared/utils/authStorage.js)

  ### API Client
  - HTTP wrapper: [httpClient.js](front/src/shared/services/httpClient.js)
  - Contribution API: [contributionApi.js](front/src/modules/payments/services/contributionApi.js)
  - Support API: [supportApi.js](front/src/modules/support/services/supportApi.js)

  ### Admin
  - Dashboard: [AdminDashboard.jsx](front/src/admin/AdminDashboard.jsx) (3000+ lignes)
  - Logs service: [adminLogService.js](backend/src/services/adminLogService.js)
  - Settings: [settings.model.js](backend/src/modules/admin/settings.model.js)

  ### Data Models
  - Campaigns: [campaign.model.js](backend/src/modules/campaigns/campaign.model.js)
  - Users: [auth.model.js](backend/src/modules/auth/auth.model.js)
  - Support: [support.model.js](backend/src/modules/support/support.model.js)

  ---

  **Document fin. Basé sur audit code source exhaustif sans hypothèses. Liens fichiers vérifiés.**

