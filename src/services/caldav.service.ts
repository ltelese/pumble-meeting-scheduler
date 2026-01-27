import { createDAVClient, DAVClient, DAVCalendar, DAVCalendarObject } from 'tsdav';
import { Meeting } from '../types/meeting';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

export class CalDAVService {
  private client: any = null;
  private calendar: DAVCalendar | null = null;

  async initialize(): Promise<void> {
    try {
      this.client = await createDAVClient({
        serverUrl: config.caldav.serverUrl,
        credentials: {
          username: config.caldav.username,
          password: config.caldav.password,
        },
        authMethod: 'Basic',
        defaultAccountType: 'caldav',
      });

      if (!this.client) {
        throw new Error('Failed to create DAV client');
      }

      const calendars = await this.client.fetchCalendars();

      if (calendars.length === 0) {
        throw new Error('No calendars found on CalDAV server');
      }

      // Use the first calendar or find by URL
      this.calendar = calendars.find((cal: DAVCalendar) => cal.url === config.caldav.calendarUrl) || calendars[0];

      console.log('CalDAV client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize CalDAV client:', error);
      throw error;
    }
  }

  async createEvent(meeting: Meeting): Promise<string> {
    if (!this.client || !this.calendar) {
      throw new Error('CalDAV client not initialized');
    }

    const icsContent = this.generateICSContent(meeting, 'REQUEST');

    try {
      const calendarObject = await this.client.createCalendarObject({
        calendar: this.calendar,
        filename: `${meeting.icsUid}.ics`,
        iCalString: icsContent,
      });

      return calendarObject.url || '';
    } catch (error) {
      console.error('Failed to create CalDAV event:', error);
      throw error;
    }
  }

  async updateEvent(meeting: Meeting): Promise<void> {
    if (!this.client || !this.calendar || !meeting.caldavEventUrl) {
      throw new Error('CalDAV client not initialized or event URL missing');
    }

    const icsContent = this.generateICSContent(meeting, 'REQUEST');

    try {
      await this.client.updateCalendarObject({
        calendarObject: {
          url: meeting.caldavEventUrl,
          data: icsContent,
          etag: '',
        },
      });

      console.log('Event updated successfully');
    } catch (error) {
      console.error('Failed to update CalDAV event:', error);
      throw error;
    }
  }

  async cancelEvent(meeting: Meeting): Promise<void> {
    if (!this.client || !meeting.caldavEventUrl) {
      throw new Error('CalDAV client not initialized or event URL missing');
    }

    try {
      await this.client.deleteCalendarObject({
        calendarObject: {
          url: meeting.caldavEventUrl,
          etag: '',
        },
      });

      console.log('Event cancelled successfully');
    } catch (error) {
      console.error('Failed to cancel CalDAV event:', error);
      throw error;
    }
  }

  private generateICSContent(meeting: Meeting, method: 'REQUEST' | 'CANCEL'): string {
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const attendeeList = meeting.attendees.map(att => {
      const status = att.status ? att.status.toUpperCase() : 'NEEDS-ACTION';
      const name = att.name ? `;CN="${att.name}"` : '';
      return `ATTENDEE${name};RSVP=TRUE;PARTSTAT=${status}:mailto:${att.email}`;
    }).join('\r\n');

    const status = meeting.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED';

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Pumble Meeting Scheduler//EN
CALSCALE:GREGORIAN
METHOD:${method}
BEGIN:VEVENT
UID:${meeting.icsUid}
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(meeting.startTime)}
DTEND:${formatDate(meeting.endTime)}
SUMMARY:${meeting.title}
DESCRIPTION:${meeting.description || ''}
LOCATION:${meeting.location || ''}
ORGANIZER;CN="${meeting.organizer.name}":mailto:${meeting.organizer.email}
${attendeeList}
STATUS:${status}
SEQUENCE:${meeting.sequence}
END:VEVENT
END:VCALENDAR`;
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.calendar = null;
  }
}

export const caldavService = new CalDAVService();
