export interface LightboxMediaItem {
  messageId: string;
  attachmentId: string;
  filename: string;
  mimeType: string;
  url: string;
  sizeBytes?: number;
  createdAt?: string;
  senderName?: string;
}

export interface LightboxGalleryConfig {
  items: LightboxMediaItem[];
  initialActiveId?: { messageId: string; attachmentId: string };
  initialIndex?: number;
  openerElement?: HTMLElement | null;
  refreshAttachmentUrl?: (
    messageId: string,
    attachmentId: string,
  ) => Promise<string | null>;
  onDownload?: (item: LightboxMediaItem) => Promise<void> | void;
}
