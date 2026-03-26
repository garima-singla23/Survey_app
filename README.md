# Student DNA Report (MERN)

A fun personality + academic chaos survey for college students.

## Project Structure

```text
.
├── client/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── SurveyForm.jsx
│       ├── Results.jsx
│       ├── main.jsx
│       └── index.css
└── server/
    ├── models/StudentDNA.js
    ├── routes/dna.js
    ├── index.js
    ├── package.json
    └── .env
```

## Features

- 3 survey sections, 13 questions total
- Dark techy UI (`#0a0e1a`, cyan accent `#00e5ff`)
- `Space Mono` headings and `DM Sans` body text
- Fade-up section/question transitions
- Computed `discipline`, `chaos`, `ambition` scores
- 6-type personality mapping + roast line
- Submit response to backend and fetch live analytics

## Backend API

### `POST /api/dna`
Saves full response + computed scores.

### `GET /api/dna/analytics`
Returns:
- total responses
- most common personality type
- average discipline/chaos/ambition scores
- personality type distribution
- `%` who said `1 night before` (exam prep)
- `%` who said `Lost count` (kal se padhunga)
- average stress level
- most common primary goal

## Local Setup

### 1) Backend

```bash
cd server
npm install
```

Update `server/.env`:

```env
MONGO_URI=your_mongodb_atlas_connection_string
PORT=5000
FRONTEND_URL=https://student-dna-report.vercel.app
```

Run:

```bash
npm run dev
```

### 2) Frontend

```bash
cd client
npm install
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000
```

Run:

```bash
npm run dev
```

Open http://localhost:5173

## Vercel Deployment (Frontend)

- Project type: `React + Vite` (build output: `dist`)
- Config file: `client/vercel.json`

### Required files/scripts

- `client/package.json`
  - `build`: `vite build`
  - `preview`: `vite preview`
- `client/vercel.json`
  - `framework`: `vite`
  - `outputDirectory`: `dist`

### Environment variables

- Local: `client/.env`
- Template: `client/.env.example`
- Required variable:

```env
VITE_API_URL=https://your-backend-service-url
```

Do not hardcode `localhost` in frontend API calls for production; frontend uses `VITE_API_URL`.

## Deployment

### Frontend → Vercel
- Import `client` folder as project
- Build command: `npm run build`
- Output directory: `dist`
- Set env var: `VITE_API_URL=https://your-render-backend-url`

### Backend → Render / Railway / Fly.io
- Import `server` folder as web service
- Build command: `npm install`
- Start command: `npm start`
- Set env vars:
  - `MONGO_URI` (MongoDB Atlas URI)
  - `FRONTEND_URL` (Vercel app URL)
  - `PORT` (optional, Render usually provides one)

Backend env template: `server/.env.example`

### Database → MongoDB Atlas
- Create free tier cluster
- Create DB user + whitelist IP
- Copy connection string into Render `MONGO_URI`

## Final Deployment Checklist

- Frontend is Vite and builds to `dist`.
- `client/vercel.json` exists and points to `dist`.
- `VITE_API_URL` is set in Vercel project environment variables.
- Backend is deployed separately (Render/Railway/Fly.io) and publicly reachable.
- Backend `FRONTEND_URL` matches your Vercel domain.
- MongoDB Atlas `MONGO_URI` is set in backend host.
- CORS allows your production frontend origin.
- `npm run build` passes in `client` before deploy.
