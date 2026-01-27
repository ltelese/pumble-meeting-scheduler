export interface Attendee {
  email: string;
  name?: string;
  isExternal: boolean;
  pumbleUserId?: string;
  status?: 'accepted' | 'declined' | 'tentative' | 'needs-action';
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: Attendee[];
  organizer: {
    email: string;
    name: string;
    pumbleUserId: string;
  };
  channelId: string;
  messageId?: string;
  caldavEventUrl?: string;
  icsUid?: string;
  sequence: number; // For ICS updates
  status: 'scheduled' | 'updated' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingFormData {
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endDate: string; // YYYY-MM-DD
  endTime: string; // HH:MM
  location?: string;
  attendees: string; // Comma-separated emails
  meetingUrl?: string;
}

export interface CalDAVConfig {
  serverUrl: string;
  username: string;
  password: string;
  calendarUrl: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}
