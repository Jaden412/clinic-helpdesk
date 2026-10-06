'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { createNotification } from '@/lib/notifications'

const LOCATIONS = [
  'Front Desk',
  'Waiting Room',
  'Exam Room 1',
  'Exam Room 2',
  'Exam Room 3',
  'Exam Room 4',
  'Nurses Station',
  'Lab',
  'Billing Office',
  'Back Office',
  'Break Room',
  'Other',
]

export default function NewTicketPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [priority, setPriority] = useState('')
  const [location, setLocation] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null)
    })
  }, [])

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null

    if (file && file.size > 10 * 1024 * 1024) {
      setMessage('Image must be under 10MB.')
      e.target.value = ''
      setImageFile(null)
      setImagePreview(null)
      return
    }

    setMessage('')
    setImageFile(file)
    setImagePreview(file ? URL.createObjectURL(file) : null)
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')

    if (!userId) {
      setMessage('You must be logged in to submit a ticket.')
      return
    }

    if (!title.trim() || !location || !category || !description.trim()) {
      setMessage('Please fill in all required fields (marked with *).')
      return
    }

    if (!priority) {
      setMessage('Please select a priority.')
      return
    }

    setSubmitting(true)

    let imageUrl: string | null = null

    if (imageFile) {
      const filePath = `${Date.now()}-${imageFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('ticket-images')
        .upload(filePath, imageFile)

      if (uploadError) {
        setMessage('Error uploading image: ' + uploadError.message)
        setSubmitting(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('ticket-images')
        .getPublicUrl(filePath)

      imageUrl = publicUrlData.publicUrl
    }

    const { data: newTicket, error } = await supabase
      .from('tickets')
      .insert([
        {
          title: title,
          description: description,
          category: category,
          priority: priority,
          location: location,
          image_url: imageUrl,
          requester_id: userId
        }
      ])
      .select()
      .single()

    if (error) {
      setMessage('Error: ' + error.message)
    } else {
      const { data: itStaff } = await supabase.rpc('get_it_staff_ids')

      if (itStaff) {
        const notificationMessage = priority === 'Critical'
          ? `🔴 CRITICAL ticket: "${title}"`
          : `New ticket: "${title}"`

        for (const staff of itStaff) {
          await createNotification(staff.id, newTicket.id, notificationMessage)
        }
      }

      setMessage('Ticket submitted successfully!')
      setTitle('')
      setDescription('')
      setCategory('')
      setPriority('')
      setLocation('')
      setImageFile(null)
      setImagePreview(null)
    }

    setSubmitting(false)
  }

  const inputClass = "w-full px-3 py-2 border border-[#E2E5E7] rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5C56] focus:border-transparent"

  return (
    <div className="max-w-lg mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold text-[#1F2937] mb-1">Submit a new ticket</h1>
      <p className="text-sm text-[#6B7280] mb-6">
        Describe the issue and IT will take it from there. Fields marked with * are required.
      </p>

      {!userId && (
        <p className="text-sm text-[#B45309] mb-4">
          You're not logged in. Please{' '}
          <a href="/login" className="underline">log in</a> to submit a ticket.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-1">
            Title <span className="text-[#B91C1C]">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-1">
            Location <span className="text-[#B91C1C]">*</span>
          </label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className={inputClass}
          >
            <option value="" disabled>Select a location</option>
            {LOCATIONS.map((loc) => <option key={loc}>{loc}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-1">
            Category <span className="text-[#B91C1C]">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className={inputClass}
          >
            <option value="" disabled>Select a category</option>
            <option>EMR</option>
            <option>Network</option>
            <option>Hardware</option>
            <option>Phone</option>
            <option>Account/Password</option>
            <option>Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            required
            className={inputClass}
          >
            <option value="" disabled>Select a priority</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Critical</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-1">
            Description <span className="text-[#B91C1C]">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-1">
            Attach an image (optional)
          </label>

          <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-[#E2E5E7] rounded-lg px-4 py-6 text-center cursor-pointer hover:border-[#0F5C56] transition-colors">
            <svg className="w-6 h-6 text-[#6B7280]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-[#1F2937]">
              <span className="text-[#0F5C56] font-medium">Click to upload</span> or drag and drop
            </span>
            <span className="text-xs text-[#6B7280]">PNG, JPG up to 10MB</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>

          {imagePreview && (
            <div className="mt-3 relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-48 rounded border border-[#E2E5E7]"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-white border border-[#E2E5E7] rounded-full text-[#6B7280] hover:text-[#B91C1C] hover:border-[#B91C1C] transition-colors"
              >
                ×
              </button>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2 bg-[#0F5C56] text-white text-sm rounded hover:bg-[#0C4A45] transition-colors disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit ticket'}
        </button>
      </form>

      {message && (
        <p className={`mt-4 text-sm ${message.startsWith('Error') || message.startsWith('Please') ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}>
          {message}
        </p>
      )}
    </div>
  )
}