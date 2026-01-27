import { Meeting, MeetingFormData, Attendee } from '../types/meeting';
import { v4 as uuidv4 } from 'uuid';
import { caldavService } from './caldav.service';
import { emailService } from './email.service';

// Simple in-memory storage (in production, use a database)
class MeetingStore {
  private meetings: Map<string, Meeting> = new Map();

  save(meeting: Meeting): void {
    this.meetings.set(meeting.id, meeting);
  }

  get(id: string): Meeting | undefined {
    return this.meetings.get(id);
  }

  getByIcsUid(icsUid: string): Meeting | undefined {
    return Array.from(this.meetings.values()).find(m => m.icsUid === icsUid);
  }

  delete(id: string): void {
    this.meetings.delete(id);
  }

  getAll(): Meeting[] {
    return Array.from(this.meetings.values());
  }
}

export class MeetingService {
  private store = new MeetingStore();

  async initialize(): Promise<void> {
    // Try to initialize CalDAV, but don't fail if it's not configured
    try {
      await caldavService.initialize();
      console.log('✓ CalDAV service initialized');
    } catch (error: any) {
      console.warn('⚠️  CalDAV not configured - calendar sync will be skipped');
      console.warn(`   Reason: ${error.message}`);
    }

    emailService.initialize();
    console.log('✓ Email service initialized');
  }

  async createMeeting(
    formData: MeetingFormData,
    organizer: { email: string; name: string; pumbleUserId: string },
    channelId: string
  ): Promise<Meeting> {
    // Parse attendees
    const attendees = this.parseAttendees(formData.attendees);

    // Create meeting object
    const meeting: Meeting = {
      id: uuidv4(),
      title: formData.title,
      description: formData.description,
      startTime: new Date(`${formData.startDate}T${formData.startTime}`),
      endTime: new Date(`${formData.endDate}T${formData.endTime}`),
      location: formData.location,
      attendees,
      organizer,
      channelId,
      icsUid: uuidv4(),
      sequence: 0,
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add meeting URL if provided
    if (formData.meetingUrl) {
      meeting.location = formData.meetingUrl;
    }

    try {
      // Create event in CalDAV (optional - skip if not configured)
      try {
        const caldavEventUrl = await caldavService.createEvent(meeting);
        meeting.caldavEventUrl = caldavEventUrl;
        console.log('✓ CalDAV event created');
      } catch (caldavError: any) {
        console.warn('⚠️  Skipped CalDAV event creation:', caldavError.message);
      }

      // Send email invites
      await emailService.sendMeetingInvite(meeting);
      console.log('✓ Email invites sent');

      // Save meeting
      this.store.save(meeting);

      console.log(`✅ Meeting created successfully: ${meeting.id}`);
      return meeting;
    } catch (error) {
      console.error('Failed to create meeting:', error);
      throw error;
    }
  }

  async updateMeeting(meetingId: string, formData: Partial<MeetingFormData>): Promise<Meeting> {
    const meeting = this.store.get(meetingId);

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    // Update meeting fields
    if (formData.title) meeting.title = formData.title;
    if (formData.description !== undefined) meeting.description = formData.description;
    if (formData.location !== undefined) meeting.location = formData.location;

    if (formData.startDate && formData.startTime) {
      meeting.startTime = new Date(`${formData.startDate}T${formData.startTime}`);
    }

    if (formData.endDate && formData.endTime) {
      meeting.endTime = new Date(`${formData.endDate}T${formData.endTime}`);
    }

    if (formData.attendees) {
      meeting.attendees = this.parseAttendees(formData.attendees);
    }

    meeting.sequence += 1;
    meeting.status = 'updated';
    meeting.updatedAt = new Date();

    try {
      // Update CalDAV event
      await caldavService.updateEvent(meeting);

      // Send update emails
      await emailService.sendMeetingUpdate(meeting);

      // Save updated meeting
      this.store.save(meeting);

      console.log(`Meeting updated successfully: ${meeting.id}`);
      return meeting;
    } catch (error) {
      console.error('Failed to update meeting:', error);
      throw error;
    }
  }

  async cancelMeeting(meetingId: string): Promise<Meeting> {
    const meeting = this.store.get(meetingId);

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    meeting.status = 'cancelled';
    meeting.sequence += 1;
    meeting.updatedAt = new Date();

    try {
      // Cancel CalDAV event
      await caldavService.cancelEvent(meeting);

      // Send cancellation emails
      await emailService.sendMeetingCancellation(meeting);

      // Save cancelled meeting
      this.store.save(meeting);

      console.log(`Meeting cancelled successfully: ${meeting.id}`);
      return meeting;
    } catch (error) {
      console.error('Failed to cancel meeting:', error);
      throw error;
    }
  }

  getMeeting(meetingId: string): Meeting | undefined {
    return this.store.get(meetingId);
  }

  getAllMeetings(): Meeting[] {
    return this.store.getAll();
  }

  private parseAttendees(attendeesString: string): Attendee[] {
    return attendeesString
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0)
      .map(email => ({
        email,
        isExternal: !email.endsWith('@yourcompany.com'), // Adjust domain check
        status: 'needs-action' as const,
      }));
  }
}

export const meetingService = new MeetingService();
