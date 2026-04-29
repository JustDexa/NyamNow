'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2, User, Info } from 'lucide-react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import Swal from 'sweetalert2'

export default function RegisterBuyerPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1 States
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Step 2 States
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')

  const isPasswordValid = (pass: string) => {
    const hasNumber = /\d/.test(pass);
    const isLongEnough = pass.length >= 8;
    return hasNumber && isLongEnough;
  }

  // Custom Alert Function biar konsisten
  const toast = (title: string, text: string, icon: 'success' | 'error' | 'warning') => {
    Swal.fire({
      title: title.toUpperCase(),
      text: text,
      icon: icon,
      background: '#ffffff',
      color: '#000000',
      confirmButtonColor: icon === 'success' ? '#b89b6d' : '#000000',
      confirmButtonText: 'OKE SIAP',
      customClass: {
        popup: `rounded-[30px] border-4 ${icon === 'success' ? 'border-[#b89b6d]' : 'border-black'}`,
        title: 'font-black italic tracking-tighter',
        confirmButton: 'rounded-full px-10 py-3 font-black text-[10px] uppercase tracking-widest'
      }
    })
  }

  const handleNextStep = () => {
    if (!email || !password || !confirmPassword) {
      toast('Waduh!', 'Isi semua field dulu dong Brok!', 'warning')
      return
    }
    if (!isPasswordValid(password)) {
      toast('Kurang Kuat!', 'Password minimal 8 karakter dan harus ada angka!', 'error')
      return
    }
    if (password !== confirmPassword) {
      toast('Gak Match!', 'Konfirmasi password lo beda sama yang pertama!', 'error')
      return
    }
    setStep(2)
  }

  const handleRegister = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) throw error

      if (data.user) {
        const { error: insertError } = await supabase.from('users').insert([{
          id: data.user.id,
          email: data.user.email,
          role: 'buyer',
          first_name: firstName,
          last_name: lastName,
          username: username,
          phone: '+62' + phone,
          birth_date: birthDate,
        }])
        
        if (insertError) throw insertError
        
        // Success Alert
        Swal.fire({
          title: 'BERHASIL REGISTRASI!',
          text: 'Akun anda udah aktif. Sekarang tinggal login dan cari makan!',
          icon: 'success',
          background: '#ffffff',
          confirmButtonColor: '#b89b6d',
          confirmButtonText: 'GAS LOGIN',
          customClass: {
            popup: 'rounded-[30px] border-4 border-[#b89b6d]',
            title: 'font-black italic tracking-tighter',
            confirmButton: 'rounded-full px-10 py-3 font-black text-[10px] uppercase tracking-widest'
          }
        }).then(() => {
          router.push('/login')
        })
      }
    } catch (err: unknown) {
      toast('Gagal!', err instanceof Error ? err.message : 'Terjadi kesalahan teknis', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f4f4] flex items-center justify-center p-6 font-sans text-black">
      <div className="bg-white w-full max-w-[1000px] rounded-[40px] shadow-2xl flex flex-col md:flex-row overflow-hidden min-h-[650px]">
        
        {/* SISI KIRI: FORM SECTION */}
        <div className="flex-[1.2] p-10 md:p-16 flex flex-col justify-center bg-white relative">
          
          <div className="flex gap-2 mb-8 justify-center md:justify-start">
            <div className={`h-1.5 rounded-full transition-all duration-500 ${step === 1 ? 'w-12 bg-black' : 'w-6 bg-slate-200'}`}></div>
            <div className={`h-1.5 rounded-full transition-all duration-500 ${step === 2 ? 'w-12 bg-[#b89b6d]' : 'w-6 bg-slate-200'}`}></div>
          </div>

          <h1 className="text-4xl font-black text-black uppercase italic tracking-tighter mb-2 text-left">
            {step === 1 ? 'Buat Akun' : 'Data Diri'}
          </h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-10 text-left">
            {step === 1 ? 'Langkah awal pemburu kuliner' : 'Lengkapi profil pembeli lo'}
          </p>

          <div className="max-w-[400px]">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="space-y-5"
                >
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic tracking-widest">Alamat Email</label>
                    <input
                      type="email" placeholder="contoh: budi@gmail.com"
                      className="w-full bg-[#f0f0f0] border-none p-4 rounded-xl text-sm font-bold outline-none text-slate-700 placeholder:text-slate-400 focus:text-black focus:bg-[#e8e8e8] transition-all"
                      onChange={(e) => setEmail(e.target.value)} value={email || ''}
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic tracking-widest">Password</label>
                    <input
                      type="password" placeholder="Min. 8 karakter & angka"
                      className="w-full bg-[#f0f0f0] border-none p-4 rounded-xl text-sm font-bold outline-none text-slate-700 placeholder:text-slate-400 focus:text-black focus:bg-[#e8e8e8] transition-all"
                      onChange={(e) => setPassword(e.target.value)} value={password || ''}
                    />
                    {password && !isPasswordValid(password) && (
                      <p className="text-[9px] text-red-500 font-bold uppercase mt-1 ml-1 flex items-center gap-1 italic">
                        <Info size={10} /> Minimal 8 karakter & ada angka!
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 italic tracking-widest">Konfirmasi Password</label>
                    <input
                      type="password" placeholder="Ulangi password tadi"
                      className={`w-full border-none p-4 rounded-xl text-sm font-bold outline-none transition-all ${
                        confirmPassword && password !== confirmPassword 
                        ? 'bg-red-50 text-red-600' 
                        : 'bg-[#f0f0f0] text-slate-700 focus:text-black'
                      }`}
                      onChange={(e) => setConfirmPassword(e.target.value)} value={confirmPassword || ''}
                    />
                  </div>

                  <button
                    onClick={handleNextStep}
                    className="w-full bg-black text-white p-5 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-zinc-800 transition-all shadow-lg flex items-center justify-center gap-2 mt-4"
                  >
                    LANJUTKAN <ArrowRight size={16} />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="grid grid-cols-2 gap-4 text-left"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nama Depan</label>
                    <input 
                      placeholder="Budi" 
                      className="w-full bg-[#f0f0f0] border-none p-4 rounded-xl text-sm font-bold outline-none text-slate-700 focus:text-black" 
                      onChange={(e) => setFirstName(e.target.value)} value={firstName || ''}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nama Belakang</label>
                    <input 
                      placeholder="Santoso" 
                      className="w-full bg-[#f0f0f0] border-none p-4 rounded-xl text-sm font-bold outline-none text-slate-700 focus:text-black" 
                      onChange={(e) => setLastName(e.target.value)} value={lastName || ''}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Username Unik</label>
                    <input 
                      placeholder="budisans_22" 
                      className="w-full bg-[#f0f0f0] border-none p-4 rounded-xl text-sm font-bold outline-none text-slate-700 focus:text-black" 
                      onChange={(e) => setUsername(e.target.value)} value={username || ''}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nomor Telepon</label>
                    <div className="flex items-center bg-[#f0f0f0] rounded-xl overflow-hidden">
                      <span className="pl-4 text-sm font-black text-slate-500">+62</span>
                      <input 
                        placeholder="812345678" 
                        className="w-full bg-transparent border-none p-4 text-sm font-bold outline-none text-slate-700 focus:text-black" 
                        onChange={(e) => setPhone(e.target.value)} value={phone || ''}
                      />
                    </div>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tanggal Lahir</label>
                    <input 
                      type="date" 
                      className="w-full bg-[#f0f0f0] border-none p-4 rounded-xl text-sm font-bold outline-none uppercase text-slate-700 focus:text-black" 
                      onChange={(e) => setBirthDate(e.target.value)} value={birthDate || ''}
                    />
                  </div>
                  
                  <div className="col-span-2 flex gap-3 pt-4">
                    <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 text-slate-500 p-4 rounded-xl font-black text-[10px] uppercase hover:bg-slate-200 transition-all">KEMBALI</button>
                    <button onClick={handleRegister} disabled={loading} className="flex-[2] bg-[#333333] text-white p-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2">
                      {loading ? 'SABAR...' : 'DAFTAR SEKARANG'} <CheckCircle2 size={16} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* SISI KANAN */}
        <div className="hidden md:flex flex-1 bg-[#b89b6d] relative flex-col items-center justify-center p-12 overflow-hidden text-slate-900">
          <div className="absolute top-0 left-0 w-24 h-full bg-white rounded-r-[120px] -ml-1"></div>
          <div className="relative z-10 text-center space-y-6 md:translate-x-8">
            <div className="w-20 h-20 bg-slate-900/10 rounded-[30px] flex items-center justify-center mx-auto border border-slate-900/20">
              <User size={40} className="text-slate-900" />
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Punya Akun?</h2>
            <p className="text-[11px] font-bold text-slate-800/80 leading-relaxed uppercase tracking-tight max-w-[220px] mx-auto">Masuk sekarang biar nggak ketinggalan promo makanan favoritmu!</p>
            <Link href="/login" className="inline-block border-2 border-slate-900 text-slate-900 px-12 py-3 rounded-full font-black text-[10px] hover:bg-slate-900 hover:text-[#b89b6d] transition-all uppercase tracking-[0.2em]">Log In</Link>
          </div>
        </div>

      </div>
    </div>
  )
}