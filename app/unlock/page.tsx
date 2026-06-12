"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function UnlockPage() {
  const [passcode, setPasscode] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, remember }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || 'Failed')
      toast.success('Unlocked')
      router.replace('/')
    } catch (err: any) {
      toast.error(err.message || 'Unable to unlock')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Unlock</h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Passcode</label>
          <input value={passcode} onChange={(e) => setPasscode(e.target.value)} className="input" type="password" />
        </div>
        <div className="mb-4">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Remember me
          </label>
        </div>
        <div>
          <button className="btn" disabled={loading} type="submit">
            {loading ? 'Unlocking...' : 'Unlock'}
          </button>
        </div>
      </form>
    </div>
  )
}
