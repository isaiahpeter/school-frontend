import { useEffect, useState } from 'react'
import { api } from '../lib/apiClient'

type VisitorEvent = {
  id?: string
  timestamp?: string
  camera_id?: string
  image_url?: string
  image_hash?: string
}

export default function VisitorsPage() {
  const [events, setEvents] = useState<VisitorEvent[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await api.get<VisitorEvent[]>('/api/camera/events')
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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Visitors</h1>
        <p className="text-sm text-gray-600">Camera capture events</p>
      </div>

      <div className="bg-white border rounded-xl p-4">
        {loading ? (
          <div className="text-sm text-gray-600">Loading...</div>
        ) : events.length === 0 ? (
          <div className="text-sm text-gray-600">No events.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr className="border-t">
                  <th className="py-2 pr-3">Timestamp</th>
                  <th className="py-2 pr-3">Camera</th>
                  <th className="py-2">Image</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id ?? `${e.timestamp}-${e.camera_id}`} className="border-t">
                    <td className="py-3 pr-3">{e.timestamp ?? '—'}</td>
                    <td className="py-3 pr-3">{e.camera_id ?? '—'}</td>
                    <td className="py-3">
                      {e.image_url ? (
                        <img src={e.image_url} alt="" className="h-16 w-16 object-cover rounded" />
                      ) : (
                        <span className="text-gray-400">No image</span>
                      )}
                      {e.image_hash ? <div className="text-[11px] text-gray-500 mt-1">Hash: {e.image_hash}</div> : null}
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

