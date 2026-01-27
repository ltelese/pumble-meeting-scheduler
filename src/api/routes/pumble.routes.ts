import { Router, Request, Response } from 'express';

const router = Router();

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

// Pumble Add-on Endpoints
router.post('/shortcuts/message', (req: Request, res: Response) => {
  res.json({ text: 'Message shortcut - Coming soon!' });
});

router.post('/shortcuts/global', (req: Request, res: Response) => {
  res.json({ text: 'Global shortcut - Coming soon!' });
});

router.post('/commands/meeting', (req: Request, res: Response) => {
  res.json({ text: 'Meeting command - Coming soon!' });
});

router.post('/events', (req: Request, res: Response) => {
  res.json({ ok: true });
});

router.get('/oauth/callback', (req: Request, res: Response) => {
  res.send('<h1>OAuth Callback</h1><p>Authorization successful!</p>');
});

export { sendToPumble };
export default router;
