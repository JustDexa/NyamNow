'use client'

import { useState, useEffect } from 'react'
import { 
  Search, MapPin, Heart, ShoppingCart, 
  LogOut, Settings, Filter, LocateFixed, Bot, MessageCircle, Lock 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type: string;
  reference_id: string;
}

interface NavbarBuyerProps {
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
  setIsChatOpen?: (val: boolean) => void
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
  const [showNotif, setShowNotif] = useState(false)
  
  const [notifs, setNotifs] = useState<NotificationItem[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMessage, setAuthMessage] = useState('')

  const requireLogin = (message: string) => {
    setAuthMessage(message)
    setShowAuthModal(true)
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;

    const fetchNotifs = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)

        // Fetch foto profil
        const { data: userData } = await supabase
          .from('users')
          .select('profile_image_url')
          .eq('id', user.id)
          .single()
        if (userData?.profile_image_url) setProfileImageUrl(userData.profile_image_url)
        
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
        
        if (data) setNotifs(data)

        channel = supabase
          .channel('realtime_notifs')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              setNotifs((prev) => [payload.new as NotificationItem, ...prev])
            }
          )
          .subscribe()
      }
    }
    
    fetchNotifs()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [])

  const markAllAsRead = async () => {
    if (!userId) return;
    
    // Update tampilan secepat kilat (Optimistic UI)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    
    // Update ke database Supabase
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  }

