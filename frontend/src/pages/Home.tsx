import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Spinner from '../components/ui/Spinner'
import useToast from '../hooks/useToast'
import {
  DocumentItem,
  listDocuments,
  processDocument,
  uploadDocument,
} from '../services/documentService'

export default function Home() {
  const { pushToast } = useToast()
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const processingCount = documents.filter(
    (d) => d.status === 'processing' || d.status === 'pending'
  ).length

  async function loadDocuments() {
    setLoading(true)
    try {
      const docs = await listDocuments()
      setDocuments(docs)
    } catch (err) {
      console.error(err)
      pushToast('Cannot load documents', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadDocument(file)
      pushToast('Uploaded, processing started', 'success')
      await loadDocuments()
    } catch (err) {
      console.error(err)
      pushToast('Upload failed', 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function onProcess(id: number) {
    try {
      await processDocument(id)
      pushToast('Processing triggered', 'info')
      await loadDocuments()
    } catch (err) {
      console.error(err)
      pushToast('Cannot trigger process', 'error')
    }
  }

  useEffect(() => {
    void loadDocuments()
  }, [])

  useEffect(() => {
    if (processingCount === 0) return
    const id = window.setInterval(() => {
      void loadDocuments()
    }, 3000)
    return () => window.clearInterval(id)
  }, [processingCount])

  return (
    <div className="space-y-6">
      {processingCount > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-600/50 dark:bg-amber-900/20 dark:text-amber-200">
          <div className="mb-2 text-sm font-semibold">
            OCR đang xử lý {processingCount} document...
          </div>
          <div className="h-2 overflow-hidden rounded bg-amber-200/60 dark:bg-amber-800/60">
            <div className="ocr-progress h-full rounded bg-amber-600 dark:bg-amber-400" />
          </div>
        </section>
      )}

      <section className="rounded-xl bg-white p-6 shadow dark:bg-slate-900 dark:ring-1 dark:ring-slate-700">
        <h1 className="mb-2 text-2xl font-bold">Document Dashboard</h1>
        <p className="mb-4 text-slate-600 dark:text-slate-300">
          Upload PDF math documents, process OCR and open editor for LaTeX refinement.
        </p>
        <label className="inline-flex cursor-pointer items-center gap-3 rounded bg-blue-600 px-4 py-2 text-white">
          {uploading && <Spinner size={14} />}
          {uploading ? 'Uploading...' : 'Upload PDF'}
          <input type="file" accept="application/pdf" className="hidden" onChange={onUpload} disabled={uploading} />
        </label>
      </section>

      <section className="rounded-xl bg-white p-6 shadow dark:bg-slate-900 dark:ring-1 dark:ring-slate-700">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your Documents</h2>
          <button className="text-sm text-blue-600" onClick={() => void loadDocuments()}>Refresh</button>
        </div>

        {loading ? (
          <div className="inline-flex items-center gap-2 text-slate-600"><Spinner /> Loading...</div>
        ) : documents.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">No documents yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="py-2">ID</th>
                  <th className="py-2">Filename</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id} className="border-b dark:border-slate-700">
                    <td className="py-2">{d.id}</td>
                    <td className="py-2">{d.filename}</td>
                    <td className="py-2">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">{d.status}</span>
                    </td>
                    <td className="py-2 space-x-2">
                      <button className="rounded bg-slate-700 px-3 py-1 text-white" onClick={() => void onProcess(d.id)}>
                        Process
                      </button>
                      <Link className="rounded bg-emerald-600 px-3 py-1 text-white" to={`/editor/${d.id}`}>
                        Open Editor
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
