'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import axios from 'axios'

// Prevent prerendering this page
export const dynamic = 'force-dynamic'

interface Profession {
  id: string
  name: string
}

interface EventData {
  id: string
  name: string
  description: string
  googleFolderUrl?: string
}

export default function ConfigureEvent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const eventId = (params?.id as string) || ''

  const [event, setEvent] = useState<EventData | null>(null)
  const [professions, setProfessions] = useState<Profession[]>([])
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && eventId) {
      fetchEventAndProfessions()
    }
  }, [status, eventId])

  const fetchEventAndProfessions = async () => {
    try {
      setLoading(true)
      const [eventRes, professionsRes] = await Promise.all([
        axios.get(`/api/events/${eventId}`),
        axios.get('/api/professions/list'),
      ])

      setEvent(eventRes.data)
      setProfessions(professionsRes.data)

      // Get configured professions for this event
      const configuredRes = await axios.get(
        `/api/events/${eventId}/professions`
      )
      setSelectedProfessions(configuredRes.data.map((p: any) => p.id))

      setError(null)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load event data')
    } finally {
      setLoading(false)
    }
  }

  const handleProfessionToggle = (professionId: string) => {
    setSelectedProfessions((prev) =>
      prev.includes(professionId)
        ? prev.filter((id) => id !== professionId)
        : [...prev, professionId]
    )
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await axios.post(`/api/events/${eventId}/professions/configure`, {
        professionIds: selectedProfessions,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving professions:', err)
      setError('Failed to save professions')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Event not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.back()}
            className="text-indigo-600 hover:text-indigo-700 mb-4"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Configure Event: {event.name}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">Professions saved successfully!</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Event Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <p className="mt-1 text-gray-900">{event.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <p className="mt-1 text-gray-900">{event.description}</p>
            </div>
            {event.googleFolderUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Google Drive Folder
                </label>
                <a
                  href={event.googleFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 text-indigo-600 hover:text-indigo-700 underline"
                >
                  Open in Google Drive
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Select Professions
          </h2>
          <p className="text-gray-600 mb-6">
            Choose which professions will be available in the wheel for this
            event
          </p>

          <div className="space-y-3 mb-6">
            {professions.map((profession) => (
              <label
                key={profession.id}
                className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedProfessions.includes(profession.id)}
                  onChange={() => handleProfessionToggle(profession.id)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="ml-3 text-gray-900">{profession.name}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Professions'}
            </button>
            <button
              onClick={() => router.back()}
              className="bg-gray-200 text-gray-900 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
