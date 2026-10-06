'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function Navbar() {
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    loadUser()

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadUser()
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadUser() {
    const { data } = await supabase.auth.getUser()
    setEmail(data.user?.email || null)
    setUserId(data.user?.id || null)

    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      setRole(profile?.role ? profile.role.trim().toUpperCase() : null)
      loadNotifications(data.user.id)
    } else {
      setRole(null)
      setNotifications([])
    }
  }

  async function loadNotifications(uid: string) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) setNotifications(data)
  }

  async function markAsRead(id: number) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(notifications.map((n) => n.id === id ? { ...n, is_read: true } : n))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <nav className="flex items-center justify-between px-8 py-4 border-b border-[#E2E5E7] bg-white relative">
      <div className="flex items-center gap-8">
        <span className="font-semibold text-[#0F5C56] text-lg tracking-tight">
          Clinic Helpdesk
        </span>
        <div className="flex items-center gap-6 text-sm text-[#1F2937]">
          <Link href="/" className="hover:text-[#0F5C56] transition-colors">
            Dashboard
          </Link>
          <Link href="/tickets" className="hover:text-[#0F5C56] transition-colors">
            All Tickets
          </Link>
          {role === 'IT' && (
            <Link href="/assigned" className="hover:text-[#0F5C56] transition-colors">
              Assigned to Me
            </Link>
          )}
          {role === 'IT' && (
            <Link href="/admin/staff" className="hover:text-[#0F5C56] transition-colors">
              Manage Staff
            </Link>
          )}
          <Link href="/new-ticket" className="hover:text-[#0F5C56] transition-colors">
            New Ticket
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        {email ? (
          <>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="relative p-1.5 text-[#1F2937] hover:text-[#0F5C56] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#B91C1C] text-white text-[10px] rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showDropdown && (
                <div className="absolute right-0 top-10 w-80 bg-white border border-[#E2E5E7] rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                  <div className="p-3 border-b border-[#E2E5E7]">
                    <p className="text-sm font-medium text-[#1F2937]">Notifications</p>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-[#6B7280]">No notifications yet.</p>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={`/tickets/${n.ticket_id}`}
                        onClick={() => {
                          markAsRead(n.id)
                          setShowDropdown(false)
                        }}
                        className={`block p-3 border-b border-[#E2E5E7] text-sm hover:bg-[#FAFAF8] ${!n.is_read ? 'bg-[#F0FDFA]' : ''}`}
                      >
                        <p className="text-[#1F2937]">{n.message}</p>
                        <p className="text-xs text-[#6B7280] mt-1">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              )}
            </div>

            <span className="text-[#1F2937]">
              {email}
              {role && <span className="text-[#6B7280]"> · {role}</span>}
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 border border-[#E2E5E7] rounded text-[#1F2937] hover:bg-[#FAFAF8] transition-colors"
            >
              Log out
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="px-3 py-1.5 bg-[#0F5C56] text-white rounded hover:bg-[#0C4A45] transition-colors"
          >
            Log in
          </Link>
        )}
      </div>
    </nav>
  )
}