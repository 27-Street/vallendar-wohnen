export const CMS_PREVIEW_PROTOCOL_VERSION = 1 as const;

export const CMS_PREVIEW_MESSAGE_TYPES = {
  READY: 'CMS_PREVIEW_READY',
  UPDATE: 'CMS_PREVIEW_UPDATE',
  SET_LOCALE: 'CMS_PREVIEW_SET_LOCALE',
  REQUEST_FOCUS: 'CMS_PREVIEW_REQUEST_FOCUS',
  ACK: 'CMS_PREVIEW_ACK',
} as const;

export type CmsPreviewMessageType = (typeof CMS_PREVIEW_MESSAGE_TYPES)[keyof typeof CMS_PREVIEW_MESSAGE_TYPES];

export interface CmsPreviewBaseMessage {
  version: typeof CMS_PREVIEW_PROTOCOL_VERSION;
  type: CmsPreviewMessageType;
}

export interface CmsPreviewUpdatePayload {
  page: 'home' | 'apartments' | 'faq' | 'exchange-students' | 'guide' | 'content-page';
  collection: 'pages' | 'apartments' | 'guides' | 'content_pages';
  slug: string;
  locale: 'de' | 'en';
  highlight: boolean;
  activePath: string | null;
  data: Record<string, unknown>;
  resolvedAssets: Record<string, string>;
  sentAt: number;
}

export interface CmsPreviewUpdateMessage extends CmsPreviewBaseMessage {
  type: typeof CMS_PREVIEW_MESSAGE_TYPES.UPDATE;
  payload: CmsPreviewUpdatePayload;
}
