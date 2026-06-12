"use client"
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    try {
      const res = await fetch('/api/signout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      if (!res.ok) throw new Error('Sign out failed')
      toast.success('Signed out')
      router.replace('/unlock')
    } catch (err: any) {
      toast.error(err?.message || 'Unable to sign out')
    }
  }

  return (
    <button onClick={handleSignOut} className="btn">
      Sign out
    </button>
  )
}
