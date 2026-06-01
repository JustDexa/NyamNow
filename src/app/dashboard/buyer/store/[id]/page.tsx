'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

import { 
  MapPin, Heart, ShoppingCart, 
  ChevronRight, Star, Navigation, CheckCircle2, Plus, Minus, X,
  Bot, Send, Lock, Clock, Ticket, Tag, Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NavbarBuyer from '@/components/NavbarBuyer'

// --- INTERFACES ---
interface StoreData {
  id: string
  name: string
  address: string
  description: string
  profile_image_url: string
  rating_avg: number
  total_reviews: number
  latitude: number
  longitude: number
  type?: string
  seller_type: string 
}

interface StoreImage {
  id: string
  image_url: string
}

interface VariantOption {
  name: string
  extra_price: number
}

interface VariantGroup {
  group_name: string
  options: VariantOption[]
}

interface Product {
  id: string
  name: string
  price: number
  image_url: string
  estimated_time: number
  stock: number
  description?: string
  flavors?: string[]
  ingredients?: string[]
  variants?: VariantGroup[]
  sold_count?: number
}

interface Promo {
  id: string
  type: 'flash_sale' | 'promo'
  title: string
  description?: string
  discount_price?: number
  promo_image_url?: string
  start_at: string
  end_at: string
  product_id?: string
  buy_qty?: number
  get_qty?: number
  products?: {
    id: string
    name: string
    price: number
    image_url: string
  }
}

interface CartItem extends Product {
  quantity: number
  note?: string
  variant?: string 
}

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  users: {
    first_name: string
    last_name: string
    profile_image_url?: string
  }
}

