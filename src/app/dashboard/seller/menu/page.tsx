/* eslint-disable @next/next/no-img-element */
'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Plus, Edit2, Clock, Zap, Trash2, ChefHat, 
  Sparkles, Calendar, RefreshCcw, Timer, Megaphone, CheckCircle2 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import AddMenuModal from './components/AddModal'
import EditMenuModal from './components/EditMenuModal'
import AddPromoModal, { PromoData } from './components/AddPromoModal'

// --- 1. INTERFACES ---
export interface VariantOption {
  name: string
  extra_price: number
}

export interface VariantGroup {
  group_name: string
  options: VariantOption[]
}

export interface Product {
  id: string
  name: string
  category: string
  price: number
  stock: number
  is_available: boolean
  image_url: string
  estimated_time?: number
  description?: string; 
  flavors?: string[]
  ingredients?: string[]
  variants?: VariantGroup[]
  store_id: string
  created_at?: string
}

export interface Promo {
  id: string
  store_id: string
  product_id: string
  campaign_id?: string 
  type: 'flash_sale' | 'promo'
  title: string | null
  description?: string 
  buy_qty: number
  get_qty: number
  discount_price: number
  promo_image_url: string | null
  start_at: string
  end_at: string
  can_repeat: boolean
  products?: {
    name: string
    price: number
    image_url: string
  }
}

export interface Campaign {
  id: string
  title: string
  banner_url: string
  start_at: string
  end_at: string
  is_active: boolean
}

