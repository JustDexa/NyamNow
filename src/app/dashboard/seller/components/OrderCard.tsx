'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Clock, CheckCheck, FileText, ChevronDown, ChevronUp } from 'lucide-react'

// ✅ 1. Definisikan tipe order yang jelas (No more 'any')
export interface OrderData {
  id: string
  user_id: string
  status: string
  grand_total?: number
  total_price?: number
  confirmation_expires_at?: string
  note?: string
}

interface OrderCardProps {
  order: OrderData
  status: 'waiting_confirmation' | 'processing'
}

interface OrderItem {
  id: string
  quantity: number
  price: number
  products: {
    name: string
  } | null
}

export default function OrderCard({ order, status }: OrderCardProps) {
  const [items, setItems] = useState<OrderItem[]>([])
  const [buyerName, setBuyerName] = useState('Pembeli')
  const [isLoading, setIsLoading] = useState(true)
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState<string>('--:--')
  const [isExpired, setIsExpired] = useState(false)
  const [isHidden, setIsHidden] = useState(false) 
  const [isExpanded, setIsExpanded] = useState(false)

  // ✅ 4. Bungkus pake useCallback biar linter useEffect nggak ngamuk
  const autoCancelOrder = useCallback(async () => {
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
    setIsHidden(true)
  }, [order.id])

  // 1. Fetch Rincian Item & Nama Pembeli
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('first_name')
          .eq('id', order.user_id)
          .single()
        if (userData) setBuyerName(userData.first_name)

        const { data: itemsData } = await supabase
          .from('order_items')
          .select('id, quantity, price, products(name)')
          .eq('order_id', order.id)
        
        // ✅ 2. Casting yang aman (No more 'any')
        if (itemsData) setItems(itemsData as unknown as OrderItem[])

      } catch (error) {
        console.error('Error fetching details:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDetails()
  }, [order.id, order.user_id])

  // 2. Timer Countdown Logic
  useEffect(() => {
    if (status !== 'waiting_confirmation' || !order.confirmation_expires_at) return

    const targetTime = new Date(order.confirmation_expires_at).getTime()

    const timer = setInterval(() => {
      const now = new Date().getTime()
      const diff = targetTime - now

      if (diff <= 0) {
        setTimeLeft('00:00')
        setIsExpired(true)
        clearInterval(timer)
        autoCancelOrder()
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [order.confirmation_expires_at, status, autoCancelOrder]) // ✅ Ditambahin ke dependency array

  // --- ACTIONS ---

  // Tombol Terima
  const handleAccept = async () => {
    const paymentDeadline = new Date()
    paymentDeadline.setMinutes(paymentDeadline.getMinutes() + 3)

    const { error } = await supabase.from('orders').update({
      status: 'waiting_payment',
      payment_expires_at: paymentDeadline.toISOString(),
      accepted_at: new Date().toISOString()
    }).eq('id', order.id)

    if (!error) {
      setIsHidden(true) 
    } else {
      alert('Gagal menerima pesanan!')
    }
  }

  // Tombol Tolak
  const handleReject = async () => {
    const confirmReject = window.confirm('Yakin mau nolak pesanan ini?')
    if (!confirmReject) return

    const { error } = await supabase.from('orders').update({
      status: 'cancelled'
    }).eq('id', order.id)

    if (!error) setIsHidden(true)
  }

  // Tombol Selesai
  const handleComplete = async () => {
    const { error } = await supabase.from('orders').update({
      status: 'completed'
    }).eq('id', order.id)

    if (!error) setIsHidden(true)
  }

  if (isHidden) return null

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md text-left">
      {/* Header Info Pembeli */}
      <div className="flex justify-between items-start mb-4 border-b border-gray-50 pb-3">
        <div>
          <h3 className="font-black text-gray-900">{buyerName}</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">ID: {order.id.split('-')[0]}</p>
        </div>
        
        {/* Badge Timer */}
        {status === 'waiting_confirmation' && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black ${isExpired ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600 animate-pulse'}`}>
            <Clock size={12} /> {timeLeft}
          </div>
        )}
      </div>

      {/* Rincian Pesanan */}
      {isLoading ? (
        <div className="animate-pulse h-10 bg-gray-100 rounded-xl mb-4" />
      ) : (
        <div className="mb-4">
          <div className="space-y-2">
            {(isExpanded ? items : items.slice(0, 2)).map((item) => (
              <div key={item.id} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-black text-[#B89B6D] bg-[#FAF4EB] w-5 h-5 flex items-center justify-center rounded-md">
                    {item.quantity}x
                  </span>
                  <span className="font-bold text-gray-700">{item.products?.name || 'Menu dihapus'}</span>
                </div>
              </div>
            ))}
          </div>
          
          {items.length > 2 && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="text-[10px] font-bold text-gray-400 mt-2 flex items-center gap-1 hover:text-gray-600 transition-colors">
              {isExpanded ? <><ChevronUp size={12}/> Sembunyikan</> : <><ChevronDown size={12}/> Lihat {items.length - 2} menu lainnya</>}
            </button>
          )}
        </div>
      )}

      {/* Catatan (Kalau ada) */}
      {order.note && (
        <div className="bg-yellow-50/50 border border-yellow-100 rounded-xl p-3 mb-4 flex items-start gap-2">
          <FileText size={14} className="text-yellow-600 mt-0.5 flex-shrink-0" />
          {/* ✅ 3. Pake &quot; pengganti tanda kutip JSX */}
          <p className="text-[10px] font-bold text-gray-600 italic">&quot;{order.note}&quot;</p>
        </div>
      )}

      {/* Footer & Aksi */}
      <div className="flex justify-between items-center mt-2 pt-4 border-t border-gray-50">
        <div>
          <p className="text-[9px] font-black uppercase text-gray-400">Total Harga</p>
          <p className="text-sm font-black text-gray-900">Rp {(order.grand_total || order.total_price || 0).toLocaleString('id-ID')}</p>
        </div>

        {/* Action Buttons berdasarkan Status */}
        {status === 'waiting_confirmation' && (
          <div className="flex gap-2">
            <button onClick={handleReject} disabled={isExpired} className="w-10 h-10 rounded-xl border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50 disabled:opacity-50 transition-colors">
              <X size={18} />
            </button>
            <button onClick={handleAccept} disabled={isExpired} className="bg-[#B89B6D] hover:bg-[#a08055] text-white px-5 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-colors shadow-sm">
              Terima
            </button>
          </div>
        )}

        {status === 'processing' && (
          <button onClick={handleComplete} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors shadow-sm">
            <CheckCheck size={14} /> Selesai
          </button>
        )}
      </div>
    </div>
  )
}