import type { TrackingStatus, AccountType } from '@/lib/data/seed'

export const STATUS_LABELS: Record<TrackingStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  PENDING: 'Pending',
}

export const STATUS_COLORS: Record<TrackingStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-yellow-100 text-yellow-800',
}

export const ACCOUNT_LABELS: Record<AccountType, string> = {
  GITHUB: 'GitHub',
  JIRA: 'Jira',
  PAGERDUTY: 'PagerDuty',
  CALENDAR: 'Calendar',
}

export const ACCOUNT_ICONS: Record<AccountType, string> = {
  GITHUB: '🐙',
  JIRA: '🎯',
  PAGERDUTY: '📟',
  CALENDAR: '📅',
}
