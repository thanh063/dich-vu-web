import { useEffect, useState } from 'react'

export default function useDebounced<T>(value: T, delay = 300) {
  const [state, setState] = useState<T>(value)
  useEffect(() => {
    const id = setTimeout(() => setState(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return state
}
