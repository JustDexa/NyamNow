'use client'

import { useState, useEffect } from 'react'
import { 
  Search, MapPin, Heart, ShoppingCart, 
  LogOut, Settings, ChevronRight, Timer, Star, Zap, Store, Filter, LocateFixed,
  Bot, Send, X, ChevronDown, ChevronUp,Lock
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NavbarBuyer from '@/components/NavbarBuyer'

// --- INTERFACES ---
interface StoreData {
  id: string
  name: string
  address?: string
  profile_image_url?: string
  latitude?: number
  longitude?: number
  rating_avg?: number
  sold_count?: number 
}

interface Product {
  id: string
  name: string
  price: number
  image_url: string
  category?: string
  stores?: StoreData
  distance?: number 
  sold_count?: number
  created_at?: string
  weekly_sold_count?: number
  is_best_seller?: boolean
}

interface Promo {
  id: string
  type: 'flash_sale' | 'promo'
  title: string
  discount_price?: number
  promo_image_url?: string
  start_at: string
  end_at: string
  product_id?: string
}

interface Campaign {
  id: string
  title: string
  banner_url: string
  start_at: string
  end_at: string
}

export default function BuyerDashboard() {
  const [activeTab, setActiveTab] = useState('Rekomendasi')
  const [showProfile, setShowProfile] = useState(false)
  const router = useRouter()

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMessage, setAuthMessage] = useState('')

  const requireLogin = (message: string) => {
    setAuthMessage(message)
    setShowAuthModal(true)
  }

  // STATE DATA
  const [products, setProducts] = useState<Product[]>([])
  const [promos, setPromos] = useState<Promo[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([]) // ✅ State Campaign
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  // STATE FAVORIT
  const [userStoreFavorites, setUserStoreFavorites] = useState<string[]>([])
  const [storeFavCounts, setStoreFavCounts] = useState<Record<string, number>>({})
  
  const [userProductFavorites, setUserProductFavorites] = useState<string[]>([])
  const [productFavCounts, setProductFavCounts] = useState<Record<string, number>>({})

  // STATE SEARCH & FILTER
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null)


  const [isMenuExpanded, setIsMenuExpanded] = useState(false)
  const [isStoreExpanded, setIsStoreExpanded] = useState(false)


  const [fsStatus, setFsStatus] = useState<'waiting' | 'active'>('waiting')
  const [fsTime, setFsTime] = useState({ h: '00', m: '00', s: '00' })

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const start = new Date()
      start.setHours(20, 0, 0, 0) // Mulai jam 8 malem (20:00)
      
      const end = new Date()
      end.setHours(22, 0, 0, 0)   // Berakhir jam 10 malem (22:00)

      if (now >= end) {
        start.setDate(start.getDate() + 1)
        end.setDate(end.getDate() + 1)
      }

      let diff = 0
      if (now < start) {
        setFsStatus('waiting')
        diff = start.getTime() - now.getTime()
      } else if (now >= start && now < end) {
        setFsStatus('active')
        diff = end.getTime() - now.getTime()
      }

      const h = Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0')
      const m = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0')
      const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0')
      setFsTime({ h, m, s })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // ==========================================
  // STATE & LOGIC CHATBOT NYAMBOT
  // ==========================================
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', text: 'Halo! Aku NyamBot, Ada yang bisa dibantu soal pesanan atau UMKM di sekitarmu?' }
  ])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    const userMessageCount = chatMessages.filter(m => m.role === 'user').length

    if (!userId && userMessageCount >= 1) {
      setChatMessages(prev => [...prev, { role: 'user', text: chatInput }])
      setChatInput('')
      
      setTimeout(() => {
        setChatMessages(prev => [...prev, { 
          role: 'bot', 
          text: 'Sesi percobaan NyamBot kamu udah habis nih. Yuk login dulu biar bisa lanjut ngobrol dan cari rekomendasi makanan enak!' 
        }])
        
        setTimeout(() => {
          requireLogin('Login dulu yuk buat lanjut ngobrol sama NyamBot!')
        }, 1500)
      }, 500)
      
      return
    }

    const userMessage = chatInput
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }])
    setChatInput('')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      })

      if (!response.ok) throw new Error('Gagal nembak API')
      const data = await response.json()
      setChatMessages(prev => [...prev, { role: 'bot', text: data.text }])
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'bot', text: 'Waduh, koneksi ke otakku putus nih. Coba lagi bentaran yak!' }])
    }
  }

  const isSearching = searchQuery !== '' || minPrice !== '' || maxPrice !== ''

  const getMyLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => alert("Gagal ambil lokasi. Pastikan izin lokasi browser diaktifkan.")
      )
    }
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371 
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2)
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
  }

  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      let query = supabase.from('products').select('*, created_at, stores(id, name, latitude, longitude, address, profile_image_url, rating_avg)')

      if (searchQuery) query = query.ilike('name', `%${searchQuery}%`)
      const min = parseInt(minPrice)
      const max = parseInt(maxPrice)
      if (!isNaN(min)) query = query.gte('price', min)
      if (!isNaN(max)) query = query.lte('price', max)

      const { data, error } = await query.limit(30)
      if (error) throw error

      let finalData = data as Product[]

      if (finalData.length > 0) {
        const { data: salesData } = await supabase
          .from('order_items')
          .select('product_id, quantity, orders!inner(status)')
          .eq('orders.status', 'completed')
          .in('product_id', finalData.map(p => p.id))

        const salesMap: Record<string, number> = {}
        salesData?.forEach(item => {
          salesMap[item.product_id] = (salesMap[item.product_id] || 0) + (item.quantity || 0)
        })

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const { data: weeklySalesData } = await supabase
          .from('order_items')
          .select('product_id, quantity, orders!inner(status, created_at)')
          .eq('orders.status', 'completed')
          .gte('orders.created_at', sevenDaysAgo.toISOString())
          .in('product_id', finalData.map(p => p.id))

        const weeklySalesMap: Record<string, number> = {}
        weeklySalesData?.forEach(item => {
          weeklySalesMap[item.product_id] = (weeklySalesMap[item.product_id] || 0) + (item.quantity || 0)
        })

        const maxWeeklySales = Math.max(...Object.values(weeklySalesMap), 0)

        finalData = finalData.map(p => ({
          ...p,
          sold_count: salesMap[p.id] || 0,
          weekly_sold_count: weeklySalesMap[p.id] || 0,
          is_best_seller: maxWeeklySales > 0 && (weeklySalesMap[p.id] || 0) === maxWeeklySales,
        }))
      }

      const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000
      finalData = finalData.sort((a, b) => {
        const scoreA = a.is_best_seller ? 2 : (a.created_at && new Date(a.created_at).getTime() > sevenDaysAgoMs ? 1 : 0)
        const scoreB = b.is_best_seller ? 2 : (b.created_at && new Date(b.created_at).getTime() > sevenDaysAgoMs ? 1 : 0)
        return scoreB - scoreA
      })

      if (userCoords) {
        finalData = finalData.map(p => ({
          ...p,
          distance: p.stores?.latitude && p.stores?.longitude 
            ? calculateDistance(userCoords.lat, userCoords.lng, p.stores.latitude, p.stores.longitude) : undefined
        })).sort((a, b) => (a.distance || 999) - (b.distance || 999))
      }

      setProducts(finalData)
    } catch (error) {
      console.error('Fetch products error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleStoreFavorite = async (e: React.MouseEvent, storeId: string) => {
    e.stopPropagation()
    if (!userId) {
      requireLogin('Login dulu yuk buat favoritin toko!')
      return
    }

    const isFaved = userStoreFavorites.includes(storeId)

    if (isFaved) {
      setUserStoreFavorites(prev => prev.filter(id => id !== storeId))
      setStoreFavCounts(prev => ({ ...prev, [storeId]: Math.max(0, (prev[storeId] || 1) - 1) }))
      await supabase.from('store_favorites').delete().match({ user_id: userId, store_id: storeId })
    } else {
      setUserStoreFavorites(prev => [...prev, storeId])
      setStoreFavCounts(prev => ({ ...prev, [storeId]: (prev[storeId] || 0) + 1 }))
      await supabase.from('store_favorites').insert({ user_id: userId, store_id: storeId })
    }
  }

  const toggleProductFavorite = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation()
    if (!userId) {
      requireLogin('Login dulu yuk buat masukin makanan ke favorit!')
      return
    }

    const isFaved = userProductFavorites.includes(productId)

    if (isFaved) {
      setUserProductFavorites(prev => prev.filter(id => id !== productId))
      setProductFavCounts(prev => ({ ...prev, [productId]: Math.max(0, (prev[productId] || 1) - 1) }))
      await supabase.from('product_favorites').delete().match({ user_id: userId, product_id: productId })
    } else {
      setUserProductFavorites(prev => [...prev, productId])
      setProductFavCounts(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }))
      await supabase.from('product_favorites').insert({ user_id: userId, product_id: productId })
    }
  }

  const handleResetFilter = () => {
    setMinPrice('')
    setMaxPrice('')
    setUserCoords(null)
    setSearchQuery('')
    setTimeout(fetchProducts, 100)
  }

  useEffect(() => {
    const initApp = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data: userData } = await supabase.from('users').select('first_name, username').eq('id', user.id).single()
        if (userData) setUserName(userData.first_name || userData.username || 'Buyer')

        const { data: favStoreData } = await supabase.from('store_favorites').select('store_id').eq('user_id', user.id)
        if (favStoreData) setUserStoreFavorites(favStoreData.map(f => f.store_id))

        const { data: favProdData } = await supabase.from('product_favorites').select('product_id').eq('user_id', user.id)
        if (favProdData) setUserProductFavorites(favProdData.map(f => f.product_id))
      }
      
      const { data: promoData } = await supabase.from('promos').select('*').eq('is_active', true).limit(5)
      setPromos(promoData || [])

      // Fetch Active Campaigns from Database
      const { data: campaignData } = await supabase.from('admin_campaigns').select('*').eq('is_active', true)
      setCampaigns(campaignData || [])

      const { data: allStoreFavs } = await supabase.from('store_favorites').select('store_id')
      if (allStoreFavs) {
        const counts: Record<string, number> = {}
        allStoreFavs.forEach(f => { counts[f.store_id] = (counts[f.store_id] || 0) + 1 })
        setStoreFavCounts(counts)
      }

      const { data: allProdFavs } = await supabase.from('product_favorites').select('product_id')
      if (allProdFavs) {
        const counts: Record<string, number> = {}
        allProdFavs.forEach(f => { counts[f.product_id] = (counts[f.product_id] || 0) + 1 })
        setProductFavCounts(counts)
      }
    }
    initApp()
  }, [])

  useEffect(() => { fetchProducts() }, [userCoords]) 

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch (error) {
      alert('Gagal Logout')
    }
  }

  const storeSalesMap: Record<string, number> = {}
  products.forEach(p => {
    if (p.stores?.id) {
      storeSalesMap[p.stores.id] = (storeSalesMap[p.stores.id] || 0) + (p.sold_count || 0)
    }
  })

  const uniqueStores = Array.from(new Map(products.filter(p => p.stores).map(p => [p.stores?.id, { 
    ...p.stores, 
    distance: p.distance, 
    fallbackImage: p.image_url,
    sold_count: storeSalesMap[p.stores!.id] || 0
  }])).values())

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-black font-sans antialiased pb-20 text-left relative overflow-x-hidden">
      
      <NavbarBuyer 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        fetchProducts={fetchProducts}
        minPrice={minPrice}
        setMinPrice={setMinPrice}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        userCoords={userCoords}
        getMyLocation={getMyLocation}
        handleResetFilter={handleResetFilter}
        setIsChatOpen={setIsChatOpen}
        userName={userName}
        handleLogout={handleLogout}
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-6 md:mt-8">
        {!isSearching && (
          <>
            {/* ✅ BANNER CAMPAIGN DINAMIS (Menggantikan Dummy) */}
            {campaigns.length > 0 && (
              <div className="mb-6 md:mb-8">
                <div className="flex justify-between items-center mb-4 md:mb-5">
                  <h2 className="text-xl md:text-2xl font-[1000] text-[#a08055]">Promo Spesial NyamNow</h2>
                </div>
                <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                  {campaigns.map(campaign => (
                    <div 
                      key={campaign.id}
                      onClick={() => router.push(`/dashboard/buyer/campaign/${campaign.id}`)}
                      className="flex-shrink-0 w-[260px] sm:w-[300px] md:w-[350px] h-32 md:h-40 rounded-[20px] relative overflow-hidden shadow-lg cursor-pointer hover:scale-[1.02] transition-transform border border-slate-100 group"
                    >
                      <img src={campaign.banner_url} alt={campaign.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                      
                      <div className="absolute bottom-4 left-4 right-4 z-10">
                        <span className="bg-[#B89B6D] text-white text-[9px] font-black px-3 py-1 rounded-full mb-2 inline-flex items-center gap-1 uppercase tracking-wider shadow-md">
                          <Zap size={10} className="text-yellow-300 fill-yellow-300" /> NyamNow Event
                        </span>
                        <h3 className="text-white text-lg md:text-xl font-black leading-tight drop-shadow-md truncate">{campaign.title}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BANNER FLASH SALE DINAMIS */}
            <div 
              onClick={() => router.push('/dashboard/buyer/flash-sale')}
              className="relative w-full h-36 md:h-48 rounded-[1.25rem] md:rounded-[2rem] overflow-hidden shadow-xl bg-gray-900 group cursor-pointer border-2 md:border-4 border-white mb-6 md:mb-12 transition-transform hover:scale-[1.01]"
            >
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110" style={{backgroundImage: "url('https://images.unsplash.com/photo-1577106263724-2c8e03bfe9cf?q=80&w=1200')"}}></div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent"></div>
              
              <div className="relative z-10 p-4 md:p-10 h-full flex flex-col justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                  <Zap size={20} className={`text-yellow-400 fill-yellow-400 md:w-8 md:h-8 ${fsStatus === 'active' ? 'animate-pulse' : ''}`} />
                  <h2 className="text-xl md:text-4xl font-black text-white italic tracking-tighter uppercase">Flash Sale</h2>
                </div>
                
                <div className="flex flex-col gap-0.5 md:gap-2">
                  <span className="text-white/80 text-[9px] md:text-xs font-bold uppercase tracking-widest">
                    {fsStatus === 'waiting' ? 'Mulai Dalam:' : 'Berakhir Dalam:'}
                  </span>
                  <div className="flex gap-1.5 md:gap-3">
                    <div className="bg-orange-600 text-white rounded-lg md:rounded-xl px-2 md:px-4 py-1 md:py-2 flex flex-col items-center min-w-[38px] md:min-w-[55px] shadow-lg">
                      <span className="text-sm md:text-lg font-black leading-none">{fsTime.h}</span>
                      <span className="text-[7px] md:text-[8px] uppercase font-bold tracking-widest mt-0.5">Jam</span>
                    </div>
                    <div className="bg-orange-600 text-white rounded-lg md:rounded-xl px-2 md:px-4 py-1 md:py-2 flex flex-col items-center min-w-[38px] md:min-w-[55px] shadow-lg">
                      <span className="text-sm md:text-lg font-black leading-none">{fsTime.m}</span>
                      <span className="text-[7px] md:text-[8px] uppercase font-bold tracking-widest mt-0.5">Men</span>
                    </div>
                    <div className="bg-orange-600 text-white rounded-lg md:rounded-xl px-2 md:px-4 py-1 md:py-2 flex flex-col items-center min-w-[38px] md:min-w-[55px] shadow-lg">
                      <span className="text-sm md:text-lg font-black leading-none">{fsTime.s}</span>
                      <span className="text-[7px] md:text-[8px] uppercase font-bold tracking-widest mt-0.5">Det</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {isLoading ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-50">
             <div className="animate-bounce mb-4 text-3xl">🍲</div>
             <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Menyiapkan Data...</p>
          </div>
        ) : (
          <>
            {uniqueStores.length > 0 && (
              <div className="mb-8 md:mb-10">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl md:text-2xl font-[1000] text-[#a08055]">Toko</h2>
                  {uniqueStores.length > 4 && (
                    <button 
                      onClick={() => setIsStoreExpanded(!isStoreExpanded)}
                      className="text-xs md:text-sm font-bold text-[#a08055] cursor-pointer hover:underline flex items-center gap-1"
                    >
                      {isStoreExpanded ? 'Sembunyikan' : 'Lihat Selengkapnya'}
                      {isStoreExpanded ? <ChevronUp size={14} /> : <ChevronRight size={14} />}
                    </button>
                  )}
                </div>
                
                <motion.div layout className={`gap-4 pb-4 ${isStoreExpanded ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'flex overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0'}`}>
                  <AnimatePresence>
                    {(isStoreExpanded ? uniqueStores : uniqueStores.slice(0, 4)).map((store, i) => {
                      const isStoreFaved = store.id ? userStoreFavorites.includes(store.id) : false;
                      const storeFavCount = store.id ? (storeFavCounts[store.id] || 0) : 0;

                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                          key={store.id || i}
                          onClick={() => store.id && router.push(`/dashboard/buyer/store/${store.id}`)}
                          className={`${isStoreExpanded ? 'w-full' : 'w-[200px] sm:w-[240px] md:w-[280px] flex-shrink-0'} bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-shadow relative`}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); store.id && toggleStoreFavorite(e, store.id); }}
                            className="absolute top-2 right-2 md:top-3 md:right-3 z-10 w-7 h-7 md:w-8 md:h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                          >
                            <Heart size={14} className={`transition-colors ${isStoreFaved ? "text-red-500 fill-red-500" : "text-gray-400"}`} />
                          </button>

                          <div className="w-full h-28 md:h-40 bg-gray-200">
                            <img src={store.profile_image_url || store.fallbackImage} alt={store.name} className="w-full h-full object-cover" />
                          </div>

                          <div className="p-2.5 md:p-4 flex flex-col flex-1 bg-[#FDFCF8]">
                            <h3 className="text-sm md:text-lg font-black text-gray-900 leading-tight truncate">{store.name}</h3>
                            <p className="text-[9px] md:text-[10px] text-gray-500 mb-1.5 md:mb-2 truncate">{store.address || "Alamat tidak tersedia"}</p>

                            <div className="flex items-center gap-0.5 mb-2">
                              {store.rating_avg && store.rating_avg > 0 ? (
                                <>
                                  {[1, 2, 3, 4, 5].map((star) => {
                                    const rating = store.rating_avg || 0;
                                    const full = star <= Math.floor(rating);
                                    const half = !full && star === Math.ceil(rating) && rating % 1 >= 0.25;
                                    return (
                                      <svg key={star} width="10" height="10" viewBox="0 0 24 24" className="md:w-3 md:h-3 flex-shrink-0">
                                        <defs>
                                          <linearGradient id={`half-${store.id}-${star}`}>
                                            <stop offset="50%" stopColor="#FACC15" />
                                            <stop offset="50%" stopColor="#E5E7EB" />
                                          </linearGradient>
                                        </defs>
                                        <polygon
                                          points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                                          fill={full ? '#FACC15' : half ? `url(#half-${store.id}-${star})` : '#E5E7EB'}
                                          stroke={full || half ? '#FACC15' : '#E5E7EB'}
                                          strokeWidth="1"
                                        />
                                      </svg>
                                    );
                                  })}
                                  <div className="bg-[#4CAF50] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ml-1">
                                    {store.rating_avg}
                                  </div>
                                </>
                              ) : (
                                <span className="text-[9px] font-bold text-gray-400 italic">Belum ada ulasan</span>
                              )}
                            </div>
                            <p className="text-[9px] md:text-[10px] text-gray-500 flex items-center gap-1.5 mb-3">
                              {store.sold_count || 0} terjual <span className="text-gray-300">|</span>
                              {store.distance ? `${store.distance.toFixed(1)}km` : "0km"} <span className="text-gray-300">|</span> 15min
                            </p>

                            <div className="mt-auto flex items-center gap-1.5 pt-3 border-t border-gray-100 text-[9px] md:text-[10px] text-gray-500 font-medium">
                              <Heart size={12} className={isStoreFaved ? "text-red-500 fill-red-500" : "text-gray-300"} /> Disukai oleh {storeFavCount}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl md:text-2xl font-[1000] text-[#a08055]">Menu</h2>
                {products.length > 6 && (
                  <button 
                    onClick={() => setIsMenuExpanded(!isMenuExpanded)}
                    className="text-xs md:text-sm font-bold text-[#a08055] cursor-pointer hover:underline flex items-center gap-1"
                  >
                    {isMenuExpanded ? 'Sembunyikan' : 'Lihat Selengkapnya'}
                    {isMenuExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}
              </div>

              {products.length === 0 ? (
                <div className="text-center py-10 text-gray-400 font-bold italic">Menu tidak ditemukan.</div>
              ) : (
                <motion.div layout className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                  <AnimatePresence>
                    {(isMenuExpanded ? products : products.slice(0, 6)).map((product) => {
                      const isProductFaved = userProductFavorites.includes(product.id);
                      const productFavCount = productFavCounts[product.id] || 0;

                      const isNew = product.created_at
                        ? (Date.now() - new Date(product.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000
                        : false

                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          transition={{ duration: 0.2 }}
                          key={product.id}
                          onClick={() => product.stores?.id && router.push(`/dashboard/buyer/store/${product.stores.id}`)}
                          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-0 md:p-3 flex flex-col md:flex-row gap-0 md:gap-4 cursor-pointer hover:shadow-md transition-shadow relative overflow-visible"
                        >
                          <div className="relative flex-shrink-0">
                            <div className="w-full h-28 md:w-20 md:h-20 rounded-t-2xl md:rounded-[15px] bg-gray-200 overflow-hidden">
                              <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                            </div>
                            {product.is_best_seller && (
                              <img src="/Best_Seller.svg" alt="Best Seller" className="absolute -top-2 -left-1 h-7 md:h-9 pointer-events-none drop-shadow-md" style={{zIndex: 10}} />
                            )}
                            {!product.is_best_seller && isNew && (
                              <img src="/New_Menu.svg" alt="New" className="absolute -top-1.5 -left-1 h-5 md:h-7 pointer-events-none drop-shadow-sm" style={{zIndex: 10}} />
                            )}
                          </div>

                          <div className="flex flex-1 min-w-0 md:py-1 p-2.5 md:p-0 items-start gap-2 md:gap-0">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs md:text-base font-black text-gray-900 truncate leading-tight mb-0.5">{product.name}</h4>
                              <div className="flex items-center gap-1 text-[8px] md:text-[10px] text-gray-500 mb-1 truncate">
                                <Store size={9} className="text-[#a08055] flex-shrink-0" /> {product.stores?.name || "Toko NyamNow"}
                              </div>
                              <div className="text-xs md:text-[13px] font-black text-[#2E7D32] mb-0.5 md:mb-1">Rp{product.price.toLocaleString("id-ID")}</div>
                              <div className="text-[7px] md:text-[9px] text-gray-400 flex items-center gap-1">
                                {product.sold_count || 0} terjual <span className="text-gray-200">|</span>
                                {product.distance ? `${product.distance.toFixed(1)}km` : "0km"} <span className="text-gray-200">|</span> 15min
                              </div>
                            </div>

                            <div className="flex flex-col items-center justify-center md:pl-2 md:border-l md:border-transparent md:self-stretch min-w-[28px] md:min-w-[40px]">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleProductFavorite(e, product.id); }}
                                className="p-1 hover:scale-110 transition-transform"
                              >
                                <Heart size={14} className={`transition-colors mb-0.5 md:w-5 md:h-5 ${isProductFaved ? "text-red-500 fill-red-500" : "text-gray-300 hover:text-red-400"}`} />
                              </button>
                              <span className="text-[7px] md:text-[9px] text-gray-400 font-bold">{productFavCount}</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 🤖 POP-UP CHATBOT NYAMBOT & MODAL AUTH */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            key="auth-modal-overlay" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[24px] md:rounded-[32px] p-6 md:p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#B89B6D]/20 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-[#FAF4EB] rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 border-4 border-white shadow-lg">
                  <Lock className="w-8 h-8 md:w-10 md:h-10 text-[#B89B6D]" />
                </div>
                
                <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-2 tracking-tight italic uppercase">Eits, Tunggu Dulu!</h3>
                <p className="text-xs md:text-sm font-bold text-gray-500 mb-6 md:mb-8 leading-relaxed">
                  {authMessage}
                </p>
                
                <div className="flex flex-col gap-2 md:gap-3">
                  <button
                    onClick={() => router.push('/login')}
                    className="w-full bg-[#B89B6D] text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-[11px] shadow-[0_10px_20px_rgba(184,155,109,0.3)] hover:scale-105 active:scale-95 transition-all"
                  >
                    Login Sekarang
                  </button>
                  <button
                    onClick={() => setShowAuthModal(false)}
                    className="w-full bg-gray-50 text-gray-400 py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-[11px] hover:bg-gray-100 transition-colors"
                  >
                    Nanti Aja
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isChatOpen && (
          <motion.div
            key="chat-bot-widget" 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-[calc(100vw-2rem)] md:w-96 bg-white rounded-2xl shadow-2xl z-[9999] flex flex-col border border-gray-100 overflow-hidden"
            style={{ height: '500px', maxHeight: '75vh' }}
          >
            <div className="bg-[#B89B6D] px-4 py-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2 text-white">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wide leading-none">NyamBot</h3>
                  <span className="text-[10px] text-white/80 font-bold">Asisten Virtual NyamNow</span>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)} 
                className="text-white/80 hover:text-white hover:bg-white/20 p-1 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[85%] px-4 py-2 text-xs font-bold shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-[#B89B6D] text-white rounded-2xl rounded-tr-sm' 
                        : 'bg-white border border-gray-100 text-gray-700 rounded-2xl rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Tanya sesuatu ke NyamBot..." 
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 md:px-4 py-2 md:py-2.5 text-[11px] md:text-xs outline-none focus:border-[#B89B6D] transition-colors"
              />
              <button 
                type="submit"
                disabled={!chatInput.trim()}
                className="bg-[#B89B6D] text-white p-2 md:p-2.5 rounded-xl hover:bg-[#a08055] disabled:opacity-50 transition-colors shadow-sm"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}