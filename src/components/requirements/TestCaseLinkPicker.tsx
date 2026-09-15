import { EntityLinkPicker } from '@/components/coverage/EntityLinkPicker'
import type { ProjectArea, TestCase, TestCaseDictionaryValue } from '@/types'

type Props = { testCases: TestCase[]; selectedIds: string[]; areas?: ProjectArea[]; types?: TestCaseDictionaryValue[]; onApply: (ids: string[]) => void; onClose: () => void }
export function TestCaseLinkPicker({ testCases, areas = [], types = [], ...props }: Props) {
  return <EntityLinkPicker {...props} testCases={testCases.map(item => ({ ...item, area: areas.find(area => area.id === item.areaId && area.projectId === item.projectId)?.name, type: types.find(type => type.id === item.typeId && type.projectId === item.projectId)?.name }))} />
}