const handleNotifClick = async (notif: NotificationItem) => {
    setShowNotif(false); // Tutup dropdown
    
    // 1. Ubah status jadi read kalau belum
    if (!notif.is_read) {
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      await supabase.from('notifications').update({ is_read: true }).eq('id', notif.id);
    }

    try {
      if (notif.type === 'NEW_MENU') {
        // Kalau Menu Baru, lacak tokonya dan arahin ke halaman toko
        const { data } = await supabase.from('products').select('store_id').eq('id', notif.reference_id).single();
        if (data?.store_id) router.push(`/dashboard/buyer/store/${data.store_id}`);
        
      } else if (notif.type === 'ORDER_STATUS') {
        // Kalau Status Pesanan, ambil statusnya dan arahin ke halaman orders + lempar query URL
        const { data } = await supabase.from('orders').select('status').eq('id', notif.reference_id).single();
        
        if (data?.status) {
          // Contoh URL jadinya: /dashboard/buyer/orders?tab=processing
          router.push(`/dashboard/buyer/orders?tab=${data.status}`);
        } else {
          router.push('/dashboard/buyer/orders');
        }
      }
    } catch (error) {
      console.error("Gagal melacak data rujukan:", error);
    }
  }

  const hasSearch = !!setSearchQuery

  return (
    <header className="sticky top-0 z-50 w-full">
      <nav className="bg-[#B89B6D] px-4 md:px-8 py-3 flex items-center justify-between relative z-50 shadow-sm">
        {/* LOGO */}
        <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => router.push('/dashboard/buyer')}>
          <div className="w-9 h-9 md:w-10 md:h-10 bg-[#FAF4EB] rounded-full flex items-center justify-center overflow-hidden border-2 border-white p-0.5 md:p-1 shadow-sm hover:scale-105 transition-transform">
            <img src="/images/iconNyamnow.png" alt="NyamNow" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* SEARCH BAR & FILTER */}
        {hasSearch ? (
          <div className="flex-1 max-w-3xl mx-4 md:mx-8 relative hidden md:flex gap-2">
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
          <div className="flex-1 mx-4 md:mx-8 hidden md:block"></div>
        )}

        {/* ICONS NAVIGATION */}
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6 text-white shrink-0">
          
          <button 
            onClick={() => {
              if (!userId) requireLogin('Halo! NyamBot cuma bisa ngobrol sama user yang udah login nih.')
              else setIsChatOpen?.(true)
            }} 
            title="Tanya NyamBot"
            className="relative group p-1.5 md:p-2 bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-xl shadow-[0_0_15px_rgba(255,215,0,0.4)] hover:shadow-[0_0_25px_rgba(255,215,0,0.6)] transition-all active:scale-90 border-2 border-white/50"
            >
            <span className="absolute inset-0 rounded-xl bg-yellow-400 animate-ping opacity-20 group-hover:opacity-40"></span>
            <Bot size={20} className="relative z-10 text-gray-900 drop-shadow-md group-hover:rotate-12 transition-transform md:w-[22px] md:h-[22px]" />
            <span className="absolute -top-1 -right-1 bg-black text-white text-[7px] font-black px-1 rounded-sm border border-white">AI</span>
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl hidden sm:block">
                Tanya NyamBot!
            </div>
          </button>

          <button onClick={() => router.push('/dashboard/buyer/explore')} title="Jelajah Sekitar" className="p-1">
            <MapPin size={20} className="cursor-pointer hover:text-white/80 transition-colors md:w-[20px] md:h-[20px] w-[18px] h-[18px]" />
          </button>
          
          <button 
            onClick={() => {
              if (!userId) requireLogin('Login dulu yuk buat ngobrol sama penjual!')
              else router.push('/dashboard/buyer/chats')
            }} 
            title="Chat Penjual" 
            className="p-1"
          >
            <MessageCircle size={20} className="cursor-pointer hover:text-white/80 transition-colors drop-shadow-md md:w-[20px] md:h-[20px] w-[18px] h-[18px]" />
          </button>
          
          {/* NOTIFICATION */}
          <div className="relative">
            <button 
              onClick={() => {
                const newState = !showNotif;
                setShowNotif(newState);
                
                // AUTO-READ LOGIC: Kalau dropdown dibuka dan ada notif unread, langsung tandai dibaca!
                if (newState && userId && notifs.some(n => !n.is_read)) {
                  markAllAsRead();
                }
              }} 
              title="Notifikasi Favorit" 
              className="relative p-1"
            >
              <Heart size={20} className={`cursor-pointer transition-colors md:w-[20px] md:h-[20px] w-[18px] h-[18px] ${showNotif ? 'text-white fill-white/20' : 'hover:text-white/80'}`} />
              {notifs.some(n => !n.is_read) && (
                <span className="absolute top-0 right-0 flex h-2 w-2 md:h-2.5 md:w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-full w-full bg-red-500 border border-[#B89B6D]"></span>
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotif && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowNotif(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                    exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                    transition={{ duration: 0.2 }}
                    className="absolute right-[-60px] sm:right-0 mt-4 w-[280px] sm:w-80 max-w-[85vw] bg-white shadow-2xl rounded-2xl border border-gray-100 overflow-hidden z-[60] text-black"
                  >
                    <div className="bg-gray-50 px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-black text-[10px] sm:text-sm uppercase italic tracking-widest text-[#B89B6D]">Notif Favorit</h3>
                    </div>
                    
                    <div className="max-h-72 sm:max-h-80 overflow-y-auto no-scrollbar">
                      {!userId ? (
                        <div className="p-8 flex flex-col items-center justify-center text-center">
                          <Lock size={32} className="text-gray-200 mb-3" />
                          <p className="text-[10px] sm:text-xs font-bold text-gray-400 leading-relaxed">
                            Login dulu yuk buat liat update pesanan & promo dari toko favorit kamu!
                          </p>
                          <button 
                            onClick={() => router.push('/login')} 
                            className="mt-4 px-6 py-2 bg-[#FAF4EB] text-[#B89B6D] text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-[#B89B6D] hover:text-white transition-colors"
                          >
                            Login Sekarang
                          </button>
                        </div>
                      ) : notifs.length === 0 ? (
                        <div className="p-6 sm:p-8 text-center text-[10px] sm:text-xs font-bold text-gray-400">
                          Belum ada update pesanan atau menu baru nih.
                        </div>
                      ) : (
                        notifs.map((notif) => (
                          <div 
                            key={notif.id} 
                            onClick={() => handleNotifClick(notif)}
                            className={`p-3 sm:p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${notif.is_read ? 'opacity-60' : 'bg-[#FAF4EB]/30'}`}
                          >
                            <div className="flex justify-between items-start mb-1 gap-2">
                              <h4 className="text-[10px] sm:text-[11px] font-black text-gray-900 leading-tight">{notif.title}</h4>
                              <span className="text-[8px] sm:text-[9px] font-bold text-gray-400 shrink-0">
                                {new Date(notif.created_at).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[10px] sm:text-xs font-bold text-gray-600 leading-relaxed line-clamp-2">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button 
            onClick={() => {
              if (!userId) requireLogin('Login dulu yuk buat buka keranjang & pesanan kamu!')
              else router.push('/dashboard/buyer/orders')
            }} 
            title="Keranjang & Pesanan" 
            className="p-1"
          >
            <ShoppingCart size={20} className="cursor-pointer hover:text-white/80 transition-colors md:w-[20px] md:h-[20px] w-[18px] h-[18px]" />
          </button>
          
          {/* USER PROFILE */}
          <div className="relative ml-1 md:ml-2">
            <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-2 bg-black/20 hover:bg-black/30 p-1 md:px-3 md:py-1.5 rounded-full transition-colors">
              <div className="w-6 h-6 md:w-6 md:h-6 rounded-full overflow-hidden bg-white/50 border border-white/50 shrink-0">
                <img src={profileImageUrl || '/images/iconNyamnow.png'} alt="User" className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-bold pr-1 hidden sm:inline-block truncate max-w-[80px]">
                {userName ? userName : 'Login'}
              </span>
            </button>
            <AnimatePresence>
              {showProfile && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowProfile(false)} />
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-3 w-40 md:w-48 bg-white shadow-xl rounded-xl border border-gray-100 py-2 z-[60] text-black">
                    {userName ? (
                      <>
                        <button onClick={() => router.push('/dashboard/buyer/settings')} className="w-full px-4 md:px-5 py-3 text-left text-[11px] md:text-xs font-bold hover:bg-gray-50 flex items-center gap-3">
                          <Settings size={14}/> Pengaturan
                        </button>
                        <button onClick={handleLogout} className="w-full px-4 md:px-5 py-3 text-left text-[11px] md:text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 border-t border-gray-50">
                          <LogOut size={14}/> Keluar
                        </button>
                      </>
                    ) : (
                      <button onClick={() => router.push('/login')} className="w-full px-4 md:px-5 py-3 text-left text-[11px] md:text-xs font-bold text-[#B89B6D] hover:bg-yellow-50 flex items-center gap-3">
                        <LogOut size={14} className="rotate-180" /> Masuk
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

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

      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#B89B6D]/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10">
                <div className="w-20 h-20 bg-[#FAF4EB] rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg">
                  <Lock className="w-10 h-10 text-[#B89B6D]" />
                </div>
                
                <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight italic uppercase">Eits, Tunggu Dulu!</h3>
                <p className="text-sm font-bold text-gray-500 mb-8 leading-relaxed">
                  {authMessage}
                </p>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => router.push('/login')}
                    className="w-full bg-[#B89B6D] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-[0_10px_20px_rgba(184,155,109,0.3)] hover:scale-105 active:scale-95 transition-all"
                  >
                    Login Sekarang
                  </button>
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="w-full bg-gray-50 text-gray-400 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-gray-100 transition-colors"
                  >
                    Nanti Aja
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  )
}