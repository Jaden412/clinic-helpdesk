'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

const PRIORITY_ORDER: Record<string, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
}

const STALE_DAYS_THRESHOLD = 2
const STATUSES = ['All', 'Open', 'In Progress', 'Waiting on Requester', 'Resolved', 'Closed']

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [staffMap, setStaffMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState('high-to-low')
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchText, setSearchText] = useState('')
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false)

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

    setCurrentUserId(user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = (profile?.role || 'Employee').trim().toUpperCase()
    setRole(userRole)

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

    if (userRole === 'IT') {
      const { data: staffData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'IT')

      if (staffData) {
        const map: Record<string, string> = {}
        staffData.forEach((s) => {
          map[s.id] = s.full_name || s.email
        })
        setStaffMap(map)
      }
    }

    setLoading(false)
  }

  if (loading) return <p className="p-10 text-[#6B7280]">Loading tickets...</p>

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter
    const matchesSearch = t.title.toLowerCase().includes(searchText.toLowerCase())
    const matchesAssignee = !assignedToMeOnly || t.assignee_id === currentUserId
    return matchesStatus && matchesSearch && matchesAssignee
  })

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    const aRank = PRIORITY_ORDER[a.priority] || 0
    const bRank = PRIORITY_ORDER[b.priority] || 0
    return sortOrder === 'high-to-low' ? bRank - aRank : aRank - bRank
  })

  const statusColor = (status: string) => {
    if (status === 'Open') return 'text-[#B45309]'
    if (status === 'In Progress') return 'text-[#0F5C56]'
    if (status === 'Resolved' || status === 'Closed') return 'text-[#15803D]'
    return 'text-[#1F2937]'
  }

  const priorityColor = (priority: string) => {
    if (priority === 'Critical') return 'text-[#B91C1C] font-medium'
    if (priority === 'High') return 'text-[#B45309]'
    return 'text-[#1F2937]'
  }

  const daysOpen = (createdAt: string) => {
    const created = new Date(createdAt).getTime()
    const now = Date.now()
    return Math.floor((now - created) / (1000 * 60 * 60 * 24))
  }

  const isStale = (ticket: any) => {
    return ticket.status === 'Open' && daysOpen(ticket.created_at) >= STALE_DAYS_THRESHOLD
  }

  function escapeCsvValue(value: string) {
    if (value == null) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  function handleExportCsv() {
    const headers = ['Title', 'Location', 'Category', 'Priority', 'Status', 'Assigned To', 'Created']

    const rows = sortedTickets.map((t) => [
      t.title,
      t.location || '',
      t.category,
      t.priority,
      t.status,
      t.assignee_id ? (staffMap[t.assignee_id] || 'Unknown') : 'Unassigned',
      new Date(t.created_at).toLocaleString(),
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `tickets-${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-[#1F2937]">
          {role === 'IT' ? 'All Tickets' : 'My Tickets'}
        </h1>

        {role === 'IT' && (
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 border border-[#E2E5E7] text-[#1F2937] text-sm rounded hover:bg-[#FAFAF8] transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search by title..."
          className="text-sm border border-[#E2E5E7] rounded px-3 py-1.5 w-56 focus:outline-none focus:ring-2 focus:ring-[#0F5C56] focus:border-transparent"
        />

        <div className="flex items-center gap-2">
          <label className="text-sm text-[#6B7280]">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-[#E2E5E7] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0F5C56] focus:border-transparent"
          >
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-[#6B7280]">Sort by priority:</label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="text-sm border border-[#E2E5E7] rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0F5C56] focus:border-transparent"
          >
            <option value="high-to-low">High to Low</option>
            <option value="low-to-high">Low to High</option>
          </select>
        </div>

        {role === 'IT' && (
          <label className="flex items-center gap-2 text-sm text-[#1F2937] cursor-pointer">
            <input
              type="checkbox"
              checked={assignedToMeOnly}
              onChange={(e) => setAssignedToMeOnly(e.target.checked)}
              className="accent-[#0F5C56]"
            />
            Assigned to me only
          </label>
        )}
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left text-sm text-[#6B7280] border-b border-[#E2E5E7]">
            <th className="py-2 font-medium">Title</th>
            <th className="py-2 font-medium">Location</th>
            <th className="py-2 font-medium">Category</th>
            <th className="py-2 font-medium">Priority</th>
            <th className="py-2 font-medium">Status</th>
            {role === 'IT' && <th className="py-2 font-medium">Assigned To</th>}
            <th className="py-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {sortedTickets.map((ticket) => (
            <tr key={ticket.id} className="border-b border-[#E2E5E7] text-sm">
              <td className="py-2">
                <Link href={`/tickets/${ticket.id}`} className="text-[#0F5C56] hover:underline">
                  {ticket.title}
                </Link>
                {isStale(ticket) && (
                  <span
                    className="ml-2 inline-block px-1.5 py-0.5 text-xs rounded bg-[#FEF3C7] text-[#B45309] font-medium"
                    title={`Open for ${daysOpen(ticket.created_at)} days`}
                  >
                    {daysOpen(ticket.created_at)}d open
                  </span>
                )}
              </td>
              <td className="py-2 text-[#1F2937]">{ticket.location || '—'}</td>
              <td className="py-2 text-[#1F2937]">{ticket.category}</td>
              <td className={`py-2 ${priorityColor(ticket.priority)}`}>{ticket.priority}</td>
              <td className={`py-2 ${statusColor(ticket.status)}`}>{ticket.status}</td>
              {role === 'IT' && (
                <td className="py-2 text-[#1F2937]">
                  {ticket.assignee_id ? (staffMap[ticket.assignee_id] || 'Unknown') : (
                    <span className="text-[#6B7280]">Unassigned</span>
                  )}
                </td>
              )}
              <td className="py-2 text-[#6B7280]">
                {new Date(ticket.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {sortedTickets.length === 0 && (
        <p className="mt-6 text-sm text-[#6B7280]">No tickets match your search/filter.</p>
      )}
    </div>
  )
}