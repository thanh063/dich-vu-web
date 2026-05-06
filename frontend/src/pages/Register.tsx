import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Spinner from '../components/ui/Spinner'
import { register } from '../services/authService'
import useToast from '../hooks/useToast'

export default function Register() {
  const navigate = useNavigate()
  const { pushToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await register({ email, password })
      if (data?.success) {
        pushToast('Registered successfully', 'success')
        navigate('/login')
      }
    } catch (err) {
      console.error(err)
      pushToast('Register failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow">
      <h2 className="text-xl font-semibold mb-4">Register</h2>
      <form onSubmit={submit}>
        <label className="block mb-2">Email</label>
        <input className="mb-3 w-full rounded border p-2" value={email} onChange={e => setEmail(e.target.value)} />
        <label className="block mb-2">Password</label>
        <input type="password" className="mb-4 w-full rounded border p-2" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="inline-flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-white" disabled={loading}>
          {loading && <Spinner size={14} />}
          {loading ? 'Creating account...' : 'Register'}
        </button>
        <p className="mt-4 text-sm text-slate-600">
          Already have an account? <Link className="text-blue-600" to="/login">Login</Link>
        </p>
      </form>
    </div>
  )
}
