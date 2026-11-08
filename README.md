# Akiles Athlete

Athlete-facing companion to Kyron Coach. React + TypeScript + Vite frontend; Express + TypeScript + SQLite API.

## Runtime

Use **Node.js 22 LTS** and npm 10. The frontend and backend dependency versions are pinned to compatible versions in their package.json files.

## Local setup

1. Start Kyron backend first (see `../kyron-coach/backend/README.md` in the paired delivery or the integration guide).
2. Copy `backend/.env.example` to `backend/.env` and set `KYRON_API_URL` plus the same `AKILES_INTEGRATION_KEY` configured in Kyron.
3. Copy `frontend/.env.example` to `frontend/.env`.
4. In terminal 1: `cd backend && npm install && npm run dev`.
5. In terminal 2: `cd frontend && npm install && npm run dev`.
6. Open `http://localhost:5173`.

## Coach onboarding workflow

- Coach profiles and contact details are read from Kyron's integration API.
- Athlete chooses a coach in Akiles, then calls/emails the coach directly to discuss terms and payment.
- Coach opens the athlete record in Kyron and selects **Invite to Akiles**, entering the email used by the athlete's Akiles account.
- Akiles polls for invitations and displays the invitation in **Onboarding**.
- The athlete accepts or declines. Kyron is the source of truth and creates the active relationship ID.
- Akiles workout completions are sent to Kyron only after the active relationship is confirmed.
- Kyron can retrieve shared workouts through its protected integration endpoint.

No meetings, appointment booking, athlete-initiated coaching requests, sample coach profiles, or simulated records are part of this workflow.

## Local video privacy

Training videos remain in browser-local IndexedDB and are not uploaded to Kyron.

## Integration requirements

Configure a long random shared `AKILES_INTEGRATION_KEY` on both servers. Configure the Kyron coach profile/contact values in Kyron's `.env`. The Kyron coach directory returns no profiles until a coach name is configured and `KYRON_COACH_VERIFIED=true` is set.

**Security limitation:** the supplied Kyron application has no coach login/session authorization layer. Its new `POST /api/integrations/onboarding-invitations` route therefore inherits that existing limitation. Before exposing Kyron publicly, protect that route with the application's real coach authentication/authorization middleware. Do not treat this prototype route as production-secure while Kyron itself has no authenticated coach session.
