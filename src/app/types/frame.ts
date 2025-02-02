import type { FrameNotificationDetails } from "@farcaster/frame-sdk";

export type AddFrameRejectedReason =
  | 'invalid_domain_manifest'
  | 'rejected_by_user';

export type AddFrameResult = {
  added: boolean;
  reason?: string;
  notificationDetails?: FrameNotificationDetails;
};

// Frame event types
export type FrameEventType = 'frame.addResponse' | 'frame.notificationsEnabled' | 'frame.notificationsDisabled';

export type FrameEventData = {
  url?: string;
  token?: string;
  success?: boolean;
  reason?: string;
};

export type FrameEvent = {
  type: FrameEventType;
  data?: FrameEventData;
}; 