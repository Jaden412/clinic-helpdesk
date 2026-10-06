'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center bg-[#FAFAF8]">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-[#1F2937] mb-1">Log in</h1>
        <p className="text-sm text-[#6B7280] mb-6">
          Enter your clinic email and password.
        </p>

        <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-sm text-[#1F2937] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
              className="w-full px-3 py-2 border border-[#E2E5E7] rounded focus:outline-none focus:ring-2 focus:ring-[#0F5C56] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-[#1F2937] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-[#E2E5E7] rounded focus:outline-none focus:ring-2 focus:ring-[#0F5C56] focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-[#0F5C56] text-white rounded hover:bg-[#0C4A45] transition-colors"
          >
            Log in
          </button>
        </form>

        {message && (
          <p className="mt-4 text-sm text-[#B91C1C]">{message}</p>
        )}
      </div>
    </div>
  )
}