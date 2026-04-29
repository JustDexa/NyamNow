'use client'

import { useState } from 'react'
import { 
  Search, MapPin, Heart, ShoppingCart, 
  LogOut, Settings, Filter, LocateFixed, Bot, MessageCircle 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

// Interface Props biar Component ini fleksibel dipake di halaman mana aja
interface NavbarBuyerProps {
  // Search & Filter (Opsional, biar bisa dipake di halaman yg ga butuh search)
  searchQuery?: string
  setSearchQuery?: (val: string) => void
  fetchProducts?: () => void
  minPrice?: string
  setMinPrice?: (val: string) => void
  maxPrice?: string
  setMaxPrice?: (val: string) => void
  userCoords?: { lat: number; lng: number } | null
  getMyLocation?: () => void
  handleResetFilter?: () => void
  
  // State NyamBot
  setIsChatOpen?: (val: boolean) => void
  
  // Auth Data
  userName?: string | null
  handleLogout?: () => void
}

export default function NavbarBuyer({
  searchQuery, setSearchQuery, fetchProducts,
  minPrice, setMinPrice, maxPrice, setMaxPrice,
  userCoords, getMyLocation, handleResetFilter,
  setIsChatOpen, userName, handleLogout
}: NavbarBuyerProps) {
  
  const router = useRouter()
  const [showFilter, setShowFilter] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  // Cek apakah halaman ini ngirim fungsi search (kalo ngga, search bar di-hide)
  const hasSearch = !!setSearchQuery

 return (
    <header className="sticky top-0 z-50 w-full">
      <nav className="bg-[#B89B6D] px-8 py-3 flex items-center justify-between relative z-50 shadow-sm">
        {/* LOGO */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/dashboard/buyer')}>
          <div className="w-10 h-10 bg-[#FAF4EB] rounded-full flex items-center justify-center overflow-hidden border-2 border-white p-1 shadow-sm hover:scale-105 transition-transform">
            <img src="/images/iconNyamnow.png" alt="NyamNow" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* SEARCH BAR & FILTER (Muncul kalau props-nya dikasih) */}
        {hasSearch ? (
          <div className="flex-1 max-w-3xl mx-8 relative hidden md:flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && fetchProducts?.()} 
                placeholder="Mau makan apa hari ini?" 
                className="w-full bg-white rounded-lg py-2.5 pl-12 pr-4 text-xs outline-none text-gray-700 shadow-sm focus:ring-2 focus:ring-[#D4C18D] transition-all" 
              />
            </div>
            <button onClick={() => setShowFilter(!showFilter)} className={`px-3 rounded-lg bg-white shadow-sm flex items-center justify-center transition-colors ${showFilter ? 'text-[#B89B6D]' : 'text-gray-400 hover:text-[#B89B6D]'}`}>
              <Filter size={16} />
            </button>
            <button onClick={() => fetchProducts?.()} className="px-6 rounded-lg bg-gray-900 text-white text-xs font-bold shadow-sm hover:bg-black transition-colors">Cari</button>
          </div>
        ) : (
          <div className="flex-1 mx-8 hidden md:block"></div> // Spacer kalau ga ada search bar
        )}

        {/* ICONS NAVIGATION */}
        <div className="flex items-center gap-6 text-white">
          
          {/* ✅ NYAMBOT DIPINDAH KE PALING KIRI */}
          <button 
            onClick={() => setIsChatOpen?.(true)} 
            title="Tanya NyamBot"
            className="relative group p-2 bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-xl shadow-[0_0_15px_rgba(255,215,0,0.4)] hover:shadow-[0_0_25px_rgba(255,215,0,0.6)] transition-all active:scale-90 border-2 border-white/50"
            >
            {/* Animasi Ring di sekitar Bot biar narik perhatian */}
            <span className="absolute inset-0 rounded-xl bg-yellow-400 animate-ping opacity-20 group-hover:opacity-40"></span>
            
            <Bot 
                size={22} 
                className="relative z-10 text-gray-900 drop-shadow-md group-hover:rotate-12 transition-transform" 
            />

            {/* Badge Kecil "AI" biar makin jelas ini fitur pintar */}
            <span className="absolute -top-1 -right-1 bg-black text-white text-[7px] font-black px-1 rounded-sm border border-white">
                AI
            </span>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
                Tanya NyamBot!
            </div>
          </button>

          <button onClick={() => router.push('/dashboard/buyer/explore')} title="Jelajah Sekitar">
            <MapPin size={20} className="cursor-pointer hover:text-white/80 transition-colors" />
          </button>
          
          {/*TOMBOL CHAT PENJUAL-PEMBELI */}
          <button onClick={() => router.push('/dashboard/buyer/chats')} title="Chat Penjual">
            <MessageCircle size={20} className="cursor-pointer hover:text-white/80 transition-colors drop-shadow-md" />
          </button>
          
          <button onClick={() => router.push('/dashboard/buyer/favorites')} title="Favorit">
            <Heart size={20} className="cursor-pointer hover:text-white/80 transition-colors" />
          </button>

          <button onClick={() => router.push('/dashboard/buyer/orders')} title="Keranjang & Pesanan">
            <ShoppingCart size={20} className="cursor-pointer hover:text-white/80 transition-colors" />
          </button>
          
          {/* USER PROFILE DROPDOWN */}
          <div className="relative ml-2">
            <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-2 bg-black/20 hover:bg-black/30 px-3 py-1.5 rounded-full transition-colors">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-white/50 border border-white/50">
                <img src="/images/iconNyamnow.png" alt="User" className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-bold pr-1">{userName ? userName : 'Login'}</span>
            </button>
            <AnimatePresence>
              {showProfile && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowProfile(false)} />
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-3 w-48 bg-white shadow-xl rounded-xl border border-gray-100 py-2 z-[60] text-black">
                    <button onClick={() => router.push('/dashboard/buyer/settings')} className="w-full px-5 py-3 text-left text-xs font-bold hover:bg-gray-50 flex items-center gap-3"><Settings size={14}/> Pengaturan</button>
                    <button onClick={handleLogout} className="w-full px-5 py-3 text-left text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 border-t border-gray-50"><LogOut size={14}/> Keluar</button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* FILTER DRAWER */}
      <AnimatePresence>
        {showFilter && hasSearch && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="absolute left-0 top-full w-full bg-white border-b border-gray-100 overflow-hidden shadow-xl z-40">
            <div className="max-w-6xl mx-auto px-6 py-5 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">Harga Min (Rp)</label>
                <input type="number" placeholder="Contoh: 10000" value={minPrice} onChange={(e) => setMinPrice?.(e.target.value)} className="w-full bg-gray-50 p-2.5 rounded-lg text-xs outline-none border border-transparent focus:border-[#B89B6D]" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">Harga Max (Rp)</label>
                <input type="number" placeholder="Contoh: 50000" value={maxPrice} onChange={(e) => setMaxPrice?.(e.target.value)} className="w-full bg-gray-50 p-2.5 rounded-lg text-xs outline-none border border-transparent focus:border-[#B89B6D]" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400">Jarak Terdekat</label>
                <button onClick={getMyLocation} className={`w-full p-2.5 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${userCoords ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 border-transparent text-gray-500 hover:border-[#B89B6D]'}`}>
                  <LocateFixed size={14} /> {userCoords ? 'Lokasi Aktif' : 'Gunakan Lokasi Saya'}
                </button>
              </div>
              <div className="flex gap-2 h-[38px]">
                <button onClick={() => { fetchProducts?.(); setShowFilter(false); }} className="flex-[2] bg-[#B89B6D] text-white text-[10px] font-black uppercase rounded-lg hover:bg-yellow-700 transition-colors">Terapkan</button>
                <button onClick={handleResetFilter} className="flex-1 text-[10px] font-black uppercase text-red-500 hover:bg-red-50 border border-red-100 rounded-lg transition-colors">Reset</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}