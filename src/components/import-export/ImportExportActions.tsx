import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Download, Upload } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { autoMapHeaders, downloadExport, importFields, readImportFile, type ImportKind, type ImportRow, type ImportValidation } from '@/lib/importExport'

type Props<T> = {
  kind: ImportKind; validate: (rows: ImportRow[], mapping: Record<string, string>) => ImportValidation<T>
  onImport: (items: T[]) => void | Promise<void>; exportRows: Record<string, string>[]
}

export function ImportExportActions<T>({ kind, validate, onImport, exportRows }: Props<T>) {
  const [open, setOpen] = useState(false), [headers, setHeaders] = useState<string[]>([]), [rows, setRows] = useState<ImportRow[]>([]), [mapping, setMapping] = useState<Record<string, string>>({}), [error, setError] = useState('')
  const [pending, setPending] = useState(false), [fileName, setFileName] = useState('')
  const result = useMemo(() => rows.length ? validate(rows, mapping) : null, [rows, mapping, validate])
  const issuesByRow = useMemo(() => new Map(result?.issues.map(issue => [issue.row, issue]) ?? []), [result])
  async function choose(file?: File) {
    if (!file) return
    setFileName(file.name)
    try { const parsed = await readImportFile(file); setHeaders(parsed.headers); setRows(parsed.rows); setMapping(autoMapHeaders(kind, parsed.headers)); setError('') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not read this file.'); setRows([]); setHeaders([]) }
  }
  function close() { setOpen(false); setRows([]); setHeaders([]); setMapping({}); setError(''); setFileName('') }
  return <div className="import-export-actions"><Button variant="outline" size="sm" className="h-8" aria-label="Import" title="Import" onClick={() => setOpen(true)}><Upload /></Button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-8" aria-label="Export" title="Export"><Download /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => downloadExport(kind, 'csv', exportRows)}>CSV</DropdownMenuItem><DropdownMenuItem onSelect={() => downloadExport(kind, 'xlsx', exportRows)}>XLSX</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    <Dialog open={open} onOpenChange={value => { if (!value) close() }}><DialogContent className="import-dialog"><DialogHeader><DialogTitle>Import {kind === 'testCases' ? 'Test Cases' : kind[0].toUpperCase() + kind.slice(1)}</DialogTitle><DialogDescription>Choose a CSV or XLSX file, review its columns and confirm the valid rows.</DialogDescription></DialogHeader>
      <label className="import-file-picker"><span><strong>Select file</strong><small>CSV or XLSX · data stays in this browser until import</small></span><Input aria-label="Upload import file" type="file" accept=".csv,.xlsx" onChange={event => void choose(event.target.files?.[0])} /></label>
      {fileName && <p className="import-file-name">Selected: {fileName}</p>}
      {error && <p role="alert" className="form-error">{error}</p>}
      {rows.length > 0 && <div className="import-review"><section className="import-mapping" aria-label="Column mapping"><h3>Column mapping</h3>{importFields[kind].map(field => <label key={field.key} className="import-mapping-row"><span>{field.label}{field.required ? ' *' : ''}</span><select className="audit-select" value={mapping[field.key] ?? ''} onChange={event => setMapping(current => ({ ...current, [field.key]: event.target.value }))}><option value="">Do not import</option>{headers.map(header => <option key={header} value={header}>{header}</option>)}</select></label>)}</section>
        <p className="import-summary" aria-label="Import summary"><span>Rows: <strong>{result?.total ?? 0}</strong></span><span className="import-valid">Valid: <strong>{result?.values.length ?? 0}</strong></span><span className={result?.issues.some(issue => issue.errors.length) ? 'import-invalid' : ''}>With issues: <strong>{result?.issues.length ?? 0}</strong></span></p>
        <div className="import-preview"><table className="tc-table" aria-label="Import preview"><thead><tr><th>Row</th>{headers.map(header => <th key={header}>{header}</th>)}<th>Status</th></tr></thead><tbody>{rows.slice(0, 10).map((row, index) => {
          const rowNumber = index + 2, issue = issuesByRow.get(rowNumber), invalid = Boolean(issue?.errors.length)
          return <tr key={index} className={invalid ? 'import-row-invalid' : issue?.warnings.length ? 'import-row-warning' : ''}><td>{rowNumber}</td>{headers.map(header => <td key={header}>{row[header]}</td>)}<td>{invalid ? <span className="import-invalid">Invalid</span> : issue?.warnings.length ? 'Warning' : <span className="import-valid">Valid</span>}</td></tr>
        })}</tbody></table></div>
        {result?.issues.length ? <ul className="import-issues" aria-label="Import issues">{result.issues.slice(0, 10).map(issue => <li key={issue.row} className={issue.errors.length ? 'import-invalid' : ''}><strong>Row {issue.row}</strong> — {[...issue.errors, ...issue.warnings].join('; ')}</li>)}</ul> : null}
      </div>}
      <DialogFooter><Button variant="outline" disabled={pending} onClick={close}>Cancel</Button><Button disabled={!result?.values.length || pending} onClick={async () => { if (!result) return; setPending(true); setError(''); try { await onImport(result.values); close() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Import failed.') } finally { setPending(false) } }}>{pending ? 'Importing…' : result?.issues.some(issue => issue.errors.length) ? `Import ${result.values.length} valid rows` : `Import ${result?.values.length ?? 0} rows`}</Button></DialogFooter>
    </DialogContent></Dialog></div>
}
