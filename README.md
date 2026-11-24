# GYAN-26

> **"Kaun Banega Gyanwan Vivekvan Gunwan"**  
> *Junior KG se PhD Tak*

Production-grade, India-first multiplayer quiz competition platform with IST timezone localization, UPI Shagun donations, Hindi + English friendly interface, squad competitions (individual & 2/4/6 teams), server-authoritative scoring & countdown timers, live leaderboards, verifiable PDF certificates with QR verification, a comprehensive admin panel, and an official Android app packaged via **Capacitor 6** with automated GitHub Actions CI/CD.

---

## 🏛️ Monorepo Architecture

```
gyan/
├── .github/
│   └── workflows/
│       └── android-apk.yml             # CI/CD: Automated Debug APK & Signed Release AAB
├── .gitignore
├── .env.example                        # Root environment template
├── README.md                           # Master documentation & production runbook
├── package.json                        # Root workspace scripts
│
├── backend/                            # Express + TypeScript (ESM) + Mongoose + Socket.IO
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── scripts/
│   │   └── seed.ts                     # Admin & category seed script
│   ├── tests/                          # 9 test suites / 73 passing tests
│   │   ├── auth.test.ts                # Argon2 password hashing & JWT token rotation
│   │   ├── team.test.ts                # Atomic 2/4/6 player limits & capacity enforcement
│   │   ├── question.test.ts            # Scoring schemes (all-or-nothing vs partial credit)
│   │   ├── game.test.ts                # Real-time state machine & linear speed bonus
│   │   ├── result.test.ts              # Tie-break rules & leaderboard rank sorting
│   │   ├── certificate.test.ts         # A4 Landscape PDFKit & sequential Counter format
│   │   ├── donation.test.ts            # NPCI UPI URI generator & dynamic QR codes
│   │   ├── security.test.ts            # NoSQL sanitizer, rate limiters, DPDP Act minor age
│   │   └── integration.test.ts         # Supertest end-to-end API test suite
│   └── src/
│       ├── app.ts                      # Express app with Helmet, CORS & NoSQL sanitizer
│       ├── server.ts                   # Bootstrapping: Env -> DB -> Sockets -> Rehydration
│       ├── config/                     # Env validation (Zod), DB, Cloudinary
│       ├── middleware/                 # Rate limiters, NoSQL sanitizer, auth guards
│       ├── models/                     # 19 Mongoose schemas with compound indexes
│       ├── routes/                     # Modular REST routing
│       ├── controllers/                # Controllers with Zod request parsing
│       ├── services/                   # Business logic, game engine, PDF generator
│       ├── socket/                     # Socket.IO handlers, rooms, anti-cheat rate limit
│       └── utils/                      # AppError, Pino logger, Argon2, JWT helpers
│
└── frontend/                           # React 18 + Vite + TypeScript + Tailwind CSS
    ├── .env.example
    ├── package.json
    ├── capacitor.config.ts             # Capacitor 6 configuration (App ID: com.gyan26.app)
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── index.html                      # Mobile viewport-fit=cover & font preconnects
    ├── android/                        # Committed native Android Studio project
    ├── assets/                         # 1024px logo, icons & 2732px splash drawables
    └── src/
        ├── App.tsx                     # React Router, AuthProvider, NativeAppManager
        ├── index.css                   # Safe-area insets & overscroll-behavior control
        ├── components/
        │   ├── ui/                     # Design system primitives (Button, Modal, Card, etc.)
        │   ├── layout/                 # Header, AppLayout, AdminLayout, ProtectedRoute
        │   ├── game/                   # CircularTimer, TeamStatusStrip
        │   ├── native/                 # NativeAppManager (hardware back button, offline banner)
        │   └── auth/                   # LoginForm, RegisterForm with DPDP consent
        ├── contexts/                   # AuthContext (platform-aware token storage)
        ├── hooks/                      # useAuth, useGameSocket, useMediaQuery
        ├── lib/                        # Storage, mobile certificate download/share
        ├── pages/                      # 16 full-featured pages (Dashboard, Arena, Support...)
        ├── services/                   # FCM Push Notification extensible service
        └── types/                      # Shared TypeScript definitions
```

---

