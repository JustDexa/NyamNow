'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, ChevronLeft } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'

interface Message {
  id: string
  sender_id: string
  message: string
  created_at: string
}

export default function ChatRoom() {
  const { id: conversationId } = useParams()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  const [storeInfo, setStoreInfo] = useState({ 
    name: 'Loading...', 
    profile_image_url: '/images/iconNyamnow.png' 
  })
  
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const initChat = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)

      const { data: convData } = await supabase
        .from('conversations')
        .select('stores(name, profile_image_url)') 
        .eq('id', conversationId)
        .single()
      
      if (convData && convData.stores) {
        const storeData = Array.isArray(convData.stores) ? convData.stores[0] : convData.stores
        setStoreInfo({ 
          name: storeData?.name || 'Penjual',
          profile_image_url: storeData?.profile_image_url || '/images/iconNyamnow.png'
        })
      }

      const { data: msgData } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (msgData) setMessages(msgData)

      const channel = supabase
        .channel(`chat_${conversationId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}` 
        }, (payload) => {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev
            return [...prev, payload.new as Message]
          })
        })
        .subscribe()

      return () => { supabase.removeChannel(channel) }
    }

    initChat()
  }, [conversationId])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUserId) return

    const messageText = newMessage
    setNewMessage('') 
    const { data, error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      message: messageText
    }).select().single()

    if (error) {
      alert("Gagal kirim pesan.")
    } else if (data) {
      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev
        return [...prev, data]
      })
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#FDFCF8] text-left">
      {/* HEADER CHAT */}
      <div className="h-[72px] bg-[#CBAE81] flex items-center px-4 gap-3 shadow-sm shrink-0 z-10 relative">
        <button onClick={() => router.back()} className="text-white hover:bg-white/10 p-2 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        
        <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center border-2 border-white/50 overflow-hidden shrink-0 shadow-sm">
          <img 
            src={storeInfo.profile_image_url} 
            alt={storeInfo.name} 
            className="w-full h-full object-cover"
            onError={(e) => e.currentTarget.src = '/images/iconNyamnow.png'}
          />
        </div>
        
        <div className="flex flex-col overflow-hidden">
          <span className="text-base font-black text-white leading-tight truncate">{storeInfo.name}</span>
          <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest mt-0.5">Penjual</span>
        </div>
      </div>

      {/* AREA PESAN */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm font-bold shadow-sm ${
                isMe ? 'bg-[#B89B6D] text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
              }`}>
                {msg.message}
                <p className={`text-[9px] mt-1.5 opacity-60 font-black ${isMe ? 'text-right text-white/80' : 'text-left text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={scrollRef} />
      </div>

      {/* INPUT CHAT */}
      <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-2 shrink-0 relative z-10">
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Ketik pesan..." 
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#B89B6D] focus:bg-white transition-all shadow-inner"
        />
        <button type="submit" className="bg-[#B89B6D] text-white p-3 rounded-xl shadow-md hover:bg-[#a08055] hover:shadow-lg transition-all active:scale-95">
          <Send size={20} />
        </button>
      </form>
    </div>
  )
}