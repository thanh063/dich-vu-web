import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { MathfieldElement } from 'mathlive'
import 'mathlive/dist/mathlive-fonts.css'

import useToast from '../hooks/useToast'
import Spinner from '../components/ui/Spinner'
import { getFormulas, FormulaItem } from '../services/documentService'
import {
  FormulaVersion,
  ReprocessFormulaResponse,
  getFormulaVersions,
  reprocessFormula,
  updateFormula,
} from '../services/formulaService'

function ConfidenceBadge({ score }: { score: number }) {
  const color =
    score >= 0.8
      ? 'bg-green-100 text-green-700'
      : score >= 0.6
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-red-100 text-red-700'
  const label = score >= 0.8 ? 'Tot' : score >= 0.6 ? 'Trung binh' : 'Can kiem tra'

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label} {Math.round(score * 100)}%
    </span>
  )
}

type MathLiveEditorProps = {
  formula: FormulaItem
  onSave: (formulaId: number, latex: string) => Promise<void>
  onReprocess: (formulaId: number) => Promise<ReprocessFormulaResponse | null>
  onNext?: () => void
}

function MathLiveEditor({ formula, onSave, onReprocess, onNext }: MathLiveEditorProps) {
  const { pushToast } = useToast()
  const mathFieldRef = useRef<MathfieldElement | null>(null)
  const isUpdatingFromTextarea = useRef(false)
  const undoStackRef = useRef<string[]>([])
  const redoStackRef = useRef<string[]>([])

  const [latexContent, setLatexContent] = useState(formula?.latex || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isReprocessing, setIsReprocessing] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    setLatexContent(formula?.latex || '')
    undoStackRef.current = []
    redoStackRef.current = []
  }, [formula.id])

  const syncMathField = useCallback((value: string) => {
    const mathField = mathFieldRef.current
    if (mathField && typeof mathField.value !== 'undefined' && mathField.value !== value) {
      isUpdatingFromTextarea.current = true
      mathField.value = value
      isUpdatingFromTextarea.current = false
    }
  }, [])

  const applyContent = useCallback(
    (nextValue: string, options?: { addToUndo?: boolean; clearRedo?: boolean }) => {
      setLatexContent((current) => {
        if (current === nextValue) {
          return current
        }

        if (options?.addToUndo !== false) {
          undoStackRef.current = [...undoStackRef.current, current]
        }
        if (options?.clearRedo !== false) {
          redoStackRef.current = []
        }
        return nextValue
      })
      syncMathField(nextValue)
    },
    [syncMathField],
  )

  const handleUndo = useCallback(() => {
    const previous = undoStackRef.current.pop()
    if (typeof previous === 'undefined') return

    redoStackRef.current = [...redoStackRef.current, latexContent]
    setLatexContent(previous)
    syncMathField(previous)
  }, [latexContent, syncMathField])

  const handleRedo = useCallback(() => {
    const next = redoStackRef.current.pop()
    if (typeof next === 'undefined') return

    undoStackRef.current = [...undoStackRef.current, latexContent]
    setLatexContent(next)
    syncMathField(next)
  }, [latexContent, syncMathField])

  useEffect(() => {
    let cancelled = false
    let cleanup: (() => void) | undefined

    void import('mathlive')
      .then(async () => {
        await customElements.whenDefined('math-field')
        if (cancelled) return

        const mathField = mathFieldRef.current
        if (!mathField) return

        mathField.value = formula?.latex || ''
        ;(mathField as unknown as { mathVirtualKeyboardPolicy?: string }).mathVirtualKeyboardPolicy = 'off'

        const handler = () => {
          if (!isUpdatingFromTextarea.current) {
            setLatexContent(mathField.value)
          }
        }
        mathField.addEventListener('input', handler)
        cleanup = () => {
          mathField.removeEventListener('input', handler)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err)
          pushToast('MathLive preview failed to load', 'error')
        }
      })

    return () => {
      cancelled = true
      if (cleanup) cleanup()
    }
  }, [formula, pushToast])

  useEffect(() => {
    syncMathField(latexContent)
  }, [latexContent, syncMathField])

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    applyContent(e.target.value)
  }

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveMsg('')
    try {
      await onSave(formula.id, latexContent)
      setSaveMsg('Da luu thanh cong!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setSaveMsg(`Luu that bai: ${msg}`)
    } finally {
      setIsSaving(false)
      window.setTimeout(() => setSaveMsg(''), 3000)
    }
  }, [formula.id, latexContent, onSave])

  const handleReprocess = useCallback(async () => {
    setIsReprocessing(true)
    setSaveMsg('')
    try {
      const res = await onReprocess(formula.id)
      if (res?.latex) {
        applyContent(res.latex)
      }
      setSaveMsg('OCR thanh cong!')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'OCR failed'
      setSaveMsg(`OCR that bai: ${msg}`)
    } finally {
      setIsReprocessing(false)
      window.setTimeout(() => setSaveMsg(''), 3000)
    }
  }, [applyContent, formula.id, onReprocess])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isModKey = e.ctrlKey || e.metaKey
      if (isModKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        void handleSave()
      }
      if (isModKey && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
      if ((isModKey && e.key.toLowerCase() === 'y') || (isModKey && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault()
        handleRedo()
      }
      if (isModKey && e.key === 'Enter') {
        e.preventDefault()
        void handleSave().then(() => onNext?.())
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleRedo, handleSave, handleUndo, onNext])

  const canUndo = undoStackRef.current.length > 0
  const canRedo = redoStackRef.current.length > 0

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800">Chinh sua cong thuc #{formula?.id}</h2>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-600">Ma LaTeX tho</label>
          <textarea
            className="h-44 w-full resize-none rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={latexContent}
            onChange={handleTextareaChange}
            placeholder="Nhap ma LaTeX, vi du: E = mc^2"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-600">MathLive Preview</label>
          <div className="flex min-h-[11rem] items-center justify-center rounded-lg border border-slate-300 bg-white p-4">
            <math-field
              ref={mathFieldRef}
              virtual-keyboard-mode="manual"
              style={{ width: '100%', fontSize: '1.4rem' }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-600">Anh goc tu PDF</label>
          <div className="flex min-h-[11rem] items-center justify-center rounded-lg border border-slate-300 bg-slate-50 p-2">
            {formula?.image_path ? (
              <img
                src={`/api/images/${formula.id}`}
                alt="Cong thuc goc"
                className="max-h-40 max-w-full object-contain"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            ) : (
              <p className="text-sm text-slate-400">Khong co anh</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => handleUndo()}
          disabled={!canUndo}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Undo
        </button>
        <button
          onClick={() => handleRedo()}
          disabled={!canRedo}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Redo
        </button>
        <button
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSaving ? 'Dang luu...' : 'Luu cong thuc'}
        </button>
        <button
          onClick={() => void handleReprocess()}
          disabled={isReprocessing}
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {isReprocessing ? 'Dang OCR...' : 'Chay lai OCR'}
        </button>
        {saveMsg && <span className="text-sm font-medium">{saveMsg}</span>}
      </div>

      <p className="mt-1 text-xs text-slate-400">Ctrl+S de luu • Ctrl+Enter de luu va sang tiep</p>
    </div>
  )
}

