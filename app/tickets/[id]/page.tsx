'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { createNotification } from '@/lib/notifications'

const STATUSES = ['Open', 'In Progress', 'Waiting on Requester', 'Resolved', 'Closed']

export default function TicketDetailPage() {
  const params = useParams()
  const [ticket, setTicket] = useState<any>(null)
  const [staffList, setStaffList] = useState<any[]>([])
  const [requesterName, setRequesterName] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [noteAuthors, setNoteAuthors] = useState<Record<string, string>>({})
  const [activity, setActivity] = useState<any[]>([])
  const [activityUsers, setActivityUsers] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchTicket()
    fetchStaffList()
    fetchRole()
    fetchNotes()
    fetchActivity()
  }, [])

  async function fetchRole() {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) return

    setCurrentUserId(user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    setRole(profile?.role ? profile.role.trim().toUpperCase() : null)
  }

  async function fetchTicket() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error(error)
    } else {
      setTicket(data)

      if (data.requester_id) {
        const { data: requesterProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', data.requester_id)
          .single()

        setRequesterName(requesterProfile?.full_name || requesterProfile?.email || 'Unknown')
      }
    }
    setLoading(false)
  }

  async function fetchStaffList() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')

    if (!error && data) {
      const itStaff = data.filter(
        (p) => p.role && p.role.trim().toUpperCase() === 'IT'
      )
      setStaffList(itStaff)
    }
  }

  async function fetchNotes() {
    const { data, error } = await supabase
      .from('ticket_notes')
      .select('*')
      .eq('ticket_id', params.id)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setNotes(data)

      const authorIds = [...new Set(data.map((n) => n.author_id))]
      if (authorIds.length > 0) {
        const { data: authors } = await supabase.rpc('get_profile_names', { user_ids: authorIds })

        if (authors) {
          const map: Record<string, string> = {}
          authors.forEach((a: any) => {
            map[a.id] = a.full_name || a.email
          })
          setNoteAuthors(map)
        }
      }
    }
  }

  async function fetchActivity() {
    const { data, error } = await supabase
      .from('ticket_activity')
      .select('*')
      .eq('ticket_id', params.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setActivity(data)

      const userIds = [...new Set(data.map((a) => a.changed_by))]
      if (userIds.length > 0) {
        const { data: users } = await supabase.rpc('get_profile_names', { user_ids: userIds })

        if (users) {
          const map: Record<string, string> = {}
          users.forEach((u: any) => {
            map[u.id] = u.full_name || u.email
          })
          setActivityUsers(map)
        }
      }
    }
  }

  function labelForValue(field: string, value: string | null) {
    if (!value) return 'Unassigned'
    if (field === 'assignee_id') {
      const staff = staffList.find((s) => s.id === value)
      return staff?.full_name || staff?.email || 'Unknown'
    }
    return value
  }

  async function updateField(field: string, value: string) {
    setSaving(true)

    const oldValue = ticket[field]

    const { error } = await supabase
      .from('tickets')
      .update({ [field]: value })
      .eq('id', params.id)

    if (!error) {
      setTicket({ ...ticket, [field]: value })

      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user

      if (user) {
        await supabase.from('ticket_activity').insert([{
          ticket_id: params.id,
          changed_by: user.id,
          field_changed: field,
          old_value: oldValue || null,
          new_value: value || null,
        }])
        fetchActivity()

        if (ticket.requester_id && ticket.requester_id !== user.id) {
          if (field === 'status') {
            await createNotification(
              ticket.requester_id,
              Number(params.id),
              `Your ticket "${ticket.title}" status changed to ${value}`
            )
          }
          if (field === 'assignee_id') {
            const staff = staffList.find((s) => s.id === value)
            const name = staff?.full_name || staff?.email || 'someone'
            await createNotification(
              ticket.requester_id,
              Number(params.id),
              `Your ticket "${ticket.title}" was assigned to ${name}`
            )
          }
        }
      }
    }
    setSaving(false)
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newNote.trim()) return

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) return

    const { error } = await supabase
      .from('ticket_notes')
      .insert([{ ticket_id: params.id, author_id: user.id, note: newNote }])

    if (!error) {
      setNewNote('')
      fetchNotes()

      if (isIT && ticket.requester_id && ticket.requester_id !== user.id) {
        await createNotification(
          ticket.requester_id,
          Number(params.id),
          `New note on your ticket "${ticket.title}"`
        )
      }

      if (!isIT) {
        const { data: itStaff } = await supabase.rpc('get_it_staff_ids')

        if (itStaff) {
          for (const staff of itStaff) {
            await createNotification(
              staff.id,
              Number(params.id),
              `New note from requester on "${ticket.title}"`
            )
          }
        }
      }
    } else {
      console.error(error)
    }
  }

  if (loading) return <p className="p-10 text-[#6B7280]">Loading ticket...</p>
  if (!ticket) return <p className="p-10 text-[#6B7280]">Ticket not found.</p>

  const isIT = role === 'IT'
  const isOwner = ticket.requester_id === currentUserId
  const assignedStaffName = ticket.assignee_id
    ? staffList.find((s) => s.id === ticket.assignee_id)?.full_name ||
      staffList.find((s) => s.id === ticket.assignee_id)?.email ||
      'Unknown'
    : 'Unassigned'

  const priorityColor = (priority: string) => {
    if (priority === 'Critical') return 'text-[#B91C1C] font-medium'
    if (priority === 'High') return 'text-[#B45309]'
    return 'text-[#1F2937]'
  }

  const fieldLabel = (field: string) => {
    if (field === 'status') return 'Status'
    if (field === 'assignee_id') return 'Assignment'
    return field
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold text-[#1F2937] mb-4">{ticket.title}</h1>

      <div className="border border-[#E2E5E7] rounded p-5 space-y-2 text-sm mb-8">
        <p><span className="text-[#6B7280]">Submitted by:</span> <span className="text-[#1F2937]">{requesterName || 'Unknown'}</span></p>
        <p><span className="text-[#6B7280]">Location:</span> <span className="text-[#1F2937]">{ticket.location || 'Not specified'}</span></p>
        <p><span className="text-[#6B7280]">Category:</span> <span className="text-[#1F2937]">{ticket.category}</span></p>
        <p><span className="text-[#6B7280]">Priority:</span> <span className={priorityColor(ticket.priority)}>{ticket.priority}</span></p>
        <p><span className="text-[#6B7280]">Created:</span> <span className="text-[#1F2937]">{new Date(ticket.created_at).toLocaleString()}</span></p>
        <div className="pt-2">
          <p className="text-[#6B7280] mb-1">Description:</p>
          <p className="text-[#1F2937]">{ticket.description}</p>
        </div>
        {ticket.image_url && (
          <div className="pt-2">
            <p className="text-[#6B7280] mb-1">Attached image:</p>
            <img
              src={ticket.image_url}
              alt="Ticket attachment"
              className="max-h-80 rounded border border-[#E2E5E7]"
            />
          </div>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-[#1F2937] mb-1">Status</label>
        {isIT ? (
          <select
            value={ticket.status || 'Open'}
            onChange={(e) => updateField('status', e.target.value)}
            className="w-full px-3 py-2 border border-[#E2E5E7] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5C56] focus:border-transparent"
          >
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        ) : (
          <p className="text-sm text-[#1F2937]">{ticket.status || 'Open'}</p>
        )}
      </div>

      <div className="mb-8">
        <label className="block text-sm font-medium text-[#1F2937] mb-1">Assigned To</label>
        {isIT ? (
          <select
            value={ticket.assignee_id || ''}
            onChange={(e) => updateField('assignee_id', e.target.value)}
            className="w-full px-3 py-2 border border-[#E2E5E7] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5C56] focus:border-transparent"
          >
            <option value="">Unassigned</option>
            {staffList.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.full_name || staff.email}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-[#1F2937]">{assignedStaffName}</p>
        )}
      </div>

      {saving && <p className="text-sm text-[#6B7280] mb-4">Saving...</p>}

      {isIT && (ticket.status === 'Resolved' || ticket.status === 'Closed') && (
        <button
          onClick={() => updateField('status', 'Open')}
          className="mb-8 px-4 py-2 border border-[#0F5C56] text-[#0F5C56] text-sm rounded hover:bg-[#0F5C56] hover:text-white transition-colors"
        >
          Reopen ticket
        </button>
      )}

      <div className="border-t border-[#E2E5E7] pt-6 mb-10">
        <h2 className="text-lg font-semibold text-[#1F2937] mb-4">Notes</h2>

        {notes.length === 0 && (
          <p className="text-sm text-[#6B7280] mb-4">No notes yet.</p>
        )}

        <div className="space-y-3 mb-4">
          {notes.map((note) => (
            <div key={note.id} className="border border-[#E2E5E7] rounded p-3">
              <p className="text-xs text-[#6B7280] mb-1">
                {noteAuthors[note.author_id] || 'Unknown'} · {new Date(note.created_at).toLocaleString()}
              </p>
              <p className="text-sm text-[#1F2937]">{note.note}</p>
            </div>
          ))}
        </div>

        {(isIT || isOwner) && (
          <form onSubmit={handleAddNote}>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              placeholder="Add a note..."
              className="w-full px-3 py-2 border border-[#E2E5E7] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5C56] focus:border-transparent"
            />
            <button
              type="submit"
              className="mt-2 px-4 py-2 bg-[#0F5C56] text-white text-sm rounded hover:bg-[#0C4A45] transition-colors"
            >
              Add note
            </button>
          </form>
        )}
      </div>

      <div className="border-t border-[#E2E5E7] pt-6">
        <h2 className="text-lg font-semibold text-[#1F2937] mb-4">Activity History</h2>

        {activity.length === 0 && (
          <p className="text-sm text-[#6B7280]">No changes recorded yet.</p>
        )}

        <div className="space-y-2">
          {activity.map((a) => (
            <p key={a.id} className="text-xs text-[#6B7280]">
              <span className="text-[#1F2937]">{activityUsers[a.changed_by] || 'Unknown'}</span>{' '}
              changed <span className="text-[#1F2937]">{fieldLabel(a.field_changed)}</span> from{' '}
              <span className="text-[#1F2937]">{labelForValue(a.field_changed, a.old_value)}</span> to{' '}
              <span className="text-[#1F2937]">{labelForValue(a.field_changed, a.new_value)}</span>
              {' · '}{new Date(a.created_at).toLocaleString()}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}