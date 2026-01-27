# CalBridge Architecture

Progetto con frontend e backend separati.

## Struttura

```
src/api/              → Backend API (Express + TypeScript)
  ├── server.ts       → Server principale
  └── routes/         → API routes
src/services/         → Business logic (email, caldav)
public/               → Frontend (HTML/CSS/JS)
  ├── index.html      → UI principale
  ├── css/styles.css  → Stili
  └── js/app.js       → Logic frontend
```

## API Endpoint

```
POST /api/meeting/create
Body: {title, date, time, duration, location, attendees[], organizerEmail, organizerName}
Response: {success, message, meeting{}}
```

## Avvio

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

## Deploy

Server → Backend su porta 3000
Apache → Reverse proxy HTTPS
Public → File statici serviti da Express
