import React, { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../lib/apiClient'
import { useAuth } from '../hooks/useAuth'

interface Room {
  id: string
  class_id: string
  created_at: string
  classes: { name: string; section: string }
}

interface Message {
  id: string
  sender_id: string
  message: string
  created_at: string
  users: { full_name: string }
}

export default function ChatPage() {
  const { user } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [sending, setSending] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [classes, setClasses] = useState<{ id: string; name: string; section: string }[]>([])
  const [newRoomClass, setNewRoomClass] = useState('')
  const [creatingRoom, setCreatingRoom] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeRoomRef = useRef<Room | null>(null)

  const currentUserId = (user as any)?.id

  // Keep ref in sync with state
  useEffect(() => {
    activeRoomRef.current = activeRoom
  }, [activeRoom])

  // Load rooms
  useEffect(() => {
    api.get('/api/chat/rooms')
      .then(res => setRooms(res.data?.value ?? res.data ?? []))
      .catch(() => toast.error('Failed to load chat rooms'))
      .finally(() => setLoadingRooms(false))
    api.get('/api/classes')
      .then(res => setClasses(res.data?.value ?? res.data ?? []))
      .catch(() => {})
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = useCallback(async (roomId: string) => {
    try {
      const res = await api.get(`/api/chat/rooms/${roomId}/messages`, {
        params: { limit: 100 }
      })
      const list: Message[] = res.data?.value ?? res.data ?? []
      setMessages(list.slice().reverse())
    } catch {
      // silent on poll failures
    }
  }, [])

  // Start/stop polling when active room changes
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (!activeRoom) return
    loadMessages(activeRoom.id)
    pollRef.current = setInterval(() => {
      if (activeRoomRef.current) loadMessages(activeRoomRef.current.id)
    }, 5000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [activeRoom, loadMessages])

  async function sendMessage() {
    if (!text.trim() || !activeRoom) return
    const draft = text.trim()
    setText('')

    // Optimistic message
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId ?? '',
      message: draft,
      created_at: new Date().toISOString(),
      users: { full_name: (user as any)?.full_name ?? 'You' }
    }
    setMessages(prev => [...prev, optimistic])

    setSending(true)
    try {
      await api.post(`/api/chat/rooms/${activeRoom.id}/messages`, { message: draft })
      await loadMessages(activeRoom.id)
    } catch (e: any) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setText(draft)
      toast.error(e?.response?.data?.message ?? 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  async function createRoom() {
    if (!newRoomClass) return toast.error('Select a class')
    setCreatingRoom(true)
    try {
      await api.post('/api/chat/rooms', { class_id: newRoomClass })
      toast.success('Room created')
      const res = await api.get('/api/chat/rooms')
      setRooms(res.data?.value ?? res.data ?? [])
      setShowCreateModal(false)
      setNewRoomClass('')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Failed to create room')
    } finally {
      setCreatingRoom(false)
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-NG', {
      day: '2-digit', month: 'short', year: 'numeric'
    })
  }

  // Group messages by date — use index in key to avoid duplicate date keys
  const grouped = messages.reduce<{ date: string; items: Message[] }[]>((groups, msg) => {
    const date = formatDate(msg.created_at)
    const last = groups[groups.length - 1]
    if (last?.date === date) last.items.push(msg)
    else groups.push({ date, items: [msg] })
    return groups
  }, [])

  const inp = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chat</h1>
          <p className="text-sm text-gray-500">Class-based messaging</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Room
        </button>
      </div>

      <div className="flex gap-4 h-[70vh]">
        {/* Room list */}
        <div className="w-64 shrink-0 bg-white border rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b text-xs text-gray-500 uppercase tracking-wide font-medium">
            Rooms ({rooms.length})
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingRooms ? (
              <div className="p-4 space-y-2 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg" />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <div className="p-4 text-sm text-gray-400 text-center">No rooms yet</div>
            ) : (
              rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => { setMessages([]); setActiveRoom(room) }}
                  className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${
                    activeRoom?.id === room.id
                      ? 'bg-violet-50 border-l-2 border-l-violet-600'
                      : ''
                  }`}
                >
                  <div className="font-medium text-sm text-gray-900">{room.classes?.name}</div>
                  <div className="text-xs text-gray-500">Section {room.classes?.section}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message area */}
        <div className="flex-1 bg-white border rounded-xl flex flex-col overflow-hidden">
          {!activeRoom ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Select a room to start chatting
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm">
                  {activeRoom.classes?.name[0]}
                </div>
                <div>
                  <div className="font-medium text-sm">{activeRoom.classes?.name}</div>
                  <div className="text-xs text-gray-500">Section {activeRoom.classes?.section}</div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {grouped.map(({ date, items }, groupIdx) => (
                  <div key={`${date}-${groupIdx}`}>
                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-xs text-gray-400">{date}</span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                    <div className="space-y-2">
                      {items.map(msg => {
                        const isMe = msg.sender_id === currentUserId
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs lg:max-w-md flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              {!isMe && (
                                <span className="text-xs text-violet-600 font-medium mb-0.5 px-1">
                                  {msg.users?.full_name}
                                </span>
                              )}
                              <div className={`px-3 py-2 rounded-2xl text-sm ${
                                isMe
                                  ? 'bg-violet-600 text-white rounded-tr-sm'
                                  : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                              }`}>
                                {msg.message}
                              </div>
                              <span className="text-xs text-gray-400 mt-0.5 px-1">
                                {formatTime(msg.created_at)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t flex gap-2">
                <input
                  className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  placeholder="Type a message…"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || !text.trim()}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-full disabled:opacity-50 transition-colors"
                >
                  {sending ? '…' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create room modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Create Chat Room</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select className={inp} value={newRoomClass} onChange={e => setNewRoomClass(e.target.value)}>
                <option value="">— Select Class —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
              </select>
            </div>
            <button
              onClick={createRoom}
              disabled={creatingRoom}
              className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg disabled:opacity-60 transition-colors"
            >
              {creatingRoom ? 'Creating…' : 'Create Room'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}