## Credit Jambo Admin (React + Vite + TS)

* Admin web app to verify devices, view customers and transactions, see stats, export CSV, and receive push notifications.

## Requirements
* Node.js 18+
* Firebase project (Firestore + Cloud Messaging)
* Backend API running (see `/backend`)

## Backend environment (.env)
* Create `backend/.env`:

* PORT=3000
* CORS_ORIGIN=http://localhost:5173,http://localhost:5174
* JWT_SECRET=replace-with-a-long-random-string
* PASSWORD_PEPPER=replace-with-a-strong-pepper
* ACCESS_TOKEN_TTL_MIN=15
* FIREBASE_PROJECT_ID=your-project-id
* FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
* FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...REPLACE...\n-----END PRIVATE KEY-----\n"
* ADMIN_SEED_EMAIL=admin@example.com
* ADMIN_SEED_PASSWORD=ChangeMe123!
* SWAGGER_ENABLED=true
* VITE_API_BASE_URL=http://localhost:3000
* VITE_VAPID_KEY=YOUR_PUBLIC_VAPID_KEY


Run each command one after the other.
-------------------------------------
## Backend
* cd backend
* copy .env.example .env 
* npm install 
* npm run dev

## Run Admin Web
# PowerShell (Windows):

* cd frontend
* npm install
* $env:VITE_API_BASE_URL="http://localhost:3000";
*  $env:VITE_VAPID_KEY=YOUR_VITE_VAPID_KEY;
*   npm run dev -- --port 5174

# CMD:

* cd frontend
* npm install
* set VITE_API_BASE_URL=http://localhost:3000
*  set VITE_VAPID_KEY=YOUR_VITE_VAPID_KEY
*  npm run dev -- --port 5174

# Git Bash:

* cd frontend
* npm install
* VITE_API_BASE_URL=http://localhost:3000 
* VITE_VAPID_KEY=YOUR_VITE_VAPID_KEY 
* npm run dev -- --port 5174

* Open the printed local URL (e.g., http://localhost:5174). Allow notifications in the browser when prompted.

## Admin Credentials (local dev)
* email: ADMIN_SEED_EMAIL
* password: ADMIN_SEED_PASSWORD

## Features
* Admin login
* Pending devices list + verify action
* Customers list and balances
* Transactions list with filters, CSV export
* Stats header (customers, total balance, deposits, withdrawals, transactions)
* Push notifications for admin actions

## Admin API Endpoints
* POST `/admin/login`
* GET `/admin/devices/pending`
* POST `/admin/devices/:id/verify`
* GET `/admin/customers`
* GET `/admin/transactions` (query: userId, type, start, end)
* GET `/admin/stats` (query: start, end)
* POST `/admin/push-token` (save admin FCM token; requires admin JWT)

## Assumptions
* Admin app shares the same backend as the client.
* Use the same Firebase project for consistent messaging.

## Database access
* Firestore access is restricted. If you need database access for testing, send your Google account email to the to the Developer so permissions can be granted in Firebase/IAM.

## Troubleshooting
* No permission prompt: check site settings (lock icon ▶ Site settings ▶ Notifications ▶ Allow).
* No push received: ensure `VITE_VAPID_KEY` set, service worker registered, backend reachable at `VITE_API_BASE_URL`.
* 401 on admin API: ensure you logged in and the Authorization header is set (app manages it after login).
