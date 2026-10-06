'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function AssignedTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('assignee_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
    } else {
      setTickets(data)
    }
    setLoading(false)
  }

  if (loading) return <p className="p-10 text-[#6B7280]">Loading assigned tickets...</p>

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

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold text-[#1F2937] mb-6">Assigned to me</h1>

      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left text-sm text-[#6B7280] border-b border-[#E2E5E7]">
            <th className="py-2 font-medium">Title</th>
            <th className="py-2 font-medium">Category</th>
            <th className="py-2 font-medium">Priority</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="border-b border-[#E2E5E7] text-sm">
              <td className="py-2">
                <Link href={`/tickets/${ticket.id}`} className="text-[#0F5C56] hover:underline">
                  {ticket.title}
                </Link>
              </td>
              <td className="py-2 text-[#1F2937]">{ticket.category}</td>
              <td className={`py-2 ${priorityColor(ticket.priority)}`}>{ticket.priority}</td>
              <td className={`py-2 ${statusColor(ticket.status)}`}>{ticket.status}</td>
              <td className="py-2 text-[#6B7280]">
                {new Date(ticket.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {tickets.length === 0 && (
        <p className="mt-6 text-sm text-[#6B7280]">No tickets assigned to you.</p>
      )}
    </div>
  )
}