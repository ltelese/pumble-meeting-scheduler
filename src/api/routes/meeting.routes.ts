import { Router, Request, Response } from 'express';
import { emailService } from '../../services/email.service';
import { caldavService } from '../../services/caldav.service';
import { Meeting } from '../../types/meeting';

const router = Router();

// CalDAV availability flag (shared)
let caldavAvailable = false;

// Initialize CalDAV (called from main server)
export async function initializeCalDAV(): Promise<boolean> {
  try {
    await caldavService.initialize();
    caldavAvailable = true;
    console.log('✓ CalDAV service initialized');
    return true;
  } catch (error: any) {
    console.warn('⚠️  CalDAV service not available:', error.message);
    console.warn('   Meeting creation will continue without CalDAV sync');
    return false;
  }
}

// POST /api/meeting/create
router.post('/create', async (req: Request, res: Response) => {
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
      }
    }

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

export default router;
