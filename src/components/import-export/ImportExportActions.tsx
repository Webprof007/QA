import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { autoMapHeaders, downloadExport, importFields, readImportFile, type ImportKind, type ImportRow, type ImportValidation } from '@/lib/importExport'

type Props<T> = {
  kind: ImportKind; validate: (rows: ImportRow[], mapping: Record<string, string>) => ImportValidation<T>
  onImport: (items: T[]) => void | Promise<void>; exportRows: Record<string, string>[]
}

export function ImportExportActions<T>({ kind, validate, onImport, exportRows }: Props<T>) {
  const [open, setOpen] = useState(false), [headers, setHeaders] = useState<string[]>([]), [rows, setRows] = useState<ImportRow[]>([]), [mapping, setMapping] = useState<Record<string, string>>({}), [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const result = useMemo(() => rows.length ? validate(rows, mapping) : null, [rows, mapping, validate])
  async function choose(file?: File) {
    if (!file) return
    try { const parsed = await readImportFile(file); setHeaders(parsed.headers); setRows(parsed.rows); setMapping(autoMapHeaders(kind, parsed.headers)); setError('') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not read this file.'); setRows([]); setHeaders([]) }
  }
  function close() { setOpen(false); setRows([]); setHeaders([]); setMapping({}); setError('') }
  return <><Button variant="outline" size="sm" onClick={() => setOpen(true)}>Import</Button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm">Export</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => downloadExport(kind, 'csv', exportRows)}>CSV</DropdownMenuItem><DropdownMenuItem onSelect={() => downloadExport(kind, 'xlsx', exportRows)}>XLSX</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    <Dialog open={open} onOpenChange={value => { if (!value) close() }}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Import {kind === 'testCases' ? 'Test Cases' : kind[0].toUpperCase() + kind.slice(1)}</DialogTitle><DialogDescription>Choose a CSV or XLSX file, review its columns and confirm the valid rows.</DialogDescription></DialogHeader>
      <Input aria-label="Upload import file" type="file" accept=".csv,.xlsx" onChange={event => void choose(event.target.files?.[0])} />
      {error && <p role="alert" className="form-error">{error}</p>}
      {rows.length > 0 && <div className="space-y-4"><div className="grid gap-2 sm:grid-cols-2">{importFields[kind].map(field => <label key={field.key} className="field"><span>{field.label}{field.required ? ' *' : ''}</span><select value={mapping[field.key] ?? ''} onChange={event => setMapping(current => ({ ...current, [field.key]: event.target.value }))}><option value="">Do not import</option>{headers.map(header => <option key={header} value={header}>{header}</option>)}</select></label>)}</div>
        <p className="muted">Rows: {result?.total ?? 0} · Valid: {result?.values.length ?? 0} · Rows with issues: {result?.issues.length ?? 0}</p>
        <div className="overflow-auto"><table className="tc-table"><thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.slice(0, 5).map((row, index) => <tr key={index}>{headers.map(header => <td key={header}>{row[header]}</td>)}</tr>)}</tbody></table></div>
        {result?.issues.length ? <ul className="form-error">{result.issues.slice(0, 10).map(issue => <li key={issue.row}>Row {issue.row} — {[...issue.errors, ...issue.warnings].join('; ')}</li>)}</ul> : null}
      </div>}
      <DialogFooter><Button variant="outline" disabled={pending} onClick={close}>Cancel</Button><Button disabled={!result?.values.length || pending} onClick={async () => { if (!result) return; setPending(true); setError(''); try { await onImport(result.values); close() } catch (reason) { setError(reason instanceof Error ? reason.message : 'Import failed.') } finally { setPending(false) } }}>{pending ? 'Importing…' : result?.issues.some(issue => issue.errors.length) ? `Import ${result.values.length} valid rows` : `Import ${result?.values.length ?? 0} rows`}</Button></DialogFooter>
    </DialogContent></Dialog></>
}