## 🛠️ Complete Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Web** | React 18, Vite 5, TypeScript 5, Tailwind CSS, React Router v6, TanStack Query v5, React Hook Form, Zod, Lucide React, Recharts, Framer Motion, Socket.IO Client, Sonner, Radix UI |
| **Mobile App** | **Capacitor 6**, `@capacitor/app`, `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capacitor/network`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/preferences`, `@capacitor-community/keep-awake` |
| **Backend API** | Node.js 20, Express 4, TypeScript (ESM), Socket.IO 4, Zod, Argon2, JSONWebToken, Helmet, CORS, Express Rate Limit, Custom NoSQL Injection Sanitizer, Pino Logger |
| **Database** | MongoDB Atlas, Mongoose 8 (19 collections, compound unique indexes, atomic updates) |
| **Documents & Media** | PDFKit (A4 Landscape, ivory theme, double border), QRCode, Cloudinary SDK, Multer |
| **CI / CD** | GitHub Actions (`android-apk.yml`), Gradle 8, Temurin OpenJDK 17 |
| **Testing** | Vitest 2, Supertest 7 (9 test suites, 73 tests passing 100%) |

---

## 📱 Android App (Capacitor 6)

The React frontend is packaged as a high-performance native Android application using Capacitor 6 without rewriting UI components.

- **App Name**: `GYAN-26`
- **Application ID**: `com.gyan26.app`
- **Android Scheme**: `https` (No cleartext HTTP permitted in release builds)

### Native Features Implemented
1. **Platform-Aware Authentication**:
   - Automatically detects `Capacitor.isNativePlatform()`.
   - Web clients use `httpOnly` secure cookies.
   - Native Android clients securely store the rotating refresh token using `@capacitor/preferences` and pass it in the request body, while transmitting the access token via `Authorization: Bearer <token>`.
   - Socket.IO handshakes use the active access token across both platforms.
2. **Adaptive Icons & Splash Screen**:
   - Generated with `@capacitor/assets` across all Android densities (`ldpi`, `mdpi`, `hdpi`, `xhdpi`, `xxhdpi`, `xxxhdpi`, and dark mode).
   - Splash screen displays the GYAN-26 crest on a dark navy `#0A192F` canvas with smooth auto-hide.
   - Status bar configured with dark styling and matching navy background (`#0A192F`).
3. **Android Hardware Back Button**:
   - Intercepted via `@capacitor/app`.
   - When a live tournament match is in progress (`/game/:sessionId`), prompts the user with a confirmation alert to avoid accidental forfeits.
   - Seamlessly navigates back in history on other screens or cleanly exits the app from the dashboard/auth screen.
4. **Keep-Screen-Awake During Games**:
   - `@capacitor-community/keep-awake` prevents phone screens from dimming or locking during active tournament question countdowns, restoring standard sleep rules when the game concludes.
5. **Safe-Area Insets & Scroll Protection**:
   - Viewport set to `viewport-fit=cover`.
   - Safe area padding bound to `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
   - `overscroll-behavior-y: none;` prevents accidental pull-to-refresh gestures during fast-paced quiz answering.
6. **Network Offline Detection**:
   - Real-time network listener via `@capacitor/network` displays an alert banner if device connectivity drops.
7. **Mobile Certificate Download & Native Sharing**:
   - On Android devices, certificates are downloaded into device cache via `@capacitor/filesystem` and immediately invoked with the native Android Share Sheet (`@capacitor/share`) for instant WhatsApp, Gmail, or Drive sharing.
8. **Deep Links (Android App Links)**:
   - Configured in `AndroidManifest.xml` for `https://gyan26.org/verify-certificate/:id` and custom scheme `gyan26://verify-certificate/:id`.

### Mobile NPM Scripts
```bash
# Build web app and synchronize Capacitor native project
cd frontend
npm run build:mobile

# Open native project in Android Studio
npm run android:open
```

---

## 🤖 CI: Automated APK & AAB Builds (GitHub Actions)

The repository includes `.github/workflows/android-apk.yml` which builds downloadable APKs automatically on every push to `main` and on manual workflow dispatch.

### 1. Required GitHub Secrets
To configure CI builds, navigate to **Settings > Secrets and variables > Actions** in your GitHub repository and add:

| Secret Name | Purpose | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | Public production API URL | `https://gyan26-api.onrender.com/api` |
| `VITE_SOCKET_URL` | Public production Socket.IO URL | `https://gyan26-api.onrender.com` |
| `ANDROID_KEYSTORE_BASE64` *(optional)* | Base64-encoded release keystore for signed builds | Output of `base64 -w 0 release.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` *(optional)* | Keystore password | `YourKeystorePassword123` |
| `ANDROID_KEY_ALIAS` *(optional)* | Key alias inside the keystore | `gyan26-key` |
| `ANDROID_KEY_PASSWORD` *(optional)* | Alias password | `YourKeyPassword123` |

### 2. How to Download & Install the Debug APK
1. Push any commit to `main` or trigger the workflow manually from the **Actions** tab on GitHub.
2. Select the latest **"Build Android APK"** run.
3. Under the **Artifacts** section at the bottom, click **gyan26-debug-apk** to download the zip file.
4. Extract `app-debug.apk` and transfer it to your Android device via USB, Google Drive, or Telegram.
5. On your Android device, tap the APK. If prompted, toggle **"Allow installation from this source"** under *Install Unknown Apps* in Android Settings.
6. Launch **GYAN-26**!

