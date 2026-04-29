'use client'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Store, ArrowRight, ChevronLeft } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-sans overflow-hidden bg-white relative">
      
      {/* SISI KIRI: DAFTAR SEBAGAI PEMBELI */}
      <button 
        onClick={() => router.push('/register/buyer')}
        className="group relative flex-1 bg-white flex flex-col items-center justify-center p-12 transition-all duration-700 hover:flex-[1.5] border-r border-slate-50"
      >
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-slate-50 rounded-[30px] flex items-center justify-center group-hover:bg-black group-hover:rotate-12 transition-all duration-500 shadow-sm">
            <ShoppingBag size={32} className="text-slate-800 group-hover:text-white transition-colors" />
          </div>
          
          <div className="text-center">
            <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Pembeli</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">
              Cari & Pesan Kuliner Terbaik
            </p>
          </div>

          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-300 group-hover:text-black transition-all mt-2">
            Daftar Sekarang <ArrowRight size={12} className="group-hover:translate-x-2 transition-transform" />
          </div>
        </div>

        {/* Text Latar (Background Text) */}
        <span className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[100px] font-black text-slate-50 select-none -z-0 group-hover:text-slate-100 transition-colors hidden md:block">
          BUYER
        </span>
      </button>

      {/* SISI KANAN: DAFTAR SEBAGAI PENJUAL */}
      <button 
        onClick={() => router.push('/register/seller')}
        className="group relative flex-1 bg-[#b89b6d] flex flex-col items-center justify-center p-12 transition-all duration-700 hover:flex-[1.5] overflow-hidden"
      >
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-[30px] flex items-center justify-center group-hover:bg-white group-hover:-rotate-12 transition-all duration-500 border border-white/30">
            <Store size={32} className="text-white group-hover:text-[#b89b6d] transition-colors" />
          </div>
          
          <div className="text-center">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Penjual</h2>
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-[0.2em] mt-2">
              Kelola & Buka Toko Anda
            </p>
          </div>

          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-all mt-2">
            Buka Toko <ArrowRight size={12} className="group-hover:translate-x-2 transition-transform" />
          </div>
        </div>

        {/* Text Latar (Background Text) */}
        <span className="absolute top-10 left-1/2 -translate-x-1/2 text-[100px] font-black text-white/5 select-none -z-0 group-hover:text-white/10 transition-colors hidden md:block">
          SELLER
        </span>
      </button>

      {/* TOMBOL KEMBALI (DI BAWAH TENGAH) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
        <button 
          onClick={() => router.push('/login')}
          className="flex items-center gap-2 bg-black/10 backdrop-blur-md hover:bg-black text-black hover:text-white px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 border border-black/5 hover:border-black shadow-lg"
        >
          <ChevronLeft size={14} />
          Kembali ke Login
        </button>
      </div>

    </div>
  )
}