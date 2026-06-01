'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Bell, MessageSquare, Settings, LogOut, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

export default function Navbar() {
  const router = useRouter()
  const [storeName, setStoreName] = useState('Loading...')
  const [profileImg, setProfileImg] = useState('/images/iconNyamnow.png')
  const [showDropdown, setShowDropdown] = useState(false)
  
  const [unreadChatCount, setUnreadChatCount] = useState(0)
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)

  useEffect(() => {
    const fetchStoreInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: storeData } = await supabase
            .from('stores')
            .select('name, profile_image_url')
            .eq('user_id', user.id)
            .single()

          if (storeData) {
            setStoreName(storeData.name)
            if (storeData.profile_image_url) setProfileImg(storeData.profile_image_url)
          }
        }
      } catch (error) {
        console.error('Gagal ambil info toko:', error)
      }
    }

    fetchStoreInfo()
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      alert('Gagal Logout, coba lagi!')
    }
  }

  return (
    <nav className="h-[72px] w-full bg-[#CBAE81] flex items-center justify-between px-6 lg:px-8 shadow-sm z-50 shrink-0 relative">
      
      {/* LOGO KIRI - UKURAN DIKECILIN BIAR PROPORSIONAL */}
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-0.5 border-2 border-white/50 overflow-hidden shadow-sm">
          <img src="/images/iconNyamnow.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        <span className="text-lg font-black text-[#3D3A40] tracking-tight mt-0.5">Nyam<span className="text-white">Now</span></span>
      </div>

      {/* MENU KANAN */}
      <div className="flex items-center gap-5 lg:gap-6">
        
        <div className="flex gap-4 items-center">
          {/* ✅ IKON DIKECILIN JADI size 22 & NOTIF DINAMIS */}
          <div className="relative cursor-pointer text-white hover:text-white/80 transition-colors flex items-center justify-center">
            <Bell size={22} />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm border border-[#CBAE81]">
                {unreadNotifCount}
              </span>
            )}
          </div>
          
          <div 
            className="relative cursor-pointer text-white hover:text-white/80 transition-colors flex items-center justify-center"
            onClick={() => router.push('/dashboard/seller/chats')} // Pintu masuk buat fitur chat nanti
          >
            <MessageSquare size={22} />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-sm border border-[#CBAE81]">
                {unreadChatCount}
              </span>
            )}
          </div>
        </div>

        {/* PROFILE CHIP DENGAN DROPDOWN - PADDING DI-PRESS BIAR RAPI */}
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 bg-[#B89868] pl-1.5 pr-3 py-1.5 rounded-full cursor-pointer hover:bg-[#A88858] transition-colors border border-white/10 shadow-inner group"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white border border-white/50 flex-shrink-0">
              <img 
                src={profileImg} 
                alt="Seller Profile" 
                className="w-full h-full object-cover" 
                onError={(e) => e.currentTarget.src = '/images/iconNyamnow.png'}
              />
            </div>
            <div className="flex flex-col items-start mr-1 text-left hidden sm:flex">
              <span className="text-[9px] font-black text-white/70 uppercase tracking-widest leading-none mb-0.5">Penjual</span>
              <span className="text-xs font-black text-white whitespace-nowrap leading-none max-w-[100px] truncate">{storeName}</span>
            </div>
            <ChevronDown size={14} className={`text-white transition-transform duration-300 ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* DROPDOWN MENU */}
          <AnimatePresence>
            {showDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowDropdown(false)} 
                />
                
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-3 w-52 bg-white shadow-xl rounded-2xl border border-gray-100 py-2 z-[60] overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-gray-50 mb-1 text-left">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Akun Toko</p>
                    <p className="text-sm font-black text-gray-800 truncate">{storeName}</p>
                  </div>

                  <button 
                    onClick={() => { router.push('/dashboard/seller/profile'); setShowDropdown(false); }}
                    className="w-full px-5 py-3 text-left text-xs font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    <Settings size={16} className="text-[#CBAE81]" /> Pengaturan Toko
                  </button>

                  <button 
                    onClick={handleLogout}
                    className="w-full px-5 py-3 text-left text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors border-t border-gray-50"
                  >
                    <LogOut size={16} /> Keluar Akun
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
      
    </nav>
  )
}