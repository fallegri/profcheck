'use client'

import nextDynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import { useVisitorSession } from '@/hooks/useVisitorSession'

// Prevent prerendering this page
export const dynamic = 'force-dynamic'

// Lazy-load heavy canvas components — no SSR needed
const ProfessionWheel = nextDynamic(
  () => import('@/components/ProfessionWheel').then((m) => ({ default: m.ProfessionWheel })),
  { ssr: false }
)
const ProfessionPanel = nextDynamic(
  () => import('@/components/ProfessionPanel').then((m) => ({ default: m.ProfessionPanel })),
  { ssr: false }
)

interface Profession {
  id: string
  name: string
  description: string
  futureInfo: string
  imageUrl?: string
}

/** localStorage cache TTL: 5 minutes in milliseconds */
const PROFESSIONS_CACHE_TTL = 5 * 60 * 1000

interface CachedProfessions {
  data: Profession[]
  expiresAt: number
}

function getProfessionsFromCache(eventId: string): Profession[] | null {
  try {
    const raw = localStorage.getItem(`professions:${eventId}`)
    if (!raw) return null
    const cached: CachedProfessions = JSON.parse(raw)
    if (Date.now() > cached.expiresAt) {
      localStorage.removeItem(`professions:${eventId}`)
      return null
    }
    return cached.data
  } catch {
    return null
  }
}

function setProfessionsCache(eventId: string, data: Profession[]): void {
  try {
    const entry: CachedProfessions = { data, expiresAt: Date.now() + PROFESSIONS_CACHE_TTL }
    localStorage.setItem(`professions:${eventId}`, JSON.stringify(entry))
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded) — ignore
  }
}

export default function WheelPage() {
  const params = useParams()
  const eventId = (params?.id as string) || ''
  const { sessionId } = useVisitorSession(eventId)

  const [professions, setProfessions] = useState<Profession[]>([])
  const [selectedProfession, setSelectedProfession] = useState<Profession | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)

  useEffect(() => {
    if (eventId) {
      fetchProfessions()
    }
  }, [eventId])

  const fetchProfessions = async () => {
    // Check localStorage cache first
    const cached = getProfessionsFromCache(eventId)
    if (cached) {
      setProfessions(cached)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await axios.get(`/api/events/${eventId}/professions`)
      const data: Profession[] = response.data?.data ?? response.data
      setProfessions(data)
      setProfessionsCache(eventId, data)
      setError(null)
    } catch (err) {
      console.error('Error fetching professions:', err)
      setError('Failed to load professions')
    } finally {
      setLoading(false)
    }
  }

  const handleProfessionSelect = async (profession: Profession) => {
    setSelectedProfession(profession)

    // Record selection in background
    if (sessionId) {
      try {
        setRecording(true)
        await axios.post('/api/selections/record', {
          eventId,
          professionId: profession.id,
          sessionId,
        })
      } catch (err) {
        console.error('Error recording selection:', err)
        // Don't show error to user, just log it
      } finally {
        setRecording(false)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading professions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchProfessions}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (professions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">No professions available for this event</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedProfession ? (
          <ProfessionPanel
            profession={selectedProfession as any}
            onClose={() => setSelectedProfession(null)}
          />
        ) : (
          <div>
            <h1 className="text-4xl font-bold text-center text-gray-900 mb-2">
              Explore Professions
            </h1>
            <p className="text-center text-gray-600 mb-8">
              Click on a profession to learn more about your future career
            </p>

            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="h-96">
                <ProfessionWheel
                  professions={professions as any}
                  onSelect={handleProfessionSelect as any}
                  isLoading={loading}
                />
              </div>
            </div>

            <p className="text-center text-gray-500 text-sm mt-8">
              Session ID: {sessionId}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
