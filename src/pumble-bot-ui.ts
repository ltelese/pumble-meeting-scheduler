import express from 'express';
import { emailService } from './services/email.service';
import { caldavService } from './services/caldav.service';
import { Meeting } from './types/meeting';
import { config } from 'dotenv';

config();

const app = express();
app.use(express.json());

// CalDAV availability flag
let caldavAvailable = false;

// Funzione per inviare messaggi a Pumble via webhook
async function sendToPumble(message: string): Promise<void> {
  const webhookUrl = process.env.PUMBLE_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('⚠️  PUMBLE_WEBHOOK_URL not configured');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message })
    });

    if (response.ok) {
      console.log('✓ Message sent to Pumble');
    } else {
      console.error('Failed to send to Pumble:', response.statusText);
    }
  } catch (error: any) {
    console.error('Error sending to Pumble:', error.message);
  }
}

// Initialize services
emailService.initialize();
console.log('✓ Email service initialized');

// Initialize CalDAV (optional - graceful failure)
(async () => {
  try {
    await caldavService.initialize();
    caldavAvailable = true;
    console.log('✓ CalDAV service initialized');
  } catch (error: any) {
    console.warn('⚠️  CalDAV service not available:', error.message);
    console.warn('   Meeting creation will continue without CalDAV sync');
  }
})();

// Serve UI inline
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CalBridge - Crea Meeting</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 600px;
            width: 100%;
        }
        h1 { color: #333; margin-bottom: 10px; font-size: 28px; }
        .subtitle { color: #666; margin-bottom: 30px; font-size: 14px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; color: #555; font-weight: 500; font-size: 14px; }
        input, textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            transition: border-color 0.3s;
        }
        input:focus, textarea:focus { outline: none; border-color: #667eea; }
        textarea { resize: vertical; min-height: 60px; }
        .row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        button {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        button:hover { transform: translateY(-2px); }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        .message {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
        }
        .message.success { background: #d4edda; color: #155724; }
        .message.error { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📅 CalBridge</h1>
        <p class="subtitle">Crea un nuovo meeting con inviti calendario</p>
        <div id="message" class="message"></div>
        <form id="meetingForm">
            <div class="form-group">
                <label>Titolo Meeting *</label>
                <input type="text" id="title" required placeholder="es. Client Demo">
            </div>
            <div class="row">
                <div class="form-group">
                    <label>Data *</label>
                    <input type="date" id="date" required>
                </div>
                <div class="form-group">
                    <label>Ora *</label>
                    <input type="time" id="time" required>
                </div>
            </div>
            <div class="form-group">
                <label>Durata (minuti) *</label>
                <input type="number" id="duration" value="60" required min="15" step="15">
            </div>
            <div class="form-group">
                <label>Link Meeting</label>
                <input type="url" id="location" placeholder="https://meet.google.com/xyz">
            </div>
            <div class="form-group">
                <label>Email Partecipanti * (una per riga)</label>
                <textarea id="attendees" required placeholder="cliente@example.com"></textarea>
            </div>
            <div class="row">
                <div class="form-group">
                    <label>Tua Email *</label>
                    <input type="email" id="organizerEmail" required value="${process.env.SMTP_USER || ''}">
                </div>
                <div class="form-group">
                    <label>Tuo Nome *</label>
                    <input type="text" id="organizerName" required>
                </div>
            </div>
            <button type="submit" id="submitBtn">Crea Meeting e Invia Inviti</button>
        </form>
    </div>
    <script>
        document.getElementById('date').valueAsDate = new Date();
        document.getElementById('meetingForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submitBtn');
            const msg = document.getElementById('message');
            btn.disabled = true;
            btn.textContent = 'Creazione in corso...';
            msg.style.display = 'none';
            try {
                const res = await fetch('/api/meeting/create', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        title: document.getElementById('title').value,
                        date: document.getElementById('date').value,
                        time: document.getElementById('time').value,
                        duration: parseInt(document.getElementById('duration').value),
                        location: document.getElementById('location').value,
                        attendees: document.getElementById('attendees').value.split('\\n').filter(e => e.trim()),
                        organizerEmail: document.getElementById('organizerEmail').value,
                        organizerName: document.getElementById('organizerName').value
                    })
                });
                const result = await res.json();
                if (result.success) {
                    msg.className = 'message success';
                    msg.textContent = '✅ Meeting creato! Gli inviti sono stati inviati.';
                    msg.style.display = 'block';
                    document.getElementById('meetingForm').reset();
                    document.getElementById('date').valueAsDate = new Date();
                    document.getElementById('organizerEmail').value = '${process.env.SMTP_USER || ''}';
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                msg.className = 'message error';
                msg.textContent = '❌ Errore: ' + error.message;
                msg.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Crea Meeting e Invia Inviti';
            }
        });
    </script>
</body>
</html>`);
});

// Endpoint per ricevere comandi da Pumble
app.post('/api/meeting/create', async (req, res) => {
  try {
    const { title, date, time, duration, location, attendees, organizerEmail, organizerName } = req.body;

    const startTime = new Date(`${date}T${time}`);
    const endTime = new Date(startTime.getTime() + (duration || 60) * 60000);

    const meeting: Meeting = {
      id: 'meeting-' + Date.now(),
      title: title || 'Pumble Meeting',
      description: 'Meeting created from Pumble',
      startTime,
      endTime,
      location: location || 'TBD',
      attendees: (attendees || []).map((email: string) => ({
        email,
        name: email.split('@')[0],
        status: 'needs-action' as const,
        isExternal: !email.includes('@pumble.com')
      })),
      organizer: {
        email: organizerEmail || process.env.SMTP_USER || '',
        name: organizerName || 'Organizer',
        pumbleUserId: 'pumble-user'
      },
      channelId: 'pumble-channel',
      icsUid: 'pumble-meeting-' + Date.now(),
      sequence: 0,
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Creating meeting:', meeting.title);

    // Send email invites
    await emailService.sendMeetingInvite(meeting);

    // Create CalDAV event if available
    if (caldavAvailable) {
      try {
        const eventUrl = await caldavService.createEvent(meeting);
        meeting.caldavEventUrl = eventUrl;
        console.log('✓ CalDAV event created');
      } catch (error: any) {
        console.error('Failed to create CalDAV event:', error.message);
        // Continue without CalDAV - email was already sent
      }
    }

    const pumbleMessage = `📅 **Meeting Created!**\\n\\n` +
      `**Title:** ${meeting.title}\\n` +
      `**When:** ${meeting.startTime.toLocaleString('it-IT')}\\n` +
      `**Duration:** ${duration || 60} minutes\\n` +
      `**Location:** ${meeting.location}\\n` +
      `**Attendees:** ${meeting.attendees.map(a => a.email).join(', ')}\\n\\n` +
      `✅ Calendar invites have been sent to all attendees!` +
      (caldavAvailable ? '\\n📆 Event synced to CalDAV calendar!' : '');

    await sendToPumble(pumbleMessage);

    res.json({
      success: true,
      message: 'Meeting created and invites sent!',
      meeting: {
        id: meeting.id,
        title: meeting.title,
        startTime: meeting.startTime,
        attendees: meeting.attendees.length
      }
    });

  } catch (error: any) {
    console.error('Error creating meeting:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CalBridge' });
});

// Manifest endpoint
app.get('/manifest.json', (req, res) => {
  res.sendFile('manifest.json', { root: '.' });
});

// Pumble Add-on Endpoints (placeholders)
app.post('/shortcuts/message', (req, res) => {
  res.json({ text: 'Message shortcut - Coming soon!' });
});

app.post('/shortcuts/global', (req, res) => {
  res.json({ text: 'Global shortcut - Coming soon!' });
});

app.post('/commands/meeting', (req, res) => {
  res.json({ text: 'Meeting command - Coming soon!' });
});

app.post('/events', (req, res) => {
  res.json({ ok: true });
});

app.get('/oauth/callback', (req, res) => {
  res.send('<h1>OAuth Callback</h1><p>Authorization successful!</p>');
});

app.get('/help', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head><title>CalBridge Help</title></head>
<body>
  <h1>CalBridge Help</h1>
  <p>CalBridge helps you schedule meetings with calendar invites directly from Pumble.</p>
  <h2>Features:</h2>
  <ul>
    <li>Create meetings with calendar invites</li>
    <li>Send invites via email</li>
    <li>Sync with CalDAV calendars</li>
  </ul>
</body>
</html>`);
});

