'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LoginButton } from '@/components/LoginButton'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      router.push('/dashboard')
    }
  }, [status, session, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-auto px-6 py-12 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Professional Wheel
          </h1>
          <p className="text-gray-600 text-lg">
            Explore careers and discover your future
          </p>
        </div>

        <div className="space-y-6">
          <p className="text-gray-700 text-center">
            Welcome to Event Professional Wheel, an interactive platform where visitors can explore different professions through an engaging wheel interface. Administrators can create events, configure professions, and analyze visitor selections.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="font-semibold text-blue-900 mb-2">Features:</h2>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Interactive profession wheel</li>
              <li>✓ Real-time selection tracking</li>
              <li>✓ Detailed analytics and reports</li>
              <li>✓ Google Drive integration</li>
              <li>✓ Secure OAuth authentication</li>
            </ul>
          </div>

          <div className="pt-4">
            <LoginButton />
          </div>

          <p className="text-xs text-gray-500 text-center">
            Sign in with your Google account to get started
          </p>
        </div>
      </div>
    </div>
  )
}
