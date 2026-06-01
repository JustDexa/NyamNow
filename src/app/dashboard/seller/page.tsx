'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import OrderCard from './components/OrderCard'

type OrderStatus = 'waiting_confirmation' | 'waiting_payment' | 'processing' | 'completed' | 'cancelled'

export type OrderType = {
  id: string
  user_id: string
  status: OrderStatus
  order_type: 'ambil' | 'reservasi'
  created_at: string
  grand_total: number
  total_price?: number 
  confirmation_expires_at: string
  note?: string 
}

export default function SellerDashboard() {
  const [orders, setOrders] = useState<OrderType[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // STATE UNTUK FILTER TAB
  const [pendingTab, setPendingTab] = useState<'ambil' | 'reservasi'>('ambil')
  const [processTab, setProcessTab] = useState<'ambil' | 'reservasi'>('ambil')

  // 1. Fetch Data (Dibungkus useCallback biar linter ga ngamuk cascading renders)
  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: store } = await supabase
      .from('stores')
      .select('id, is_open')
      .eq('user_id', user.id)
      .single()

    if (!store) return

    setStoreId(store.id)
    setIsOpen(store.is_open)

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })

    setOrders(ordersData || [])
    setLoading(false)
  }, [])
  
  // 2. Initial Fetch
  useEffect(() => {
      const initialize = async () => {
        await loadData()
      }
      
      initialize()
    }, [loadData])

  // 3. SUPABASE REALTIME (Biar pesanan langsung masuk tanpa refresh)
  useEffect(() => {
    if (!storeId) return

    const channel = supabase
      .channel('realtime-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
        () => {
          // Kalau ada perubahan/pesanan baru, tarik ulang datanya
          loadData()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [storeId, loadData])

  // 4. Toggle Buka/Tutup Toko

  if (loading && orders.length === 0) {
  return (
    <div className="flex h-full min-h-[500px] items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#b89b6d]"></div>
    </div>
   )
  }

  // 5. FILTERING PESANAN BERDASARKAN STATUS DAN TAB YANG DIPILIH
  const pendingOrders = orders.filter(o => o.status === 'waiting_confirmation' && o.order_type === pendingTab)
  const processOrders = orders.filter(o => o.status === 'processing' && o.order_type === processTab)
  const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div className="p-4 lg:p-8">
      {/* HEADER & TOGGLE */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Pesanan Cepat</h1>

    
      </div>

      {/* GRID KOLOM PESANAN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT: MENUNGGU DISETUJUI */}
        <div className="bg-[#fdf4e3] border border-[#f5e2b8] p-6 rounded-[40px] shadow-sm min-h-[600px]">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#f5e2b8] rounded-full flex items-center justify-center font-black text-slate-700 shadow-inner">
                {pendingOrders.length}
              </div>
              <h2 className="font-extrabold text-slate-800 text-lg">Menunggu Disetujui</h2>
            </div>
            <span className="bg-white/60 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-500 border border-white">
              {today}
            </span>
          </div>

          {/* TAB KATEGORI PENDING */}
          <div className="flex gap-6 text-[11px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200/60 mb-6 px-2">
            <button 
              onClick={() => setPendingTab('ambil')}
              className={`pb-3 transition-all ${pendingTab === 'ambil' ? 'text-slate-800 border-b-2 border-slate-800' : 'hover:text-slate-600'}`}
            >
              Makan Ditempat
            </button>
            <button 
              onClick={() => setPendingTab('reservasi')}
              className={`pb-3 transition-all ${pendingTab === 'reservasi' ? 'text-slate-800 border-b-2 border-slate-800' : 'hover:text-slate-600'}`}
            >
              Reservasi
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {/* Panggil OrderCard dan lempar props */}
            {pendingOrders.map(order => (
              <OrderCard key={order.id} order={order} status="waiting_confirmation" />
            ))}
            {pendingOrders.length === 0 && (
              <div className="text-center py-20 opacity-20 font-bold uppercase text-xs tracking-widest text-[#B89B6D]">Kosong</div>
            )}
          </div>
        </div>

        {/* RIGHT: SEDANG DIPROSES */}
        <div className="bg-[#edf4fc] border border-[#d6e4f5] p-6 rounded-[40px] shadow-sm min-h-[600px]">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#d6e4f5] rounded-full flex items-center justify-center font-black text-slate-700 shadow-inner">
                {processOrders.length}
              </div>
              <h2 className="font-extrabold text-slate-800 text-lg">Sedang Diproses</h2>
            </div>
            <span className="bg-white/60 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-500 border border-white">
              {today}
            </span>
          </div>

          {/* TAB KATEGORI PROSES */}
          <div className="flex gap-6 text-[11px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200/60 mb-6 px-2">
            <button 
              onClick={() => setProcessTab('ambil')}
              className={`pb-3 transition-all ${processTab === 'ambil' ? 'text-slate-800 border-b-2 border-slate-800' : 'hover:text-slate-600'}`}
            >
              Makan Ditempat
            </button>
            <button 
              onClick={() => setProcessTab('reservasi')}
              className={`pb-3 transition-all ${processTab === 'reservasi' ? 'text-slate-800 border-b-2 border-slate-800' : 'hover:text-slate-600'}`}
            >
              Reservasi
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {/* Panggil OrderCard dan lempar props */}
            {processOrders.map(order => (
              <OrderCard key={order.id} order={order} status="processing" />
            ))}
            {processOrders.length === 0 && (
              <div className="text-center py-20 opacity-20 font-bold uppercase text-xs tracking-widest text-blue-800">Kosong</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}