import api from './api'

type Credentials = {
  email: string
  password: string
}

export async function login(payload: Credentials) {
  const res = await api.post('/api/auth/login', payload)
  const token = res.data?.data?.access_token as string | undefined
  if (token) {
    localStorage.setItem('token', token)
  }
  return res.data
}

export async function register(payload: Credentials) {
  const res = await api.post('/api/auth/register', payload)
  return res.data
}

export function logout() {
  localStorage.removeItem('token')
}

export function hasToken() {
  return Boolean(localStorage.getItem('token'))
}
