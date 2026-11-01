import { useEffect, useState, type ReactNode } from "react"

/** A short status message at the bottom of the screen. It disappears by itself after 2.4 seconds. */
export function useToast(): [ReactNode, (message: string | null) => void] {
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])
  const node = toast ? <div className="toast" role="status">{toast}</div> : null
  return [node, setToast]
}
