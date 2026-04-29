'use client'

import { useState, useEffect } from 'react'
import { 
  Search, MapPin, Heart, ShoppingCart, 
  LogOut, Settings, ChevronRight, Store, X, Minus, Plus, Edit3, Ticket, MessageCircle, CheckCircle2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import NavbarBuyer from '@/components/NavbarBuyer'

// --- INTERFACES ---
interface CartItem {
  id: string
  name: string
  variant?: string // Buat nampung varian kalau ada
  price: number
  quantity: number
  image_url: string
}

export default function CheckoutPage() {
  const router = useRouter()
  
  // NAVBAR STATES
  const [userName, setUserName] = useState<string | null>(null)
  
  // CHECKOUT STATES
  const [cart, setCart] = useState<CartItem[]>([])
  const [storeName, setStoreName] = useState('')
  const [sellerType, setSellerType] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  
  const [showVoucherModal, setShowVoucherModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false) // ✅ State baru buat modal sukses
  
  const [note, setNote] = useState('')
  const [activeTab, setActiveTab] = useState<'ambil' | 'reservasi'>('ambil')
  
  const discount = 0 // Nanti dikonek ke state voucher

  // pesan bayar
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return alert("Keranjang kosong bejir!")
    
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
          discount: discount,
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

      // 5. ✅ Munculin Modal Sukses, tunggu 2 detik, baru pindah halaman
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
  const grandTotal = subtotal - discount

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

              <button onClick={() => setShowVoucherModal(true)} className="w-full flex items-center justify-between border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors shadow-sm">
                <div className="flex items-center gap-2">
                  <Ticket size={18} className="text-gray-400" />
                  <span className="text-xs font-black text-gray-600">Voucher</span>
                </div>
                <span className="text-sm font-black text-gray-900">
                  {discount > 0 ? `- Rp ${discount.toLocaleString('id-ID')}` : 'Pilih Voucher'}
                </span>
              </button>
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
                {discount > 0 && (
                  <div className="flex justify-between text-xs font-bold text-gray-600">
                    <span>Voucher</span>
                    <span>- Rp {discount.toLocaleString('id-ID')}</span>
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

      {/* --- MODAL VOUCHER --- */}
      <AnimatePresence>
        {showVoucherModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-lg font-black text-gray-900">Pilih Voucher</h2>
                <button onClick={() => setShowVoucherModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"><X size={16} /></button>
              </div>
              <div className="p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                <Ticket size={48} className="text-gray-300 mb-4" />
                <p className="text-sm font-bold text-gray-500 italic">Fitur voucher sedang dikembangkan</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ✅ --- MODAL SUKSES CHECKOUT (BARU) --- */}
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