import React, { useEffect, useRef, useState } from 'react'
import { api } from '../lib/apiClient'

export default function CapturePage() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [cameraError, setCameraError] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [event, setEvent] = useState<any>(null)

  // Example camera_id; in real UI this should be a dropdown.
  const cameraId = 'reception'

  useEffect(() => {
    async function start() {
      setCameraError(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch (e: any) {
        setCameraError(e?.message ?? 'Unable to access camera')
      }
    }
    start()

    return () => {
      const v = videoRef.current
      const s = v?.srcObject as MediaStream | null
      s?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function capture() {
    if (!videoRef.current || !canvasRef.current) return
    setCapturing(true)
    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const w = video.videoWidth
      const h = video.videoHeight
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('No canvas context')
      ctx.drawImage(video, 0, 0, w, h)

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      if (!blob) throw new Error('Failed to capture image')

      const fd = new FormData()
      fd.append('image', blob, 'capture.jpg')
      fd.append('camera_id', cameraId)

      // Spec in prompt: POST /api/camera/capture (multipart/form-data)
      const res = await api.post('/api/camera/capture', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setEvent(res.data)
    } finally {
      setCapturing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Capture</h1>
        <p className="text-sm text-gray-600">Take a photo and send it to the backend</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border rounded-xl p-4">
          {cameraError ? <div className="text-sm text-red-600">{cameraError}</div> : null}
          <video ref={videoRef} className="w-full rounded-lg bg-black" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />

          <button
            disabled={capturing}
            className="mt-4 w-full rounded-lg py-2 px-3 text-white font-medium"
            style={{ background: 'var(--school-primary, #7c3aed)' }}
            onClick={capture}
          >
            {capturing ? 'Capturing...' : 'Capture'}
          </button>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <div className="font-medium mb-2">Last capture</div>
          {event ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Timestamp: {event.timestamp ?? '—'}</div>
              <div className="text-sm text-gray-600">Camera: {event.camera_id ?? cameraId}</div>
              {event.image_hash ? <div className="text-sm text-gray-600">Hash: {event.image_hash}</div> : null}
              {event.image_url ? (
                <img src={event.image_url} alt="Captured" className="mt-2 h-48 w-full object-cover rounded" />
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-gray-600">No capture yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}

