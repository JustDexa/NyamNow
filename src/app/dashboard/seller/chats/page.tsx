'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, MessageSquare, Search, ChevronLeft } from 'lucide-react'
import NavbarSeller from '../components/Navbar' 

interface Message {
  id: string
  sender_id: string
  message: string
  created_at: string
}

interface Conversation {
  id: string
  buyer_id: string
  users: { first_name: string; last_name: string } 
  last_message?: string
}

export default function SellerChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeChat, setActiveChat] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const initSellerChat = async () => {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserId(user.id)

      const { data: store } = await supabase.from('stores').select('id').eq('user_id', user.id).single()
      if (!store) return

      const { data: convs } = await supabase
        .from('conversations')
        .select(`
          id, buyer_id,
          users!conversations_buyer_id_fkey ( first_name, last_name )
        `)
        .eq('store_id', store.id)

      // ✅ FIX: Gak pake 'any' lagi biar ESLint seneng
      if (convs) setConversations(convs as unknown as Conversation[])
      setIsLoading(false)
    }

    initSellerChat()
  }, [])

  useEffect(() => {
    if (!activeChat) return

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeChat.id)
        .order('created_at', { ascending: true })
      if (data) setMessages(data)
    }

    fetchMessages()

    const channel = supabase
      .channel(`room_${activeChat.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${activeChat.id}` 
      }, (payload) => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new as Message]
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeChat])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeChat || !currentUserId) return

    const msgText = newMessage
    setNewMessage('')

    const { data, error } = await supabase.from('messages').insert({
      conversation_id: activeChat.id,
      sender_id: currentUserId,
      message: msgText
    }).select().single()

    if (!error && data) {
      setMessages(prev => [...prev, data])
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#FDFCF8]">
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR DAFTAR CHAT */}
        <div className={`w-full md:w-80 lg:w-96 bg-white border-r border-gray-100 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-50 bg-white">
            <h2 className="text-xl font-black text-gray-900 mb-4 tracking-tight">Pesan Pembeli</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Cari pembeli..." className="w-full bg-gray-50 border-none rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold outline-none focus:ring-2 ring-[#B89B6D]/20 transition-all" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {isLoading ? (
              <div className="p-8 text-center text-xs font-bold text-gray-400 animate-pulse">Memuat obrolan...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare size={40} className="mx-auto text-gray-100 mb-2" />
                <p className="text-xs font-bold text-gray-400">Belum ada chat masuk bejir.</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div 
                  key={conv.id} 
                  onClick={() => setActiveChat(conv)}
                  className={`p-4 flex items-center gap-3 cursor-pointer transition-all border-b border-gray-50 ${activeChat?.id === conv.id ? 'bg-[#FAF4EB] border-l-4 border-l-[#B89B6D]' : 'hover:bg-gray-50'}`}
                >
                  <div className="w-12 h-12 bg-[#B89B6D]/10 rounded-full flex items-center justify-center text-[#B89B6D] shrink-0 font-black uppercase">
                    {conv.users?.first_name?.[0] || 'P'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className="text-sm font-black text-gray-900 truncate">{conv.users?.first_name} {conv.users?.last_name}</h4>
                    </div>
                    <p className="text-[11px] font-bold text-gray-400 truncate">Klik untuk membalas pesan...</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MAIN CHAT AREA */}
        <div className={`flex-1 flex flex-col bg-[#FDFCF8] ${!activeChat ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
          {activeChat ? (
            <>
              {/* Header Chat */}
              <div className="h-16 bg-white border-b border-gray-100 flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveChat(null)} className="md:hidden text-gray-400"><ChevronLeft /></button>
                  <div className="w-10 h-10 bg-[#B89B6D] rounded-full flex items-center justify-center text-white font-black text-xs uppercase">
                    {activeChat.users?.first_name?.[0] || 'P'}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 leading-none">{activeChat.users?.first_name} {activeChat.users?.last_name}</h3>
                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest mt-1 inline-block">Pembeli</span>
                  </div>
                </div>
              </div>

              {/* Messages Bubble */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === currentUserId
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm font-bold shadow-sm ${
                        isMe ? 'bg-[#3D3A40] text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                      }`}>
                        {msg.message}
                        <p className={`text-[8px] mt-1 opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={scrollRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-2 shrink-0">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Balas pesan pembeli..." 
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B89B6D] focus:bg-white transition-all"
                />
                <button type="submit" className="bg-[#B89B6D] text-white p-3 rounded-xl shadow-md hover:bg-[#a08055] transition-colors">
                  <Send size={20} />
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-200">
                <MessageSquare size={40} />
              </div>
              <h3 className="text-lg font-black text-gray-300 uppercase tracking-tighter">Pilih obrolan untuk memulai</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}