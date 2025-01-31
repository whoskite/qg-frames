// Frame notification types
export type FrameNotificationDetails = {
  url: string;
  token: string;
};

export type AddFrameRejectedReason =
  | 'invalid_domain_manifest'
  | 'rejected_by_user';

export type AddFrameResult =
  | {
      added: true;
      notificationDetails?: FrameNotificationDetails;
    }
  | {
      added: false;
      reason: AddFrameRejectedReason;
    };

// Frame event types
export interface FrameEvent {
  type: 'frame.addResponse' | 'frame.notificationsEnabled' | 'frame.notificationsDisabled';
  data?: {
    url?: string;
    token?: string;
    success?: boolean;
    reason?: string;
  };
} 