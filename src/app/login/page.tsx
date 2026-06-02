'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [showTerms, setShowTerms] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data?.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single()

        if (userError || !userData) {
          alert('User tidak ditemukan di database')
          return
        }

        if (userData.role === 'seller') {
          router.push('/dashboard/seller')
        } else if (userData.role === 'buyer') {
          router.push('/dashboard/buyer')
        } else if (userData.role === 'admin') {
          router.push('/dashboard/admin')
        } else {
          router.push('/')
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message)
      } else {
        alert('Terjadi kesalahan yang tidak diketahui')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] flex items-center justify-center p-6 font-sans">
      <div className="bg-white w-full max-w-[900px] rounded-[40px] shadow-xl flex flex-col md:flex-row overflow-hidden min-h-[550px]">
        
        {/* SISI KIRI: FORM LOGIN */}
        <div className="flex-1 p-12 flex flex-col justify-center bg-white">
          <h1 className="text-4xl font-black text-center mb-10 text-black uppercase italic tracking-tighter">Masuk</h1>
          
          <form onSubmit={handleLogin} className="space-y-4 max-w-[320px] mx-auto w-full">
            <input
              type="email"
              placeholder="Email"
              className="w-full bg-[#f0f0f0] border-none p-4 rounded-xl text-sm outline-none font-bold text-slate-700 focus:ring-2 focus:ring-[#b89b6d] transition-all"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <input
              type="password"
              placeholder="Password"
              className="w-full bg-[#f0f0f0] border-none p-4 rounded-xl text-sm outline-none font-bold text-slate-700 focus:ring-2 focus:ring-[#b89b6d] transition-all"
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {/*Tombol Lupa Password Dihapus, diganti Modal S&K */}
            <div className="flex flex-col gap-3 px-1 pt-2">
               <label className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-tight cursor-pointer">
                 <input type="checkbox" className="rounded-sm border-gray-300 w-3 h-3 accent-black" required />
                 <span>
                   Saya setuju dengan{' '}
                   <span 
                     onClick={(e) => {
                       e.preventDefault(); // Biar checkbox-nya nggak ikut kepencet pas klik tulisan
                       setShowTerms(true);
                     }}
                     className="text-black underline hover:text-[#b89b6d] transition-colors"
                   >
                     Syarat & Ketentuan
                   </span>
                 </span>
               </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#333333] text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 mt-4 disabled:opacity-50"
            >
              {loading ? 'MEMPROSES...' : 'MASUK SEKARANG'}
            </button>
          </form>
        </div>

        {/* SISI KANAN: PANEL DAFTAR */}
        <div className="flex-1 bg-[#b89b6d] relative flex flex-col items-center justify-center p-12 overflow-hidden">
          <div className="absolute top-0 left-0 w-24 h-full bg-white rounded-r-[120px] hidden md:block -ml-1"></div>
          <div className="relative z-10 text-center space-y-5 max-w-[280px] md:translate-x-6">
            <h2 className="text-3xl font-black italic text-slate-900 uppercase tracking-tighter leading-none">
              Belum Punya Akun?
            </h2>
            <p className="text-[12px] font-bold text-slate-800/80 leading-relaxed uppercase tracking-tight">
              Daftar sekarang untuk menikmati fitur lengkap dan mulai berburu kuliner UMKM terbaik.
            </p>
            <Link 
              href="/register"
              className="inline-block border-2 border-slate-900 text-slate-900 px-12 py-3 rounded-full font-black text-[10px] hover:bg-slate-900 hover:text-[#b89b6d] transition-all uppercase tracking-[0.2em] mt-6"
            >
              Daftar Disini
            </Link>
          </div>
        </div>
      </div>

      {/*MODAL SYARAT & KETENTUAN */}
      <AnimatePresence>
        {showTerms && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative max-h-[80vh] flex flex-col text-left"
            >
              <button 
                onClick={() => setShowTerms(false)}
                className="absolute top-5 right-5 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X size={18} />
              </button>
              
              <h2 className="text-2xl font-black text-gray-900 mb-6 uppercase italic tracking-tighter border-b border-gray-100 pb-4">
                Syarat & Ketentuan NyamNow
              </h2>
              
              <div className="overflow-y-auto no-scrollbar flex-1 pr-2 space-y-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-black text-gray-900 text-xs uppercase tracking-widest mb-1">1. Penggunaan Layanan</h4>
                  <p>Dengan mendaftar, Anda setuju untuk menggunakan aplikasi NyamNow sesuai dengan hukum dan peraturan yang berlaku di Indonesia.</p>
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-xs uppercase tracking-widest mb-1">2. Transaksi & Pembayaran</h4>
                  <p>Semua transaksi pembayaran diproses melalui gerbang pembayaran demo. NyamNow tidak menyimpan data sensitif perbankan Anda secara langsung.</p>
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-xs uppercase tracking-widest mb-1">3. Kebijakan Privasi</h4>
                  <p>Kami menjaga privasi Anda. Data pribadi yang Anda berikan hanya digunakan untuk keperluan operasional pesanan, pengiriman, dan pengalaman pengguna dalam platform NyamNow.</p>
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-xs uppercase tracking-widest mb-1">4. Hak Cipta</h4>
                  <p>Seluruh aset, logo, dan konten yang ada di dalam aplikasi ini adalah hak milik intelektual platform NyamNow dan tidak boleh disalin tanpa izin.</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <button 
                  onClick={() => setShowTerms(false)}
                  className="w-full bg-[#B89B6D] hover:bg-[#a08055] text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[11px] transition-all shadow-md active:scale-95"
                >
                  Saya Mengerti
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}