import React from 'react'
import { Navigate } from 'react-router-dom'
import { hasToken } from '../../services/authService'

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  if (!hasToken()) {
    return <Navigate to="/login" replace />
  }
  return children
}
