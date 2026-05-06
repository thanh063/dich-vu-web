import React, { useEffect, useState } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Editor from './pages/Editor'
import ProtectedRoute from './components/layout/ProtectedRoute'
import { hasToken, logout } from './services/authService'

export default function App() {
  const authed = hasToken()
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const enableDark = saved === 'dark'
    setDark(enableDark)
    document.documentElement.classList.toggle('dark', enableDark)
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-800 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link to="/" className="text-lg font-bold tracking-tight">
            Ebook2LaTeX
          </Link>
          <nav className="space-x-3 text-sm">
            <button className="rounded border border-slate-300 px-3 py-1 dark:border-slate-600" onClick={toggleTheme}>
              {dark ? 'Light' : 'Dark'}
            </button>
            <Link to="/" className="hover:text-blue-600">Dashboard</Link>
            {!authed && <Link to="/login" className="hover:text-blue-600">Login</Link>}
            {!authed && <Link to="/register" className="hover:text-blue-600">Register</Link>}
            {authed && (
              <button
                className="rounded bg-slate-800 px-3 py-1 text-white"
                onClick={() => {
                  logout()
                  window.location.href = '/login'
                }}
              >
                Logout
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/editor/:documentId"
            element={
              <ProtectedRoute>
                <Editor />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  )
}
