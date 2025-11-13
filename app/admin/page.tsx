import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyAccessToken } from '@/lib/utils/auth'

export default async function AdminPage() {
  // 1. Get the accessToken from cookies
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value

  // 2. If no token, redirect to login page
  if (!accessToken) {
    redirect('/login')
  }

  // 3. Verify the token and extract the payload
  const payload = await verifyAccessToken(accessToken!)

  // 4. If verification fails or user is not an admin → redirect to dashboard
  if (!payload || (payload.role !== 'OWNER' && payload.role !== 'ADMIN')) {
    redirect('/dashboard')
  }

  // 5. If verification succeeds, render the admin interface
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow p-8 max-w-xl w-full space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-gray-600">
          Hello, <span className="font-semibold">{payload.email}</span>. Your
          role is{' '}
          <span className="font-mono bg-gray-100 px-2 py-1 rounded">
            {payload.role}
          </span>
          .
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold mb-2">👥 User Management</h2>
            <p className="text-sm text-gray-600">
              (Here you can later add features like viewing the user list,
              inviting members, or editing roles.)
            </p>
          </div>
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold mb-2">⚙️ Team Settings</h2>
            <p className="text-sm text-gray-600">
              (This section could include team name settings, domain
              restrictions, or permission policies.)
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          This page uses **server-side authentication**: if the user is not an
          OWNER or ADMIN, they are automatically redirected to `/dashboard`.
        </p>
      </div>
    </div>
  )
}
