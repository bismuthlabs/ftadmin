"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function UnlockForm() {
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Passcode</label>
        <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} className="input" />
      </div>
      <div>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember me
        </label>
      </div>
      <div>
        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Unlocking...' : 'Unlock'}
        </button>
      </div>
    </form>
  )
}
