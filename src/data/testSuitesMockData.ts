import type { TestCase } from '@/types'
import { saveTestSuite } from '@/lib/testSuites'
export function createTestSuitesMockData(cases: TestCase[]) {
  const ids = (values: string[]) => values.filter(id => cases.some(item => item.id === id && item.projectId === 'voicli'))
  const regression = saveTestSuite({ suites: [], links: [] }, 'voicli', { id: 'demo-suite-regression', name: 'Regression', description: 'Основний демонстраційний набір регресійних перевірок.', testCaseIds: ids(['demo-test-case-1', 'demo-test-case-4', 'demo-test-case-2']), }, cases)
  return saveTestSuite(regression, 'voicli', { id: 'demo-suite-authentication', name: 'Authentication', description: '', testCaseIds: ids(['demo-test-case-1', 'demo-test-case-2']) }, cases)
}
