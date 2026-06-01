'use client'

import { useState, useEffect } from 'react'
import { 
  Search, MapPin, ShoppingCart, 
  Filter, Bot, MessageCircle, Star, ChevronDown, ChevronUp
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// --- INTERFACES ---
interface ProductFlashSale {
  id: string
  name: string
  price: number
  image_url: string
  promo_price: number
  store_id: string
  store_name: string
  distance: number
  start_at: string
  end_at: string
}
interface SupabaseFSResponse {
  discount_price: number;
  start_at: string;
  end_at: string;
  product_id: string;
  products: {
    id: string;
    name: string;
    price: number;
    image_url: string;
    stores: {
      id: string;
      name: string;
    };
  };
}

export default function FlashSalePage() {
  const router = useRouter()
  
  // UI STATES
  const [showProfile, setShowProfile] = useState(false)
  const [activeSession, setActiveSession] = useState<'19:00' | '20:00' | '21:00'>('19:00')
  const [isExpanded, setIsExpanded] = useState(false)
  
  // DATA STATES
  const [fsProducts, setFsProducts] = useState<ProductFlashSale[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // TIMER & REALTIME STATES
  const [currentHour, setCurrentHour] = useState(new Date().getHours())
  const [fsStatus, setFsStatus] = useState<'waiting' | 'active'>('waiting')
  const [fsTime, setFsTime] = useState({ h1: '0', h2: '0', m1: '0', m2: '0', s1: '0', s2: '0' })

  // ==========================================
  // 1. REAL-TIME ENGINE (TIMER & STATUS)
  // ==========================================
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentHour(now.getHours())

      const startTime = new Date(now)
      startTime.setHours(19, 0, 0, 0)
      
      const endTime = new Date(now)
      endTime.setHours(22, 0, 0, 0)

      // Rollover ke besok kalau udah lewat jam 10 malem
      if (now.getHours() >= 22) {
        startTime.setDate(startTime.getDate() + 1)
        endTime.setDate(endTime.getDate() + 1)
      }

      let diff = 0
      if (now < startTime) {
        setFsStatus('waiting')
        diff = startTime.getTime() - now.getTime()
      } else {
        setFsStatus('active')
        diff = endTime.getTime() - now.getTime()
      }

      const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0')
      const m = Math.floor((diff / (1000 * 60)) % 60).toString().padStart(2, '0')
      const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0')

      setFsTime({
        h1: h[0], h2: h[1],
        m1: m[0], m2: m[1],
        s1: s[0], s2: s[1]
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // ==========================================
  // 2. LOGIKA STATUS SESI (DYNAMIC LABELS)
  // ==========================================
  const getSessionLabel = (session: string) => {
    const h = parseInt(session.split(':')[0])
    
    if (currentHour >= 22) return 'Tomorrow'
    if (currentHour < 19) return 'Coming Soon'
    
    if (currentHour === h) return 'Ongoing'
    if (currentHour < h) return 'Coming Soon'
    return 'Ended'
  }

  // Menentukan tanggal target (Hari ini atau Besok)
  const getTargetDate = () => {
    const target = new Date()
    if (currentHour >= 22) {
      target.setDate(target.getDate() + 1)
    }
    return target
  }

  // ==========================================
  // 3. FETCH & FILTER DATA (STRICT DATE)
  // ==========================================
useEffect(() => {
    const fetchFS = async () => {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('promos')
          .select(`
            discount_price, start_at, end_at, product_id,
            products!promos_product_id_fkey ( id, name, price, image_url, stores ( id, name ) )
          `)
          .eq('type', 'flash_sale')
          .eq('is_active', true)

        if (error) throw error

        const targetDate = getTargetDate()

        const rawData = (data as unknown) as SupabaseFSResponse[]

        const formatted: ProductFlashSale[] = rawData
          .map((item: SupabaseFSResponse) => ({
            id: item.products.id,
            name: item.products.name,
            price: item.products.price,
            image_url: item.products.image_url,
            promo_price: item.discount_price,
            store_id: item.products.stores.id,
            store_name: item.products.stores.name,
            distance: 1.2, // Masih dummy 
            start_at: item.start_at,
            end_at: item.end_at
          }))
          .filter(p => {
            const pStart = new Date(p.start_at)
            const pEnd = new Date(p.end_at)
            const targetDate = getTargetDate()
            const sessionHour = parseInt(activeSession.split(':')[0])
            
            // 1. Cek apakah tanggalnya sama (Hari ini / Besok)
            const isSameDate = (
                pStart.getFullYear() === targetDate.getFullYear() &&
                pStart.getMonth() === targetDate.getMonth() &&
                pStart.getDate() === targetDate.getDate()
            )

            // 2. Cek apakah jam sesi (misal 21) ada di antara jam mulai dan jam berakhir promo
            // Contoh: Promo 19:00 - 22:00, Sesi 21:00 -> (21 >= 19 && 21 < 22) = TRUE
            const isWithinSession = sessionHour >= pStart.getHours() && sessionHour < pEnd.getHours()

            return isSameDate && isWithinSession
          })

        setFsProducts(formatted)
      } catch (err) {
        console.error("Gagal load flash sale:", err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchFS()
  }, [activeSession, currentHour]) // Akan fetch ulang kalau jam atau sesi ganti
  return (
    <div className="min-h-screen bg-[#FDFCF8] pb-20 text-left">
      
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 w-full bg-[#B89B6D] px-8 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/dashboard/buyer')}>
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-1">
            <img src="/images/iconNyamnow.png" alt="NyamNow" className="w-full h-full object-contain" />
          </div>
        </div>
        
        <div className="flex-1 max-w-3xl mx-8 relative hidden md:flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Cari di Flash Sale..." className="w-full bg-white rounded-lg py-2.5 pl-12 pr-4 text-xs outline-none text-gray-700 shadow-sm" />
          </div>
          <button className="px-3 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-[#B89B6D]"><Filter size={16} /></button>
          <button className="px-6 rounded-lg bg-gray-900 text-white text-xs font-bold shadow-sm hover:bg-black transition-colors">Cari</button>
        </div>

        <div className="flex items-center gap-6 text-white">
          <MessageCircle size={22} className="cursor-pointer hover:opacity-80" onClick={() => router.push('/dashboard/buyer/chats')} />
          <Bot size={22} className="cursor-pointer hover:opacity-80" />
          <ShoppingCart size={22} className="cursor-pointer hover:opacity-80" onClick={() => router.push('/dashboard/buyer/orders')} />
          <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 overflow-hidden">
            <img src="/images/iconNyamnow.png" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 mt-6">
        
        {/* TIMER SECTION */}
        <div className="bg-gradient-to-b from-gray-100 to-gray-50 rounded-t-[32px] p-8 flex flex-col items-center border border-b-0 border-gray-200">
          <h1 className="text-2xl font-[1000] text-gray-700 uppercase tracking-tighter italic">Flash Sale</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 mb-3">
            {fsStatus === 'waiting' ? 'Starts In' : 'Ends In'}
          </p>
          
          <div className="flex items-center gap-2">
            {[fsTime.h1, fsTime.h2].map((d, i) => (
              <div key={`h-${i}`} className="w-10 h-12 bg-[#E88C30] rounded-xl flex items-center justify-center text-2xl font-black text-white shadow-lg">{d}</div>
            ))}
            <span className="text-2xl font-black text-gray-400 pb-1">:</span>
            {[fsTime.m1, fsTime.m2].map((d, i) => (
              <div key={`m-${i}`} className="w-10 h-12 bg-[#E88C30] rounded-xl flex items-center justify-center text-2xl font-black text-white shadow-lg">{d}</div>
            ))}
            <span className="text-2xl font-black text-gray-400 pb-1">:</span>
            {[fsTime.s1, fsTime.s2].map((d, i) => (
              <div key={`s-${i}`} className="w-10 h-12 bg-[#E88C30] rounded-xl flex items-center justify-center text-2xl font-black text-white shadow-lg">{d}</div>
            ))}
          </div>
        </div>

        {/* SESSION TABS DINAMIS */}
        <div className="flex bg-gray-300 rounded-b-[32px] overflow-hidden shadow-md mb-8">
          {(['19:00', '20:00', '21:00'] as const).map((session) => {
            const isSelected = activeSession === session
            const label = getSessionLabel(session)
            
            return (
              <button 
                key={session}
                onClick={() => setActiveSession(session)}
                className={`flex-1 py-4 flex flex-col items-center transition-all ${isSelected ? 'bg-[#C19B6C] text-white shadow-inner' : 'text-white/70 hover:bg-gray-400 border-r border-white/20 last:border-0'}`}
              >
                <span className="text-lg font-black">{session}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest">{label}</span>
              </button>
            )
          })}
        </div>

        {/* LIST SECTION HEADER */}
        <div className="flex justify-between items-end mb-6">
          <div className="flex gap-8 border-b-2 border-gray-100 flex-1">
            {['Rekomendasi', 'Terlaris', 'Sekitarmu'].map(tab => (
              <button key={tab} className="pb-3 text-sm font-black text-gray-400 hover:text-gray-900 border-b-4 border-transparent hover:border-[#B89B6D] transition-all uppercase tracking-widest">{tab}</button>
            ))}
          </div>
          {fsProducts.length > 4 && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-black text-[#B89B6D] uppercase flex items-center gap-1 hover:underline ml-4 mb-3"
            >
              {isExpanded ? 'Sembunyikan' : 'Lihat Selengkapnya'}
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>

        {/* PRODUCTS GRID */}
        {isLoading ? (
          <div className="py-20 text-center font-black text-[#B89B6D] animate-pulse">MEMUAT PENAWARAN...</div>
        ) : fsProducts.length === 0 ? (
          <div className="py-20 text-center text-gray-400 font-bold italic">Belum ada promo flash sale di sesi ini.</div>
        ) : (
          <motion.div layout className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <AnimatePresence>
              {(isExpanded ? fsProducts : fsProducts.slice(0, 4)).map((product) => {
                const sessionLabel = getSessionLabel(activeSession)
                const isOngoing = sessionLabel === 'Ongoing'
                const isEnded = sessionLabel === 'Ended'
                const isComingSoon = sessionLabel === 'Coming Soon' || sessionLabel === 'Tomorrow'

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={product.id}
                    onClick={() => router.push(`/dashboard/buyer/store/${product.store_id}`)}
                    className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden group cursor-pointer flex flex-col hover:shadow-xl transition-all"
                  >
                    <div className="relative h-40 bg-gray-100 p-2">
                      <img src={product.image_url} className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-4 left-4 bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-md animate-bounce">
                        {Math.round(((product.price - product.promo_price) / product.price) * 100)}% OFF
                      </div>
                    </div>

                    <div className="p-4 flex-1">
                      <h3 className="font-black text-gray-900 truncate">{product.name}</h3>
                      <div className="flex items-center gap-1 my-1">
                        <Star size={12} className="fill-yellow-400 text-yellow-400" />
                        <span className="text-[10px] font-bold text-gray-500">4.8 (125)</span>
                      </div>
                      <div className="mt-2">
                        <p className="text-base font-black text-[#C19B6C]">Rp{product.promo_price.toLocaleString('id-ID')}</p>
                        <p className="text-[11px] font-bold text-gray-400 line-through">Rp{product.price.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="mt-3 flex justify-between items-center text-[10px] font-bold text-gray-400 border-t pt-3">
                        <span>{product.store_name}</span>
                        <span className="flex items-center gap-1"><MapPin size={10} /> {product.distance}km</span>
                      </div>
                    </div>

                    {/* ✅ SMART BUTTON LOGIC */}
                    <button 
                      disabled={!isOngoing}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isOngoing) alert(`Ditambahkan ke keranjang: ${product.name}`)
                      }}
                      className={`w-full py-4 text-[11px] font-black uppercase tracking-widest transition-colors ${
                        isOngoing 
                        ? 'bg-[#D4AF37] hover:bg-[#C5A017] text-white shadow-[0_-5px_15px_rgba(212,175,55,0.2)]'
                        : isEnded
                        ? 'bg-red-50 text-red-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isOngoing ? 'Beli Sekarang' : isEnded ? 'Sesi Berakhir' : 'Coming Soon'}
                    </button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* CHATBOT NYAMBOT FLOAT */}
      <div className="fixed bottom-6 right-6 w-14 h-14 bg-[#B89B6D] rounded-full shadow-2xl flex items-center justify-center text-white cursor-pointer hover:scale-110 active:scale-95 transition-all z-50 border-4 border-white">
        <Bot size={28} />
      </div>
    </div>
  )
}