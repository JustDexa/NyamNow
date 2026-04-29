'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // 🔥 Ambil role dengan pengecekan null yang aman
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
        } else {
          router.push('/')
        }
      }
    } catch (err: unknown) {
      // ✅ Solusi 'Unexpected any': Cek apakah err itu instance dari Error
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
              className="w-full bg-[#f0f0f0] border-none p-4 rounded-xl text-sm outline-none font-bold text-slate-700"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            <input
              type="password"
              placeholder="Password"
              className="w-full bg-[#f0f0f0] border-none p-4 rounded-xl text-sm outline-none font-bold text-slate-700"
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex flex-col gap-3 px-1">
               <button type="button" className="text-[11px] text-gray-400 self-start font-bold hover:text-black transition-colors uppercase italic">
                 Lupa Password?
               </button>
               <label className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-tight cursor-pointer">
                 <input type="checkbox" className="rounded-sm border-gray-300 w-3 h-3 accent-black" required />
                 Saya setuju dengan <span className="text-black underline">Syarat & Ketentuan</span>
               </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#333333] text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 mt-4"
            >
              {loading ? 'MEMPROSES...' : 'MASUK SEKARANG'}
            </button>
          </form>
        </div>

        {/* SISI KANAN: PANEL DAFTAR (WARNA GOLD) */}
        {/* SISI KANAN: PANEL DAFTAR (WARNA GOLD) */}
<div className="flex-1 bg-[#b89b6d] relative flex flex-col items-center justify-center p-12 overflow-hidden">
  {/* Efek Lengkung Besar */}
  <div className="absolute top-0 left-0 w-24 h-full bg-white rounded-r-[120px] hidden md:block -ml-1"></div>

  {/* Konten digeser sedikit ke kanan dengan pl-10 atau translate-x-4 */}
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
    </div>
  )
}