# Tuutta — AI-Powered Learning Management System

Tuutta is a full-stack Learning Management System (LMS) built with React, Firebase, and OpenAI. It combines an AI course-building pipeline (Genie AI), a structured learner experience, an ELS (Enterprise Learning Studio) authoring environment, and a real-time AI tutor with voice input.

---

## Features

### Genie AI — Admin Course Pipeline
- **ADDIE-based pipeline** — Analyze, Design, Develop, Implement, Evaluate stages
- **AI-assisted course generation** — Ingest source materials, auto-generate modules, lessons, and quizzes
- **Copilot sidebar** — Chat-based AI assistant for each pipeline stage
- **Template gallery** — Pre-built course templates
- **Program workspace** — Manage multiple courses within a training program
- **Auto-build launcher** — One-click full course generation

### AI Tutor (Learner-facing)
- Real-time chat with OpenAI GPT-4o-mini via Firebase callable functions
- **Voice input** — Record audio, transcribed via OpenAI Whisper API
- **Web search** — Live web results injected into AI context
- **File uploads** — PDF, DOCX, XLSX, images — extracted and used as context
- **Stop / cancel** — Abort in-flight requests at any time
- Markdown rendering with math (KaTeX), code highlighting, and more

### LMS — Learner Experience
- Course catalog, enrollment, and progress tracking
- Course player with lessons, quizzes, and assessments
- Gamification — badges, leaderboards, points
- Learning path viewer
- Discussion forums, mentoring, training calendar
- Certificate viewer
- Notifications center

### Admin Tools
- User management, departments, teams
- Enrollment management and waitlists
- Gradebook and reports dashboard
- Audit log viewer
- Compliance dashboard
- Skills manager
- Survey builder and quiz builder
- ILT (Instructor-Led Training) session manager
- Bulk import
- Integration settings (LMS, SCORM, xAPI)
- Announcements center

### ELS Studio (Enterprise Learning Studio)
- Multi-phase content authoring (Needs Analysis → Design → Develop → Implement → Evaluate)
- Spaced repetition scheduling
- Adaptive learning paths
- Assessment builder
- Governance and audit trails

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, Radix UI, shadcn/ui |
| State | Zustand |
| Routing | React Router v6 |
| Backend | Firebase (Auth, Firestore, Storage, Functions v2) |
| AI | OpenAI GPT-4o-mini (chat), Whisper (voice), Vision (images) |
| Rich text | TipTap |
| Charts | Recharts |
| File processing | PDF.js, Mammoth (DOCX), xlsx, Tesseract.js (OCR) |
| Drag and drop | dnd-kit |
| Audio | WaveSurfer.js, MediaRecorder API |
| Payments | Stripe |
| Deployment | Netlify (frontend), Firebase Cloud Run (functions) |
| Testing | Vitest, Playwright, Firebase Emulator |

---

## Project Structure

```
TuuttaWebApp/
├── src/
│   ├── components/
│   │   ├── admin/           # Admin panel components
│   │   │   ├── genie/       # Genie AI pipeline UI (shell, copilot, workspace)
│   │   │   └── pipeline/    # ADDIE stage components
│   │   ├── learner/         # Learner-facing components
│   │   ├── els/             # Enterprise Learning Studio
│   │   ├── lms/             # LMS layout and hub pages
│   │   ├── layout/          # App shell, navigation, footer
│   │   └── ui/              # Shared UI primitives (button, input, badge...)
│   ├── context/             # React contexts (App, ELS, GeniePipeline, Guided)
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Core utilities
│   │   ├── firebase.ts      # Firebase app init
│   │   ├── openai.ts        # AI chat (Firebase callable + browser fallback)
│   │   ├── voice.ts         # Voice recording + Whisper transcription
│   │   ├── speech.ts        # Text-to-speech
│   │   ├── fileProcessor.ts # File extraction (PDF, DOCX, XLSX, images)
│   │   ├── search.ts        # Web search integration
│   │   ├── errorHandling.ts # Error code to user message mapping
│   │   └── retry.ts         # Exponential backoff retry utility
│   ├── pages/               # Top-level page components
│   ├── services/            # Firestore service layer
│   │   └── els/             # ELS-specific services
│   ├── store/               # Zustand stores
│   ├── types/               # TypeScript type definitions
│   └── App.tsx              # Root router
├── functions/
│   └── src/
│       └── index.ts         # Firebase Cloud Functions
├── firestore.rules          # Firestore security rules
├── firestore.indexes.json   # Firestore composite indexes
├── netlify.toml             # Netlify build config + redirects
└── vite.config.ts           # Vite build config with manual chunk splitting
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project on the **Blaze (pay-as-you-go) plan** (required for Cloud Functions outbound internet calls)

### 1. Clone and install

```bash
git clone https://github.com/Gaziyo/TuuttaWebApp.git
cd TuuttaWebApp
npm install
```

### 2. Firebase setup

```bash
firebase login
firebase use <your-project-id>
```

Set the required secret for AI functions:

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

### 3. Environment variables

Create a `.env.local` file in the project root:

```env
# Firebase config (get from Firebase Console > Project Settings > Your apps)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# OpenAI browser fallback key (temporary — see Known Issues)
VITE_OPENAI_API_KEY=sk-...

