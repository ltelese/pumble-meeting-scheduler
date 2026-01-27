import { Meeting } from '../types/meeting';

// This will use the Pumble SDK when properly integrated
// For now, we create the interface that will work with the SDK

export class PumbleService {
  async postMeetingSummary(meeting: Meeting, client: any): Promise<string> {
    const message = this.formatMeetingSummary(meeting);

    try {
      // Post message to channel using Pumble SDK
      const response = await client.chat.postMessage({
        channel: meeting.channelId,
        text: message,
        blocks: this.createMessageBlocks(meeting),
      });

      return response.ts; // Message timestamp/ID
    } catch (error) {
      console.error('Failed to post meeting summary to Pumble:', error);
      throw error;
    }
  }

  async updateMeetingSummary(meeting: Meeting, messageId: string, client: any): Promise<void> {
    const message = this.formatMeetingSummary(meeting);

    try {
      await client.chat.update({
        channel: meeting.channelId,
        ts: messageId,
        text: message,
        blocks: this.createMessageBlocks(meeting),
      });

      console.log('Meeting summary updated in Pumble');
    } catch (error) {
      console.error('Failed to update meeting summary in Pumble:', error);
      throw error;
    }
  }

  private formatMeetingSummary(meeting: Meeting): string {
    const formatDate = (date: Date): string => {
      return date.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const statusEmoji = {
      scheduled: '📅',
      updated: '🔄',
      cancelled: '❌',
    };

    let summary = `${statusEmoji[meeting.status]} **${meeting.title}**\n\n`;
    summary += `**When:** ${formatDate(meeting.startTime)} - ${formatDate(meeting.endTime)}\n`;

    if (meeting.location) {
      summary += `**Location:** ${meeting.location}\n`;
    }

    if (meeting.description) {
      summary += `**Description:** ${meeting.description}\n`;
    }

    summary += `**Organizer:** ${meeting.organizer.name}\n`;
    summary += `**Attendees:** ${meeting.attendees.map(a => a.name || a.email).join(', ')}\n`;

    if (meeting.status === 'cancelled') {
      summary += `\n⚠️ This meeting has been cancelled.`;
    }

    return summary;
  }

  private createMessageBlocks(meeting: Meeting): any[] {
    const formatDate = (date: Date): string => {
      return date.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const statusEmoji = {
      scheduled: '📅',
      updated: '🔄',
      cancelled: '❌',
    };

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji[meeting.status]} ${meeting.title}`,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Start:*\n${formatDate(meeting.startTime)}`,
          },
          {
            type: 'mrkdwn',
            text: `*End:*\n${formatDate(meeting.endTime)}`,
          },
        ],
      },
    ];

    if (meeting.location) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Location:* ${meeting.location}`,
        },
      });
    }

    if (meeting.description) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Description:*\n${meeting.description}`,
        },
      });
    }

    blocks.push({
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Organizer:*\n${meeting.organizer.name}`,
        },
        {
          type: 'mrkdwn',
          text: `*Attendees:*\n${meeting.attendees.map(a => a.name || a.email).join(', ')}`,
        },
      ],
    });

    if (meeting.status === 'cancelled') {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '⚠️ *This meeting has been cancelled.*',
        },
      });
    }

    return blocks;
  }

  createMeetingModal(triggerId: string): any {
    return {
      trigger_id: triggerId,
      view: {
        type: 'modal',
        callback_id: 'meeting_create',
        title: {
          type: 'plain_text',
          text: 'Schedule Meeting',
        },
        submit: {
          type: 'plain_text',
          text: 'Create Meeting',
        },
        close: {
          type: 'plain_text',
          text: 'Cancel',
        },
        blocks: [
          {
            type: 'input',
            block_id: 'title',
            label: {
              type: 'plain_text',
              text: 'Meeting Title',
            },
            element: {
              type: 'plain_text_input',
              action_id: 'title_input',
              placeholder: {
                type: 'plain_text',
                text: 'e.g., Weekly Team Sync',
              },
            },
          },
          {
            type: 'input',
            block_id: 'description',
            optional: true,
            label: {
              type: 'plain_text',
              text: 'Description',
            },
            element: {
              type: 'plain_text_input',
              action_id: 'description_input',
              multiline: true,
              placeholder: {
                type: 'plain_text',
                text: 'Meeting agenda and details...',
              },
            },
          },
          {
            type: 'input',
            block_id: 'start_date',
            label: {
              type: 'plain_text',
              text: 'Start Date',
            },
            element: {
              type: 'datepicker',
              action_id: 'start_date_input',
              placeholder: {
                type: 'plain_text',
                text: 'Select date',
              },
            },
          },
          {
            type: 'input',
            block_id: 'start_time',
            label: {
              type: 'plain_text',
              text: 'Start Time',
            },
            element: {
              type: 'plain_text_input',
              action_id: 'start_time_input',
              placeholder: {
                type: 'plain_text',
                text: 'HH:MM (e.g., 14:30)',
              },
            },
          },
          {
            type: 'input',
            block_id: 'end_date',
            label: {
              type: 'plain_text',
              text: 'End Date',
            },
            element: {
              type: 'datepicker',
              action_id: 'end_date_input',
              placeholder: {
                type: 'plain_text',
                text: 'Select date',
              },
            },
          },
          {
            type: 'input',
            block_id: 'end_time',
            label: {
              type: 'plain_text',
              text: 'End Time',
            },
            element: {
              type: 'plain_text_input',
              action_id: 'end_time_input',
              placeholder: {
                type: 'plain_text',
                text: 'HH:MM (e.g., 15:30)',
              },
            },
          },
          {
            type: 'input',
            block_id: 'location',
            optional: true,
            label: {
              type: 'plain_text',
              text: 'Location / Meeting URL',
            },
            element: {
              type: 'plain_text_input',
              action_id: 'location_input',
              placeholder: {
                type: 'plain_text',
                text: 'e.g., https://meet.google.com/abc-defg-hij',
              },
            },
          },
          {
            type: 'input',
            block_id: 'attendees',
            label: {
              type: 'plain_text',
              text: 'Attendees',
            },
            element: {
              type: 'plain_text_input',
              action_id: 'attendees_input',
              multiline: true,
              placeholder: {
                type: 'plain_text',
                text: 'Enter email addresses separated by commas',
              },
            },
            hint: {
              type: 'plain_text',
              text: 'Email addresses for both internal and external attendees',
            },
          },
        ],
      },
    };
  }
}

export const pumbleService = new PumbleService();
