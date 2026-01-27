import nodemailer, { Transporter } from 'nodemailer';
import { Meeting, Attendee } from '../types/meeting';
import { config } from '../config';
import ical from 'ical-generator';

export class EmailService {
  private transporter: Transporter | null = null;

  initialize(): void {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.auth,
    });

    console.log('Email service initialized');
  }

  async sendMeetingInvite(meeting: Meeting): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    const icsContent = this.generateICS(meeting, 'REQUEST');

    const attendeeEmails = meeting.attendees.map(att => att.email);

    const mailOptions = {
      from: config.email.from,
      to: attendeeEmails,
      subject: `Meeting Invitation: ${meeting.title}`,
      html: this.generateEmailHTML(meeting, 'invite'),
      icalEvent: {
        method: 'REQUEST',
        content: icsContent,
      },
      alternatives: [
        {
          contentType: 'text/calendar; method=REQUEST',
          content: Buffer.from(icsContent),
        },
      ],
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Meeting invite sent to ${attendeeEmails.length} attendees`);
    } catch (error) {
      console.error('Failed to send meeting invite:', error);
      throw error;
    }
  }

  async sendMeetingUpdate(meeting: Meeting): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    const icsContent = this.generateICS(meeting, 'REQUEST');
    const attendeeEmails = meeting.attendees.map(att => att.email);

    const mailOptions = {
      from: config.email.from,
      to: attendeeEmails,
      subject: `Meeting Updated: ${meeting.title}`,
      html: this.generateEmailHTML(meeting, 'update'),
      icalEvent: {
        method: 'REQUEST',
        content: icsContent,
      },
      alternatives: [
        {
          contentType: 'text/calendar; method=REQUEST',
          content: Buffer.from(icsContent),
        },
      ],
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Meeting update sent to ${attendeeEmails.length} attendees`);
    } catch (error) {
      console.error('Failed to send meeting update:', error);
      throw error;
    }
  }

  async sendMeetingCancellation(meeting: Meeting): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    const icsContent = this.generateICS(meeting, 'CANCEL');
    const attendeeEmails = meeting.attendees.map(att => att.email);

    const mailOptions = {
      from: config.email.from,
      to: attendeeEmails,
      subject: `Meeting Cancelled: ${meeting.title}`,
      html: this.generateEmailHTML(meeting, 'cancel'),
      icalEvent: {
        method: 'CANCEL',
        content: icsContent,
      },
      alternatives: [
        {
          contentType: 'text/calendar; method=CANCEL',
          content: Buffer.from(icsContent),
        },
      ],
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Meeting cancellation sent to ${attendeeEmails.length} attendees`);
    } catch (error) {
      console.error('Failed to send meeting cancellation:', error);
      throw error;
    }
  }

  private generateICS(meeting: Meeting, method: 'REQUEST' | 'CANCEL'): string {
    const calendar = ical({
      prodId: { company: 'Pumble', product: 'Meeting Scheduler' },
      name: meeting.title,
      timezone: config.app.timezone,
      method: method as any,
    } as any);

    const event = calendar.createEvent({
      start: meeting.startTime,
      end: meeting.endTime,
      summary: meeting.title,
      description: meeting.description || '',
      location: meeting.location || '',
      id: meeting.icsUid,
      sequence: meeting.sequence,
      status: (meeting.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED') as any,
      organizer: {
        name: meeting.organizer.name,
        email: meeting.organizer.email,
      },
    });

    // Add attendees
    meeting.attendees.forEach(att => {
      event.createAttendee({
        name: att.name || att.email,
        email: att.email,
        rsvp: true,
        status: att.status ? this.mapAttendeeStatus(att.status) : 'NEEDS-ACTION',
      });
    });

    return calendar.toString();
  }

  private mapAttendeeStatus(status: string): any {
    const statusMap: Record<string, string> = {
      'accepted': 'ACCEPTED',
      'declined': 'DECLINED',
      'tentative': 'TENTATIVE',
      'needs-action': 'NEEDS-ACTION',
    };
    return statusMap[status] || 'NEEDS-ACTION';
  }

  private generateEmailHTML(meeting: Meeting, type: 'invite' | 'update' | 'cancel'): string {
    const formatDate = (date: Date): string => {
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    };

    const typeMessages = {
      invite: 'You have been invited to a meeting',
      update: 'A meeting has been updated',
      cancel: 'A meeting has been cancelled',
    };

    const typeColors = {
      invite: '#4CAF50',
      update: '#FF9800',
      cancel: '#F44336',
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${typeColors[type]}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
    .detail-row { margin: 10px 0; }
    .label { font-weight: bold; display: inline-block; width: 120px; }
    .footer { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-size: 0.9em; }
    .attendee-list { margin-left: 120px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${typeMessages[type]}</h2>
    </div>
    <div class="content">
      <div class="detail-row">
        <span class="label">Title:</span>
        <span>${meeting.title}</span>
      </div>
      <div class="detail-row">
        <span class="label">Start:</span>
        <span>${formatDate(meeting.startTime)}</span>
      </div>
      <div class="detail-row">
        <span class="label">End:</span>
        <span>${formatDate(meeting.endTime)}</span>
      </div>
      ${meeting.location ? `
      <div class="detail-row">
        <span class="label">Location:</span>
        <span>${meeting.location}</span>
      </div>
      ` : ''}
      ${meeting.description ? `
      <div class="detail-row">
        <span class="label">Description:</span>
        <span>${meeting.description}</span>
      </div>
      ` : ''}
      <div class="detail-row">
        <span class="label">Organizer:</span>
        <span>${meeting.organizer.name} (${meeting.organizer.email})</span>
      </div>
      <div class="detail-row">
        <span class="label">Attendees:</span>
        <div class="attendee-list">
          ${meeting.attendees.map(att => `<div>${att.name || att.email}</div>`).join('')}
        </div>
      </div>
    </div>
    <div class="footer">
      <p>This invitation was sent from ${config.app.name}.</p>
      <p>Please accept or decline this meeting invitation by responding to the calendar invite.</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}

export const emailService = new EmailService();
