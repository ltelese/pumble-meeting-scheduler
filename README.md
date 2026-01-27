# CalBridge

Pumble add-on per la creazione di meeting con inviti calendario (iCal) e sincronizzazione CalDAV.

## Architettura

```
src/api/              → Backend API (Express + TypeScript)
  ├── server.ts       → Server principale
  └── routes/         → API routes
public/               → Frontend (HTML/CSS/JS statici)
  ├── index.html      → UI principale
  ├── css/            → Stili
  └── js/             → Logic frontend
```

## Installazione

```bash
npm install
```

## Configurazione

Copia `.env.example` in `.env` e configura:

```env
# Pumble
PUMBLE_BOT_TOKEN=your_token
PUMBLE_WEBHOOK_URL=your_webhook_url

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# CalDAV (opzionale)
CALDAV_SERVER_URL=https://your-caldav-server.com
CALDAV_USERNAME=username
CALDAV_PASSWORD=password
```

## Sviluppo

```bash
npm run dev
```

Apri http://localhost:3000

## Produzione

```bash
npm run build
npm start
```

## Deploy

Vedi [DEPLOY_STEPS.md](./DEPLOY_STEPS.md) per istruzioni complete.

## API

```
POST /api/meeting/create
Body: {title, date, time, duration, location, attendees[], organizerEmail, organizerName}
```

## Funzionalità

- ✅ Creazione meeting con form web
- ✅ Invio email con allegato iCal (RFC 5545)
- ✅ Notifiche su Pumble via webhook
- ✅ Sincronizzazione CalDAV (opzionale)
- ✅ Integrazione Pumble add-on (shortcuts, slash commands)

## Licenza

MIT
