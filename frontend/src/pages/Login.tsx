import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Spinner from '../components/ui/Spinner'
import { login } from '../services/authService'
import useToast from '../hooks/useToast'

export default function Login() {
  const navigate = useNavigate()
  const { pushToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await login({ email, password })
      if (data?.success) {
        pushToast('Login successful', 'success')
        navigate('/')
      }
    } catch (err) {
      console.error(err)
      pushToast('Login failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow">
      <h2 className="text-xl font-semibold mb-4">Login</h2>
      <form onSubmit={submit}>
        <label className="block mb-2">Email</label>
        <input className="mb-3 w-full rounded border p-2" value={email} onChange={e => setEmail(e.target.value)} />
        <label className="block mb-2">Password</label>
        <input type="password" className="mb-4 w-full rounded border p-2" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white" disabled={loading}>
          {loading && <Spinner size={14} />}
          {loading ? 'Signing in...' : 'Login'}
        </button>
        <p className="mt-4 text-sm text-slate-600">
          No account? <Link className="text-blue-600" to="/register">Register now</Link>
        </p>
      </form>
    </div>
  )
}