export default function Editor() {
  const { documentId } = useParams()
  const docId = Number(documentId)
  const { pushToast } = useToast()

  const [formulas, setFormulas] = useState<FormulaItem[]>([])
  const [selectedFormulaId, setSelectedFormulaId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [pageFilter, setPageFilter] = useState('all')
  const [confidenceFilter, setConfidenceFilter] = useState('all')
  const [originalLatexMap, setOriginalLatexMap] = useState<Record<number, string>>({})
  const [showComparison, setShowComparison] = useState(false)
  const [versions, setVersions] = useState<FormulaVersion[]>([])
  const [loading, setLoading] = useState(false)

  const selectedFormula = useMemo(
    () => formulas.find((f) => f.id === selectedFormulaId) ?? null,
    [formulas, selectedFormulaId],
  )

  const pageOptions = useMemo(() => {
    const pages = Array.from(
      new Set(formulas.map((formula) => formula.page).filter((page): page is number => page !== null)),
    )
    return pages.sort((left, right) => left - right)
  }, [formulas])

  const filteredFormulas = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return formulas.filter((formula) => {
      const pageMatches = pageFilter === 'all' || String(formula.page ?? '') === pageFilter

      let confidenceMatches = true
      const score = formula.confidence_score ?? 0
      if (confidenceFilter === 'high') confidenceMatches = score >= 0.8
      if (confidenceFilter === 'medium') confidenceMatches = score >= 0.6 && score < 0.8
      if (confidenceFilter === 'low') confidenceMatches = score < 0.6

      const searchableText = `${formula.id} ${formula.page ?? ''} ${formula.latex ?? ''}`.toLowerCase()
      const queryMatches = !normalizedQuery || searchableText.includes(normalizedQuery)

      return pageMatches && confidenceMatches && queryMatches
    })
  }, [confidenceFilter, formulas, pageFilter, searchQuery])

  const visibleSelectedFormula = useMemo(
    () => filteredFormulas.find((formula) => formula.id === selectedFormulaId) ?? null,
    [filteredFormulas, selectedFormulaId],
  )

  useEffect(() => {
    if (filteredFormulas.length === 0) {
      if (selectedFormulaId !== null) {
        setSelectedFormulaId(null)
      }
      return
    }

    if (!visibleSelectedFormula) {
      setSelectedFormulaId(filteredFormulas[0].id)
    }
  }, [filteredFormulas, selectedFormulaId, visibleSelectedFormula])

  useEffect(() => {
    async function load() {
      if (!docId) return
      setLoading(true)
      try {
        const list = await getFormulas(docId)
        setFormulas(list)
        setOriginalLatexMap((prev) => {
          const copy = { ...prev }
          for (const f of list) {
            if (!copy[f.id]) copy[f.id] = f.latex ?? ''
          }
          return copy
        })
        if (list.length > 0) {
          setSelectedFormulaId(list[0].id)
        }
      } catch (err) {
        console.error(err)
        pushToast('Cannot load formulas', 'error')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [docId, pushToast])

  useEffect(() => {
    async function loadVersions() {
      if (!selectedFormulaId) {
        setVersions([])
        return
      }
      try {
        const list = await getFormulaVersions(selectedFormulaId)
        setVersions(list)
      } catch (err) {
        console.error(err)
      }
    }
    void loadVersions()
  }, [selectedFormulaId])

  const handleSave = useCallback(
    async (id: number, latex: string) => {
      await updateFormula(id, latex, 'edited in web editor')
      setFormulas((prev) => prev.map((f) => (f.id === id ? { ...f, latex } : f)))
      const list = await getFormulaVersions(id)
      setVersions(list)
      pushToast('Saved with version snapshot', 'success')
    },
    [pushToast],
  )

  const handleReprocess = useCallback(
    async (id: number) => {
      const updated = await reprocessFormula(id)
      if (updated) {
        setFormulas((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  latex: updated.latex,
                  confidence_score: updated.confidence_score,
                  image_path: updated.image_path,
                }
              : f,
          ),
        )
        pushToast('OCR successful', 'success')
      }
      return updated
    },
    [pushToast],
  )

  const handleExportAll = useCallback(() => {
    const header = `% Xuat tu Ebook2LaTeX\n% Tai lieu: ${docId}\n\n`
    const body = formulas
      .map(
        (f, i) =>
          `% Cong thuc #${f.id} - Trang ${f.page || i + 1}\n` +
          `\\begin{equation}\n  ${f.latex || ''}\n\\end{equation}\n`,
      )
      .join('\n')

    const blob = new Blob([header + body], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `document_${docId}_formulas.tex`
    a.click()
    URL.revokeObjectURL(url)
  }, [docId, formulas])

  const onNext = useCallback(() => {
    if (!selectedFormula) return
    const idx = formulas.findIndex((f) => f.id === selectedFormula.id)
    if (idx >= 0 && idx < formulas.length - 1) {
      setSelectedFormulaId(formulas[idx + 1].id)
    }
  }, [formulas, selectedFormula])

  const savedCount = formulas.filter((f) => (f.latex || '').trim().length > 0).length
  const percent = formulas.length > 0 ? Math.round((savedCount / formulas.length) * 100) : 0
  const visibleCount = filteredFormulas.length

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2">
        <Spinner /> Loading formulas...
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-xl bg-slate-50">
      <div className="border-b bg-white px-6 py-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm text-slate-600">
            Da xu ly: {savedCount}/{formulas.length} cong thuc
          </span>
          <span className="text-sm font-medium text-indigo-600">{percent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-64 flex-col overflow-y-auto border-r bg-white">
          <div className="border-b p-4 font-semibold text-slate-700">
            <div>Tai lieu #{docId}</div>
            <span className="text-sm text-slate-400">{visibleCount}/{formulas.length} cong thuc</span>
          </div>

          <div className="space-y-3 border-b p-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tim kiem</label>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ID, trang, LaTeX..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trang</label>
                <select
                  value={pageFilter}
                  onChange={(e) => setPageFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="all">Tat ca</option>
                  {pageOptions.map((page) => (
                    <option key={page} value={page}>
                      Trang {page}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tin cay</label>
                <select
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="all">Tat ca</option>
                  <option value="high">Tot</option>
                  <option value="medium">Trung binh</option>
                  <option value="low">Can kiem tra</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setPageFilter('all')
                setConfidenceFilter('all')
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Xoa bo loc
            </button>
          </div>

          <div className="space-y-2 p-3">
            {filteredFormulas.length > 0 ? (
              filteredFormulas.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFormulaId(f.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    selectedFormulaId === f.id
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      #{f.id} trang {f.page ?? '-'}
                    </span>
                    <ConfidenceBadge score={f.confidence_score ?? 0} />
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                Khong tim thay cong thuc nao.
              </div>
            )}
          </div>

          <div className="mt-auto border-t p-4">
            <button
              onClick={handleExportAll}
              className="w-full rounded-lg bg-green-600 py-2 text-sm text-white hover:bg-green-700"
            >
              Export tat ca .tex
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          {selectedFormula ? (
            <>
              <MathLiveEditor
                key={selectedFormula.id}
                formula={selectedFormula}
                onSave={handleSave}
                onReprocess={handleReprocess}
                onNext={onNext}
              />

              <div className="mt-4 flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold">So sanh OCR vs Edited</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowComparison((s) => !s)}
                    className="rounded-lg border px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {showComparison ? 'An so sanh' : 'Hien thi so sanh'}
                  </button>
                </div>
              </div>

              {showComparison && (
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border bg-white p-4">
                    <div className="mb-2 text-xs font-semibold text-slate-500">OCR ban dau</div>
                    <div className="min-h-[4rem] rounded p-3 bg-slate-50">
                      <math-field
                        read-only
                        value={originalLatexMap[selectedFormula.id] ?? ''}
                        virtual-keyboard-mode="manual"
                        style={{ width: '100%', fontSize: '1.25rem' }}
                      />
                    </div>
                    <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap break-words text-xs font-mono text-slate-600">
                      {originalLatexMap[selectedFormula.id] ?? ''}
                    </pre>
                  </div>

                  <div className="rounded-lg border bg-white p-4">
                    <div className="mb-2 text-xs font-semibold text-slate-500">Edited (hien tai)</div>
                    <div className="min-h-[4rem] rounded p-3 bg-slate-50">
                      <math-field
                        read-only
                        value={selectedFormula.latex ?? ''}
                        virtual-keyboard-mode="manual"
                        style={{ width: '100%', fontSize: '1.25rem' }}
                      />
                    </div>
                    <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap break-words text-xs font-mono text-slate-600">
                      {selectedFormula.latex ?? ''}
                    </pre>
                  </div>
                </div>
              )}

              <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
                <h3 className="mb-2 font-semibold">Version History</h3>
                {versions.length === 0 ? (
                  <p className="text-sm text-slate-500">No versions yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {versions.map((v) => (
                      <li key={v.id} className="rounded border p-2">
                        <div className="text-xs text-slate-500">{new Date(v.created_at).toLocaleString()}</div>
                        <div className="truncate font-mono text-xs">{v.latex}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-slate-400">Chon cong thuc ben trai</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
