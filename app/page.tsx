'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'

export default function DashboardPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      setTickets([])
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    const userRole = (profile?.role || 'Employee').trim().toUpperCase()
    setRole(userRole)
    setFullName(profile?.full_name || null)

    let query = supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false })

    if (userRole !== 'IT') {
      query = query.eq('requester_id', user.id)
    }

    const { data, error } = await query

    if (error) {
      console.error(error)
    } else {
      setTickets(data)
    }

    setLoading(false)
  }

  if (loading) return <p className="p-10 text-[#6B7280]">Loading dashboard...</p>

  const isIT = role === 'IT'

  const statusColor = (status: string) => {
    if (status === 'Open') return 'text-[#B45309]'
    if (status === 'In Progress') return 'text-[#0F5C56]'
    if (status === 'Resolved' || status === 'Closed') return 'text-[#15803D]'
    return 'text-[#1F2937]'
  }

  const statusDot = (status: string) => {
    if (status === 'Open') return 'bg-[#B45309]'
    if (status === 'In Progress') return 'bg-[#0F5C56]'
    if (status === 'Waiting on Requester') return 'bg-[#B91C1C]'
    if (status === 'Resolved' || status === 'Closed') return 'bg-[#15803D]'
    return 'bg-[#6B7280]'
  }

  // ----- IT DASHBOARD -----
  if (isIT) {
    const openCount = tickets.filter((t) => t.status === 'Open').length
    const inProgressCount = tickets.filter((t) => t.status === 'In Progress').length
    const resolvedCount = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length
    const recentTickets = tickets.slice(0, 5)

    const resolvedTickets = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed')
    const avgResolutionDays = resolvedTickets.length > 0
      ? Math.round(
          resolvedTickets.reduce((sum, t) => {
            const created = new Date(t.created_at).getTime()
            const updated = new Date(t.updated_at || t.created_at).getTime()
            return sum + (updated - created) / (1000 * 60 * 60 * 24)
          }, 0) / resolvedTickets.length
        )
      : null

    const categoryCounts: Record<string, number> = {}
    tickets.forEach((t) => {
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1
    })
    const categoryData = Object.entries(categoryCounts).map(([category, count]) => ({ category, count }))

    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-semibold text-[#1F2937] mb-6">Dashboard</h1>

        <div className="grid grid-cols-4 gap-4 mb-10">
          <div className="border border-[#E2E5E7] rounded p-5">
            <p className="text-3xl font-semibold text-[#1F2937]">{openCount}</p>
            <p className="text-sm text-[#6B7280] mt-1">Open</p>
          </div>
          <div className="border border-[#E2E5E7] rounded p-5">
            <p className="text-3xl font-semibold text-[#1F2937]">{inProgressCount}</p>
            <p className="text-sm text-[#6B7280] mt-1">In Progress</p>
          </div>
          <div className="border border-[#E2E5E7] rounded p-5">
            <p className="text-3xl font-semibold text-[#1F2937]">{resolvedCount}</p>
            <p className="text-sm text-[#6B7280] mt-1">Resolved</p>
          </div>
          <div className="border border-[#E2E5E7] rounded p-5">
            <p className="text-3xl font-semibold text-[#1F2937]">
              {avgResolutionDays !== null ? `${avgResolutionDays}d` : '—'}
            </p>
            <p className="text-sm text-[#6B7280] mt-1">Avg. Resolution Time</p>
          </div>
        </div>

        <div className="border border-[#E2E5E7] rounded p-5 mb-10">
          <h2 className="text-lg font-semibold text-[#1F2937] mb-4">Tickets by Category</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData}>
              <XAxis dataKey="category" tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
              <Bar dataKey="count" fill="#0F5C56" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <h2 className="text-lg font-semibold text-[#1F2937] mb-3">Recent Tickets</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-sm text-[#6B7280] border-b border-[#E2E5E7]">
              <th className="py-2 font-medium">Title</th>
              <th className="py-2 font-medium">Status</th>
              <th className="py-2 font-medium">Priority</th>
              <th className="py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {recentTickets.map((ticket) => (
              <tr key={ticket.id} className="border-b border-[#E2E5E7] text-sm">
                <td className="py-2">
                  <Link href={`/tickets/${ticket.id}`} className="text-[#0F5C56] hover:underline">
                    {ticket.title}
                  </Link>
                </td>
                <td className={`py-2 ${statusColor(ticket.status)}`}>{ticket.status}</td>
                <td className="py-2 text-[#1F2937]">{ticket.priority}</td>
                <td className="py-2 text-[#6B7280]">
                  {new Date(ticket.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-6 text-sm">
          <Link href="/tickets" className="text-[#0F5C56] hover:underline">
            View all tickets
          </Link>
          <span className="text-[#6B7280]"> · </span>
          <Link href="/new-ticket" className="text-[#0F5C56] hover:underline">
            Submit a new ticket
          </Link>
        </p>
      </div>
    )
  }

  // ----- EMPLOYEE DASHBOARD -----
  const openTickets = tickets.filter((t) => t.status !== 'Resolved' && t.status !== 'Closed')
  const needsAttention = tickets.filter((t) => t.status === 'Waiting on Requester')
  const firstName = fullName ? fullName.split(' ')[0] : null

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold text-[#1F2937] mb-1">
        {firstName ? `Hi, ${firstName}` : 'Welcome'}
      </h1>
      <p className="text-sm text-[#6B7280] mb-8">
        Here's what's going on with your IT requests.
      </p>

      <Link
        href="/new-ticket"
        className="block border border-[#0F5C56] rounded-lg p-5 mb-8 hover:bg-[#0F5C56] hover:text-white transition-colors group"
      >
        <p className="text-base font-medium text-[#0F5C56] group-hover:text-white">
          + Submit a new ticket
        </p>
        <p className="text-sm text-[#6B7280] group-hover:text-white/80 mt-1">
          Have an IT issue? Let us know and we'll take a look.
        </p>
      </Link>

      {needsAttention.length > 0 && (
        <div className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg p-4 mb-8">
          <p className="text-sm font-medium text-[#B91C1C] mb-1">
            {needsAttention.length === 1 ? 'A ticket needs' : `${needsAttention.length} tickets need`} your response
          </p>
          <div className="space-y-1">
            {needsAttention.map((t) => (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="block text-sm text-[#B91C1C] underline"
              >
                {t.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-base font-semibold text-[#1F2937] mb-3">
        Your open requests ({openTickets.length})
      </h2>

      {openTickets.length === 0 ? (
        <p className="text-sm text-[#6B7280] mb-8">
          Nothing open right now — nice and quiet.
        </p>
      ) : (
        <div className="space-y-2 mb-8">
          {openTickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/tickets/${ticket.id}`}
              className="flex items-center justify-between border border-[#E2E5E7] rounded-lg p-4 hover:border-[#0F5C56] transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-[#1F2937]">{ticket.title}</p>
                <p className="text-xs text-[#6B7280] mt-0.5">{ticket.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${statusDot(ticket.status)}`} />
                <span className={`text-sm ${statusColor(ticket.status)}`}>{ticket.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="text-sm">
        <Link href="/tickets" className="text-[#0F5C56] hover:underline">
          View all my tickets, including resolved
        </Link>
      </p>
    </div>
  )
}