export default function MenuPage() {
  const [activeTab, setActiveTab] = useState('Semua')
  const [menus, setMenus] = useState<Product[]>([])
  const [promos, setPromos] = useState<Promo[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([]) 
  
  const [selectedMenu, setSelectedMenu] = useState<Product | null>(null)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false)
  const [storeId, setStoreId] = useState<string | null>(null)

  const fetchMenus = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { data: store } = await supabase.from('stores').select('id').eq('user_id', user.id).single()
    if (store) {
      setStoreId(store.id)
      const { data } = await supabase.from('products').select('*').eq('store_id', store.id).order('created_at', { ascending: false })
      setMenus((data as Product[]) || [])
    }
  }, [])

  const fetchPromos = useCallback(async () => {
      if (!storeId) return
      const { data, error } = await supabase.from('promos')
        .select('*, products!promos_product_id_fkey(name, price, image_url)')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error("Error Fetch Promos Supabase:", error.message)
      }
      
      setPromos((data as unknown as Promo[]) || [])
    }, [storeId])

  const fetchCampaigns = useCallback(async () => {
    const { data } = await supabase.from('admin_campaigns').select('*').eq('is_active', true).order('created_at', { ascending: false })
    setCampaigns((data as Campaign[]) || [])
  }, [])

  useEffect(() => { fetchMenus(); fetchCampaigns(); }, [fetchMenus, fetchCampaigns])
  useEffect(() => { if (storeId) fetchPromos() }, [storeId, fetchPromos])

  const handleDeletePromo = async (id: string) => {
    if (confirm('Hapus promo ini?')) {
      await supabase.from('promos').delete().eq('id', id)
      fetchPromos()
    }
  }

  const handleSavePromo = async (data: PromoData) => {
    try {
      if (!storeId) return

      let finalStart = data.start_at;
      let finalEnd = data.end_at;
      let finalType = data.type;

      if (selectedCampaignId) {
        const targetCampaign = campaigns.find(c => c.id === selectedCampaignId);
        if (targetCampaign) {
          finalStart = targetCampaign.start_at;
          finalEnd = targetCampaign.end_at;
          finalType = 'promo'; 
        }
      }

      let finalImageUrl = ''
      
      if (data.promo_image_url?.startsWith('blob:')) {
        const file = await fetch(data.promo_image_url).then(r => r.blob())
        const fileName = `${storeId}/p-${Date.now()}.jpg`
        await supabase.storage.from('promo-banners').upload(fileName, file)
        const { data: url } = supabase.storage.from('promo-banners').getPublicUrl(fileName)
        finalImageUrl = url.publicUrl
      }

      const { error } = await supabase.from('promos').insert([{
        store_id: storeId, 
        product_id: data.product_id, 
        campaign_id: selectedCampaignId || null, 
        type: finalType,
        title: data.title || null, 
        description: data.description || null,
        buy_qty: data.buy_qty || 0, 
        get_qty: data.get_qty || 0,
        discount_price: data.discount_price || null, 
        promo_image_url: finalImageUrl || null,
        start_at: finalStart, 
        end_at: finalEnd, 
        can_repeat: data.can_repeat
      }])

      if (error) throw error
      
      //Auto-Switch Tab biar promonya langsung keliatan
      if (selectedCampaignId) {
        setActiveTab('Promo Campaign');
      } else if (finalType === 'flash_sale') {
        setActiveTab('Flash Sale');
      } else {
        setActiveTab('Promo Bundle');
      }

      setIsPromoModalOpen(false)
      setSelectedCampaignId(null)
      fetchPromos()
      } catch (e: unknown) { 
      console.error(e)
      if (e instanceof Error) {
        alert(`Gagal Simpan Promo! Error: ${e.message}`) 
      } else {
        alert('Gagal Simpan Promo! Terjadi kesalahan yang tidak diketahui.')
      }
    }
  }

  const handleClosePromoModal = () => {
    setIsPromoModalOpen(false)
    setSelectedCampaignId(null)
  }

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto text-black min-h-screen bg-white text-left">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-[1000] italic uppercase tracking-tighter leading-none flex items-center gap-3">
            Manajemen <span className="text-[#b89b6d]">Produk</span> <ChefHat size={32} className="text-slate-200" />
          </h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">
            Control your stock, variants, and flash sale strategies
          </p>
        </div>
        
        {activeTab !== 'Promo Campaign' && (
          <button 
            onClick={() => ['Flash Sale', 'Promo Bundle'].includes(activeTab) ? setIsPromoModalOpen(true) : setIsModalOpen(true)} 
            className="bg-black text-white px-8 py-5 rounded-[25px] font-black text-[11px] uppercase shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
          >
            {['Flash Sale', 'Promo Bundle'].includes(activeTab) ? (
              <><Zap size={16} className="text-orange-400 fill-orange-400" /> Buat Promo Baru</>
            ) : (
              <><Plus size={16} /> Tambah Menu Baru</>
            )}
          </button>
        )}
      </div>

      {/* TABS */}
      <div className="flex gap-8 mb-10 border-b border-slate-100 overflow-x-auto no-scrollbar scroll-smooth">
        {['Semua', 'Aktif', 'Habis', 'Flash Sale', 'Promo Bundle', 'Promo Campaign'].map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`pb-5 text-[11px] font-black uppercase tracking-widest relative whitespace-nowrap transition-colors ${activeTab === tab ? 'text-[#b89b6d]' : 'text-slate-300 hover:text-slate-500'}`}
          >
            <span className="flex items-center gap-2">
              {tab === 'Promo Campaign' && <Megaphone size={14} className={activeTab === tab ? 'text-[#b89b6d]' : 'text-slate-300'}/>}
              {tab}
            </span>
            {activeTab === tab && (
              <motion.div layoutId="activeTabUnderline" className="absolute bottom-0 left-0 w-full h-1.5 bg-[#b89b6d] rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* CONTENT GRID */}
      <AnimatePresence mode="wait">
        {activeTab === 'Promo Campaign' ? (
          <motion.div 
            key="campaign-grid"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {campaigns.length === 0 ? (
              <div className="col-span-full py-20 text-center text-slate-300 font-bold uppercase tracking-widest">Belum ada Campaign Aktif dari Admin.</div>
            ) : campaigns.map(c => {
               const hasJoined = promos.some(p => p.campaign_id === c.id)

               return (
                 <div key={c.id} className="bg-white border border-slate-100 rounded-[45px] overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col h-full group">
                   <div className="h-44 w-full bg-slate-100 overflow-hidden relative">
                     <img src={c.banner_url} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                     <div className="absolute top-4 left-4 bg-black text-white px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-md flex items-center gap-1.5">
                       <Megaphone size={12} className="text-[#b89b6d]"/> NyamNow Event
                     </div>
                   </div>
                   <div className="p-8 flex flex-col flex-1">
                     <h3 className="font-[1000] text-xl uppercase italic tracking-tighter text-black leading-tight mb-2">{c.title}</h3>
                     <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                       <Calendar size={12}/>
                       <span>{new Date(c.start_at).toLocaleDateString('id-ID')} - {new Date(c.end_at).toLocaleDateString('id-ID')}</span>
                     </div>

                     <div className="mt-auto">
                       {hasJoined ? (
                         <div className="w-full bg-green-50 text-green-600 font-black text-xs uppercase tracking-widest py-4 rounded-2xl flex justify-center items-center gap-2 border border-green-100">
                           <CheckCircle2 size={16}/> Sudah Bergabung
                         </div>
                       ) : (
                         <button 
                           onClick={() => {
                             setSelectedCampaignId(c.id);
                             setIsPromoModalOpen(true);
                           }} 
                           className="w-full bg-[#B89B6D] hover:bg-black text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95"
                         >
                           Join Event
                         </button>
                       )}
                     </div>
                   </div>
                 </div>
               )
            })}
          </motion.div>
        ) : ['Flash Sale', 'Promo Bundle'].includes(activeTab) ? (
          <motion.div 
            key="promo-grid"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {promos.filter(p => activeTab === 'Flash Sale' ? p.type === 'flash_sale' : p.type === 'promo').map(p => {
              const isExpired = new Date(p.end_at) < new Date();
              const discountPercent = p.products && p.products.price > 0 ? Math.round((1 - (p.discount_price / p.products.price)) * 100) : 0;

              return (
                <div key={p.id} className="bg-white border border-slate-100 rounded-[45px] overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col h-full">
                  <div className="h-52 overflow-hidden relative">
                    <img 
                      src={p.type === 'flash_sale' ? p.products?.image_url : (p.promo_image_url || p.products?.image_url)} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      alt="Promo" 
                    />
                    
                    {/* BADGE TIPE PROMO KIRI ATAS */}
                    <div className={`absolute top-5 left-5 px-4 py-2 rounded-full text-[9px] font-black text-white uppercase italic shadow-lg z-10 ${p.type === 'flash_sale' ? 'bg-orange-600' : 'bg-black'}`}>
                      {p.type.replace('_', ' ')}
                    </div>

                    {p.campaign_id && (
                      <div className="absolute top-5 right-5 px-3 py-2 rounded-full bg-[#b89b6d] shadow-lg flex items-center gap-1.5 z-10 border-2 border-white/50 backdrop-blur-md" title="Tergabung dalam Campaign NyamNow">
                        <Megaphone size={12} className="text-white animate-pulse"/>
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">Event</span>
                      </div>
                    )}

                    {p.type === 'flash_sale' && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-orange-600/90 to-transparent p-5 pt-12">
                         <div className="flex items-center gap-2 text-white">
                            <Timer size={14} className="animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                              {isExpired ? 'Promo Berakhir' : `Ends: ${new Date(p.end_at).toLocaleDateString('id-ID')}`}
                            </span>
                         </div>
                      </div>
                    )}
                  </div>

                  <div className="p-8 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <h3 className="font-[1000] uppercase italic tracking-tighter text-xl leading-[0.9] text-black">
                        {p.title || p.products?.name}
                      </h3>
                      
                      {/*TOMBOL HAPUS & EDIT */}
                      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl flex-shrink-0">
                        <button onClick={() => alert('Fitur Edit Promo segera kita buat!')} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-white rounded-xl transition-all shadow-sm" title="Edit Promo">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDeletePromo(p.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-xl transition-all shadow-sm" title="Hapus Promo">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {p.description && (
                      <p className="text-[11px] font-medium text-slate-400 leading-relaxed mb-5 line-clamp-2 italic">
                        {p.description}
                      </p>
                    )}

                    <div className="mt-auto">
                      {p.type === 'flash_sale' ? (
                        <div className="bg-orange-50 p-5 rounded-[30px] border border-orange-100 mb-6">
                          <div className="flex items-center gap-2 mb-1">
                             <span className="text-[10px] text-slate-400 line-through font-bold italic">Rp {p.products?.price.toLocaleString()}</span>
                             <span className="bg-orange-200 text-orange-700 text-[8px] font-black px-2 py-0.5 rounded">SAVE {discountPercent}%</span>
                          </div>
                          <p className="text-2xl font-[1000] text-orange-600 italic tracking-tighter leading-none">
                            Rp {p.discount_price?.toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <div className="bg-blue-50 p-5 rounded-[30px] mb-6 border border-blue-100 flex items-center justify-between">
                          <div>
                             <p className="text-[11px] font-[1000] text-blue-600 uppercase italic leading-none">Beli {p.buy_qty} Gratis {p.get_qty}</p>
                             <p className="text-[8px] font-black text-blue-400 uppercase mt-1">Bundle Deal</p>
                          </div>
                          {p.can_repeat && (
                            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200" title="Bisa Repeat Order">
                              <RefreshCcw size={14} className="animate-spin-slow" />
                            </div>
                          )}
                        </div>
                      )}

                      <div className="pt-5 border-t border-dashed border-slate-100 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <div className="flex items-center gap-2">
                          <Calendar size={12} className="text-[#b89b6d]"/>
                          <span>Start: {new Date(p.start_at).toLocaleDateString('id-ID')}</span>
                        </div>
                        <span className={p.can_repeat ? "text-green-500" : "text-slate-300"}>
                          {p.can_repeat ? 'Unlimited' : 'Single Use'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div 
            key="menu-grid"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {menus.filter(m => activeTab === 'Aktif' ? m.stock > 0 : activeTab === 'Habis' ? m.stock === 0 : true).map(m => {
               const groupCount = m.variants?.length || 0;

               return (
                 <div key={m.id} className="bg-white border border-slate-100 rounded-[45px] p-5 flex flex-col gap-4 shadow-sm hover:shadow-xl hover:border-orange-100 transition-all group relative">
                    <div className="flex gap-5">
                      <div className="w-28 h-28 bg-slate-50 rounded-[35px] bg-center bg-cover border border-slate-100 flex-shrink-0 group-hover:scale-105 transition-all duration-500" 
                           style={{ backgroundImage: `url(${m.image_url})` }} />
                      
                      <div className="flex flex-col justify-between flex-1 py-1">
                        <div className="flex justify-between items-start">
                          <div className="max-w-[130px]">
                            <h3 className="font-[1000] text-[15px] uppercase tracking-tighter leading-tight truncate italic">{m.name}</h3>
                            <p className="text-[12px] font-black text-[#b89b6d] mt-1 italic">Rp {m.price.toLocaleString()}</p>
                          </div>
                          <button onClick={() => { setSelectedMenu(m); setIsEditModalOpen(true); }} 
                                  className="p-3 bg-slate-50 text-slate-400 hover:bg-black hover:text-white rounded-2xl transition-all shadow-sm">
                            <Edit2 size={14}/>
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ${m.stock > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            Stok: {m.stock}
                          </div>
                          <div className="px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[8px] font-black uppercase tracking-tighter">
                            {m.category}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-dashed border-slate-100">
                      <div className="flex items-center gap-3 px-1">
                        <div className="p-2 bg-orange-50 text-orange-500 rounded-xl"><Clock size={14} /></div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Cook Time</p>
                          <p className="text-[11px] font-[1000] text-slate-700 italic">{m.estimated_time || 0} <span className="text-[9px]">Mins</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 px-1 border-l border-slate-100">
                        <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><Sparkles size={14} /></div>
                        <div>
                          <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">Variants</p>
                          <p className="text-[11px] font-[1000] text-slate-700 italic">{groupCount} <span className="text-[9px]">Grup</span></p>
                        </div>
                      </div>
                    </div>

                    {m.flavors && m.flavors.length > 0 && (
                      <div className="flex gap-1 overflow-x-auto no-scrollbar pt-1">
                        {m.flavors.slice(0, 3).map((f, i) => (
                          <span key={i} className="text-[7px] font-black text-slate-300 uppercase italic tracking-widest bg-slate-50 px-2 py-0.5 rounded-md">#{f}</span>
                        ))}
                      </div>
                    )}
                 </div>
               )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS */}
      {isModalOpen && storeId && (
        <AddMenuModal storeId={storeId} onClose={() => setIsModalOpen(false)} onRefresh={fetchMenus} />
      )}
      
      {isEditModalOpen && selectedMenu && (
        <EditMenuModal menu={selectedMenu} onClose={() => setIsEditModalOpen(false)} onRefresh={fetchMenus} />
      )}
      
      {isPromoModalOpen && (
        <AddPromoModal 
          menus={menus} 
          onClose={handleClosePromoModal} 
          onSave={handleSavePromo} 
          isCampaignMode={!!selectedCampaignId}
        />
      )}
    </div>
  )
}