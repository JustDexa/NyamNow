'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { 
  Search, MapPin, Heart, ShoppingCart, 
  LogOut, Settings, ChevronRight, Store, X, Minus, Plus, Edit3, Ticket, MessageCircle, CheckCircle2,
  Tag, Zap, Lock
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NavbarBuyer from '@/components/NavbarBuyer'

// --- INTERFACES ---
interface CartItem {
  id: string
  name: string
  variant?: string
  price: number
  quantity: number
  image_url: string
}

interface StorePromo {
  id: string
  title: string
  description: string
  type: 'flash_sale' | 'promo'
  buy_qty: number
  get_qty: number
  discount_price: number
  product_id: string
  products: {
    id: string
    name: string
    price: number
  }
}

// ✅ 2. Ubah nama fungsi ini jadi CheckoutContent (hilangkan export default)
function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // NAVBAR STATES
  const [userName, setUserName] = useState<string | null>(null)
  
  // CHECKOUT STATES
  const [cart, setCart] = useState<CartItem[]>([])
  const [storeName, setStoreName] = useState('')
  const [sellerType, setSellerType] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  
  const [note, setNote] = useState('')
  const [activeTab, setActiveTab] = useState<'ambil' | 'reservasi'>('ambil')

  // PROMO STATES
  const [availablePromos, setAvailablePromos] = useState<StorePromo[]>([])
  const [appliedPromo, setAppliedPromo]       = useState<StorePromo | null>(null)
  const [promoDiscount, setPromoDiscount]     = useState(0)

  // pesan bayar
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return alert("Keranjang kosong!")
    
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const savedStoreId = localStorage.getItem('checkout_store_id')
      
      if (!user || !savedStoreId) throw new Error("Data user atau toko tidak ditemukan")

      // 1. Hitung Waktu Kadaluarsa Konfirmasi (Sekarang + 3 Menit)
      const now = new Date()
      const confirmationExpiresAt = new Date(now.getTime() + 3 * 60000).toISOString()

      // 2. Insert ke tabel ORDERS
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          store_id: savedStoreId,
          status: 'waiting_confirmation',
          total_price: subtotal,
          discount: promoDiscount,
          grand_total: grandTotal,
          note: note,
          order_type: activeTab,
          confirmation_expires_at: confirmationExpiresAt
        })
        .select()
        .single()

      if (orderError) throw orderError

      // 3. Insert rincian menu ke ORDER_ITEMS
      const orderItemsPayload = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        variant: item.variant || null
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsPayload)

      if (itemsError) throw itemsError

      // 4. Bersihkan Local Storage
      localStorage.removeItem('checkout_cart')
      localStorage.removeItem('checkout_store_id')

      setShowSuccessModal(true)
      setTimeout(() => {
        router.push('/dashboard/buyer/orders')
      }, 2000)

    } catch (error: unknown) {
      console.error("Gagal buat pesanan:", error)
      let message = "Terjadi kesalahan"
      if (error instanceof Error) message = error.message
      alert("Gagal buat pesanan: " + message)
      setIsLoading(false) // Matiin loading kalau error
    } 
  }

  // --- FETCH DATA DARI LOCAL STORAGE & SUPABASE ---
  useEffect(() => {
    const initCheckout = async () => {
      setIsLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: userData } = await supabase.from('users').select('first_name').eq('id', user.id).single()
          if (userData) setUserName(userData.first_name)
        }

        const savedCart = localStorage.getItem('checkout_cart')
        const savedStoreId = localStorage.getItem('checkout_store_id')
        
        if (savedCart) setCart(JSON.parse(savedCart))

        if (savedStoreId) {
          const { data: storeData } = await supabase.from('stores')
            .select('name, type')
            .eq('id', savedStoreId)
            .single()
            
          if (storeData) {
            setStoreName(storeData.name)
            setSellerType(storeData.type?.toLowerCase() || '')
          }

          // Fetch promo aktif toko ini
          const now = new Date().toISOString()
          const { data: promosData } = await supabase
            .from('promos')
            .select('id, title, description, type, buy_qty, get_qty, discount_price, product_id, products!promos_product_id_fkey(id, name, price)')
            .eq('store_id', savedStoreId)
            .eq('is_active', true)
            .lte('start_at', now)
            .gte('end_at', now)
          
          const promos = (promosData as unknown as StorePromo[]) || []
          setAvailablePromos(promos)

          // Auto-apply promo dari URL params (dari halaman campaign)
          const promoIdFromUrl = searchParams.get('promo_id')
          if (promoIdFromUrl && promos.length > 0) {
            const autoPromo = promos.find(p => p.id === promoIdFromUrl)
            if (autoPromo) {
              // Cek eligibility lagi setelah cart di-load
              const cartRaw = localStorage.getItem('checkout_cart')
              const currentCart: CartItem[] = cartRaw ? JSON.parse(cartRaw) : []
              const cartItem = currentCart.find(c => c.id === autoPromo.product_id)
              if (cartItem) {
                const meetsQty = autoPromo.type === 'promo'
                  ? cartItem.quantity >= autoPromo.buy_qty
                  : true
                if (meetsQty) {
                  const discount = autoPromo.type === 'promo'
                    ? cartItem.price * autoPromo.get_qty
                    : (cartItem.price - autoPromo.discount_price) * cartItem.quantity
                  setAppliedPromo(autoPromo)
                  setPromoDiscount(discount)
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Checkout init error:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    initCheckout()
  }, [])

  // Biar keranjang di LocalStorage ikut ke-update kalau di-tambah/kurang
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('checkout_cart', JSON.stringify(cart))
    }
  }, [cart])

  

  // --- LOGIKA RESERVASI STRICT BERKEMBANG ---
  const isBerkembang = sellerType === 'berkembang'

  // --- CART LOGIC YANG UDAH DIBENERIN ---
  const updateQty = (id: string, variant: string | undefined, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id && item.variant === variant) {
        const newQty = Math.max(1, item.quantity + delta)
        return { ...item, quantity: newQty }
      }
      return item
    }))
  }

  const removeItem = (id: string, variant: string | undefined) => {
    setCart(prev => {
      const newCart = prev.filter(item => !(item.id === id && item.variant === variant))
      if (newCart.length === 0) {
        localStorage.removeItem('checkout_cart')
        localStorage.removeItem('checkout_store_id')
      }
      return newCart
    })
  }

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); router.push('/login'); router.refresh() } 
    catch (error) { alert('Gagal Logout') }
  }

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0)
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const grandTotal = Math.max(0, subtotal - promoDiscount)

  // Helper cek eligibility promo
  const checkEligibility = useCallback((promo: StorePromo) => {
    const cartItem = cart.find(c => c.id === promo.product_id)
    if (!cartItem) return { eligible: false, reason: `Tambahkan ${promo.products?.name} ke keranjang`, discountAmount: 0 }
    if (promo.type === 'promo') {
      if (cartItem.quantity < promo.buy_qty) return { eligible: false, reason: `Beli min. ${promo.buy_qty} item (kamu: ${cartItem.quantity})`, discountAmount: 0 }
      return { eligible: true, reason: `${promo.get_qty} item gratis!`, discountAmount: cartItem.price * promo.get_qty }
    } else {
      return { eligible: true, reason: `Hemat Rp${(cartItem.price - promo.discount_price).toLocaleString('id-ID')}/item`, discountAmount: (cartItem.price - promo.discount_price) * cartItem.quantity }
    }
  }, [cart])
  
  useEffect(() => {
    if (appliedPromo) {
      const { eligible, discountAmount } = checkEligibility(appliedPromo)
      
      if (!eligible) {
        // Kalau udah ga memenuhi syarat (misal dari beli 2 jadi beli 1), cabut promo
        setAppliedPromo(null)
        setPromoDiscount(0)
      } else {
        // Kalau masih memenuhi syarat tapi qty berubah, update jumlah diskonnya
        setPromoDiscount(discountAmount)
      }
    }
  }, [cart, appliedPromo, checkEligibility])
  

  if (isLoading && !showSuccessModal) return <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center font-black text-[#B89B6D] animate-pulse">Menyiapkan Pesanan...</div>

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-black font-sans antialiased pb-32 text-left">
      
      {/* --- NAVBAR COMPONENT --- */}
      <NavbarBuyer userName={userName} handleLogout={handleLogout} />

      <div className="max-w-5xl mx-auto px-6 mt-10 relative z-0">
        <h1 className="text-2xl font-black text-gray-900 mb-6">Konfirmasi Pembayaran</h1>

        {/* MAIN CARD: RINGKASAN PESANAN */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          
          {/* HEADER TABEL */}
          <div className="grid grid-cols-12 gap-4 px-8 py-5 border-b border-gray-100 bg-[#FDFCF8]">
            <div className="col-span-6 text-lg font-black text-[#a08055]">Ringkasan Pesanan</div>
            <div className="col-span-2 text-xs font-black text-gray-500 uppercase flex items-center justify-center">Harga Satuan</div>
            <div className="col-span-2 text-xs font-black text-gray-500 uppercase flex items-center justify-center">Kuantitas</div>
            <div className="col-span-1 text-xs font-black text-gray-500 uppercase flex items-center justify-center">Total</div>
            <div className="col-span-1 text-xs font-black text-gray-500 uppercase flex items-center justify-center">Ubah</div>
          </div>

          {/* STORE NAME */}
          <div className="px-8 py-4 bg-white flex items-center gap-2 border-b border-gray-100">
            <Store size={18} className="text-[#a08055]" />
            <h2 className="text-sm font-black text-gray-900">{storeName || 'Toko NyamNow'}</h2>
          </div>

          {/* CART ITEMS LIST */}
          <div className="px-8 flex flex-col">
            {cart.length === 0 ? (
              <div className="py-10 text-center text-sm font-bold text-gray-400 italic">Keranjang kamu masih kosong.</div>
            ) : (
              cart.map((item, idx) => (
                <div key={`${item.id}-${item.variant || 'no-variant'}`} className={`grid grid-cols-12 gap-4 py-6 items-center ${idx !== cart.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  
                  {/* Produk Info */}
                  <div className="col-span-6 flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900 mb-1">{item.name}</h3>
                      {item.variant && (
                        <div className="inline-flex items-center gap-1 border border-orange-200 text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-[10px] font-bold">
                          <Edit3 size={10} /> {item.variant}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Harga Satuan */}
                  <div className="col-span-2 flex items-center justify-center">
                    <span className="text-xs font-black text-[#a08055]">Rp{item.price.toLocaleString('id-ID')}</span>
                  </div>

                  {/* Kuantitas (+/-) */}
                  <div className="col-span-2 flex items-center justify-center">
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                      <button onClick={() => updateQty(item.id, item.variant, -1)} className="text-gray-400 hover:text-gray-900"><Minus size={14}/></button>
                      <span className="text-xs font-black w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.id, item.variant, 1)} className="text-gray-400 hover:text-gray-900"><Plus size={14}/></button>
                    </div>
                  </div>

                  {/* Total Harga Item */}
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-xs font-black text-[#a08055]">Rp{(item.price * item.quantity).toLocaleString('id-ID')}</span>
                  </div>

                  {/* Hapus */}
                  <div className="col-span-1 flex items-center justify-center">
                    <button onClick={() => removeItem(item.id, item.variant)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <X size={20} />
                    </button>
                  </div>

                </div>
              ))
            )}
          </div>

          {/* NOTES & VOUCHER SECTION */}
          {cart.length > 0 && (
            <div className="px-8 pb-8 pt-2">
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-4 focus-within:border-[#a08055] transition-colors shadow-sm">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                  <Edit3 size={14} className="text-[#a08055]" />
                  <span className="text-xs font-black text-gray-800">Catatan untuk penjual</span>
                </div>
                <textarea 
                  rows={2} placeholder="Tulis catatan di sini..." value={note} onChange={(e) => setNote(e.target.value)}
                  className="w-full p-4 text-xs outline-none resize-none text-gray-700"
                />
              </div>

              {/* PROMO / VOUCHER SECTION */}
              {availablePromos.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
                    <Tag size={14} className="text-[#a08055]" />
                    <span className="text-xs font-black text-gray-800">Promo Toko</span>
                    <span className="text-[9px] font-black text-[#a08055] bg-[#FAF4EB] px-1.5 py-0.5 rounded-full ml-auto">{availablePromos.length} tersedia</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {availablePromos.map(promo => {
                      const { eligible, reason, discountAmount } = checkEligibility(promo)
                      const isApplied = appliedPromo?.id === promo.id
                      return (
                        <div
                          key={promo.id}
                          onClick={() => {
                            if (!eligible) return
                            if (isApplied) { setAppliedPromo(null); setPromoDiscount(0) }
                            else { setAppliedPromo(promo); setPromoDiscount(discountAmount) }
                          }}
                          className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                            isApplied ? 'bg-[#FAF4EB]' : eligible ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${promo.type === 'flash_sale' ? 'bg-orange-100' : 'bg-[#FAF4EB]'}`}>
                            {promo.type === 'flash_sale'
                              ? <Zap size={14} className="text-orange-500 fill-orange-500" />
                              : <Tag size={14} className="text-[#B89B6D]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-gray-900 truncate">{promo.title || promo.products?.name}</p>
                            <p className={`text-[10px] font-bold ${eligible ? 'text-green-600' : 'text-gray-400'}`}>
                              {promo.type === 'promo' ? `Beli ${promo.buy_qty} Gratis ${promo.get_qty}` : `Harga spesial Rp${(promo.discount_price||0).toLocaleString('id-ID')}`}
                            </p>
                            <p className={`text-[9px] ${eligible ? (isApplied ? 'text-[#a08055] font-black' : 'text-gray-400') : 'text-gray-400'}`}>
                              {isApplied ? `✓ Hemat Rp${promoDiscount.toLocaleString('id-ID')}` : reason}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            {isApplied
                              ? <CheckCircle2 size={16} className="text-[#B89B6D]" />
                              : eligible
                              ? <span className="text-[9px] font-black text-[#B89B6D] border border-[#B89B6D] px-2 py-1 rounded-lg">Pakai</span>
                              : <Lock size={13} className="text-gray-300" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FULFILLMENT TABS & SUMMARY */}
        {cart.length > 0 && (
          <>
            <div className="flex">
              <button 
                onClick={() => setActiveTab('ambil')}
                className={`px-8 py-3 text-sm font-black transition-all ${
                  activeTab === 'ambil' ? 'bg-[#a08055] text-white rounded-t-xl' : 'bg-gray-100 text-gray-500 rounded-t-xl border border-b-0 border-gray-200 hover:bg-gray-200'
                }`}
              >
                Ambil Ditempat
              </button>
              
              {isBerkembang && (
                <button 
                  onClick={() => setActiveTab('reservasi')}
                  className={`px-8 py-3 text-sm font-black transition-all shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.1)] z-10 ${
                    activeTab === 'reservasi' ? 'bg-[#a08055] text-white rounded-t-xl' : 'bg-white text-gray-500 rounded-t-xl border border-b-0 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Reservasi
                </button>
              )}
            </div>

            <div className="bg-white border border-gray-200 shadow-sm rounded-b-2xl rounded-tr-2xl overflow-hidden">
              <div className="px-8 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-black text-gray-900">Pembayaran</h3>
                <div className="flex items-center gap-1 italic font-black text-xl tracking-tighter">
                  QRIS
                </div>
              </div>
              
              <div className="px-8 py-6 space-y-3">
                <div className="flex justify-between text-xs font-bold text-gray-600">
                  <span>Total Pesanan ({totalItems} Menu)</span>
                  <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-xs font-bold text-green-600">
                    <span className="flex items-center gap-1"><Tag size={11}/> {appliedPromo?.title || 'Promo'}</span>
                    <span>- Rp {promoDiscount.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-dashed border-gray-200">
                  <span>Total</span>
                  <span>Rp {grandTotal.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="px-8 pb-8 flex justify-end">
                <button 
                  onClick={handlePlaceOrder} 
                  disabled={isLoading || cart.length === 0}
                  className="bg-[#a08055] hover:bg-[#8b6e49] text-white px-8 py-3 rounded-lg text-sm font-black tracking-widest flex items-center gap-2 transition-colors shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? 'Memproses...' : 'Kirim Pesanan'} <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* --- MODAL SUKSES CHECKOUT --- */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              className="bg-white p-8 rounded-[2rem] shadow-2xl flex flex-col items-center text-center max-w-sm w-full border border-gray-100 relative overflow-hidden"
            >
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner z-10"
              >
                <CheckCircle2 size={48} className="text-green-500" />
              </motion.div>
              <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tighter z-10">Pesanan Terkirim!</h2>
              <p className="text-sm font-bold text-gray-500 mb-6 z-10">Penjual sedang meninjau pesananmu. Mengalihkan halaman...</p>
              
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden z-10">
                <motion.div 
                  initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2, ease: "linear" }}
                  className="h-full bg-green-500"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        
    </div>
  )
}

// ✅ 3. Bikin fungsi CheckoutPage yang isinya murni buat ngebungkus pakai Suspense
export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center font-black text-[#B89B6D] animate-pulse">
        Menyiapkan Halaman Checkout...
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}