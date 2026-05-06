import api from './api'

export type ReprocessFormulaResponse = {
  id: number
  document_id: number
  latex: string
  page: number | null
  image_path?: string | null
  confidence_score?: number | null
}

export type FormulaVersion = {
  id: number
  formula_id: number
  latex: string
  note: string | null
  created_at: string
}

export async function updateFormula(id: number, latex: string, note?: string) {
  const res = await api.put(`/api/formulas/${id}`, { latex, note })
  return res.data
}

export async function getFormulaVersions(id: number) {
  const res = await api.get(`/api/formulas/${id}/versions`)
  return (res.data?.data ?? []) as FormulaVersion[]
}

export async function reprocessFormula(id: number) {
  const res = await api.post(`/api/process/formula/${id}/reprocess`)
  return (res.data?.data ?? null) as ReprocessFormulaResponse | null
}
