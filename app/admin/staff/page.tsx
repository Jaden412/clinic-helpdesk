'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function StaffAdminPage() {
  const [role, setRole] = useState<string | null>(null)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newRole, setNewRole] = useState('Employee')
  const [message, setMessage] = useState('')

  const [staffList, setStaffList] = useState<any[]>([])

  useEffect(() => {
    checkAccess()
  }, [])

  async function checkAccess() {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      setCheckingAccess(false)
      return
    }

    setCurrentUserId(user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role ? profile.role.trim().toUpperCase() : null
    setRole(userRole)
    setCheckingAccess(false)

    if (userRole === 'IT') {
      loadStaffList()
    }
  }

  async function loadStaffList() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('full_name')

    if (data) setStaffList(data)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')

    const res = await fetch('/api/create-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName, role: newRole }),
    })

    const result = await res.json()

    if (result.error) {
      setMessage('Error: ' + result.error)
    } else {
      setMessage('Account created successfully!')
      setFullName('')
      setEmail('')
      setPassword('')
      setNewRole('Employee')
      loadStaffList()
    }
  }

  async function handleDelete(userId: string, name: string) {
    if (userId === currentUserId) {
      setMessage("You can't delete your own account while logged in as it.")
      return
    }

    const confirmed = window.confirm(`Are you sure you want to delete ${name}'s account? This can't be undone.`)
    if (!confirmed) return

    setMessage('')

    const res = await fetch('/api/delete-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    const result = await res.json()

    if (result.error) {
      setMessage('Error: ' + result.error)
    } else {
      setMessage('Account deleted.')
      loadStaffList()
    }
  }

  if (checkingAccess) return <p className="p-10 text-[#6B7280]">Loading...</p>

  if (role !== 'IT') {
    return <p className="p-10 text-[#6B7280]">Access denied. This page is for IT staff only.</p>
  }

  const inputClass = "w-full px-3 py-2 border border-[#E2E5E7] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5C56] focus:border-transparent"

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold text-[#1F2937] mb-6">Manage staff accounts</h1>

      <form onSubmit={handleCreate} className="space-y-4 border border-[#E2E5E7] rounded p-5 mb-10">
        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-1">Full name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-1">Temporary password</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-1">Role</label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className={inputClass}
          >
            <option value="Employee">Employee</option>
            <option value="IT">IT</option>
          </select>
        </div>

        <button
          type="submit"
          className="px-5 py-2 bg-[#0F5C56] text-white text-sm rounded hover:bg-[#0C4A45] transition-colors"
        >
          Create account
        </button>
      </form>

      {message && (
        <p className={`mb-6 text-sm ${message.startsWith('Error') ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}>
          {message}
        </p>
      )}

      <h2 className="text-lg font-semibold text-[#1F2937] mb-3">Existing accounts</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left text-sm text-[#6B7280] border-b border-[#E2E5E7]">
            <th className="py-2 font-medium">Name</th>
            <th className="py-2 font-medium">Email</th>
            <th className="py-2 font-medium">Role</th>
            <th className="py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {staffList.map((s) => (
            <tr key={s.id} className="border-b border-[#E2E5E7] text-sm">
              <td className="py-2 text-[#1F2937]">{s.full_name}</td>
              <td className="py-2 text-[#1F2937]">{s.email}</td>
              <td className="py-2 text-[#1F2937]">{s.role}</td>
              <td className="py-2">
                <button
                  onClick={() => handleDelete(s.id, s.full_name || s.email)}
                  className="text-[#B91C1C] hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}