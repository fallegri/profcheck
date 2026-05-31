'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ErrorEntry {
  timestamp: string
  errorCode: string
  statusCode: number
  message: string
  context: string
  userAgent?: string
  ip?: string
  method?: string
  url?: string
}

interface ErrorStatistics {
  total: number
  byCode: Record<string, number>
  byStatus: Record<number, number>
  recent: ErrorEntry[]
}

interface RateLimitIdentifier {
  identifier: string
  requestCount: number
  oldestRequest: string | null
}

interface RateLimitStats {
  totalTrackedIdentifiers: number
  identifiers: RateLimitIdentifier[]
}

interface MonitoringData {
  statistics: ErrorStatistics
  recentErrors: ErrorEntry[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ code }: { code: number }) {
  const color =
    code >= 500 ? 'bg-red-100 text-red-800' :
    code >= 400 ? 'bg-yellow-100 text-yellow-800' :
    'bg-green-100 text-green-800'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {code}
    </span>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MonitoringDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [monitoring, setMonitoring] = useState<MonitoringData | null>(null)
  const [rateLimits, setRateLimits] = useState<RateLimitStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [errorsRes, rateLimitRes] = await Promise.allSettled([
        axios.get<{ success: boolean; data: MonitoringData }>('/api/admin/errors?limit=50'),
        axios.get<{ success: boolean; data: RateLimitStats }>('/api/admin/rate-limits'),
      ])

      if (errorsRes.status === 'fulfilled') {
        setMonitoring(errorsRes.value.data.data)
      } else {
        // Errors endpoint failed – show partial data
        setError('Could not load error statistics.')
      }

      if (rateLimitRes.status === 'fulfilled') {
        setRateLimits(rateLimitRes.value.data.data)
      }
      // Rate-limit endpoint is optional; silently ignore if unavailable

      setLastRefresh(new Date())
    } catch (err) {
      console.error('Monitoring fetch error:', err)
      setError('Failed to load monitoring data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData()
    }
  }, [status, fetchData])

  // ── Loading / auth guards ──────────────────────────────────────────────────

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading monitoring data…</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const stats = monitoring?.statistics
  const recentErrors = monitoring?.recentErrors ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Monitoring Dashboard</h1>
              <p className="text-gray-500 text-sm mt-1">
                Logged in as <span className="font-medium">{session?.user?.name}</span>
                {lastRefresh && (
                  <> · Last refreshed {lastRefresh.toLocaleTimeString()}</>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchData}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
              >
                Refresh
              </button>
              <Link
                href="/dashboard"
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
              >
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* ── System Status ─────────────────────────────────────────────── */}
        <SectionCard title="System Status">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{stats?.total ?? '—'}</p>
              <p className="text-xs text-gray-500 mt-1">Total Errors (in memory)</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-red-600">
                {stats ? (stats.byStatus[500] ?? 0) + (stats.byStatus[503] ?? 0) : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">5xx Errors</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">
                {stats
                  ? Object.entries(stats.byStatus)
                      .filter(([code]) => Number(code) >= 400 && Number(code) < 500)
                      .reduce((sum, [, count]) => sum + count, 0)
                  : '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">4xx Errors</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-indigo-600">
                {rateLimits?.totalTrackedIdentifiers ?? '—'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Rate-Limited Clients</p>
            </div>
          </div>
        </SectionCard>

        {/* ── Errors by Code ────────────────────────────────────────────── */}
        {stats && Object.keys(stats.byCode).length > 0 && (
          <SectionCard title="Errors by Code">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 font-medium text-gray-600">Error Code</th>
                    <th className="text-right py-2 font-medium text-gray-600">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(stats.byCode)
                    .sort(([, a], [, b]) => b - a)
                    .map(([code, count]) => (
                      <tr key={code} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-4 font-mono text-gray-800">{code}</td>
                        <td className="py-2 text-right text-gray-700">{count}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* ── Errors by HTTP Status ─────────────────────────────────────── */}
        {stats && Object.keys(stats.byStatus).length > 0 && (
          <SectionCard title="Errors by HTTP Status">
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.byStatus)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <StatusBadge code={Number(status)} />
                    <span className="text-sm text-gray-700 font-medium">{count}</span>
                  </div>
                ))}
            </div>
          </SectionCard>
        )}

        {/* ── Recent Errors ─────────────────────────────────────────────── */}
        <SectionCard title="Recent Errors (last 50)">
          {recentErrors.length === 0 ? (
            <p className="text-gray-500 text-sm">No errors recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-3 font-medium text-gray-600 whitespace-nowrap">Time</th>
                    <th className="text-left py-2 pr-3 font-medium text-gray-600">Status</th>
                    <th className="text-left py-2 pr-3 font-medium text-gray-600">Code</th>
                    <th className="text-left py-2 pr-3 font-medium text-gray-600">Message</th>
                    <th className="text-left py-2 font-medium text-gray-600">Context</th>
                  </tr>
                </thead>
                <tbody>
                  {[...recentErrors].reverse().map((entry, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-2 pr-3">
                        <StatusBadge code={entry.statusCode} />
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs text-gray-700">{entry.errorCode}</td>
                      <td className="py-2 pr-3 text-gray-800 max-w-xs truncate">{entry.message}</td>
                      <td className="py-2 text-gray-500 text-xs max-w-xs truncate">{entry.context}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* ── Rate Limiting ─────────────────────────────────────────────── */}
        <SectionCard title="Rate Limiting">
          {!rateLimits ? (
            <p className="text-gray-500 text-sm">Rate limit data unavailable.</p>
          ) : rateLimits.identifiers.length === 0 ? (
            <p className="text-gray-500 text-sm">No clients currently tracked.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 font-medium text-gray-600">Client</th>
                    <th className="text-right py-2 pr-4 font-medium text-gray-600">Requests</th>
                    <th className="text-left py-2 font-medium text-gray-600">Oldest Request</th>
                  </tr>
                </thead>
                <tbody>
                  {rateLimits.identifiers
                    .sort((a, b) => b.requestCount - a.requestCount)
                    .slice(0, 20)
                    .map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-4 font-mono text-xs text-gray-700 max-w-xs truncate">
                          {item.identifier}
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-800 font-medium">
                          {item.requestCount}
                        </td>
                        <td className="py-2 text-gray-500 text-xs">
                          {item.oldestRequest
                            ? new Date(item.oldestRequest).toLocaleTimeString()
                            : '—'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {rateLimits.identifiers.length > 20 && (
                <p className="text-xs text-gray-400 mt-2">
                  Showing top 20 of {rateLimits.identifiers.length} tracked clients.
                </p>
              )}
            </div>
          )}
        </SectionCard>

      </div>
    </div>
  )
}