app.get('/install', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head><title>Install CalBridge</title></head>
<body>
  <h1>Install CalBridge</h1>
  <p>To install CalBridge to your Pumble workspace, contact your workspace administrator.</p>
</body>
</html>`);
});

// Privacy policy endpoint
app.get('/privacy-policy.htm', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head><title>CalBridge Privacy Policy</title></head>
<body>
  <h1>Privacy Policy - CalBridge</h1>
  <p>Last updated: January 2026</p>
  <h2>Data Collection</h2>
  <p>CalBridge collects only the minimum data necessary to provide meeting scheduling services:</p>
  <ul>
    <li>Meeting titles, dates, times, and locations</li>
    <li>Attendee email addresses</li>
    <li>Organizer information</li>
  </ul>
  <h2>Data Usage</h2>
  <p>Your data is used exclusively to:</p>
  <ul>
    <li>Send calendar invitations</li>
    <li>Sync with CalDAV servers</li>
    <li>Post notifications to Pumble</li>
  </ul>
  <h2>Data Storage</h2>
  <p>CalBridge does not store meeting data permanently. All data is processed in real-time and discarded after processing.</p>
  <h2>Third-Party Services</h2>
  <p>CalBridge may send data to:</p>
  <ul>
    <li>Email providers (SMTP) - for sending calendar invites</li>
    <li>CalDAV servers - for calendar synchronization</li>
    <li>Pumble - for notifications</li>
  </ul>
  <h2>Contact</h2>
  <p>For privacy concerns, contact: ltelese@gmail.com</p>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\\n🚀 CalBridge running on port ${PORT}`);
  console.log(`\\n🌐 Open http://localhost:${PORT} in your browser!`);
});