# Optional: Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
```

> **Note:** `VITE_OPENAI_API_KEY` is a temporary browser-side fallback used while Cloud Run egress is not configured. Once that is fixed, all AI calls will route through the secure Firebase callable function and this key can be removed from the environment.

### 4. Run locally

```bash
npm run dev
```

### 5. Deploy Firebase functions

```bash
firebase deploy --only functions
```

### 6. Deploy frontend

Push to `main` — Netlify auto-deploys on every push to main.

---

## Firebase Cloud Functions

| Function | Purpose |
|----------|---------|
| `genieChatCompletion` | AI tutor chat via GPT-4o-mini |
| `genieTranscribeAudio` | Voice transcription via Whisper |
| `genieTextToSpeech` | Text-to-speech synthesis |
| `genieAnalyzeImage` | Image analysis via GPT-4o Vision |
| `scrapePage` | Web page scraping for search context |
| `enrollmentCreated` | Firestore trigger — enrollment events |
| `coursePublished` | Firestore trigger — course publish events |

---

## Known Issues and TODOs

### Cloud Run Egress (High Priority)

Firebase callable functions (`genieChatCompletion`, `genieTranscribeAudio`) cannot reach `api.openai.com` because Cloud Run egress is configured to "Private ranges only". A browser-side fallback using `VITE_OPENAI_API_KEY` is in place as a temporary workaround.

**Fix (approx. 5 minutes in GCP Console):**

1. Go to [GCP Console > Cloud Run](https://console.cloud.google.com/run)
2. Select your project, find the `genieChatCompletion` service
3. Click **Edit & Deploy New Revision** > **Networking** tab
4. Set **Egress** to **"All traffic"**
5. Remove any VPC connector (or configure Cloud NAT on it)
6. Click **Deploy** and repeat for `genieTranscribeAudio` and `genieTextToSpeech`

After confirming AI calls work through Firebase, remove the browser fallback:
- Remove `browserChatCompletion` and `shouldFallbackToBrowserOpenAI` from `src/lib/openai.ts`
- Remove `browserTranscribeAudio` and `shouldFallbackToBrowserForTranscription` from `src/lib/voice.ts`
- Remove `VITE_OPENAI_API_KEY` from Netlify environment variables and `.env.local`

### Node.js 20 Deprecation

Firebase functions use Node.js 20, deprecated April 2026 and decommissioned October 2026. Upgrade to Node.js 22 before then.

### Firestore Trigger Functions

Several Firestore trigger functions (`coursePublished`, `enrollmentCreatedOrg`, `assessmentResultCreated`, etc.) may not be fully deployed due to GCP CPU quota limits during initial deployment. Re-run `firebase deploy --only functions` if any are missing.

---

## Available Scripts

```bash
npm run dev               # Start development server
npm run build             # TypeScript check + production build
npm run lint              # ESLint
npm run test              # Vitest (watch mode)
npm run test:run          # Vitest (single run)
npm run test:e2e          # Playwright end-to-end tests
npm run test:rules        # Firestore security rules tests (requires emulator)
npm run ops:observability # Observability / uptime check
npm run release:candidate # Run release candidate checklist
```

---

## Deployment

### Netlify (Frontend)

The `netlify.toml` configures:
- Build command: `npm run build`
- Publish directory: `dist`
- SPA redirect: all routes → `index.html`

All environment variables prefixed with `VITE_` must be set in **Netlify > Site settings > Environment variables**.

### Firebase (Backend)

Functions are deployed via:

```bash
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## Contributing

1. Branch from `main`
2. Make your changes and test locally
3. Push and open a pull request to `main`
4. Netlify automatically creates a deploy preview for the PR

---

## License

Private — All rights reserved.
