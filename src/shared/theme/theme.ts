export const colors = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',
  primary: '#1F6FEB',
  onPrimary: '#FFFFFF',
  danger: '#B91C1C',
  dangerSurface: '#FEF2F2',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { sm: 6, md: 12, pill: 999 } as const;

/** Keeps content readable on tablets and in landscape. */
export const MAX_CONTENT_WIDTH = 720;
