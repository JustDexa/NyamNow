'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  ArrowLeft, Clock, MapPin, Store, 
  Ticket, ChevronRight, ShoppingBag, 
  Info, Sparkles, Megaphone
} from 'lucide-react'
import { motion } from 'framer-motion'

// --- INTERFACES ---
interface Campaign {
  id: string
  title: string
  banner_url: string
  start_at: string
  end_at: string
}

interface CampaignPromo {
  id: string
  title: string
  description: string
  type: string
  buy_qty: number
  get_qty: number
  discount_price: number
  store_id: string
  products: {
    id: string
    name: string
    price: number
    image_url: string
    stores: {
      id: string
      name: string
    }
  }
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const campaignId = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [promos, setPromos] = useState<CampaignPromo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchCampaignData = async () => {
      setIsLoading(true)
      try {
        // 1. Tarik Data Banner & Info Campaign Admin
        const { data: campData, error: campError } = await supabase
          .from('admin_campaigns')
          .select('*')
          .eq('id', campaignId)
          .single()

        if (campError) throw campError
        setCampaign(campData)

        // 2. Tarik Semua Promo Toko yang ikutan Campaign ini
        const { data: promoData, error: promoError } = await supabase
          .from('promos')
          .select(`
            id, title, description, type, buy_qty, get_qty, discount_price, store_id,
            products!promos_product_id_fkey ( id, name, price, image_url, stores ( id, name ) )
          `)
          .eq('campaign_id', campaignId)
          .eq('is_active', true)

        if (promoError) throw promoError
        setPromos((promoData as unknown as CampaignPromo[]) || [])

      } catch (error) {
        console.error("Gagal load detail campaign:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (campaignId) fetchCampaignData()
  }, [campaignId])


  const handleGunakanPromo = (promo: CampaignPromo) => {
    const params = new URLSearchParams({
      tab: 'All Menu',                          // langsung buka tab menu
      apply_promo: promo.id,                    // ID promo yang dipakai
      promo_product_id: promo.products.id,      // produk yang harus di-add
      promo_buy_qty: String(promo.buy_qty || 1),// jumlah yang harus dibeli
      promo_get_qty: String(promo.get_qty || 0),// jumlah yang digratiskan
      promo_type: promo.type,                   // tipe promo
    })
    router.push(`/dashboard/buyer/store/${promo.store_id}?${params.toString()}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#B89B6D] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Membuka Event NyamNow...</p>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-2xl font-black text-gray-900 mb-2">Event Ghaib!</h1>
        <p className="text-gray-500 mb-6">Campaign yang kamu cari nggak ketemu.</p>
        <button onClick={() => router.back()} className="px-6 py-3 bg-black text-white rounded-xl font-bold">Kembali ke Beranda</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-black font-sans pb-20">
      
      {/* 1. HERO BANNER SECTION */}
      <div className="relative w-full h-[40vh] md:h-[50vh] bg-gray-900">
        <img src={campaign.banner_url} alt={campaign.title} className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FDFCF8] via-[#FDFCF8]/20 to-transparent"></div>
        
        {/* Tombol Back */}
        <button 
          onClick={() => router.back()}
          className="absolute top-6 left-6 z-10 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Info Campaign di atas Banner */}
        <div className="absolute bottom-6 left-6 right-6 z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#B89B6D] text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 shadow-lg">
            <Megaphone size={12} className="animate-pulse" /> NyamNow Event
          </div>
          <h1 className="text-3xl md:text-5xl font-[1000] text-gray-900 italic tracking-tighter leading-tight mb-2 drop-shadow-sm">
            {campaign.title}
          </h1>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-600 bg-white/80 backdrop-blur-md w-fit px-4 py-2 rounded-xl shadow-sm">
            <Clock size={14} className="text-[#a08055]" />
            <span>Berlaku: {new Date(campaign.start_at).toLocaleDateString('id-ID')} - {new Date(campaign.end_at).toLocaleDateString('id-ID')}</span>
          </div>
        </div>
      </div>

      {/* 2. LIST PROMO DARI UMKM */}
      <div className="max-w-4xl mx-auto px-6 mt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-[1000] text-gray-900 uppercase italic tracking-tight">Katalog Diskon</h2>
            <p className="text-xs text-gray-500 font-medium">Banyak UMKM yang ikutan event ini. Yuk sikat!</p>
          </div>
          <div className="text-xs font-black text-white bg-gray-900 px-4 py-2 rounded-xl shadow-sm">
            {promos.length} Promo Tersedia
          </div>
        </div>

        {promos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <Ticket size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="font-bold text-gray-400">Belum ada UMKM yang gabung di event ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {promos.map((promo) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={promo.id} 
                className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-5 flex flex-col hover:shadow-lg transition-all"
              >
                {/* Header Card: Info Toko */}
                <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#FAF4EB] rounded-full flex items-center justify-center">
                      <Store size={14} className="text-[#B89B6D]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-0.5">Toko NyamNow</p>
                      <p className="text-sm font-black text-gray-900 leading-tight">{promo.products.stores.name}</p>
                    </div>
                  </div>
                  <button onClick={() => router.push(`/dashboard/buyer/store/${promo.store_id}`)} className="text-[10px] font-bold text-[#B89B6D] hover:underline flex items-center gap-0.5">
                    Kunjungi <ChevronRight size={10} />
                  </button>
                </div>

                {/* Konten Produk & Promo */}
                <div className="flex gap-4 mb-5">
                  <img src={promo.products.image_url} alt={promo.products.name} className="w-24 h-24 rounded-2xl object-cover bg-gray-100 shadow-inner flex-shrink-0" />
                  <div className="flex-1">
                    <div className="inline-block bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider mb-2">
                      {promo.type === 'promo' ? 'Bundle Deal' : 'Special Price'}
                    </div>
                    <h3 className="font-black text-lg text-gray-900 leading-tight italic uppercase mb-1">{promo.title || promo.products.name}</h3>
                    
                    {/* Logika Tampilan Harga / Mekanik Promo */}
                    {promo.type === 'promo' ? (
                      <p className="text-sm font-[1000] text-[#2E7D32]">Beli {promo.buy_qty} Gratis {promo.get_qty}</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 line-through">Rp{promo.products.price.toLocaleString('id-ID')}</span>
                        <span className="text-sm font-[1000] text-orange-600">Rp{promo.discount_price.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deskripsi Promo */}
                {promo.description && (
                  <div className="bg-[#FAF4EB] p-3 rounded-xl mb-4 flex items-start gap-2">
                    <Info size={14} className="text-[#a08055] mt-0.5 flex-shrink-0" />
                    <p className="text-[10px] font-bold text-gray-600 leading-relaxed italic">{promo.description}</p>
                  </div>
                )}

                {/* Tombol Eksekusi */}
                <button 
                  onClick={() => handleGunakanPromo(promo)}
                  className="mt-auto w-full bg-gray-900 hover:bg-black text-white py-3.5 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest shadow-md hover:shadow-lg transition-all active:scale-95"
                >
                  <Ticket size={16} /> Gunakan Promo Ini
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}