export default function StoreDetail() {
  const router = useRouter()
  const params = useParams()
  const storeId = params.id as string

  // --- STATES ---
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMessage, setAuthMessage] = useState('')

  const requireLogin = (message: string) => {
    setAuthMessage(message)
    setShowAuthModal(true)
  }
  const [activeTab, setActiveTab] = useState<'Home' | 'All Menu' | 'Promo' | 'Ulasan'>('Home')
  const [menuFilter, setMenuFilter] = useState('Semua Menu') 
  
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  
  const [store, setStore] = useState<StoreData | null>(null)
  const [gallery, setGallery] = useState<StoreImage[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [promos, setPromos] = useState<Promo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isChatLoading, setIsChatLoading] = useState(false)
  
  const [isStoreFaved, setIsStoreFaved] = useState(false)
  const [userProductFavorites, setUserProductFavorites] = useState<string[]>([])
  const [productFavCounts, setProductFavCounts] = useState<Record<string, number>>({})

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [modalQty, setModalQty] = useState(1)
  const [modalNote, setModalNote] = useState('')
  const [selectedVariants, setSelectedVariants] = useState<Record<string, VariantOption>>({})
  const [cart, setCart] = useState<CartItem[]>([])
  const [reviews, setReviews] = useState<Review[]>([])

  // STATE CHATBOT NYAMBOT
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', text: 'Halo! Aku NyamBot 🤖 Ada yang bisa dibantu soal menu di toko ini?' }
  ])

  const [promoApplied, setPromoApplied] = useState<Promo | null>(null);

 useEffect(() => {
  const fetchStoreData = async () => {
    if (!storeId) return
    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setUserId(user.id)

        const { data: userData } = await supabase
          .from('users')
          .select('first_name')
          .eq('id', user.id)
          .single()

        if (userData) setUserName(userData.first_name)

        const { data: storeFav } = await supabase
          .from('store_favorites')
          .select('id')
          .match({ user_id: user.id, store_id: storeId })
          .maybeSingle()

        if (storeFav) setIsStoreFaved(true)

        const { data: favProdData } = await supabase
          .from('product_favorites')
          .select('product_id')
          .eq('user_id', user.id)

        if (favProdData) {
          setUserProductFavorites(favProdData.map(f => f.product_id))
        }
      }

      const { data: storeData } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single()

      setStore(storeData)

      const { data: galleryData } = await supabase
        .from('store_images')
        .select('*')
        .eq('store_id', storeId)

      setGallery(galleryData || [])

      let productsWithSales = []

      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)

      if (productData) {
        const { data: salesData } = await supabase
          .from('order_items')
          .select('product_id, quantity, orders!inner(status)')
          .eq('orders.status', 'completed')
          .in('product_id', productData.map(p => p.id))

        const salesMap: Record<string, number> = {}

        salesData?.forEach(item => {
          salesMap[item.product_id] =
            (salesMap[item.product_id] || 0) + (item.quantity || 0)
        })

        productsWithSales = productData.map(p => ({
          ...p,
          sold_count: salesMap[p.id] || 0
        }))

        setProducts(productsWithSales)
      }

      const now = new Date().toISOString()
      const { data: promoData } = await supabase
        .from('promos')
        .select('id, type, title, description, discount_price, promo_image_url, start_at, end_at, product_id, buy_qty, get_qty, products!promos_product_id_fkey(id, name, price, image_url)')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .lte('start_at', now)
        .gte('end_at', now)

      setPromos((promoData as unknown as Promo[]) || [])

      // ==========================
      // AUTO OPEN PRODUCT & PROMO
      // ==========================
      const searchParams = new URLSearchParams(window.location.search)

      const autoOpenId = searchParams.get('auto_open')
      const applyPromoId = searchParams.get('apply_promo')

      if (applyPromoId && promoData?.length) {
        const foundPromo = promoData.find(
          promo => promo.id === applyPromoId
        )

        if (foundPromo) {
          setPromoApplied(foundPromo as unknown as Promo)
        }
      }

      if (autoOpenId && productsWithSales.length) {
        const foundProduct = productsWithSales.find(
          product => product.id === autoOpenId
        )

        if (foundProduct) {
          openProductModal(foundProduct)
        }
      }

      const { data: allProdFavs } = await supabase
        .from('product_favorites')
        .select('product_id')

      if (allProdFavs) {
        const counts: Record<string, number> = {}

        allProdFavs.forEach(f => {
          counts[f.product_id] = (counts[f.product_id] || 0) + 1
        })

        setProductFavCounts(counts)
      }

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(
          'id, rating, comment, created_at, users(first_name, last_name, profile_image_url)'
        )
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })

      setReviews((reviewsData as unknown as Review[]) || [])

    } catch (error) {
      console.error('Error fetching store detail:', error)
    } finally {
      setIsLoading(false)
    }
  }

  fetchStoreData()
}, [storeId])

  const checkIsPremiumUMKM = () => (store?.type || '').toLowerCase() === 'berkembang'

  const getProductPrice = (product: Product) => {
    const now = new Date().getTime() 
    const activePromo = promos.find(p => {
      const startTime = new Date(p.start_at).getTime()
      const endTime = new Date(p.end_at).getTime()
      return p.product_id === product.id && now >= startTime && now <= endTime
    })
    return {
      currentPrice: activePromo?.discount_price || product.price,
      originalPrice: product.price,
      hasPromo: !!activePromo,
      promoType: activePromo?.type || 'promo'
    }
  }

  const openProductModal = (product: Product) => {
    setSelectedProduct(product)
    setModalQty(1) 
    setModalNote('')
    setSelectedVariants({}) 
  }

 const handleModalAddToCart = () => {
    if (!userId) {
      requireLogin('Login dulu yuk buat masukin ke keranjang!')
      return
    }

    if (!selectedProduct) return
    const priceInfo = getProductPrice(selectedProduct)
    
    let finalQty = modalQty;
    let finalPrice = priceInfo.currentPrice;

    // Kalau ada promo terpasang, cek mekaniknya
    if (promoApplied && promoApplied.type === 'promo') {
      const buyQty = promoApplied.buy_qty ?? 1
      const getQty = promoApplied.get_qty ?? 0
      if (modalQty >= (buyQty + getQty)) {
        finalQty = modalQty + getQty
      }
    }
    
    const variantExtraCost = Object.values(selectedVariants).reduce((sum, opt) => sum + opt.extra_price, 0)
    finalPrice = (priceInfo.currentPrice + variantExtraCost)

    const variantNames = Object.values(selectedVariants).map(v => v.name)
    const variantString = variantNames.length > 0 ? variantNames.join(', ') : undefined

    setCart(prev => {
      const existing = prev.find(item => item.id === selectedProduct.id && item.variant === variantString)
      if (existing) {
        return prev.map(item => item.id === selectedProduct.id && item.variant === variantString 
          ? { ...item, quantity: item.quantity + finalQty, note: modalNote } 
          : item)
      }
      return [...prev, { 
        ...selectedProduct, 
        price: finalPrice, 
        quantity: finalQty, 
        note: modalNote, 
        variant: variantString,
        promo_id: promoApplied?.id
      }]
    })
    setSelectedProduct(null)
    setPromoApplied(null) // Reset promo setelah masuk cart
  }

  const toggleStoreFavorite = async () => {
    if (!userId) {
      requireLogin('Login dulu yuk buat favoritin toko!')
      return
    }
    const current = isStoreFaved
    setIsStoreFaved(!current)
    if (current) await supabase.from('store_favorites').delete().match({ user_id: userId, store_id: storeId })
    else await supabase.from('store_favorites').insert({ user_id: userId, store_id: storeId })
  }

  const toggleProductFavorite = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation()
    if (!userId) {
      requireLogin('Login dulu yuk buat favoritin produk!')
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

  const openNavigation = () => {
    if (!store?.latitude || !store?.longitude) return alert('Koordinat toko tidak ditemukan!')
    window.open(`https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`, '_blank')
  }

  const addToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation()

    if (!userId) {
      requireLogin('Login dulu yuk buat masukin ke keranjang!')
      return
    }

    const currentQty = getQty(product.id)
    if (currentQty >= product.stock) return

    if (product.variants && product.variants.length > 0) return openProductModal(product)
    const priceInfo = getProductPrice(product)
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && !item.variant)
      if (existing) return prev.map(item => item.id === product.id && !item.variant ? { ...item, quantity: item.quantity + 1 } : item)
      return [...prev, { ...product, price: priceInfo.currentPrice, quantity: 1 }]
    })
  }

  const removeFromCart = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation()
    setCart(prev => {
      const existing = prev.find(item => item.id === productId)
      if (existing && existing.quantity > 1) return prev.map(item => item.id === productId ? { ...item, quantity: item.quantity - 1 } : item)
      return prev.filter(item => item.id !== productId)
    })
  }

  const totalCartItems = cart.reduce((acc, item) => acc + item.quantity, 0)
  const totalCartPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const getQty = (productId: string) => cart.filter(item => item.id === productId).reduce((acc, item) => acc + item.quantity, 0)

  const handleContactSeller = async (targetStoreId: string) => {
    setIsChatLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')
      let { data: conversation } = await supabase.from('conversations').select('id').eq('buyer_id', user.id).eq('store_id', targetStoreId).maybeSingle()
      if (!conversation) {
        const { data: newConv, error: createError } = await supabase.from('conversations').insert({ buyer_id: user.id, store_id: targetStoreId }).select('id').single()
        if (createError) throw createError
        conversation = newConv
      }
      if (conversation?.id) router.push(`/dashboard/buyer/chats?id=${conversation.id}`)
    } catch (error) {
      console.error("Gagal memulai chat:", error)
      alert("Gagal menghubungi penjual.")
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) {
      requireLogin('Halo ahjussi! NyamBot cuma bisa ngobrol sama user yang udah login nih.')
      return
    }
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
    } catch (_err) {
      setChatMessages(prev => [...prev, { role: 'bot', text: 'Waduh, koneksi ke otakku putus nih. Coba lagi bentaran yak!' }])
    }
  }

  if (isLoading) return <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center font-black text-[#B89B6D] animate-pulse">Menyiapkan Toko...</div>

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-black font-sans antialiased pb-32">
      
      <NavbarBuyer 
        userName={userName} 
        handleLogout={() => supabase.auth.signOut().then(() => router.push('/login'))} 
        setIsChatOpen={setIsChatOpen}
      />

      <div className="w-full md:max-w-6xl md:mx-auto px-3 md:px-6 mt-4 md:mt-8">
        {/* HEADER TOKO */}
        <div className="bg-[#F6F2EB] rounded-2xl p-4 md:p-6 border border-[#EAE2D3] shadow-sm relative mb-4 md:mb-6 text-left">
          
          {/* TOP ROW: foto + nama + badge premium */}
          <div className="flex items-center gap-3 md:gap-6 mb-4">
            <div className="w-16 h-16 md:w-28 md:h-28 rounded-full border-4 border-white shadow-md overflow-hidden bg-white flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={store?.profile_image_url || '/images/iconNyamnow.png'} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-base md:text-2xl font-black text-gray-900 leading-tight truncate">{store?.name}</h1>
                {checkIsPremiumUMKM() && (
                  <div className="bg-green-100 text-green-700 px-2 md:px-4 py-1 md:py-2 rounded-lg flex items-center gap-1 border border-green-200 shadow-sm flex-shrink-0">
                    <CheckCircle2 size={12} /> <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Reservasi</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {[1,2,3,4,5].map(star => <Star key={star} size={11} className="fill-yellow-400 text-yellow-400" />)}
                <span className="text-[10px] font-bold text-gray-500 ml-1">({store?.rating_avg || 5})</span>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS — wrap di mobile */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={openNavigation} className="bg-[#B89B6D] text-white px-3 md:px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 hover:bg-[#a08055] transition-colors shadow-sm">
              <Navigation size={11} /> Menuju Lokasi
            </button>
            <button onClick={() => handleContactSeller(storeId)} disabled={isChatLoading} className="bg-transparent border-2 border-[#B89B6D] text-[#B89B6D] px-3 md:px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-[#B89B6D] hover:text-white transition-colors disabled:opacity-50">
              {isChatLoading ? 'Membuka Chat...' : 'Hubungi Penjual'}
            </button>
            <button onClick={toggleStoreFavorite} className={`bg-white border-2 p-2 rounded-lg transition-colors shadow-sm active:scale-95 ${isStoreFaved ? 'border-red-200 text-red-500' : 'text-gray-400 hover:border-red-200 hover:text-red-400'}`}>
              <Heart size={14} className={isStoreFaved ? "fill-red-500 text-red-500" : ""} />
            </button>
          </div>

          {/* TABS — grid 4 kolom biar ga overflow dan ga ada scrollbar */}
          <div className="grid grid-cols-4 mt-5 border-b-2 border-gray-200/50">
            {(['Home', 'All Menu', 'Promo', 'Ulasan'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-[10px] md:text-sm font-black uppercase tracking-widest transition-colors relative flex items-center justify-center gap-1 ${activeTab === tab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {tab}
                {tab === 'Promo' && promos.length > 0 && (
                  <span className="bg-orange-500 text-white text-[7px] md:text-[8px] font-black px-1 md:px-1.5 py-0.5 rounded-full leading-none">{promos.length}</span>
                )}
                {activeTab === tab && <div className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-gray-900 rounded-t-full" />}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT TABS */}
        {activeTab === 'Home' ? (
          <section className="text-left">
            <div className="mb-10">
              <p className="text-gray-500 text-sm leading-relaxed mb-4 max-w-4xl">{store?.description}</p>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {gallery.map(img => (
                  <div key={img.id} className="w-32 h-32 flex-shrink-0 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.image_url} alt="Foto galeri toko" className="w-full h-full object-cover hover:scale-110 transition-transform" onError={(e) => e.currentTarget.src = '/images/iconNyamnow.png'} />
                  </div>
                ))}
              </div>
            </div>
            <h2 className="text-xl font-black text-[#a08055] mb-6">Rekomendasi</h2>
            <div className="flex gap-5 overflow-x-auto no-scrollbar pb-6">
              {products.slice(0, 5).map((product) => {
                const isFaved = userProductFavorites.includes(product.id)
                const priceInfo = getProductPrice(product)
                return (
                  <div key={product.id} onClick={() => openProductModal(product)} className="flex-shrink-0 w-[240px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative group cursor-pointer hover:shadow-md transition-shadow">
                    <div className="w-full h-36 bg-gray-200 overflow-hidden relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      {priceInfo.hasPromo && (
                        <div className="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shadow-sm animate-pulse z-10">
                          {priceInfo.promoType === 'flash_sale' ? '⚡ Flash Sale' : '🔥 Promo'}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h4 className="text-sm font-black text-gray-900 truncate mb-1">{product.name}</h4>
                      <div className="flex items-center gap-2 mb-1">
                         <span className="text-[13px] font-black text-[#2E7D32]">Rp{priceInfo.currentPrice.toLocaleString('id-ID')}</span>
                         {priceInfo.hasPromo && <span className="text-[10px] font-bold text-gray-400 line-through">Rp{priceInfo.originalPrice.toLocaleString('id-ID')}</span>}
                      </div>
                      
                      <div className="mb-3">
                        {product.stock > 5 ? (
                          <span className="text-[9px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">Tersedia {product.stock} Porsi</span>
                        ) : product.stock > 0 ? (
                          <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100 animate-pulse">Sisa {product.stock} Porsi!</span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">Habis Terjual</span>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-[9px] text-gray-400 border-t border-gray-50 pt-3">
                        <span>{product.sold_count || 0} terjual | {product.estimated_time || 15}min</span>
                        <button onClick={(e) => toggleProductFavorite(e, product.id)} className="group/fav">
                          <Heart size={14} className={`transition-colors ${isFaved ? 'text-red-500 fill-red-500' : 'text-gray-300 group-hover/fav:text-red-400'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : activeTab === 'Promo' ? (
          <section className="text-left">
            {promos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Tag size={24} className="text-gray-300" />
                </div>
                <p className="font-black text-gray-400 text-sm">Tidak ada promo aktif saat ini</p>
                <p className="text-xs text-gray-300 mt-1">Pantau terus ya, promo bisa datang kapan aja!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* FLASH SALE */}
                {promos.filter(p => p.type === 'flash_sale').length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Zap size={16} className="text-orange-500 fill-orange-500" />
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight italic">Flash Sale</h3>
                      <span className="text-[9px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                        {promos.filter(p => p.type === 'flash_sale').length} aktif
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {promos.filter(p => p.type === 'flash_sale').map(promo => {
                        const msLeft = new Date(promo.end_at).getTime() - Date.now()
                        const expiringSoon = msLeft > 0 && msLeft < 2 * 3600 * 1000
                        return (
                          <div
                            key={promo.id}
                            onClick={() => {
                              const full = products.find(p => p.id === promo.product_id)
                              if (full) openProductModal(full)
                            }}
                            className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4 flex gap-3 cursor-pointer hover:shadow-md transition-shadow active:scale-95 relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 bg-orange-500 text-white text-[8px] font-black px-2 py-1 rounded-bl-xl uppercase tracking-widest flex items-center gap-1">
                              <Zap size={9} className="fill-white" /> Flash Sale
                            </div>
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={promo.products?.image_url || '/images/iconNyamnow.png'} alt={promo.products?.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                              <p className="text-xs font-black text-gray-900 truncate">{promo.products?.name}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[10px] text-gray-400 line-through">Rp{(promo.products?.price || 0).toLocaleString('id-ID')}</span>
                                <span className="text-sm font-black text-orange-600">Rp{(promo.discount_price || 0).toLocaleString('id-ID')}</span>
                              </div>
                              {promo.description && (
                                <p className="text-[9px] text-gray-400 mt-1 line-clamp-1">{promo.description}</p>
                              )}
                              <div className="flex items-center gap-1 mt-1.5">
                                <Clock size={9} className={expiringSoon ? 'text-red-500' : 'text-gray-400'} />
                                <span className={`text-[9px] font-bold ${expiringSoon ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                                  Berakhir {new Date(promo.end_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* BUNDLE PROMO */}
                {promos.filter(p => p.type === 'promo').length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Tag size={15} className="text-[#B89B6D]" />
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight italic">Bundle & Promo</h3>
                      <span className="text-[9px] font-black text-[#B89B6D] bg-[#FAF4EB] px-2 py-0.5 rounded-full border border-[#EAE2D3]">
                        {promos.filter(p => p.type === 'promo').length} promo
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {promos.filter(p => p.type === 'promo').map(promo => (
                        <div
                          key={promo.id}
                          onClick={() => {
                            const full = products.find(p => p.id === promo.product_id)
                            if (full) openProductModal(full)
                          }}
                          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-3 cursor-pointer hover:shadow-md transition-shadow active:scale-95"
                        >
                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={promo.products?.image_url || '/images/iconNyamnow.png'} alt={promo.products?.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="inline-block bg-green-50 text-green-700 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider mb-1 border border-green-100">Bundle Deal</div>
                            <p className="text-xs font-black text-gray-900 uppercase italic truncate">{promo.title || promo.products?.name}</p>
                            <p className="text-sm font-black text-green-600 mt-0.5">Beli {promo.buy_qty} Gratis {promo.get_qty}</p>
                            {promo.description && (
                              <p className="text-[9px] text-gray-400 mt-1 line-clamp-2">{promo.description}</p>
                            )}
                            <div className="flex items-center gap-1 mt-1.5">
                              <Clock size={9} className="text-gray-400" />
                              <span className="text-[9px] font-bold text-gray-400">
                                s/d {new Date(promo.end_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : activeTab === 'Ulasan' ? (
          <section className="text-left">
            <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-start">

              {/* KIRI: ULASAN */}
              <div className="flex-1 min-w-0">
                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 md:gap-6 mb-4 md:mb-6">
                  <div className="text-center flex-shrink-0">
                    <h2 className="text-5xl font-black text-gray-900">{store?.rating_avg || 0}</h2>
                    <div className="flex justify-center mt-2 mb-1">
                      {[1,2,3,4,5].map(s => <Star key={s} size={14} className={s <= Math.round(store?.rating_avg || 0) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"} />)}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{store?.total_reviews || 0} Ulasan</p>
                  </div>
                  <div className="h-16 w-px bg-gray-100"></div>
                  <div className="flex-1 text-sm font-bold text-gray-500">
                    Nilai dan ulasan murni dari pembeli yang udah nyobain langsung hidangan di {store?.name}.
                  </div>
                </div>

                {reviews.length === 0 ? (
                  <p className="text-sm font-bold text-gray-400 text-center py-8">Belum ada ulasan untuk toko ini.</p>
                ) : (
                  reviews.map(rev => (
                    <div key={rev.id} className="mb-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-[#FAF4EB] border border-[#EAE2D3] flex-shrink-0 overflow-hidden">
                          {rev.users?.profile_image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={rev.users.profile_image_url} alt={rev.users.first_name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display='none'; (e.currentTarget.parentElement as HTMLElement).innerHTML = `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:12px;font-weight:900;color:#a08055">${rev.users?.first_name?.[0]?.toUpperCase() || '?'}</span>` }} />
                          ) : (
                            <span className="w-full h-full flex items-center justify-center text-xs font-black text-[#a08055]">{rev.users?.first_name?.[0]?.toUpperCase() || '?'}</span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-black">{rev.users?.first_name || 'Anonim'} {rev.users?.last_name || ''}</h4>
                          <div className="flex mt-0.5">
                            {[1,2,3,4,5].map((i) => <Star key={i} size={10} className={i <= rev.rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"} />)}
                          </div>
                        </div>
                        <span className="ml-auto text-[10px] text-gray-400 font-bold">{new Date(rev.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      {rev.comment && <p className="text-sm text-gray-600 leading-relaxed">{rev.comment}</p>}
                    </div>
                  ))
                )}
              </div>

              {/* KANAN: SIDEBAR INFO TOKO */}
              <div className="w-full md:w-72 md:flex-shrink-0 space-y-4 md:sticky md:top-24">
                {/* Info Toko */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Info Toko</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#FAF4EB] flex items-center justify-center flex-shrink-0">
                        <MapPin size={13} className="text-[#B89B6D]" />
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{store?.address || 'Alamat belum tersedia'}</p>
                    </div>
                  </div>
                </div>

                {/* Rating breakdown */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Distribusi Rating</p>
                  <div className="space-y-2">
                    {[5,4,3,2,1].map(star => {
                      const count = reviews.filter(r => r.rating === star).length
                      const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-gray-500 w-3">{star}</span>
                          <Star size={9} className="fill-yellow-400 text-yellow-400 flex-shrink-0" />
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-yellow-400 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[9px] text-gray-400 font-bold w-4 text-right">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section>
            <div className="flex justify-center gap-2 mb-4 md:mb-8">
              {['Semua Menu', 'Terlaris', 'Top Rating'].map((filter) => (
                <button key={filter} onClick={() => setMenuFilter(filter)} className={`px-4 md:px-8 py-2 rounded-full text-[10px] md:text-xs font-bold transition-all shadow-sm ${menuFilter === filter ? 'bg-[#a08055] text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{filter}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-6">
              {products.map((product) => {
                const qty = getQty(product.id)
                const isFaved = userProductFavorites.includes(product.id)
                const favCount = productFavCounts[product.id] || 0
                const priceInfo = getProductPrice(product)
                return (
                  <div key={product.id} onClick={() => openProductModal(product)} className="bg-[#FDFCF8] rounded-xl md:rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden group cursor-pointer hover:shadow-md transition-shadow relative text-left">
                    <div className="w-full h-28 md:h-40 bg-gray-200 overflow-hidden relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      {priceInfo.hasPromo && (
                        <div className="absolute top-1.5 left-1.5 bg-orange-500 text-white text-[7px] md:text-[9px] font-black px-1.5 md:px-2 py-0.5 md:py-1 rounded-md uppercase tracking-wider shadow-sm animate-pulse z-10">
                          {priceInfo.promoType === 'flash_sale' ? '⚡ Sale' : '🔥 Promo'}
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 md:p-4 flex flex-col flex-1">
                      <h4 className="text-xs md:text-base font-black text-gray-900 truncate mb-0.5">{product.name}</h4>
                      <div className="flex items-center gap-1 mb-1 flex-wrap">
                        <span className="text-xs font-black text-[#2E7D32]">Rp{priceInfo.currentPrice.toLocaleString('id-ID')}</span>
                        {priceInfo.hasPromo && <span className="text-[9px] font-bold text-gray-400 line-through">Rp{priceInfo.originalPrice.toLocaleString('id-ID')}</span>}
                      </div>

                      <div className="mb-1.5">
                        {product.stock > 5 ? (
                          <span className="text-[8px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">Tersedia {product.stock}</span>
                        ) : product.stock > 0 ? (
                          <span className="text-[8px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 animate-pulse">Sisa {product.stock}!</span>
                        ) : (
                          <span className="text-[8px] font-black uppercase tracking-widest text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Habis</span>
                        )}
                      </div>

                      <div className="text-[8px] text-gray-400 mb-2 font-bold uppercase tracking-widest">
                        {product.sold_count || 0} terjual · {product.estimated_time || 15}min
                      </div>
                      <div className="mt-auto pt-2 border-t border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-1 cursor-pointer group/fav" onClick={(e) => toggleProductFavorite(e, product.id)}>
                          <Heart size={12} className={`transition-colors ${isFaved ? 'text-red-500 fill-red-500' : 'text-gray-300 group-hover/fav:text-red-400'}`} />
                          <span className="text-[8px] text-gray-500">{favCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {qty > 0 && (!product.variants || product.variants.length === 0) ? (
                            <>
                              <button onClick={(e) => removeFromCart(e, product.id)} className="w-5 h-5 md:w-6 md:h-6 rounded-full border border-[#B89B6D] text-[#B89B6D] flex items-center justify-center hover:bg-[#FAF4EB] transition-colors"><Minus size={10} strokeWidth={3}/></button>
                              <span className="font-black text-xs w-3 text-center">{qty}</span>
                              <button 
                                onClick={(e) => addToCart(e, product)} 
                                disabled={qty >= product.stock}
                                className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center transition-colors ${qty >= product.stock ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#B89B6D] text-white hover:bg-[#a08055]'}`}
                              >
                                <Plus size={10} strokeWidth={3}/>
                              </button>
                            </>
                          ) : product.stock > 0 ? (
                            <button onClick={(e) => addToCart(e, product)} className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-[#a08055] text-white flex items-center justify-center hover:bg-[#8b6e49] shadow-sm active:scale-95 transition-all"><Plus size={12} strokeWidth={3}/></button>
                          ) : (
                            <span className="text-[7px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">HABIS</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {/* --- MODAL DETAIL PRODUK --- */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-sm md:px-4">
            <motion.div 
              initial={{ opacity: 0, y: '100%' }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: '100%' }} 
              className="bg-[#FDFCF8] w-full md:max-w-4xl rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl h-[90vh] md:h-auto md:max-h-[90vh]"
            >
              {/* Bagian Kiri: Gambar (Mobile ditaruh atas) */}
              <div className="w-full md:w-1/2 h-56 md:h-auto bg-gray-200 relative flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 bg-white/80 backdrop-blur p-2 rounded-full text-gray-800 hover:bg-white transition-colors shadow-md md:hidden z-50">
                  <X size={20} />
                </button>
              </div>

              {/* Bagian Kanan: Info & Action */}
              <div className="w-full md:w-1/2 flex flex-col h-full bg-white relative text-left overflow-hidden">
                <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200 transition-colors hidden md:block z-20">
                  <X size={20} />
                </button>
                
                {/* Info Atas (Fixed, gak ikut scroll) */}
                <div className="p-5 md:p-8 pb-3 md:pb-4 bg-white z-10 flex-shrink-0">
                  <div className="flex justify-between items-start md:mr-8">
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 leading-tight">{selectedProduct.name}</h2>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Heart size={16} className={userProductFavorites.includes(selectedProduct.id) ? "fill-red-500 text-red-500" : ""} />
                      <span className="text-xs font-bold">{productFavCounts[selectedProduct.id] || 0}</span>
                    </div>
                  </div>

                  {/* Label promo aktif untuk produk ini */}
                  {(() => {
                    const activePromos = promos.filter(p => p.product_id === selectedProduct.id)
                    if (activePromos.length === 0) return null
                    return (
                      <div className="flex flex-wrap gap-2 mt-2 mb-1">
                        {activePromos.map(p => (
                          <div
                            key={p.id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm ${
                              p.type === 'flash_sale'
                                ? 'bg-orange-500 text-white'
                                : 'bg-gradient-to-r from-[#B89B6D] to-[#a08055] text-white'
                            }`}
                          >
                            {p.type === 'flash_sale' ? <Zap size={11} className="fill-white" /> : <Tag size={11} />}
                            {p.type === 'flash_sale'
                              ? `⚡ Flash Sale — Rp${(p.discount_price || 0).toLocaleString('id-ID')}`
                              : `🎟️ Beli ${p.buy_qty} Gratis ${p.get_qty}`}
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  {promoApplied && (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-[#B89B6D] to-[#a08055] text-white px-4 py-2 rounded-xl mt-2 mb-2 shadow-lg">
                      <Ticket size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest italic truncate">
                        🎟️ PROMO: {promoApplied.title || 'Beli 1 Gratis 1'}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-1 mb-3 md:mb-4">
                    {[1,2,3,4,5].map(star => <Star key={star} size={14} className="fill-yellow-400 text-yellow-400" />)}
                    <div className="bg-[#4CAF50] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ml-1">5</div>
                  </div>

                  {(() => {
                    const priceInfo = getProductPrice(selectedProduct)
                    const variantExtraCost = Object.values(selectedVariants).reduce((sum, opt) => sum + opt.extra_price, 0)
                    const currentTotal = priceInfo.currentPrice + variantExtraCost
                    const originalTotal = priceInfo.originalPrice + variantExtraCost
                    return (
                      <div className={`inline-flex items-end gap-2 px-4 md:px-5 py-2 md:py-3 rounded-xl shadow-sm ${priceInfo.hasPromo ? 'bg-orange-50 border border-orange-200 text-orange-700' : 'bg-[#B89B6D] text-white'}`}>
                        <span className="text-xl md:text-2xl font-black leading-none">Rp{currentTotal.toLocaleString('id-ID')}</span>
                        {priceInfo.hasPromo && <span className="text-xs md:text-sm font-bold opacity-60 line-through mb-0.5 text-gray-500">Rp{originalTotal.toLocaleString('id-ID')}</span>}
                      </div>
                    )
                  })()}
                  
                  {/* ✅ INDIKATOR STOK DI DALAM MODAL */}
                  <div className="mt-3">
                    {selectedProduct.stock > 5 ? (
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-green-100">Tersedia {selectedProduct.stock} Porsi</span>
                    ) : selectedProduct.stock > 0 ? (
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-orange-100 animate-pulse">Sisa {selectedProduct.stock} Porsi!</span>
                    ) : (
                      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-red-500 bg-red-50 px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-red-100">Habis Terjual</span>
                    )}
                  </div>
                </div>
                
                {/* Area Scroll (Bisa digeser) */}
                <div className="px-5 md:px-8 pb-4 overflow-y-auto flex-1 no-scrollbar space-y-5 md:space-y-6">
                  <p className="text-xs md:text-sm text-gray-500 leading-relaxed">{selectedProduct.description || 'Tidak ada deskripsi untuk menu ini.'}</p>
                  
                  <div className="space-y-4">
                    {selectedProduct.flavors && selectedProduct.flavors.length > 0 && (
                      <div>
                        <h4 className="text-sm font-black text-gray-900 mb-1">Karakter Rasa</h4>
                        <p className="text-xs text-gray-500">{selectedProduct.flavors.join(', ')}</p>
                      </div>
                    )}
                    {selectedProduct.ingredients && selectedProduct.ingredients.length > 0 && (
                      <div>
                        <h4 className="text-sm font-black text-gray-900 mb-1">Bahan Utama</h4>
                        <p className="text-xs text-gray-500">{selectedProduct.ingredients.join(', ')}</p>
                      </div>
                    )}
                    
                    {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                      <div className="pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-black text-gray-900 mb-4">Pilih Varian</h4>
                        <div className="space-y-4">
                          {selectedProduct.variants.map((group: VariantGroup, idx: number) => (
                            <div key={idx} className="space-y-2">
                              <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg inline-block">{group.group_name}</h5>
                              <div className="flex flex-col gap-2">
                                {group.options.map((opt: VariantOption, oIdx: number) => {
                                  const isSelected = selectedVariants[group.group_name]?.name === opt.name
                                  return (
                                    <label key={oIdx} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-[#a08055] bg-[#FAF4EB]' : 'border-gray-100 hover:border-gray-200'}`}>
                                      <div className="flex items-center gap-3">
                                        <input type="radio" name={group.group_name} className="hidden" checked={isSelected}
                                          onChange={() => setSelectedVariants(prev => ({...prev, [group.group_name]: opt}))} />
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-[#a08055]' : 'border-gray-300'}`}>
                                          {isSelected && <div className="w-2 h-2 rounded-full bg-[#a08055]" />}
                                        </div>
                                        <span className="text-xs font-bold text-gray-800">{opt.name}</span>
                                      </div>
                                      {opt.extra_price > 0 && (
                                        <span className="text-[10px] font-black text-[#a08055]">+Rp{opt.extra_price.toLocaleString('id-ID')}</span>
                                      )}
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Bar (Fixed, gak ikut scroll) */}
                <div className="p-4 md:p-6 pb-6 md:pb-6 bg-white md:bg-gray-50 border-t border-gray-100 flex items-center gap-2 md:gap-4 z-10 flex-shrink-0 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
                  <div className="flex items-center gap-2 md:gap-4 bg-gray-50 md:bg-white border border-gray-200 rounded-xl px-2 py-1 shadow-sm">
                    <button onClick={() => setModalQty(Math.max(1, modalQty - 1))} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"><Minus size={16}/></button>
                    <span className="font-black text-sm md:text-lg w-4 md:w-6 text-center">{modalQty}</span>
                    <button 
                      onClick={() => setModalQty(Math.min(selectedProduct.stock, modalQty + 1))} 
                      disabled={modalQty >= selectedProduct.stock}
                      className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Plus size={16}/>
                    </button>
                  </div>
                  <button 
                    onClick={handleModalAddToCart} 
                    disabled={selectedProduct.stock <= 0}
                    className={`flex-1 py-3.5 md:py-4 rounded-xl text-xs md:text-sm font-black uppercase tracking-widest shadow-md transition-all active:scale-95 ${
                      selectedProduct.stock > 0 
                        ? 'bg-[#5D4037] hover:bg-[#4E342E] text-white' 
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {selectedProduct.stock > 0 ? (
                      <>
                        <span className="md:hidden">Tambah</span>
                        <span className="hidden md:inline">Tambahkan Pesanan</span>
                      </>
                    ) : 'Habis'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING CART */}
      <AnimatePresence>
        {totalCartItems > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-0 left-0 w-full bg-white border-t px-3 py-3 md:p-4 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            <div className="md:max-w-6xl md:mx-auto flex justify-between items-center md:px-4 gap-3">
              <div className="flex items-center gap-2 md:gap-4 text-left min-w-0">
                <div className="bg-[#FAF4EB] p-2 md:p-3 rounded-xl text-[#B89B6D] relative flex-shrink-0">
                  <ShoppingCart size={20} className="md:w-6 md:h-6" />
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center border-2 border-white">{totalCartItems}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Pesanan</p>
                  <p className="text-base md:text-xl font-black text-[#2E7D32] leading-none truncate">Rp{totalCartPrice.toLocaleString('id-ID')}</p>
                </div>
              </div>
              <button onClick={() => { localStorage.setItem('checkout_cart', JSON.stringify(cart)); localStorage.setItem('checkout_store_id', storeId); router.push('/dashboard/buyer/checkout') }} className="bg-black text-white px-5 md:px-10 py-3 md:py-4 rounded-xl text-xs md:text-sm font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-gray-900 active:scale-95 transition-all shadow-lg flex-shrink-0">
                Checkout <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* POP-UP CHATBOT NYAMBOT */}
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
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl z-[9999] flex flex-col border border-gray-100 overflow-hidden"
            style={{ height: '500px', maxHeight: '80vh' }}
          >
            <div className="bg-[#B89B6D] px-4 py-3 flex items-center justify-between shadow-sm text-left">
              <div className="flex items-center gap-2 text-white">
                <div className="bg-white/20 p-1.5 rounded-lg"><Bot size={18} /></div>
                <div>
                  <h3 className="text-sm font-black tracking-wide leading-none">NyamBot</h3>
                  <span className="text-[10px] text-white/80 font-bold">Asisten Virtual NyamNow</span>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-white/80 hover:text-white hover:bg-white/20 p-1 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3 text-left">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-2 text-xs font-bold shadow-sm ${msg.role === 'user' ? 'bg-[#B89B6D] text-white rounded-2xl rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-700 rounded-2xl rounded-tl-sm'}`}>
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
                placeholder="Tanya NyamBot soal toko ini..." 
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#B89B6D] transition-colors text-black"
              />
              <button type="submit" disabled={!chatInput.trim()} className="bg-[#B89B6D] text-white p-2.5 rounded-xl hover:bg-[#a08055] disabled:opacity-50 transition-colors shadow-sm">
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}