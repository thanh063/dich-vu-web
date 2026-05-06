import React from 'react'

export default function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
      style={{ width: size, height: size }}
      aria-label="loading"
    />
  )
}
