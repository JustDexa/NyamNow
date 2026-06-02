'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import NavbarBuyer from '@/components/NavbarBuyer'
import { Clock, CheckCircle2, XCircle, Utensils, ShoppingBag, ChevronRight, AlertCircle, PackageCheck, QrCode, Star, Info, MessageSquare, CreditCard } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'

interface OrderItem {
  id: string
  product_id: string
  quantity: number
  price: number
  variant: string | null
  products: { name: string; image_url: string; estimated_time: number }
}

interface Order {
  id: string
  store_id: string
  status: string
  grand_total: number
  order_type: string
  confirmation_expires_at: string
  payment_expires_at: string
  created_at: string
  is_reviewed: boolean
  stores: { name: string }
  order_items: OrderItem[]
}

const TABS = [
  { id: 'semua', label: 'Semua', statuses: ['waiting_confirmation', 'waiting_payment', 'processing', 'ready_for_pickup', 'completed', 'cancelled'] },
  { id: 'konfirmasi', label: 'Menunggu Konfirmasi', statuses: ['waiting_confirmation'] },
  { id: 'bayar', label: 'Menunggu Pembayaran', statuses: ['waiting_payment'] },
  { id: 'proses', label: 'Diproses', statuses: ['processing', 'ready_for_pickup'] },
  { id: 'selesai', label: 'Selesai', statuses: ['completed'] },
  { id: 'batal', label: 'Dibatalkan', statuses: ['cancelled'] }
]