### 3. Generating a Release Signing Keystore
To build a production release APK or Google Play App Bundle (`.aab`):
```bash
keytool -genkey -v -keystore gyan26-release.keystore -alias gyan26-alias -keyalg RSA -keysize 2048 -validity 10000
```
Encode the generated `.keystore` file to Base64 for the `ANDROID_KEYSTORE_BASE64` secret:
```bash
# Linux / macOS
base64 -i gyan26-release.keystore | tr -d '\n'

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("gyan26-release.keystore")) | Set-Clipboard
```
When a version tag is pushed (e.g. `git tag v1.0.0 && git push origin v1.0.0`), the workflow automatically builds both a signed APK and AAB and attaches them to a new GitHub Release.

> [!NOTE]
> Google Play Store requires apps to be uploaded as a signed **Android App Bundle (.aab)** along with an active Google Play Developer account.

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js**: >= 20.0.0
- **npm**: >= 10.0.0
- **MongoDB**: MongoDB 6+ running locally or MongoDB Atlas connection string
- **Android Studio** *(optional, for local mobile emulation)*: Hedgehog / Iguana / Koala with Android SDK Platform 34

### 2. Configure Environment Files

#### Backend (`backend/.env`):
```ini
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/gyan26?retryWrites=true&w=majority
JWT_ACCESS_SECRET=super-secret-access-token-min-32-chars-long
JWT_REFRESH_SECRET=super-secret-refresh-token-min-32-chars-long
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173,https://localhost,http://localhost,capacitor://localhost
FRONTEND_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=gyan26
CLOUDINARY_API_KEY=sample_api_key
CLOUDINARY_API_SECRET=sample_api_secret
EMAIL_FROM=noreply@gyan26.org
SEED_ADMIN_EMAIL=admin@gyan26.org
SEED_ADMIN_PASSWORD=Admin@12345678
```

#### Frontend (`frontend/.env`):
```ini
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Install Dependencies & Seed Database
```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Seed database categories and Super Admin
cd ../backend
npm run seed
```

### 4. Run Development Servers
```bash
# Terminal 1: Backend API & Socket Engine
cd backend
npm run dev

# Terminal 2: Frontend Web Client
cd frontend
npm run dev
```

- **Frontend Web**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000/api](http://localhost:5000/api)
- **Health Check**: [http://localhost:5000/health](http://localhost:5000/health)

### 5. Run Verification Test Suite
```bash
cd backend
npm test
```
All **9 test suites and 73 unit/integration tests** will execute and report passing status.

---

## 🔒 Security & Privacy Implementation

- **Digital Personal Data Protection (DPDP) Act Compliance**: Under-18 students strictly require verifiable parental consent (guardian name, guardian phone/email, and consent confirmation timestamp). Minors' contact details are permanently masked from public searches, rosters, and certificate verification endpoints.
- **Defence-in-Depth NoSQL Sanitizer**: Custom middleware recursively strips MongoDB query operators (`$gt`, `$where`, `$ne`, `$regex`, `$elemMatch`) and drops field path traversal keys (`.`).
- **Strict Tier-Based Rate Limiting**:
  - `authLimiter`: 10 requests / 15 mins for `/login` and `/register`.
  - `strictLimiter`: 5 requests / 15 mins for `/forgot-password` and `/reset-password`.
  - `generalLimiter`: 100 requests / 15 mins for general browsing.
- **Anti-Cheat Multi-Socket Enforcement**: Enforces a single active socket connection per user. Attempted concurrent logins instantly supersede previous connections with an explicit alert. Answer submissions are protected by compound unique indexes (`{ gameSessionId, userId, questionId }`) preventing double answers.
- **Zero-Leak Question Engine**: Correct answers and detailed explanations are never transmitted over the wire while question timers are active.

---

## 🗺️ Roadmap & Future Work (TODOs)

- **Push Notifications (FCM)**: The service layer in `frontend/src/services/pushNotification.service.ts` is architected for Firebase Cloud Messaging. Adding push notifications requires adding `google-services.json` and provisioning Firebase credentials.
- **Text-Answer & Descriptive Questions**: Extensible registry in `Question.ts` contains `TODO: text_answer` for automated semantic evaluation.
- **Digital Asset Links**: Production deployment requires hosting `/.well-known/assetlinks.json` on the public frontend domain for instant Android App Link verification without browser disambiguation prompts.
- **Redis Socket.IO Adapter**: Documented for multi-instance horizontal scaling with Redis sticky sessions.

---

## 📜 License
Proprietary — Developed for **GYAN-26 Educational Competition Platform**. All rights reserved.
