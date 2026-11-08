# ⚔️ AKILES ATHLETE
### The Athlete Operating System

<p align="center">
  <strong>FORGED IN THE ARENA.</strong>
  <br/>
  Every round has a purpose. Every session leaves a mark.
</p>

---

## About Akiles

**Akiles Athlete** is an athlete-focused training and performance management platform built for combat sports.

Designed to give athletes ownership of their training journey, Akiles brings workout tracking, training history, video management, coach collaboration, and performance analytics into one unified platform.

Akiles is part of the **Areté Performance Ecosystem**, alongside Kyron Coach — its companion platform for coaches.

Our philosophy is simple:

> Discipline is the difference between participation and progression.

## The Ecosystem

Akiles and Kyron work together to create a connected environment for athletes and coaches.

| Platform | Purpose |
|---|---|
| **Akiles Athlete** | Athlete training, workout logging, video library and performance tracking |
| **Kyron Coach** | Coach management, athlete management, workout planning and training oversight |
| **Areté** | The wider combat sports ecosystem and competition discovery platform |

Akiles is designed to work independently while offering deeper functionality when connected to Kyron.

---

## Features

### 🏛️ The Citadel — Athlete Dashboard
Your central command for training and performance.

- Personal training overview.
- Training activity and progress summaries.
- Coach relationship status.
- Quick access to workouts and performance statistics.

### ⚔️ The Forge — Training Management
A dedicated space for managing daily training.

- Log independent workouts.
- Complete coach-assigned workouts.
- Record exercises, sets, repetitions and rounds.
- Track workout duration and intensity.
- Add notes and training observations.
- Maintain a structured training history.

### 📜 The Chronicle — Video Library
A personal archive of your training journey.

- Import training videos from your device.
- Organise and review recorded sessions.
- Associate videos with workouts.
- Keep training videos private by default.
- Manage locally stored video content.

**Privacy first:** Training videos remain on the athlete's device unless the athlete explicitly chooses to share them.

### 🛡️ The Mentors — Coach Discovery
Discover verified coaches through the Kyron network.

- Browse verified coach profiles.
- Explore coaching disciplines and specialisations.
- View coach experience and location.
- Access available contact information.
- Discover coaches through the connected Kyron platform.

### 🤝 Onboarding — Coach-Athlete Connection
A structured onboarding process connecting athletes with coaches.

- Receive coach-initiated invitations.
- Review invitation details.
- Accept or decline invitations.
- Establish an active coach-athlete relationship.
- Synchronise relationship status with Kyron.

### 📊 The Ascension — Performance Analytics
Understand your progress through measurable training data.

- Total workouts.
- Training hours.
- Training frequency.
- Workout history.
- Performance trends.
- Training consistency.

The goal is to turn training activity into meaningful performance insights.

---

## Technology Stack

### Frontend
- React
- TypeScript
- Vite
- CSS
- React Router
- Recharts
- Lucide React

### Backend
- Node.js
- Express.js
- TypeScript
- SQLite
- better-sqlite3
- JWT Authentication

### Infrastructure
- **Vercel** — Frontend deployment
- **Render** — Backend deployment
- **Kyron API** — Coach directory, onboarding and training integration

---

## Architecture

Akiles follows a client-server architecture with local-first principles for athlete-owned data.

```text
                 AKILES ATHLETE
                       |
          +------------+------------+
          |                         |
     React Frontend            Express API
       (Vercel)                  (Render)
                                    |
                              SQLite Database
                                    |
                    +---------------+---------------+
                    |                               |
              Athlete Data                    Sync Service
                    |                               |
             Workout Logs                       KYRON API
             User Profiles                          |
             Training Records              +--------+--------+
                                           |                 |
                                     Coach Profiles    Relationships
                                     Assignments       Workout Sync
```

### Design Principles

- **Athlete ownership:** Athletes retain control over their personal training records.
- **Privacy:** Training videos remain local by default.
- **Modularity:** Akiles and Kyron operate as separate applications.
- **Interoperability:** Applications communicate through authenticated APIs.
- **Resilience:** Local athlete functionality should remain usable when the coach platform is unavailable.

Kyron is responsible for coach-side information and coach-athlete relationships, while Akiles manages the athlete-facing experience.

---

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js 22 LTS
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/Akiles.git
cd Akiles
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file inside the backend directory:

```env
PORT=4100
DATA_DIR=./data
JWT_SECRET=your-long-random-secret
CORS_ORIGIN=http://localhost:5173

KYRON_API_URL=http://localhost:4000
AKILES_INTEGRATION_KEY=your-shared-integration-secret
```

Use the actual deployed Kyron backend URL when running against production.

Start the backend:

```bash
npm start
```

### 3. Set up the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local development URL provided by Vite, usually:

```text
http://localhost:5173
```

### Environment Configuration

For deployment, configure environment variables separately in the hosting providers:

- Render: Backend environment variables.
- Vercel: Frontend environment variables, if required by the configured API base URL.

Never commit `.env` files, JWT secrets or integration keys to GitHub.

---

## Deployment

Akiles uses separate deployments for its frontend and backend.

| Component | Hosting |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | SQLite on backend host |

The frontend communicates with the backend through its configured API URL. The backend communicates with Kyron using the integration API and shared secret.

**Important:** SQLite persistence on an ephemeral hosting filesystem is not suitable for guaranteed production data retention. A persistent storage strategy is required before relying on this deployment for critical athlete records.

---

## Design Philosophy

Akiles takes inspiration from ancient Greek mythology, warrior culture and the discipline of combat sports.

Its visual identity is built around:

- Deep black and charcoal surfaces.
- Antique gold accents.
- Ivory typography.
- Greek-inspired visual elements.
- Spartan and warrior symbolism.
- Cormorant Unicase typography.

The interface is designed to feel like an athlete's personal command centre — focused, disciplined and purposeful.

---

## Project Structure

```text
Akiles/
│
├── backend/
│   ├── data/
│   ├── src/
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/
│   ├── public/
│   │   └── Akiles_logo.png
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── .gitignore
└── README.md
```

---

## Roadmap

- [x] Athlete authentication and account management
- [x] Athlete dashboard
- [x] Workout logging
- [x] Local video library
- [x] Coach discovery through Kyron
- [x] Coach-initiated onboarding invitations
- [x] Coach-athlete relationship integration
- [ ] Complete bidirectional workout synchronisation
- [ ] Coach-assigned workout delivery
- [ ] Reliable offline synchronisation and retry queue
- [ ] Advanced athlete performance analytics
- [ ] Expanded combat sports support

*Roadmap items reflect development priorities and may change.*

---

## Vision

Akiles is being built around a belief that an athlete's development should be measurable, structured and owned by the athlete.

From the first training session to competitive preparation, every workout contributes to a larger journey.

**Train with purpose. Track your progress. Rise through discipline.**

<p align="center">
  <strong>AKILES ATHLETE</strong>
  <br/>
  <em>RISE CHAMPION.</em>
  <br/>
  Part of the Areté Performance Ecosystem.
</p>

---

### Connect

- **GitHub:** [YOUR_GITHUB_PROFILE]
- **Website:** [Areté — Coming Soon]
- **Companion Platform:** Kyron Coach
