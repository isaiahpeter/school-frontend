import { useEffect, useState } from 'react'
import { api } from '../lib/apiClient'

type EventRow = {
  id?: string
  timestamp?: string
  camera_id?: string
  image_url?: string
}

export default function DashboardPage() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Spec in prompt mentions /api/camera/events; OpenAPI snippet provided earlier did not include it.
        // We'll call it defensively.
        const res = await api.get<EventRow[]>('/api/camera/events', { params: { limit: 5 } })
        setEvents(res.data ?? [])
      } catch {
        setEvents([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-600">Recent visitor/camera activity</p>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="font-medium">Recent events</div>
          <a className="text-sm" href="/visitors">View all →</a>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-gray-600">Loading...</div>
        ) : events.length === 0 ? (
          <div className="mt-4 text-sm text-gray-600">No events found.</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Camera</th>
                  <th className="py-2">Image</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 10).map((e, idx) => (
                  <tr key={e.id ?? idx} className="border-t">
                    <td className="py-3 pr-3">{e.timestamp ?? '—'}</td>
                    <td className="py-3 pr-3">{e.camera_id ?? '—'}</td>
                    <td className="py-3">
                      {e.image_url ? (
                        <img src={e.image_url} alt="" className="h-12 w-12 object-cover rounded" />
                      ) : (
                        <div className="text-gray-400">No image</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

