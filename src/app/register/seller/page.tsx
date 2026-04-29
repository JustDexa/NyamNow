'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, Store, ShoppingBag, CheckCircle2 } from 'lucide-react'

export default function SellerTypePage() {
  const router = useRouter()
  const [showInfo, setShowInfo] = useState<{ open: boolean; type: 'mikro' | 'berkembang' | null }>({
    open: false,
    type: null
  })

  const details = {
    mikro: {
      title: "UMKM Mikro",
      desc: "Cocok untuk usaha gerobak, stand kantin, atau jualan rumahan yang butuh sistem simpel.",
      features: ["Sistem Kasir (POS) Simpel", "Kelola Stok Digital", "Tanpa Biaya Langganan", "Laporan Penjualan Harian"]
    },
    berkembang: {
      title: "UMKM Berkembang",
      desc: "Untuk kafe, resto, atau butik yang butuh manajemen meja, reservasi, dan tim yang lebih besar.",
      features: ["Manajemen Meja & Reservasi", "Multi-Admin / Karyawan", "Sistem Promo & Flash Sale", "Analitik Bisnis Mendalam"]
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center p-6 text-black">
      {/* HEADER */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-[1000] text-[#2D3663] italic uppercase tracking-tighter">Pilih Jenis Usaha Anda</h1>
        <p className="text-slate-400 font-bold text-sm mt-2 uppercase tracking-widest italic">Silahkan pilih sebagai apa anda ingin bergabung</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 w-full max-w-5xl justify-center items-stretch">
        
        {/* CARD MIKRO (BIRU) */}
        <motion.div 
          whileHover={{ y: -10 }}
          className="flex-1 bg-white rounded-[40px] shadow-xl shadow-blue-100/50 overflow-hidden flex flex-col border border-blue-50"
        >
          <div className="p-10 flex flex-col items-center text-center flex-1">
            <div className="w-full aspect-video bg-blue-50 rounded-[30px] mb-8 flex items-center justify-center overflow-hidden">
              <img 
                src="/images/gerobak_mikro.png" // Sesuaikan nama filenya ya, misal mikro.png atau mikro.jpg
                alt="UMKM Mikro" 
                className="w-full h-full object-contain p-6 hover:scale-110 transition-transform duration-500" 
              />
               <Store size={80} className="text-blue-500 opacity-20" />
            </div>
            <h2 className="text-2xl font-[1000] text-blue-600 uppercase italic tracking-tighter mb-4">UMKM Mikro</h2>
            <p className="text-slate-400 text-xs font-bold leading-relaxed px-4 italic uppercase">
              Untuk usaha gerobak atau stand sederhana tanpa kasir dan reservasi.
            </p>
          </div>
          <div className="p-8 pt-0 flex flex-col gap-3">
            <button 
              onClick={() => setShowInfo({ open: true, type: 'mikro' })}
              className="w-full py-4 rounded-2xl border-2 border-blue-100 text-blue-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 transition-all"
            >
              Selengkapnya <ChevronRight size={14} />
            </button>
            <button 
              onClick={() => router.push('/register/seller/form?type=mikro')}
              className="w-full py-4 rounded-2xl bg-[#2D46B9] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200"
            >
              Daftar Sekarang
            </button>
          </div>
        </motion.div>

        {/* CARD BERKEMBANG (OREN) */}
        <motion.div 
          whileHover={{ y: -10 }}
          className="flex-1 bg-white rounded-[40px] shadow-xl shadow-orange-100/50 overflow-hidden flex flex-col border border-orange-50"
        >
          <div className="p-10 flex flex-col items-center text-center flex-1">
            <div className="w-full aspect-video bg-orange-50 rounded-[30px] mb-8 flex items-center justify-center overflow-hidden">
               <img 
                src="/images/gerobak_berkembang.png" // Sesuaikan nama filenya ya, misal mikro.png atau mikro.jpg
                alt="UMKM Mikro" 
                className="w-full h-full object-contain p-6 hover:scale-110 transition-transform duration-500" 
              />
               <ShoppingBag size={80} className="text-orange-500 opacity-20" />
            </div>
            <h2 className="text-2xl font-[1000] text-orange-600 uppercase italic tracking-tighter mb-4">UMKM Berkembang</h2>
            <p className="text-slate-400 text-xs font-bold leading-relaxed px-4 italic uppercase">
              Untuk usaha yang membutuhkan sistem kasir dan manajemen reservasi.
            </p>
          </div>
          <div className="p-8 pt-0 flex flex-col gap-3">
            <button 
              onClick={() => setShowInfo({ open: true, type: 'berkembang' })}
              className="w-full py-4 rounded-2xl border-2 border-orange-100 text-orange-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-50 transition-all"
            >
              Selengkapnya <ChevronRight size={14} />
            </button>
            <button 
              onClick={() => router.push('/register/seller/form?type=berkembang')}
              className="w-full py-4 rounded-2xl bg-[#C16D1F] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-200"
            >
              Daftar Sekarang
            </button>
          </div>
        </motion.div>

      </div>

      {/* MODAL POPUP (SELENGKAPNYA) */}
      <AnimatePresence>
        {showInfo.open && showInfo.type && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowInfo({ open: false, type: null })}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setShowInfo({ open: false, type: null })}
                className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>

              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${showInfo.type === 'mikro' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                {showInfo.type === 'mikro' ? <Store size={28} /> : <ShoppingBag size={28} />}
              </div>

              <h3 className="text-2xl font-[1000] italic uppercase tracking-tighter mb-2">
                {details[showInfo.type].title}
              </h3>
              <p className="text-slate-500 text-sm font-medium mb-8">
                {details[showInfo.type].desc}
              </p>

              <div className="space-y-4 mb-8">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Fitur Utama :</p>
                {details[showInfo.type].features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 size={18} className={showInfo.type === 'mikro' ? 'text-blue-500' : 'text-orange-500'} />
                    <span className="text-xs font-bold text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => router.push(`/register/seller/form?type=${showInfo.type}`)}
                className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95 ${showInfo.type === 'mikro' ? 'bg-blue-600 shadow-blue-200' : 'bg-orange-600 shadow-orange-200'}`}
              >
                Gas Pilih {details[showInfo.type].title}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}