function BuyerOrderCard({ order, onPay, onReview }: { order: Order, onPay: (id: string, amount: number) => void, onReview: (orderId: string, storeId: string) => void }) {
  const [timeLeft, setTimeLeft] = useState<string>('00:00')
  const [isExpired, setIsExpired] = useState(false)

  const maxEstTime = Math.max(0, ...order.order_items.map(item => item.products?.estimated_time || 0))
  const finalEstTime = maxEstTime > 0 ? maxEstTime : 15

  const autoCancelOrder = useCallback(async () => {
    if (order.status === 'cancelled') return
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
  }, [order.id, order.status])

  useEffect(() => {
    if (order.status !== 'waiting_confirmation' && order.status !== 'waiting_payment') return

    const targetTime = order.status === 'waiting_confirmation' 
      ? new Date(order.confirmation_expires_at).getTime()
      : new Date(order.payment_expires_at).getTime()

    const updateTimer = () => {
      const now = new Date().getTime()
      const diff = targetTime - now
      if (diff <= 0) {
        setTimeLeft('00:00')
        setIsExpired(true)
        autoCancelOrder()
        return true
      } else {
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const secs = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`)
        return false
      }
    }
    const expiredInitial = updateTimer()
    if (expiredInitial) return
    const timer = setInterval(() => {
      const expired = updateTimer()
      if (expired) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [order.status, order.confirmation_expires_at, order.payment_expires_at, autoCancelOrder])

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 shadow-sm overflow-hidden relative text-left">
      
      {/* HEADER: Fix tumpukan & teks kepanjangan */}
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-3 border-b border-gray-100 pb-3 mb-4 w-full">
        <div className="flex items-center gap-2 max-w-full overflow-hidden pr-2">
          <Utensils size={16} className="text-[#B89B6D] flex-shrink-0" />
          <span className="font-black text-sm text-gray-900 truncate">{order.stores?.name}</span>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold uppercase flex-shrink-0">{order.order_type}</span>
        </div>
        
        <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 flex-shrink-0 bg-gray-50 md:bg-transparent px-2 md:px-0 py-1 md:py-0 rounded-lg">
          {order.status === 'waiting_confirmation' && <span className="text-orange-500 flex items-center gap-1"><Clock size={12}/> Menunggu ACC</span>}
          {order.status === 'waiting_payment' && <span className="text-blue-500 flex items-center gap-1"><AlertCircle size={12}/> Perlu Dibayar</span>}
          {order.status === 'processing' && <span className="text-purple-500">Sedang Dimasak</span>}
          {order.status === 'ready_for_pickup' && <span className="text-teal-500 flex items-center gap-1"><PackageCheck size={12}/> Siap Diambil</span>}
          {order.status === 'completed' && <span className="text-green-500 flex items-center gap-1"><CheckCircle2 size={12}/> Selesai</span>}
          {order.status === 'cancelled' && <span className="text-red-500 flex items-center gap-1"><XCircle size={12}/> Dibatalkan</span>}
        </div>
      </div>

      {/* ITEMS: Fix varian teks kepanjangan */}
      <div className="space-y-3 mb-4">
        {order.order_items.map(item => (
          <div key={item.id} className="flex items-center gap-3">
            <img src={item.products?.image_url || '/images/iconNyamnow.png'} className="w-12 h-12 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
            <div className="flex-1 text-left min-w-0">
              <h4 className="text-xs font-black text-gray-900 truncate">{item.products?.name}</h4>
              {item.variant && <p className="text-[9px] text-gray-500 font-bold truncate">{item.variant}</p>}
              <p className="text-[10px] text-gray-400">{item.quantity} x Rp{item.price.toLocaleString('id-ID')}</p>
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER: Fix nyamping di mobile jadi numpuk */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-3 border-t border-gray-100 w-full">
        <div className="text-left flex justify-between w-full md:w-auto md:block items-center">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Belanja</p>
          <p className="text-sm font-black text-[#a08055]">Rp{order.grand_total.toLocaleString('id-ID')}</p>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
          {(order.status === 'waiting_confirmation' || order.status === 'waiting_payment') && (
            <div className="text-center md:text-right bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 flex md:block justify-between items-center w-full md:w-auto">
              <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest">{order.status === 'waiting_payment' ? 'Sisa Waktu Bayar' : 'Batas Konfirmasi'}</p>
              <p className={`text-sm font-black ${isExpired ? 'text-red-500' : 'text-orange-600'}`}>{timeLeft}</p>
            </div>
          )}

          {order.status === 'processing' && (
            <div className="text-center md:text-right bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 flex md:block justify-between items-center w-full md:w-auto">
              <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest">Estimasi Dimasak</p>
              <p className="text-sm font-black text-purple-600">~{finalEstTime} Menit</p>
            </div>
          )}

          {order.status === 'waiting_payment' && !isExpired && (
            <button onClick={() => onPay(order.id, order.grand_total)} className="bg-[#B89B6D] hover:bg-[#a08055] text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 w-full md:w-auto">
              <QrCode size={16} /> Bayar Sekarang
            </button>
          )}

          {order.status === 'completed' && !order.is_reviewed && (
            <button onClick={() => onReview(order.id, order.store_id)} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 w-full md:w-auto">
              <Star size={16} className="fill-white" /> Beri Ulasan
            </button>
          )}
          {order.status === 'completed' && order.is_reviewed && (
            <div className="bg-gray-100 text-gray-500 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 border border-gray-200 w-full md:w-auto">
              <CheckCircle2 size={14} /> Sudah Dinilai
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function OrdersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabQuery = searchParams.get('tab')

  const [activeTab, setActiveTab] = useState(() => {
    if (tabQuery) {
      const matchedTab = TABS.find(t => t.statuses.includes(tabQuery))
      if (matchedTab) return matchedTab.id
    }
    return 'semua'
  })

  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userName, setUserName] = useState<string | null>(null)
  
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, orderId: '', amount: 0 })
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  const [reviewModal, setReviewModal] = useState({ isOpen: false, orderId: '', storeId: '' })
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>

    const initData = async () => {
      setIsLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return router.push('/login')

      const { data: userData } = await supabase.from('users').select('first_name').eq('id', user.id).single()
      if (userData) setUserName(userData.first_name)

      const fetchOrders = async () => {
        const { data: orderData } = await supabase
          .from('orders')
          .select(`*, stores (name), order_items ( *, products (name, image_url, estimated_time) )`)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (orderData) setOrders(orderData as unknown as Order[])
      }

      await fetchOrders()
      setIsLoading(false)

      channel = supabase
        .channel('buyer_orders_realtime')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` }, (payload) => {
          setOrders(prev => prev.map(order => order.id === payload.new.id ? { ...order, ...payload.new } : order))
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` }, () => {
          fetchOrders()
        })
        .subscribe()
    }
    initData()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [router])

  const handleConfirmPayment = async () => {
    setIsProcessingPayment(true)
    const { error } = await supabase.from('orders').update({ status: 'processing' }).eq('id', paymentModal.orderId)
    if (!error) setPaymentModal({ isOpen: false, orderId: '', amount: 0 })
    setIsProcessingPayment(false)
  }

  const submitReview = async () => {
    if (!reviewComment.trim()) return alert("Tulis komentar sedikit dong!")
    setIsSubmittingReview(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    await supabase.from('reviews').insert({
      user_id: user?.id,
      store_id: reviewModal.storeId,
      order_id: reviewModal.orderId,
      rating: reviewRating,
      comment: reviewComment
    })

    setReviewModal({ isOpen: false, orderId: '', storeId: '' })
    setReviewRating(5)
    setReviewComment('')
    setIsSubmittingReview(false)
  }

  const currentTabConfig = TABS.find(t => t.id === activeTab)
  const filteredOrders = orders.filter(o => currentTabConfig?.statuses.includes(o.status))

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-black font-sans antialiased pb-20">
      <NavbarBuyer userName={userName} handleLogout={() => supabase.auth.signOut().then(() => router.push('/login'))} />

      {/* FIXED: Padding HP dikecilin biar gak nabrak */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-6 md:mt-8 text-center w-full">
        <h1 className="text-xl md:text-2xl font-black text-gray-900 mb-4 md:mb-6 uppercase italic tracking-tighter text-left">Riwayat Pesanan</h1>

        {/* FIXED: Container tab dibuat w-full dan disembunyiin overflow luarnya */}
        <div className="mb-6 md:mb-8 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-full overflow-hidden mx-auto">
          <div className="flex flex-row items-center gap-1 overflow-x-auto no-scrollbar pb-1 w-full">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id
              const count = orders.filter(o => tab.statuses.includes(o.status)).length

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    router.replace('/dashboard/buyer/orders') 
                  }}
                  className={`relative px-4 py-2.5 rounded-xl transition-all text-center flex items-center justify-center gap-2 whitespace-nowrap ${isActive ? 'text-white' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  {isActive && <motion.div layoutId="orderTab" className="absolute inset-0 bg-[#B89B6D] rounded-xl z-0" />}
                  <span className="relative z-10 text-[10px] md:text-xs font-black uppercase tracking-widest whitespace-nowrap">{tab.label}</span>
                  {count > 0 && tab.id !== 'semua' && (
                    <span className={`relative z-10 w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full text-[8px] md:text-[9px] flex-shrink-0 ${isActive ? 'bg-white text-[#B89B6D]' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <AnimatePresence>
          {activeTab === 'selesai' && (
            <motion.div initial={{ opacity: 0, height: 0, marginBottom: 0 }} animate={{ opacity: 1, height: 'auto', marginBottom: 16 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }} className="max-w-4xl mx-auto overflow-hidden text-left">
              <div className="bg-green-50 border border-green-200 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
                <Info className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-[10px] font-black text-green-800 uppercase tracking-widest mb-1">Pemberitahuan</p>
                  <p className="text-xs font-bold text-green-700">Pesanan sudah dapat diambil bila status sudah selesai.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-4xl mx-auto space-y-4 w-full">
          {isLoading ? (
            <div className="py-20 text-[#B89B6D] font-black animate-pulse">Memuat Pesanan...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-20 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200 w-full">
              <ShoppingBag size={48} className="mx-auto mb-4 opacity-30" />
              <p className="font-bold text-sm">Belum ada pesanan di kategori ini.</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredOrders.map(order => (
                <BuyerOrderCard key={order.id} order={order} onPay={(id, amount) => setPaymentModal({ isOpen: true, orderId: id, amount })} onReview={(orderId, storeId) => setReviewModal({ isOpen: true, orderId, storeId })} />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/*MODAL SIMULASI PEMBAYARAN */}
      <AnimatePresence>
        {paymentModal.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm w-full">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-2xl w-full max-w-md relative text-center">
              <button onClick={() => setPaymentModal({ isOpen: false, orderId: '', amount: 0 })} className="absolute top-5 right-5 p-2 bg-gray-100 rounded-full text-gray-400 hover:text-red-500"><XCircle size={20} /></button>

              <div className="w-16 h-16 bg-[#FAF4EB] rounded-full flex items-center justify-center mx-auto mb-4 text-[#B89B6D]">
                <CreditCard size={32} />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-1">Simulasi Pembayaran</h2>
              <p className="text-xs text-gray-500 font-bold mb-6">Tekan tombol di bawah untuk mensimulasikan pembayaran berhasil.</p>

              <div className="bg-[#FAF4EB] rounded-2xl p-4 mb-6 border border-[#EAE2D3]">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Tagihan</p>
                <p className="text-2xl md:text-3xl font-black text-[#B89B6D]">Rp {paymentModal.amount.toLocaleString('id-ID')}</p>
              </div>

              <button
                onClick={handleConfirmPayment}
                disabled={isProcessingPayment}
                className="w-full bg-[#B89B6D] hover:bg-[#a08055] text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isProcessingPayment ? 'Memproses...' : 'Konfirmasi Bayar'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL REVIEW */}
      <AnimatePresence>
        {reviewModal.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm w-full">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white p-6 md:p-8 rounded-[2rem] shadow-2xl w-full max-w-md relative text-center">
              <button onClick={() => setReviewModal({ isOpen: false, orderId: '', storeId: '' })} className="absolute top-5 right-5 p-2 bg-gray-100 rounded-full text-gray-400 hover:text-red-500"><XCircle size={20} /></button>
              
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-500"><Star size={32} className="fill-yellow-500" /></div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Gimana Rasa Makanannya?</h2>
              <p className="text-xs text-gray-500 font-bold mb-6">Penilaian kamu ngebantu pembeli lain dan bikin penjual makin semangat!</p>

              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setReviewRating(star)} className="focus:outline-none transform hover:scale-110 transition-transform">
                  <Star className={`w-8 h-8 md:w-9 md:h-9 transition-colors ${star <= reviewRating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />                  </button>
                ))}
              </div>

              <div className="relative mb-6 text-left">
                <MessageSquare className="absolute top-3 left-3 text-gray-400" size={16} />
                <textarea 
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Ceritain pengalaman lo makan di sini..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-[#B89B6D] min-h-[100px] resize-none text-black"
                />
              </div>

              <button onClick={submitReview} disabled={isSubmittingReview || !reviewComment.trim()} className="w-full bg-[#B89B6D] hover:bg-[#a08055] text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50">
                {isSubmittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#FDFCF8]"><div className="animate-pulse text-[#B89B6D] font-black text-xl">Memuat...</div></div>}>
      <OrdersContent />
    </Suspense>
  )
}