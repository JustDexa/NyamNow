'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Search, Clock, Check, X, Package, FileText, User, AlertCircle, CheckCheck
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

// --- INTERFACES ---
type OrderStatus = 'waiting_confirmation' | 'waiting_payment' | 'processing' | 'completed' | 'cancelled'

interface OrderItem {
  id: string
  name: string
  quantity: number
  price: number
  image_url: string
  variant?: string
}

export interface SellerOrder {
  id: string
  buyer_name: string
  status: OrderStatus
  order_type: string
  total_price: number
  created_at: string
  note?: string
  items: OrderItem[]
  confirmation_expires_at: string
  payment_expires_at: string
}

interface SupabaseSellerOrder {
  id: string
  status: OrderStatus
  order_type: string
  total_price: number
  grand_total: number
  created_at: string
  note: string | null
  confirmation_expires_at: string
  payment_expires_at: string
  users: { first_name: string; last_name: string | null } | null
  order_items: {
    id: string
    quantity: number
    price: number
    variant: string | null
    products: {
      name: string
      image_url: string | null
    } | null
  }[]
}

// ==========================================
// KOMPONEN KARTU PESANAN PENJUAL
// ==========================================
// ✅ FIX 1: Tambahin newDeadline di props onStatusChange biar timer bayar ke-update
function SellerOrderCard({ order, onStatusChange }: { order: SellerOrder, onStatusChange: (id: string, newStatus: OrderStatus, newDeadline?: string) => void }) {
  const [timeLeft, setTimeLeft] = useState<string>('--:--')
  const [isExpired, setIsExpired] = useState(false)

  const autoCancelOrder = useCallback(async () => {
    // Biar gak spam update ke DB
    if (order.status === 'cancelled') return;
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
    onStatusChange(order.id, 'cancelled')
  }, [order.id, order.status, onStatusChange])

  // Logic Timer (Hanya nyala pas nunggu konfirmasi atau nunggu bayar)
  useEffect(() => {
    if (order.status !== 'waiting_confirmation' && order.status !== 'waiting_payment') return

    const targetTime = order.status === 'waiting_confirmation' 
      ? new Date(order.confirmation_expires_at).getTime()
      : new Date(order.payment_expires_at).getTime()

    const timer = setInterval(() => {
      const now = new Date().getTime()
      const diff = targetTime - now

      if (diff <= 0) {
        clearInterval(timer)
        setTimeLeft('00:00')
        setIsExpired(true)
        autoCancelOrder()
      } else {
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const secs = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [order.status, order.confirmation_expires_at, order.payment_expires_at, autoCancelOrder])

  // --- ACTIONS ---
  const handleAccept = async () => {
    const paymentDeadline = new Date()
    paymentDeadline.setMinutes(paymentDeadline.getMinutes() + 3) // Kasih 3 menit buat bayar

    const { error } = await supabase.from('orders').update({
      status: 'waiting_payment',
      payment_expires_at: paymentDeadline.toISOString(),
      accepted_at: new Date().toISOString()
    }).eq('id', order.id)

    if (error) {
      alert("GAGAL ACC: " + error.message) // ✅ Nambahin ini biar errornya keliatan
      console.error(error)
    } else {
      onStatusChange(order.id, 'waiting_payment', paymentDeadline.toISOString())
    }
  }

  const handleReject = async () => {
    if (!window.confirm('Yakin mau tolak pesanan ini?')) return
    const { error } = await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
    if (!error) onStatusChange(order.id, 'cancelled')
  }

  const handleComplete = async () => {
    const { error } = await supabase.from('orders').update({ status: 'completed' }).eq('id', order.id)
    if (!error) onStatusChange(order.id, 'completed')
  }

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden text-left flex flex-col md:flex-row"
    >
      {/* BAGIAN KIRI: Info Pembeli & Timer */}
      <div className="md:w-1/3 p-6 bg-[#FDFCF8] border-b md:border-b-0 md:border-r border-gray-100 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Order #{order.id.split('-')[0]}</span>
            <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${
              order.status === 'waiting_confirmation' ? 'bg-orange-100 text-orange-600' :
              order.status === 'waiting_payment' ? 'bg-blue-100 text-blue-600' :
              order.status === 'processing' ? 'bg-yellow-100 text-yellow-600' :
              order.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              {order.status.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#B89B6D]/10 rounded-full flex items-center justify-center text-[#B89B6D]">
              <User size={20} />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900">{order.buyer_name}</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase">{order.order_type || 'Makan Ditempat'}</p>
            </div>
          </div>
        </div>

        {/* Timer khusus Penjual */}
        {(order.status === 'waiting_confirmation' || order.status === 'waiting_payment') && (
          <div className={`mt-6 p-3 rounded-xl border flex items-center justify-between ${isExpired ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
            <div className="flex items-center gap-2">
              <Clock size={16} className={isExpired ? 'text-red-500' : 'text-orange-500 animate-pulse'} />
              <span className={`text-[10px] font-black uppercase ${isExpired ? 'text-red-600' : 'text-orange-600'}`}>
                {order.status === 'waiting_confirmation' ? 'Batas Terima:' : 'Batas Bayar:'}
              </span>
            </div>
            <span className={`text-lg font-black ${isExpired ? 'text-red-600' : 'text-orange-600'}`}>{timeLeft}</span>
          </div>
        )}
      </div>

      {/* BAGIAN KANAN: Rincian & Aksi */}
      <div className="md:w-2/3 p-6 flex flex-col justify-between">
        <div className="space-y-4 mb-6">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center pb-3 border-b border-gray-50 last:border-0 last:pb-0">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-xs font-black text-gray-600">
                  {item.quantity}x
                </span>
                <div>
                  <h4 className="text-sm font-bold text-gray-800">{item.name}</h4>
                  {item.variant && <p className="text-[10px] font-bold text-gray-400 mt-0.5">{item.variant}</p>}
                </div>
              </div>
              <span className="text-sm font-black text-gray-900">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</span>
            </div>
          ))}

          {/* Catatan Pembeli */}
          {order.note && (
            <div className="bg-yellow-50/50 border border-yellow-100 rounded-xl p-3 flex items-start gap-2 mt-4">
              <FileText size={14} className="text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] font-bold text-gray-600 italic">&quot;{order.note}&quot;</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Total Pendapatan</p>
            <p className="text-xl font-black text-[#B89B6D]">Rp {order.total_price.toLocaleString('id-ID')}</p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {order.status === 'waiting_confirmation' && (
              <>
                <button onClick={handleReject} disabled={isExpired} className="flex-1 sm:flex-none w-12 h-12 rounded-xl border-2 border-red-100 text-red-500 flex items-center justify-center hover:bg-red-50 disabled:opacity-50 transition-colors">
                  <X size={20} />
                </button>
                <button onClick={handleAccept} disabled={isExpired} className="flex-1 sm:flex-none bg-[#B89B6D] hover:bg-[#a08055] text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2">
                  <Check size={16} /> Terima
                </button>
              </>
            )}

            {order.status === 'processing' && (
              <button onClick={handleComplete} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2">
                <CheckCheck size={16} /> Pesanan Selesai
              </button>
            )}

            {(order.status === 'waiting_payment' || order.status === 'completed' || order.status === 'cancelled') && (
              <button className="w-full sm:w-auto bg-gray-100 text-gray-500 px-6 py-3 rounded-xl text-xs font-black uppercase hover:bg-gray-200 transition-all">
                Menunggu Pembeli
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ==========================================
// HALAMAN UTAMA MANAJEMEN PESANAN
// ==========================================
export default function SellerOrdersHistory() {
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all')
  const [orders, setOrders] = useState<SellerOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let storeId = '';

    const fetchOrders = async () => {
      setIsLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: store } = await supabase.from('stores').select('id').eq('user_id', user.id).single()
        if (!store) return
        storeId = store.id;
        
        const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
            id, status, order_type, total_price, grand_total, created_at, note,
            confirmation_expires_at, payment_expires_at,
            users!orders_user_id_fkey ( first_name, last_name ),
            order_items!order_items_order_id_fkey ( 
              id, quantity, price, variant, products ( name, image_url ) 
            )
        `)
        .eq('store_id', store.id)
        .order('created_at', { ascending: false })

        if (error) throw error

        if (ordersData) {
          const mappedOrders: SellerOrder[] = (ordersData as unknown as SupabaseSellerOrder[]).map((o) => {
            const buyerName = o.users ? `${o.users.first_name || ''} ${o.users.last_name || ''}`.trim() : 'Pembeli Anonim';
            return {
              id: o.id, buyer_name: buyerName || 'Pembeli', status: o.status,
              order_type: o.order_type || 'ambil', total_price: o.grand_total || o.total_price || 0,
              created_at: o.created_at, note: o.note || undefined,
              confirmation_expires_at: o.confirmation_expires_at, payment_expires_at: o.payment_expires_at,
              items: (o.order_items || []).map((item) => ({
                id: item.id, name: item.products?.name || 'Menu Tidak Diketahui',
                quantity: item.quantity || 0, price: item.price || 0,
                image_url: item.products?.image_url || '/images/iconNyamnow.png', variant: item.variant || undefined
              }))
            };
          });
          setOrders(mappedOrders);
        }
      } catch (err) {
        console.error('Error fetching seller orders:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()

    // ✅ FIX 3: PASANG CCTV REALTIME DI SINI
    const channel = supabase
      .channel('seller_orders_realtime')
      .on('postgres_changes', { 
        event: '*', // Dengerin INSERT & UPDATE
        schema: 'public', 
        table: 'orders'
      }, (payload) => {
        // Kalau ada data masuk/berubah, langsung panggil fetchOrders ulang 
        // biar data relasi (users & order_items) ikut ke-update bersih.
        fetchOrders() 
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const handleStatusChange = (orderId: string, newStatus: OrderStatus, newDeadline?: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return { 
          ...o, 
          status: newStatus,
          ...(newDeadline && { payment_expires_at: newDeadline }) 
        }
      }
      return o
    }))
  }

  const filteredOrders = activeTab === 'all' ? orders : orders.filter(o => o.status === activeTab)

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full text-left bg-gray-50 min-h-screen">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Manajemen Pesanan</h1>
          <p className="text-sm font-bold text-slate-500 mt-1">Pantau dan kelola semua riwayat pesanan tokomu.</p>
        </div>
        
        <div className="relative hidden md:block w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input type="text" placeholder="Cari ID Pesanan atau Nama..." className="w-full bg-white border border-gray-200 shadow-sm rounded-full py-2.5 pl-12 pr-4 text-xs font-bold outline-none focus:border-[#B89B6D] transition-colors" />
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar border-b border-gray-200 mb-8 pb-1">
        {[
          { id: 'all' as const, label: 'Semua Pesanan' },
          { id: 'waiting_confirmation' as const, label: 'Perlu Konfirmasi' },
          { id: 'waiting_payment' as const, label: 'Belum Bayar' },
          { id: 'processing' as const, label: 'Sedang Diproses' },
          { id: 'completed' as const, label: 'Selesai' },
          { id: 'cancelled' as const, label: 'Dibatalkan' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all relative ${
              activeTab === tab.id ? 'text-[#B89B6D]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
            {tab.id === 'waiting_confirmation' && orders.some(o => o.status === 'waiting_confirmation') && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
            
            {activeTab === tab.id && (
              <motion.div layoutId="seller-tab-underline" className="absolute bottom-0 left-0 w-full h-1 bg-[#B89B6D] rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#B89B6D]"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-gray-200">
          <Package size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-sm font-bold text-gray-400">Belum ada pesanan yang masuk di kategori ini.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <AnimatePresence>
            {filteredOrders.map((order) => (
              <SellerOrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}