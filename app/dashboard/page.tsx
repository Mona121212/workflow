'use client'

import { useAuthStore } from '@/stores/auth-store'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const { user, tenant, role, logout } = useAuthStore()
  const router = useRouter()
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    logout()
    router.push('/login')
  }

  const isAdmin = role === 'OWNER' || role === 'ADMIN' // define them as admin
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.firstName || user?.email}! 👋
        </h1>
        <p className="mt-2 text-gray-600">
          This is your workspace in{' '}
          <span className="font-semibold">{tenant?.name}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">24</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
          <p className="mt-2 text-sm text-green-600">+12% this week</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔄</span>
            </div>
          </div>
          <p className="mt-2 text-sm text-yellow-600">3 due soon</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✨</span>
            </div>
          </div>
          <p className="mt-2 text-sm text-green-600">5 completed this week</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Team Members</p>
              <p className="text-2xl font-bold text-gray-900">1</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600">Your role: {role}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Recent Activity
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="w-2 h-2 mt-2 bg-blue-600 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  <span className="font-semibold">You</span> created your
                  account
                </p>
                <p className="text-xs text-gray-500">Just now</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-2 h-2 mt-2 bg-green-600 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  Team <span className="font-semibold">{tenant?.name}</span> was
                  created
                </p>
                <p className="text-xs text-gray-500">Just now</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <span className="text-2xl mb-2 block">➕</span>
            <span className="text-sm font-medium text-gray-700">
              Create Task
            </span>
          </button>

          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <span className="text-2xl mb-2 block">📁</span>
            <span className="text-sm font-medium text-gray-700">
              New Project
            </span>
          </button>

          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
            <span className="text-2xl mb-2 block">👥</span>
            <span className="text-sm font-medium text-gray-700">
              Invite Members
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
