export type PreparationItem = {
  id: string
  text: string
  checked: boolean
  sortOrder: number
}

export type TestResult = {
  id: string
  date: string
  completed: boolean
  status: 'pass' | 'fail' | 'blocked' | null
  comment: string
  taskUrl: string
}

export type TestCase = {
  id: string
  title: string
  profile: string
  estimatedMinutes: number
  steps: string[]
  expectedResults: string[]
  results: TestResult[]
}

export type ResultDraft = Omit<TestResult, 'id'> & { id?: string }
