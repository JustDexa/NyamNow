'use client'

import { useState, useEffect } from 'react'
import { 
  Search, MapPin, Heart, ShoppingCart, 
  LogOut, Settings, ChevronRight, Star, Navigation, MessageCircle, CheckCircle2, Plus, Minus, X,
  Bot, Send // ✅ Tambahan icon buat NyamBot
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
  discount_price?: number
  promo_image_url?: string
  start_at: string
  end_at: string
  product_id?: string
}

interface CartItem extends Product {
  quantity: number
  note?: string
  variant?: string 
}

export default function StoreDetail() {
  const router = useRouter()
  const params = useParams()
  const storeId = params.id as string

  // --- STATES ---
  const [activeTab, setActiveTab] = useState<'Home' | 'All Menu'>('Home')
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

  // ==========================================
  // ✅ STATE CHATBOT NYAMBOT
  // ==========================================
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', text: 'Halo! Aku NyamBot 🤖 Ada yang bisa dibantu soal menu di toko ini?' }
  ])

  useEffect(() => {
    const fetchStoreData = async () => {
      if (!storeId) return
      setIsLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserId(user.id)
          const { data: userData } = await supabase.from('users').select('first_name').eq('id', user.id).single()
          if (userData) setUserName(userData.first_name)
          
          const { data: storeFav } = await supabase.from('store_favorites').select('id').match({ user_id: user.id, store_id: storeId }).maybeSingle()
          if (storeFav) setIsStoreFaved(true)

          const { data: favProdData } = await supabase.from('product_favorites').select('product_id').eq('user_id', user.id)
          if (favProdData) setUserProductFavorites(favProdData.map(f => f.product_id))
        }

        const { data: storeData } = await supabase.from('stores').select('*').eq('id', storeId).single()
        setStore(storeData)

        const { data: galleryData } = await supabase.from('store_images').select('*').eq('store_id', storeId)
        setGallery(galleryData || [])

        // 1. Tarik Data Produk
        const { data: productData } = await supabase.from('products').select('*').eq('store_id', storeId)
        
        if (productData) {
          // 2. HITUNG JUMLAH TERJUAL (Hanya yang status pesanan 'completed')
          const { data: salesData } = await supabase
            .from('order_items')
            .select('product_id, quantity, orders!inner(status)')
            .eq('orders.status', 'completed')
            .in('product_id', productData.map(p => p.id))

          const salesMap: Record<string, number> = {}
          salesData?.forEach(item => {
            salesMap[item.product_id] = (salesMap[item.product_id] || 0) + (item.quantity || 0)
          })

          const productsWithSales = productData.map(p => ({
            ...p,
            sold_count: salesMap[p.id] || 0
          }))

          setProducts(productsWithSales)
        }

        const { data: promoData } = await supabase.from('promos').select('*').eq('store_id', storeId).eq('is_active', true)
        setPromos(promoData || [])

        const { data: allProdFavs } = await supabase.from('product_favorites').select('product_id')
        if (allProdFavs) {
          const counts: Record<string, number> = {}
          allProdFavs.forEach(f => { counts[f.product_id] = (counts[f.product_id] || 0) + 1 })
          setProductFavCounts(counts)
        }

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
    if (!selectedProduct) return
    const priceInfo = getProductPrice(selectedProduct)
    
    // Hitung Extra Cost Varian
    const variantExtraCost = Object.values(selectedVariants).reduce((sum, opt) => sum + opt.extra_price, 0)
    const finalPrice = priceInfo.currentPrice + variantExtraCost
    
    const variantNames = Object.values(selectedVariants).map(v => v.name)
    const variantString = variantNames.length > 0 ? variantNames.join(', ') : undefined

    setCart(prev => {
      const existing = prev.find(item => item.id === selectedProduct.id && item.variant === variantString)
      if (existing) {
        return prev.map(item => item.id === selectedProduct.id && item.variant === variantString 
          ? { ...item, quantity: item.quantity + modalQty, note: modalNote } 
          : item)
      }
      return [...prev, { ...selectedProduct, price: finalPrice, quantity: modalQty, note: modalNote, variant: variantString }]
    })
    setSelectedProduct(null)
  }

  const toggleStoreFavorite = async () => {
    if (!userId) return alert('Login dulu bejir!')
    const current = isStoreFaved
    setIsStoreFaved(!current)
    if (current) await supabase.from('store_favorites').delete().match({ user_id: userId, store_id: storeId })
    else await supabase.from('store_favorites').insert({ user_id: userId, store_id: storeId })
  }

  const toggleProductFavorite = async (e: React.MouseEvent, productId: string) => {
    e.stopPropagation()
    if (!userId) return alert('Login dulu bejir!')
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
      alert("Gagal menghubungi penjual bejir.")
    } finally {
      setIsChatLoading(false)
    }
  }

  // ✅ HANDLER SEND MESSAGE NYAMBOT
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

  if (isLoading) return <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center font-black text-[#B89B6D] animate-pulse">Menyiapkan Toko...</div>

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-black font-sans antialiased pb-32">
      
      {/* ✅ KIRIM setIsChatOpen KE NAVBAR BIAR BISA DI-KLIK */}
      <NavbarBuyer 
        userName={userName} 
        handleLogout={() => supabase.auth.signOut().then(() => router.push('/login'))} 
        setIsChatOpen={setIsChatOpen}
      />

      <div className="max-w-6xl mx-auto px-6 mt-8">
        {/* HEADER TOKO */}
        <div className="bg-[#F6F2EB] rounded-2xl p-6 border border-[#EAE2D3] shadow-sm relative mb-6 text-left">
          <div className="flex items-start gap-6">
            <div className="w-28 h-28 rounded-full border-4 border-white shadow-md overflow-hidden bg-white flex-shrink-0">
              <img src={store?.profile_image_url || '/images/iconNyamnow.png'} alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 pt-2">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black text-gray-900">{store?.name}</h1>
                  <div className="flex items-center gap-1 mt-1 mb-3">
                    {[1,2,3,4,5].map(star => <Star key={star} size={14} className="fill-yellow-400 text-yellow-400" />)}
                    <span className="text-xs font-bold text-gray-500 ml-1">({store?.rating_avg || 5})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={openNavigation} className="bg-[#B89B6D] text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 hover:bg-[#a08055] transition-colors shadow-sm">
                      <Navigation size={12} /> Menuju Lokasi
                    </button>
                    <button onClick={() => handleContactSeller(storeId)} disabled={isChatLoading} className="bg-transparent border-2 border-[#B89B6D] text-[#B89B6D] px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-[#B89B6D] hover:text-white transition-colors disabled:opacity-50">
                      {isChatLoading ? 'Membuka Chat...' : 'Hubungi Penjual'}
                    </button>
                    <button onClick={toggleStoreFavorite} className={`bg-white border-2 p-2 rounded-lg transition-colors shadow-sm active:scale-95 ${isStoreFaved ? 'border-red-200 text-red-500' : 'text-gray-400 hover:border-red-200 hover:text-red-400'}`}>
                      <Heart size={16} className={isStoreFaved ? "fill-red-500 text-red-500" : ""} />
                    </button>
                  </div>
                </div>
                {checkIsPremiumUMKM() && (
                  <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg flex items-center gap-2 border border-green-200 shadow-sm">
                    <CheckCircle2 size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Reservasi</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-8 mt-8 border-b-2 border-gray-200/50 px-2">
            {(['Home', 'All Menu'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-sm font-black uppercase tracking-widest transition-colors relative ${activeTab === tab ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                {tab} {activeTab === tab && <div className="absolute bottom-[-2px] left-0 w-full h-1 bg-gray-900 rounded-t-full"></div>}
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
                    <img src={img.image_url} className="w-full h-full object-cover hover:scale-110 transition-transform" onError={(e) => e.currentTarget.src = '/images/iconNyamnow.png'} />
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
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      {priceInfo.hasPromo && (
                        <div className="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shadow-sm animate-pulse z-10">
                          {priceInfo.promoType === 'flash_sale' ? '⚡ Flash Sale' : '🔥 Promo'}
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h4 className="text-sm font-black text-gray-900 truncate mb-1">{product.name}</h4>
                      <div className="flex items-center gap-2 mb-3">
                         <span className="text-[13px] font-black text-[#2E7D32]">Rp{priceInfo.currentPrice.toLocaleString('id-ID')}</span>
                         {priceInfo.hasPromo && <span className="text-[10px] font-bold text-gray-400 line-through">Rp{priceInfo.originalPrice.toLocaleString('id-ID')}</span>}
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
        ) : (
          <section>
            <div className="flex justify-center gap-3 mb-8">
              {['Semua Menu', 'Terlaris', 'Top Rating'].map((filter) => (
                <button key={filter} onClick={() => setMenuFilter(filter)} className={`px-8 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm ${menuFilter === filter ? 'bg-[#a08055] text-white shadow-md' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{filter}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => {
                const qty = getQty(product.id)
                const isFaved = userProductFavorites.includes(product.id)
                const favCount = productFavCounts[product.id] || 0
                const priceInfo = getProductPrice(product)
                return (
                  <div key={product.id} onClick={() => openProductModal(product)} className="bg-[#FDFCF8] rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden group cursor-pointer hover:shadow-md transition-shadow relative text-left">
                    <div className="w-full h-40 bg-gray-200 overflow-hidden relative">
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      {priceInfo.hasPromo && (
                        <div className="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shadow-sm animate-pulse z-10">
                          {priceInfo.promoType === 'flash_sale' ? '⚡ Flash Sale' : '🔥 Promo'}
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h4 className="text-base font-black text-gray-900 truncate mb-1">{product.name}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-black text-[#2E7D32]">Rp{priceInfo.currentPrice.toLocaleString('id-ID')}</span>
                        {priceInfo.hasPromo && <span className="text-[10px] font-bold text-gray-400 line-through">Rp{priceInfo.originalPrice.toLocaleString('id-ID')}</span>}
                      </div>
                      <div className="text-[9px] text-gray-400 mb-4 font-bold uppercase tracking-widest">
                        {product.sold_count || 0} terjual <span className="mx-1">|</span> {product.estimated_time || 15}min
                      </div>
                      <div className="mt-auto pt-3 border-t border-gray-100 flex justify-between items-center">
                        <div className="flex items-center gap-1.5 cursor-pointer group/fav" onClick={(e) => toggleProductFavorite(e, product.id)}>
                          <Heart size={14} className={`transition-colors ${isFaved ? 'text-red-500 fill-red-500' : 'text-gray-300 group-hover/fav:text-red-400'}`} />
                          <span className="text-[9px] text-gray-500">Disukai oleh {favCount}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {qty > 0 && (!product.variants || product.variants.length === 0) ? (
                            <>
                              <button onClick={(e) => removeFromCart(e, product.id)} className="w-6 h-6 rounded-full border border-[#B89B6D] text-[#B89B6D] flex items-center justify-center hover:bg-[#FAF4EB] transition-colors"><Minus size={12} strokeWidth={3}/></button>
                              <span className="font-black text-xs w-3 text-center">{qty}</span>
                              <button onClick={(e) => addToCart(e, product)} className="w-6 h-6 rounded-full bg-[#B89B6D] text-white flex items-center justify-center hover:bg-[#a08055] transition-colors"><Plus size={12} strokeWidth={3}/></button>
                            </>
                          ) : (
                            <button onClick={(e) => addToCart(e, product)} className="w-7 h-7 rounded-full bg-[#a08055] text-white flex items-center justify-center hover:bg-[#8b6e49] shadow-sm active:scale-95 transition-all"><Plus size={14} strokeWidth={3}/></button>
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#FDFCF8] w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl max-h-[90vh]">
              <div className="w-full md:w-1/2 h-64 md:h-auto bg-gray-200 relative">
                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 bg-white/80 backdrop-blur p-2 rounded-full text-gray-800 hover:bg-white transition-colors shadow-md md:hidden"><X size={20} /></button>
              </div>
              <div className="w-full md:w-1/2 flex flex-col h-full bg-white relative max-h-[90vh] text-left">
                <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200 transition-colors hidden md:block z-20"><X size={20} /></button>
                <div className="p-8 pb-4 bg-white z-10">
                  <div className="flex justify-between items-start mr-8">
                    <h2 className="text-2xl font-black text-gray-900 leading-tight">{selectedProduct.name}</h2>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Heart size={16} className={userProductFavorites.includes(selectedProduct.id) ? "fill-red-500 text-red-500" : ""} />
                      <span className="text-xs font-bold">{productFavCounts[selectedProduct.id] || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-1 mb-4">
                    {[1,2,3,4,5].map(star => <Star key={star} size={14} className="fill-yellow-400 text-yellow-400" />)}
                    <div className="bg-[#4CAF50] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center ml-1">5</div>
                  </div>
                  {(() => {
                    const priceInfo = getProductPrice(selectedProduct)
                    // ✅ HARGA DITAMBAH VARIAN LANGSUNG UPDATE DI ATAS
                    const variantExtraCost = Object.values(selectedVariants).reduce((sum, opt) => sum + opt.extra_price, 0)
                    const currentTotal = priceInfo.currentPrice + variantExtraCost
                    const originalTotal = priceInfo.originalPrice + variantExtraCost
                    return (
                      <div className={`inline-flex items-end gap-2 px-5 py-3 rounded-xl shadow-sm ${priceInfo.hasPromo ? 'bg-orange-50 border border-orange-200 text-orange-700' : 'bg-[#B89B6D] text-white'}`}>
                        <span className="text-2xl font-black leading-none">Rp{currentTotal.toLocaleString('id-ID')}</span>
                        {priceInfo.hasPromo && <span className="text-sm font-bold opacity-60 line-through mb-0.5 text-gray-500">Rp{originalTotal.toLocaleString('id-ID')}</span>}
                      </div>
                    )
                  })()}
                </div>
                
                <div className="px-8 pb-4 overflow-y-auto flex-1 no-scrollbar space-y-6">
                  <p className="text-sm text-gray-500 leading-relaxed">{selectedProduct.description || 'Tidak ada deskripsi untuk menu ini.'}</p>
                  
                  {/* ✅ UI VARIAN, RASA, & BAHAN UDAH BALIK! */}
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

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center gap-4 z-10">
                  <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-2 py-1 shadow-sm">
                    <button onClick={() => setModalQty(Math.max(1, modalQty - 1))} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"><Minus size={18}/></button>
                    <span className="font-black text-lg w-6 text-center">{modalQty}</span>
                    <button onClick={() => setModalQty(modalQty + 1)} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"><Plus size={18}/></button>
                  </div>
                  <button onClick={handleModalAddToCart} className="flex-1 bg-[#5D4037] hover:bg-[#4E342E] text-white py-4 rounded-xl text-sm font-black uppercase tracking-widest shadow-md transition-all active:scale-95">Tambahkan Pesanan</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING CART */}
      <AnimatePresence>
        {totalCartItems > 0 && (
          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-0 left-0 w-full bg-white border-t p-4 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
            <div className="max-w-6xl mx-auto flex justify-between items-center px-4">
              <div className="flex items-center gap-4 text-left">
                <div className="bg-[#FAF4EB] p-3 rounded-xl text-[#B89B6D] relative">
                  <ShoppingCart size={24} /> <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{totalCartItems}</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Pesanan</p>
                  <p className="text-xl font-black text-[#2E7D32] leading-none">Rp {totalCartPrice.toLocaleString('id-ID')}</p>
                </div>
              </div>
              <button onClick={() => { localStorage.setItem('checkout_cart', JSON.stringify(cart)); localStorage.setItem('checkout_store_id', storeId); router.push('/dashboard/buyer/checkout') }} className="bg-black text-white px-10 py-4 rounded-xl text-sm font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-900 active:scale-95 transition-all shadow-lg">Checkout <ChevronRight size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ POP-UP CHATBOT NYAMBOT */}
      <AnimatePresence>
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