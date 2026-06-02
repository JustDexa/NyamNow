/* eslint-disable @next/next/no-img-element */
'use client'
import { useState, useMemo, useRef } from 'react'
import { X, UploadCloud, AlignLeft, RefreshCcw, Clock, Info, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

export interface Product {
  id: string; name: string; price: number; image_url: string;
}

export interface PromoData {
  type: 'flash_sale' | 'promo'
  title?: string
  description?: string
  product_id: string
  buy_qty?: number
  get_qty?: number
  discount_price?: number
  start_at: string
  end_at: string
  can_repeat: boolean
  promo_image_url?: string 
}

interface AddPromoModalProps {
  menus: Product[]; 
  onClose: () => void; 
  onSave: (data: PromoData) => void;
  isCampaignMode?: boolean; 
}

export default function AddPromoModal({ menus, onClose, onSave, isCampaignMode = false }: AddPromoModalProps) {
  const [promoType, setPromoType] = useState<'flash_sale' | 'promo'>(isCampaignMode ? 'promo' : 'promo')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // State untuk Bundle (Promo)
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  
  // State Khusus Flash Sale
  const [fsDate, setFsDate] = useState('')
  const [fsSessions, setFsSessions] = useState<number[]>([])

  const [canRepeat, setCanRepeat] = useState(false)
  const [fsMenuId, setFsMenuId] = useState('')
  const [fsDiscountPrice, setFsDiscountPrice] = useState('') 
  const [promoTitle, setPromoTitle] = useState('')
  const [promoDescription, setPromoDescription] = useState('')
  const [selectedBuyMenu, setSelectedBuyMenu] = useState('')
  const [buyQty, setBuyQty] = useState('2')
  const [getQty, setGetQty] = useState('1')
  const [promoPreview, setPromoPreview] = useState('')

  const selectedProduct = useMemo(() => {
    const id = promoType === 'promo' ? selectedBuyMenu : fsMenuId
    return menus.find(m => m.id === id)
  }, [promoType, selectedBuyMenu, fsMenuId, menus])

  const toggleFsSession = (session: number) => {
    setFsSessions(prev => {
      if (prev.includes(session)) {
        const removed = prev.filter(s => s !== session)
        let isBolong = false;
        for (let i = 0; i < removed.length - 1; i++) {
           if (removed[i+1] - removed[i] > 1) isBolong = true;
        }
        if (isBolong) {
           alert('Sesi tidak bisa kosong ditengah!');
           return []; 
        }
        return removed;
      } else {
        const newArr = [...prev, session].sort((a, b) => a - b)
        let isBolong = false;
        for (let i = 0; i < newArr.length - 1; i++) {
           if (newArr[i+1] - newArr[i] > 1) isBolong = true;
        }
        if (isBolong) {
           alert('Pemilihan sesi harus berurutan (contoh: 19 & 20). Bila mau loncat ke 21, silahkan buat 2 promo terpisah ya!');
           return prev; 
        }
        return newArr;
      }
    })
  }

  const handleSave = () => {
    if (promoType === 'promo') {
      if (!selectedBuyMenu || !promoTitle) return alert('Lengkapi data Promo Bundle!')
      
      let startWIB = ''
      let endWIB = ''

      if (!isCampaignMode) {
        if (!startAt || !endAt) return alert('Jadwal Bundle belum diisi!')
        startWIB = `${startAt}:00+07:00`
        endWIB = `${endAt}:00+07:00`
      }
      
      onSave({ 
        type: 'promo', 
        title: promoTitle, 
        description: promoDescription, 
        product_id: selectedBuyMenu, 
        buy_qty: Number(buyQty), 
        get_qty: Number(getQty), 
        start_at: startWIB,
        end_at: endWIB,
        can_repeat: canRepeat,
        promo_image_url: promoPreview 
      })

    } else {
      if (!fsMenuId || !fsDiscountPrice) return alert('Lengkapi data Flash Sale!')
      if (!fsDate || fsSessions.length === 0) return alert('Pilih Tanggal dan minimal 1 Sesi Waktu untuk Flash Sale!')

      const earliestSession = fsSessions[0]
      const latestSession = fsSessions[fsSessions.length - 1]

      const formattedStart = `${fsDate}T${earliestSession.toString().padStart(2, '0')}:00:00+07:00`
      const formattedEnd = `${fsDate}T${(latestSession + 1).toString().padStart(2, '0')}:00:00+07:00`

      onSave({ 
        type: 'flash_sale', 
        product_id: fsMenuId, 
        discount_price: Number(fsDiscountPrice),
        start_at: formattedStart,
        end_at: formattedEnd,
        can_repeat: canRepeat
      })
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-8 pb-4 flex justify-between items-center border-b border-slate-50 text-black sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-[1000] italic uppercase tracking-tighter">BUAT STRATEGI PROMO</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-8 pt-4 space-y-6">
          {/* TOGGLE TYPE */}
          <div className="flex bg-slate-100 p-1.5 rounded-[25px] gap-2">
            <button 
              onClick={() => setPromoType('promo')} 
              className={`flex-1 py-3 rounded-full text-[10px] font-black uppercase transition-all ${promoType === 'promo' ? 'bg-black text-white shadow-lg' : 'text-slate-400'}`}
            >
              BUNDLE (BUY X GET Y)
            </button>
            <button 
              onClick={() => setPromoType('flash_sale')} 
              disabled={isCampaignMode}
              title={isCampaignMode ? "Flash Sale tidak tersedia untuk NyamNow Event Campaign" : ""}
              className={`flex-1 py-3 rounded-full flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all ${
                promoType === 'flash_sale' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-orange-500'
              } ${isCampaignMode ? 'opacity-30 cursor-not-allowed' : ''}`}
            >
              <Zap size={14} /> FLASH SALE
            </button>
          </div>

          {/* REALTIME PRICE INFO */}
          {selectedProduct && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-50 p-4 rounded-3xl border border-blue-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <img src={selectedProduct.image_url} className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm" />
                <div>
                  <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Produk Terpilih</p>
                  <p className="text-sm font-[1000] text-blue-900 uppercase italic truncate max-w-[150px]">{selectedProduct.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-blue-400 uppercase leading-none">Harga Normal</p>
                <p className="text-lg font-black italic text-blue-900">Rp {selectedProduct.price.toLocaleString()}</p>
              </div>
            </motion.div>
          )}

          {/* FORM BERDASARKAN TYPE */}
          <div className="space-y-5">
            {promoType === 'promo' ? (
              <>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1 tracking-widest flex items-center gap-2"><UploadCloud size={12}/> Banner Promo</label>
                  <div onClick={() => fileInputRef.current?.click()} className="w-full h-36 rounded-[35px] border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:border-black transition-all">
                    {promoPreview ? <img src={promoPreview} className="w-full h-full object-cover" /> : <p className="text-[10px] font-black text-slate-300 uppercase">Klik Upload Banner</p>}
                    <input type="file" ref={fileInputRef} hidden onChange={(e) => e.target.files?.[0] && setPromoPreview(URL.createObjectURL(e.target.files[0]))} />
                  </div>
                </div>

                <div className="space-y-4">
                  <input value={promoTitle} onChange={(e) => setPromoTitle(e.target.value.toUpperCase())} placeholder="NAMA PROMO (CONTOH: MINGGU KENYANG)" className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-black outline-none border-2 border-transparent focus:border-slate-100" />
                  
                  <div className="relative">
                    <AlignLeft className="absolute top-4 left-4 text-slate-300" size={16} />
                    <textarea value={promoDescription} onChange={(e) => setPromoDescription(e.target.value)} placeholder="TULIS DESKRIPSI ATAU SYARAT PROMO DI SINI..." className="w-full bg-slate-50 p-4 pl-12 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-slate-100 h-24 no-scrollbar resize-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 ml-1">JUMLAH BELI</label>
                      <input type="number" value={buyQty} onChange={(e) => setBuyQty(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-black outline-none border-2 border-transparent focus:border-black" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-orange-400 ml-1">JUMLAH GRATIS</label>
                      <input type="number" value={getQty} onChange={(e) => setGetQty(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl text-xs font-black outline-none border-2 border-transparent focus:border-orange-500 text-orange-500" />
                    </div>
                  </div>

                  <select value={selectedBuyMenu} onChange={(e) => setSelectedBuyMenu(e.target.value)} className="w-full bg-slate-100 p-4 rounded-2xl text-xs font-black outline-none appearance-none cursor-pointer">
                    <option value="">PILIH PRODUK BUNDLE...</option>
                    {menus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <>
                <select value={fsMenuId} onChange={(e) => setFsMenuId(e.target.value)} className="w-full bg-slate-100 p-4 rounded-2xl text-xs font-black outline-none appearance-none cursor-pointer">
                  <option value="">PILIH MENU UNTUK FLASH SALE...</option>
                  {menus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-orange-400 ml-1 tracking-widest">HARGA FLASH SALE (RP)</label>
                  <input type="number" value={fsDiscountPrice} onChange={(e) => setFsDiscountPrice(e.target.value)} placeholder="CONTOH: 10000" className="w-full bg-orange-50 p-5 rounded-2xl text-xl font-black outline-none border-2 border-orange-100 focus:border-orange-500 text-orange-600" />
                </div>
              </>
            )}
          </div>

          {/* SCHEDULING & RULES DINAMIS */}
          <div className="bg-slate-50 p-6 rounded-[35px] space-y-5 border border-slate-100">
            <h4 className="text-[10px] font-[1000] uppercase italic tracking-widest flex items-center gap-2">
              <Clock size={14}/> Penjadwalan & Aturan
            </h4>
            
            {promoType === 'promo' ? (
              isCampaignMode ? (
                <div className="bg-blue-50/80 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
                  <Info size={16} className="text-blue-500 flex-shrink-0" />
                  <p className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase">
                    Jadwal promo ini akan otomatis mengikuti waktu NyamNow Event Campaign. Anda tidak perlu mengaturnya secara manual.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 ml-1 uppercase">Mulai</label>
                    <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="w-full bg-white p-3 rounded-xl text-[10px] font-black outline-none shadow-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 ml-1 uppercase">Berakhir</label>
                    <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} className="w-full bg-white p-3 rounded-xl text-[10px] font-black outline-none shadow-sm" />
                  </div>
                </div>
              )
            ) : (
              // JADWAL UNTUK FLASH SALE
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-slate-400 ml-1 uppercase">Pilih Tanggal</label>
                  <input 
                    type="date" 
                    value={fsDate} 
                    onChange={(e) => setFsDate(e.target.value)} 
                    className="w-full bg-white p-4 rounded-2xl text-xs font-black outline-none border border-slate-100 shadow-sm" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[8px] font-black text-slate-400 ml-1 uppercase">Pilih Sesi Flash Sale (WIB)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[19, 20, 21].map(session => (
                      <button
                        key={session}
                        type="button"
                        onClick={() => toggleFsSession(session)}
                        className={`py-3 rounded-2xl text-[11px] font-black transition-all border-2 ${
                          fsSessions.includes(session)
                            ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105'
                            : 'bg-white border-slate-100 text-slate-400 hover:border-orange-200 hover:text-orange-400'
                        }`}
                      >
                        {session}:00
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-orange-50/80 border border-orange-100 p-4 rounded-2xl flex items-start gap-3">
                  <Info size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[9px] font-bold text-orange-700 leading-relaxed uppercase">
                    Setiap pilihan berdurasi tepat 1 jam. Anda bisa memilih lebih dari 1 sesi. Sistem otomatis menghitung rentang promo dari awal sesi pertama hingga akhir sesi terakhir yang dipilih.
                  </p>
                </div>
              </div>
            )}

            {/* REPEAT ORDER TOGGLE */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${canRepeat ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                  <RefreshCcw size={16} className={canRepeat ? 'animate-spin-slow' : ''} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase">Bisa Repeat Order?</p>
                  <p className="text-[8px] font-bold text-slate-400 leading-tight">Jika aktif, user bisa beli promo ini berkali-kali.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setCanRepeat(!canRepeat)}
                className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${canRepeat ? 'bg-green-500' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${canRepeat ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-8 bg-white border-t border-slate-50 flex gap-4 items-center">
          <button onClick={onClose} className="flex-1 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-black transition-colors">BATAL</button>
          <button onClick={handleSave} className="flex-[2] bg-black text-white py-5 rounded-2xl text-[11px] font-[1000] uppercase tracking-widest shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all">
            AKTIFKAN PROMO SEKARANG
          </button>
        </div>
      </motion.div>
    </div>
  )
}