'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import axios from 'axios'

// Prevent prerendering this page
export const dynamic = 'force-dynamic'

interface Selection {
  professionId: string
  professionName: string
  count: number
  percentage: string
}

interface ReportData {
  total: number
  selections: Selection[]
  limit: number
  offset: number
}

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const eventId = (params?.id as string) || ''

  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated' && eventId) {
      fetchReport()
    }
  }, [status, eventId])

  const fetchReport = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/events/${eventId}/selections`)
      setReport(response.data)
      setError(null)
    } catch (err) {
      console.error('Error fetching report:', err)
      setError('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      setExporting(true)
      const response = await axios.get(
        `/api/events/${eventId}/selections/export`,
        {
          responseType: 'blob',
        }
      )

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute(
        'download',
        `selections_${eventId}_${new Date().toISOString().split('T')[0]}.csv`
      )
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting selections:', err)
      alert('Failed to export selections')
    } finally {
      setExporting(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.back()}
            className="text-indigo-600 hover:text-indigo-700 mb-4"
          >
            ← Back
          </button>
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Selection Reports</h1>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {report && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Total Selections</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {report.total}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Unique Professions</p>
                  <p className="text-3xl font-bold text-green-600">
                    {report.selections.length}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Most Popular</p>
                  <p className="text-lg font-bold text-purple-600">
                    {report.selections.length > 0
                      ? report.selections[0].professionName
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Selections by Profession
                </h2>
              </div>

              {report.selections.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-600">No selections yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Profession
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Count
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Percentage
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Visualization
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {report.selections.map((selection) => (
                        <tr key={selection.professionId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {selection.professionName}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {selection.count}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {selection.percentage}%
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{
                                  width: `${parseFloat(selection.percentage)}%`,
                                }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Chart */}
            {report.selections.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Distribution Chart
                </h2>
                <div className="space-y-4">
                  {report.selections.map((selection) => (
                    <div key={selection.professionId}>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {selection.professionName}
                        </span>
                        <span className="text-sm text-gray-600">
                          {selection.count} ({selection.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-3 rounded-full"
                          style={{
                            width: `${parseFloat(selection.percentage)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
