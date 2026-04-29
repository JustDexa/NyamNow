'use client'

import { useState, useEffect } from 'react'
import { 
  Search, MapPin, Heart, ShoppingCart, 
  LogOut, Settings, ChevronRight, Timer, Star, Zap, Store, Filter, LocateFixed,
  Bot, Send, X, ChevronDown, ChevronUp
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
  sold_count?: number // ✅ Tambahan buat fitur terjual di Toko
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

export default function BuyerDashboard() {
  const [activeTab, setActiveTab] = useState('Rekomendasi')
  const [showProfile, setShowProfile] = useState(false)
  const router = useRouter()

  // STATE DATA
  const [products, setProducts] = useState<Product[]>([])
  const [promos, setPromos] = useState<Promo[]>([])
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

  // ==========================================
  // 🚀 STATE EXPAND MENU & STORE
  // ==========================================
  const [isMenuExpanded, setIsMenuExpanded] = useState(false)
  const [isStoreExpanded, setIsStoreExpanded] = useState(false)

  // ==========================================
  // ⚡ STATE FLASH SALE COUNTDOWN
  // ==========================================
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
    { role: 'bot', text: 'Halo! Aku NyamBot 🤖 Ada yang bisa dibantu soal pesanan atau UMKM di sekitarmu?' }
  ])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim()) return

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

  // ✅ LOGIKA BARU FETCH PRODUK + SOLD COUNT
  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      let query = supabase.from('products').select('*, stores(id, name, latitude, longitude, address, profile_image_url, rating_avg)')

      if (searchQuery) query = query.ilike('name', `%${searchQuery}%`)
      const min = parseInt(minPrice)
      const max = parseInt(maxPrice)
      if (!isNaN(min)) query = query.gte('price', min)
      if (!isNaN(max)) query = query.lte('price', max)

      const { data, error } = await query.limit(30)
      if (error) throw error

      let finalData = data as Product[]

      // 🛒 Tarik data quantity pesanan selesai dari order_items
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

        // Gabungin angka penjualan ke array produk
        finalData = finalData.map(p => ({
          ...p,
          sold_count: salesMap[p.id] || 0
        }))
      }

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
    if (!userId) return alert('Silakan login dulu untuk menambahkan favorit!')

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
    if (!userId) return alert('Silakan login dulu untuk menambahkan favorit!')

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

  // ✅ LOGIKA KUMPULIN PENJUALAN PER TOKO
  const storeSalesMap: Record<string, number> = {}
  products.forEach(p => {
    if (p.stores?.id) {
      storeSalesMap[p.stores.id] = (storeSalesMap[p.stores.id] || 0) + (p.sold_count || 0)
    }
  })

  // Ekstrak Toko yang Unik + masukin angka penjualan
  const uniqueStores = Array.from(new Map(products.filter(p => p.stores).map(p => [p.stores?.id, { 
    ...p.stores, 
    distance: p.distance, 
    fallbackImage: p.image_url,
    sold_count: storeSalesMap[p.stores!.id] || 0
  }])).values())

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-black font-sans antialiased pb-20 text-left relative">
      
      {/* HEADER STICKY */}
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

      <div className="max-w-6xl mx-auto px-6 mt-8">
        {!isSearching && (
          <>
            <div className="mb-8">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-2xl font-[1000] text-[#a08055]">Promo Spesial</h2>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
                <div className="flex-shrink-0 w-[350px] h-40 bg-gradient-to-r from-orange-400 to-orange-500 rounded-2xl p-6 relative overflow-hidden shadow-md">
                  <div className="relative z-10">
                    <span className="bg-white/20 text-white text-[9px] font-black px-3 py-1 rounded-full mb-3 inline-block uppercase tracking-wider">Terbatas</span>
                    <h3 className="text-white text-xl font-black leading-tight">DISKON 25%<br/>SEMUA MINUMAN</h3>
                    <p className="text-white/70 text-[10px] mt-2">Hingga 24 April 2026</p>
                  </div>
                  <div className="absolute right-0 top-0 w-1/2 h-full opacity-30 mix-blend-overlay"><img src="https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=400" className="object-cover h-full w-full" /></div>
                </div>
              </div>
            </div>

            {/* BANNER FLASH SALE DINAMIS */}
            <div 
              onClick={() => router.push('/dashboard/buyer/flash-sale')}
              className="relative w-full h-48 rounded-[2rem] overflow-hidden shadow-xl bg-gray-900 group cursor-pointer border-4 border-white mb-12 transition-transform hover:scale-[1.01]"
            >
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110" style={{backgroundImage: "url('https://images.unsplash.com/photo-1577106263724-2c8e03bfe9cf?q=80&w=1200')"}}></div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent"></div>
              
              <div className="relative z-10 p-10 h-full flex flex-col justify-between">
                <div className="flex items-center gap-3">
                  <Zap size={32} className={`text-yellow-400 fill-yellow-400 ${fsStatus === 'active' ? 'animate-pulse' : ''}`} />
                  <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Flash Sale</h2>
                </div>
                
                <div className="flex flex-col gap-2">
                  <span className="text-white/80 text-xs font-bold uppercase tracking-widest">
                    {fsStatus === 'waiting' ? 'Mulai Dalam:' : 'Berakhir Dalam:'}
                  </span>
                  <div className="flex gap-3">
                    <div className="bg-orange-600 text-white rounded-xl px-4 py-2 flex flex-col items-center min-w-[55px] shadow-lg">
                      <span className="text-lg font-black leading-none">{fsTime.h}</span>
                      <span className="text-[8px] uppercase font-bold tracking-widest mt-1">Jam</span>
                    </div>
                    <div className="bg-orange-600 text-white rounded-xl px-4 py-2 flex flex-col items-center min-w-[55px] shadow-lg">
                      <span className="text-lg font-black leading-none">{fsTime.m}</span>
                      <span className="text-[8px] uppercase font-bold tracking-widest mt-1">Men</span>
                    </div>
                    <div className="bg-orange-600 text-white rounded-xl px-4 py-2 flex flex-col items-center min-w-[55px] shadow-lg">
                      <span className="text-lg font-black leading-none">{fsTime.s}</span>
                      <span className="text-[8px] uppercase font-bold tracking-widest mt-1">Det</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {isLoading ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-50">
             <div className="animate-bounce mb-4 text-3xl">🍱</div>
             <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Menyiapkan Data...</p>
          </div>
        ) : (
          <>
            {uniqueStores.length > 0 && (
              <div className="mb-10">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-[1000] text-[#a08055]">Toko</h2>
                  {uniqueStores.length > 4 && (
                    <button 
                      onClick={() => setIsStoreExpanded(!isStoreExpanded)}
                      className="text-sm font-bold text-[#a08055] cursor-pointer hover:underline flex items-center gap-1"
                    >
                      {isStoreExpanded ? 'Sembunyikan' : 'Lihat Selengkapnya'}
                      {isStoreExpanded ? <ChevronUp size={16} /> : <ChevronRight size={16} />}
                    </button>
                  )}
                </div>
                
                <motion.div layout className={`gap-4 pb-4 ${isStoreExpanded ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'flex overflow-x-auto no-scrollbar'}`}>
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
                          className={`${isStoreExpanded ? 'w-full' : 'w-[280px] flex-shrink-0'} bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col cursor-pointer hover:shadow-md transition-shadow relative`}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); store.id && toggleStoreFavorite(e, store.id); }}
                            className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                          >
                            <Heart size={16} className={`transition-colors ${isStoreFaved ? "text-red-500 fill-red-500" : "text-gray-400"}`} />
                          </button>

                          <div className="w-full h-40 bg-gray-200">
                            <img src={store.profile_image_url || store.fallbackImage} alt={store.name} className="w-full h-full object-cover" />
                          </div>

                          <div className="p-4 flex flex-col flex-1 bg-[#FDFCF8]">
                            <h3 className="text-lg font-black text-gray-900 leading-tight truncate">{store.name}</h3>
                            <p className="text-[10px] text-gray-500 mb-2 truncate">{store.address || "Alamat tidak tersedia"}</p>

                            <div className="flex items-center gap-0.5 mb-2">
                              {[1, 2, 3, 4, 5].map((star) => <Star key={star} size={12} className="fill-yellow-400 text-yellow-400" />)}
                              <div className="bg-[#4CAF50] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ml-1">{store.rating_avg || 5}</div>
                            </div>

                            <p className="text-[10px] text-gray-500 flex items-center gap-1.5 mb-3">
                              {/* ✅ ANGKA TOKO DINAMIS */}
                              {store.sold_count || 0} terjual <span className="text-gray-300">|</span>
                              {store.distance ? `${store.distance.toFixed(1)}km` : "0km"} <span className="text-gray-300">|</span> 15min
                            </p>

                            <div className="mt-auto flex items-center gap-1.5 pt-3 border-t border-gray-100 text-[10px] text-gray-500 font-medium">
                              <Heart size={14} className={isStoreFaved ? "text-red-500 fill-red-500" : "text-gray-300"} /> Disukai oleh {storeFavCount}
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
                <h2 className="text-2xl font-[1000] text-[#a08055]">Menu</h2>
                {products.length > 6 && (
                  <button 
                    onClick={() => setIsMenuExpanded(!isMenuExpanded)}
                    className="text-sm font-bold text-[#a08055] cursor-pointer hover:underline flex items-center gap-1"
                  >
                    {isMenuExpanded ? 'Sembunyikan' : 'Lihat Selengkapnya'}
                    {isMenuExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                )}
              </div>

              {products.length === 0 ? (
                <div className="text-center py-10 text-gray-400 font-bold italic">Menu tidak ditemukan.</div>
              ) : (
                <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {(isMenuExpanded ? products : products.slice(0, 6)).map((product) => {
                      const isProductFaved = userProductFavorites.includes(product.id);
                      const productFavCount = productFavCounts[product.id] || 0;

                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          transition={{ duration: 0.2 }}
                          key={product.id}
                          onClick={() => product.stores?.id && router.push(`/dashboard/buyer/store/${product.stores.id}`)}
                          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex gap-4 items-center cursor-pointer hover:shadow-md transition-shadow"
                        >
                          <div className="w-20 h-20 rounded-[15px] bg-gray-200 flex-shrink-0 overflow-hidden">
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                          </div>

                          <div className="flex-1 min-w-0 py-1">
                            <h4 className="text-base font-black text-gray-900 truncate leading-tight mb-0.5">{product.name}</h4>
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1.5 truncate">
                              <Store size={10} className="text-[#a08055]" /> {product.stores?.name || "Toko NyamNow"}
                            </div>
                            <div className="text-[13px] font-black text-[#2E7D32] mb-1">Rp{product.price.toLocaleString("id-ID")}</div>
                            <div className="text-[9px] text-gray-400 flex items-center gap-1.5">
                              {/* ✅ ANGKA PRODUK DINAMIS */}
                              {product.sold_count || 0} terjual <span className="text-gray-200">|</span>
                              {product.distance ? `${product.distance.toFixed(1)}km` : "0km"} <span className="text-gray-200">|</span> 15min
                            </div>
                          </div>

                          <div className="flex flex-col items-center justify-center pl-2 border-l border-transparent self-stretch min-w-[40px]">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleProductFavorite(e, product.id); }}
                              className="p-1 hover:scale-110 transition-transform"
                            >
                              <Heart size={18} className={`transition-colors mb-1 ${isProductFaved ? "text-red-500 fill-red-500" : "text-gray-300 hover:text-red-400"}`} />
                            </button>
                            <span className="text-[9px] text-gray-400 font-bold">{productFavCount}</span>
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

      {/* 🤖 POP-UP CHATBOT NYAMBOT */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl z-[9999] flex flex-col border border-gray-100 overflow-hidden"
            style={{ height: '500px', maxHeight: '80vh' }}
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
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#B89B6D] transition-colors"
              />
              <button 
                type="submit"
                disabled={!chatInput.trim()}
                className="bg-[#B89B6D] text-white p-2.5 rounded-xl hover:bg-[#a08055] disabled:opacity-50 transition-colors shadow-sm"
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