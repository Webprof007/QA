import type { PreparationItem, TestCase } from '@/types'

// No prerequisites were supplied. Users can add their own checklist items.
export const initialPreparation: PreparationItem[] = []

const testRows: [string, string, string, number][] = [
  ['SMK-PUB-001', 'Landing, locale та Pricing CTA', 'Core', 2],
  ['SMK-REG-001', 'Email registration та onboarding', 'Full', 5],
  ['SMK-AUTH-001', 'Login і відновлення session', 'Core', 2],
  ['SMK-DASH-001', 'Завантаження Dashboard', 'Core', 1],
  ['SMK-MEET-001', 'Future meeting і scheduled modal', 'Core', 4],
  ['SMK-MEET-002', 'Instant meeting і room access', 'Core', 3],
  ['SMK-LIVE-001', 'Два учасники, media та basic realtime', 'Core', 5],
  ['SMK-LIVE-002', 'Translation і subtitles', 'Core', 3],
  ['SMK-HIST-001', 'Завершення та completed history', 'Core', 3],
  ['SMK-NTF-001', 'Realtime notification', 'Core', 2],
  ['SMK-CNT-001', 'Contact і group mutation', 'Full', 5],
  ['SMK-SET-001', 'Збереження profile settings', 'Full', 3],
  ['SMK-BIL-001', 'Plan і Paddle checkout start', 'Full', 3],
  ['SMK-ADM-001', 'Admin allow/deny', 'Full', 3],
  ['SMK-AUTH-002', 'Logout і protected route', 'Core', 1],
  ['SMK-RWD-001', 'Mobile critical-flow sanity', 'Full', 4],
]

export const initialTests: TestCase[] = testRows.map(
  ([id, title, profile, estimatedMinutes]) => ({
    id,
    title,
    profile,
    estimatedMinutes,
    steps: [],
    expectedResults: [],
    results: [],
  }),
)
