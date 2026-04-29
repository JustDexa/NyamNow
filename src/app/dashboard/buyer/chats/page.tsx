'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { Send, MessageSquare, Search, ChevronLeft, Store } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import NavbarBuyer from '@/components/NavbarBuyer'

interface Message {
  id: string
  sender_id: string
  message: string
  created_at: string
}

interface Conversation {
  id: string
  store_id: string
  stores: { name: string; profile_image_url: string } 
}

// ✅ 1. Komponen isi Chat kita pisah ke sini
function ChatContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetId = searchParams.get('id') // Buat nangkep id dari tombol "Hubungi Penjual"

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeChat, setActiveChat] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const initBuyerChats = async () => {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      setCurrentUserId(user.id)

      // Ambil nama user buat Navbar
      const { data: userData } = await supabase.from('users').select('first_name').eq('id', user.id).single()
      if (userData) setUserName(userData.first_name)

      // 1. Tarik daftar percakapan (Toko-toko yang pernah di-chat)
      const { data: convs } = await supabase
        .from('conversations')
        .select(`
          id, store_id,
          stores!conversations_store_id_fkey ( name, profile_image_url )
        `)
        .eq('buyer_id', user.id)

      if (convs) {
        const mappedConvs = convs as unknown as Conversation[]
        setConversations(mappedConvs)

        // 2. Kalau ada ?id= di URL, otomatis buka chat itu
        if (targetId) {
          const found = mappedConvs.find(c => c.id === targetId)
          if (found) setActiveChat(found)
        }
      }
      setIsLoading(false)
    }

    initBuyerChats()
  }, [targetId, router])

  // LOAD PESAN SAAT CHAT DIPILIH
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
      .channel(`buyer_room_${activeChat.id}`)
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
    scrollRef.current?.scrollIntoView({ behavior: 'auto' })
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
    <div className="flex flex-col h-screen overflow-hidden bg-[#FDFCF8] text-left">
      <NavbarBuyer userName={userName} handleLogout={() => supabase.auth.signOut().then(() => router.push('/login'))} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR: DAFTAR TOKO */}
        <div className={`w-full md:w-80 lg:w-96 bg-white border-r border-gray-100 flex flex-col h-full ${activeChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-50 bg-white shrink-0">
            <h2 className="text-xl font-black text-gray-900 mb-4 tracking-tight">Chat Toko</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Cari toko..." className="w-full bg-gray-50 border-none rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold outline-none focus:ring-2 ring-[#B89B6D]/20 transition-all text-gray-900" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {isLoading ? (
              <div className="p-8 text-center text-xs font-bold text-gray-400 animate-pulse">Memuat chat...</div>
            ) : conversations.length === 0 ? (
              <div className="p-12 text-center">
                <MessageSquare size={40} className="mx-auto text-gray-100 mb-2" />
                <p className="text-xs font-bold text-gray-400">Belum pernah chat toko bejir.</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div 
                  key={conv.id} 
                  onClick={() => setActiveChat(conv)}
                  className={`p-4 flex items-center gap-3 cursor-pointer border-b border-gray-50 ${activeChat?.id === conv.id ? 'bg-[#FAF4EB] border-l-4 border-l-[#B89B6D]' : 'hover:bg-gray-50'}`}
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-100 shrink-0">
                    <img src={conv.stores?.profile_image_url || '/images/iconNyamnow.png'} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-gray-900 truncate">{conv.stores?.name}</h4>
                    <p className="text-[11px] font-bold text-gray-400 truncate">Klik untuk chat...</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MAIN CHAT: AREA PESAN */}
        <div className={`flex-1 flex flex-col h-full bg-[#FDFCF8] relative ${!activeChat ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
          {activeChat ? (
            <>
              {/* Header Ruang Chat */}
              <div className="h-16 bg-white border-b border-gray-100 flex items-center px-4 justify-between shrink-0 absolute top-0 left-0 w-full z-10">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveChat(null)} className="md:hidden text-gray-400"><ChevronLeft /></button>
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100">
                    <img src={activeChat.stores?.profile_image_url || '/images/iconNyamnow.png'} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 leading-none">{activeChat.stores?.name}</h3>
                    <span className="text-[10px] font-bold text-[#B89B6D] uppercase tracking-widest mt-1 inline-block">Penjual</span>
                  </div>
                </div>
              </div>

              {/* Bubble Messages */}
              <div className="flex-1 overflow-y-auto p-4 pt-20 pb-24 space-y-4 no-scrollbar">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === currentUserId
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm font-bold shadow-sm ${
                        isMe ? 'bg-[#B89B6D] text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
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

              {/* Input Chat Fixed */}
              <form onSubmit={handleSend} className="absolute bottom-0 left-0 w-full p-4 bg-white border-t border-gray-100 flex gap-2 z-10">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Ketik pesan ke penjual..." 
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:border-[#B89B6D] focus:bg-white transition-all"
                />
                <button type="submit" className="bg-[#B89B6D] text-white p-3 rounded-xl shadow-md hover:bg-[#a08055] transition-all active:scale-95">
                  <Send size={20} />
                </button>
              </form>
            </>
          ) : (
            <div className="text-center p-8">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-200">
                <Store size={40} />
              </div>
              <h3 className="text-lg font-black text-gray-300 uppercase tracking-tighter">Pilih toko untuk mulai chat</h3>
              <p className="text-xs font-bold text-gray-400 mt-2">Hubungi penjual untuk menanyakan stok atau pesananmu.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BuyerChatsPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center bg-[#FDFCF8]">
        <div className="animate-pulse text-[#B89B6D] font-black tracking-widest uppercase text-sm">
          Menyiapkan Ruang Chat...
        </div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  )
}