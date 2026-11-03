import { formatDateZa } from 'src/shared/formatting/formatters'
import type { NotificationChannel, NotificationType } from './types'

const timeFormatter = new Intl.DateTimeFormat('en-ZA', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function notificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case 'InvoiceSent':
      return 'Invoice sent'
    case 'PaymentReceived':
      return 'Payment receipt'
    case 'OverdueReminder1':
      return 'Overdue reminder'
    case 'OverdueReminder2':
      return 'Second overdue reminder'
    case 'OverdueFinal':
      return 'Final overdue notice'
    case 'InvoiceCancelled':
      return 'Cancellation notice'
  }
}

export function notificationTypeIcon(type: NotificationType): string {
  switch (type) {
    case 'InvoiceSent':
      return 'send'
    case 'PaymentReceived':
      return 'payments'
    case 'OverdueReminder1':
      return 'schedule'
    case 'OverdueReminder2':
      return 'notification_important'
    case 'OverdueFinal':
      return 'warning_amber'
    case 'InvoiceCancelled':
      return 'block'
  }
}

export function channelIcon(channel: NotificationChannel): string {
  return channel === 'Sms' ? 'sms' : 'email'
}

export function channelSuffix(channel: NotificationChannel): string {
  return channel === 'Sms' ? ' by SMS' : ' by email'
}

export function formatNotificationTimestamp(iso: string | null | undefined): string {
  if (!iso) {
    return '—'
  }
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }
  return `${formatDateZa(date)} ${timeFormatter.format(date)}`
}
