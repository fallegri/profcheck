'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'

interface Event {
  id: string
  name: string
  description: string
  createdAt: string
  professions?: Array<{ id: string; name: string }>
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchEvents()
    }
  }, [status])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/events')
      setEvents(response.data)
      setError(null)
    } catch (err) {
      console.error('Error fetching events:', err)
      setError('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return
    }

    try {
      await axios.delete(`/api/events/${eventId}/delete`)
      setEvents(events.filter((e) => e.id !== eventId))
    } catch (err) {
      console.error('Error deleting event:', err)
      alert('Failed to delete event')
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

  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome, {session?.user?.name}</p>
            </div>
            <Link
              href="/events/create"
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Create Event
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg mb-4">No events yet</p>
            <Link
              href="/events/create"
              className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              Create Your First Event
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {event.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {event.description}
                </p>

                <div className="mb-4">
                  <p className="text-xs text-gray-500">
                    Created: {new Date(event.createdAt).toLocaleDateString()}
                  </p>
                  {event.professions && (
                    <p className="text-xs text-gray-500">
                      Professions: {event.professions.length}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/events/${event.id}/configure`}
                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm font-medium hover:bg-blue-100 transition text-center"
                  >
                    Configure
                  </Link>
                  <Link
                    href={`/events/${event.id}/reports`}
                    className="flex-1 bg-green-50 text-green-600 px-3 py-2 rounded text-sm font-medium hover:bg-green-100 transition text-center"
                  >
                    Reports
                  </Link>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded text-sm font-medium hover:bg-red-100 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
