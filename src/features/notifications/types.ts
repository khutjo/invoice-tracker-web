import { channelSuffix, notificationTypeLabel } from './labels'

export type NotificationType =
  | 'InvoiceSent'
  | 'PaymentReceived'
  | 'OverdueReminder1'
  | 'OverdueReminder2'
  | 'OverdueFinal'
  | 'InvoiceCancelled'

export type NotificationChannel = 'Email' | 'Sms'

export type NotificationStatus = 'Pending' | 'Sent' | 'Failed'

export interface NotificationSentMessage {
  notificationId: string
  invoiceId: string
  invoiceNumber: string | null // null only if the invoice had no number yet
  customerName: string
  notificationType: NotificationType
  channel: NotificationChannel
  recipient: string // the email address or phone number it went to
  sentAt: string // ISO 8601 UTC
}

export interface NotificationLogItem {
  notificationId: string
  invoiceId: string
  invoiceNumber: string
  customerName: string
  notificationType: NotificationType
  channel: NotificationChannel
  recipient: string
  status: NotificationStatus
  attempts: number // delivery attempts so far (max 5)
  body: string // the rendered plain-text message, may contain line breaks
  createdAt: string
  sentAt: string | null // null unless status is Sent
}

export function describeNotification(message: NotificationSentMessage): string {
  const invoiceRef = message.invoiceNumber ?? 'an invoice'
  const suffix = channelSuffix(message.channel)

  if (message.notificationType === 'InvoiceSent') {
    return `Invoice ${invoiceRef} sent to ${message.customerName}${suffix}`
  }

  const label = notificationTypeLabel(message.notificationType)
  return `${label} sent to ${message.customerName} for ${invoiceRef}${suffix}`
}
