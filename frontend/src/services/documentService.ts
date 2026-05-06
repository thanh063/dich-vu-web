import api from './api'

export type DocumentItem = {
  id: number
  filename: string
  status: 'pending' | 'processing' | 'done' | 'error'
  created_at: string
}

export type FormulaItem = {
  id: number
  document_id: number
  latex: string
  page: number | null
  image_path?: string | null
  confidence_score?: number | null
}

export async function uploadDocument(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await api.post('/api/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function listDocuments() {
  const res = await api.get('/api/documents')
  return (res.data?.data ?? []) as DocumentItem[]
}

export async function processDocument(id: number) {
  const res = await api.post(`/api/process/${id}`)
  return res.data
}

export async function getFormulas(id: number) {
  const res = await api.get(`/api/process/${id}/formulas`)
  return (res.data?.data ?? []) as FormulaItem[]
}
