'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useRef, ChangeEvent, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, Image as ImageIcon, X, Store, Lock } from 'lucide-react'
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop'
import { motion, AnimatePresence } from 'framer-motion'
import 'react-image-crop/dist/ReactCrop.css'

// --- MAP PICKER LOAD (SSR False karena butuh window object) ---
const MapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-800 animate-pulse rounded-[32px] flex items-center justify-center text-white/20 font-black italic">LOADING MAP...</div>
})

// Helper buat Crop
function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  )
}

function SellerFormContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const type = searchParams.get('type') || 'Umum'

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // --- STATE DATA ---
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [storeName, setStoreName] = useState('')
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)

  // --- STATE FOTO ---
  const [storeProfileImage, setStoreProfileImage] = useState<File | null>(null)
  const [profilePreview, setProfilePreview] = useState<string | null>(null)
  const [storeImages, setStoreImages] = useState<File[]>([])
  
  // --- CROP STATE ---
  const [imgSrc, setImgSrc] = useState('')
  const imgRef = useRef<HTMLImageElement>(null)
  const [crop, setCrop] = useState<Crop>() 
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [showCropModal, setShowCropModal] = useState(false)
  const aspect = 1;

  // --- STEP 4 STATE (Legal & Bank) ---
  const [ktpFile, setKtpFile] = useState<File | null>(null)
  const [ktpPreview, setKtpPreview] = useState<string | null>(null)
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  
  const profileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const ktpInputRef = useRef<HTMLInputElement>(null)

  // --- HANDLERS ---
  const onSelectProfile = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined)
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '')
        setShowCropModal(true)
      })
      reader.readAsDataURL(e.target.files[0])
    }
  }

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    setCrop(centerAspectCrop(width, height, aspect))
  }

  const getCroppedImg = () => {
    if (!completedCrop || !imgRef.current) return
    const canvas = document.createElement('canvas')
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height
    canvas.width = completedCrop.width
    canvas.height = completedCrop.height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(imgRef.current, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, completedCrop.width, completedCrop.height)
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' })
          setStoreProfileImage(file)
          setProfilePreview(URL.createObjectURL(blob))
          setShowCropModal(false)
        }
      }, 'image/jpeg')
    }
  }

  const handleRegister = async () => {
    if (password !== confirmPassword) return alert('Password tidak sama!')
    if (!latitude || !longitude) return alert('Pilih lokasi di map dulu!')
    if (!ktpFile) return alert('Mohon unggah KTP!')

    setLoading(true)
    try {
      // 1. Auth Sign Up
      const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password })
      if (authErr) throw authErr
      const userId = authData.user?.id
      if (!userId) throw new Error("Registrasi gagal, ID tidak ditemukan.")

      // 2. Upload KTP
      const ktpPath = `ktp/${userId}-${Date.now()}.jpg`
      const { error: ktpUploadErr } = await supabase.storage.from('ktp').upload(ktpPath, ktpFile)
      if (ktpUploadErr) throw ktpUploadErr
      const ktpUrl = supabase.storage.from('ktp').getPublicUrl(ktpPath).data.publicUrl

      // 3. Insert ke Tabel Users
      const { error: userInsertErr } = await supabase.from('users').insert([{ 
        id: userId, email, role: 'seller', bank_name: bankName, 
        account_number: accountNumber, account_name: storeName, ktp_url: ktpUrl 
      }])
      if (userInsertErr) throw userInsertErr

      // 4. Upload Profile Store
      let profileUrl = ''
      if (storeProfileImage) {
        const path = `profiles/${userId}-${Date.now()}.jpg`
        await supabase.storage.from('store-profile').upload(path, storeProfileImage)
        profileUrl = supabase.storage.from('store-profile').getPublicUrl(path).data.publicUrl
      }

      // 5. Insert ke Tabel Stores
      const { data: storeData, error: storeErr } = await supabase.from('stores').insert([{ 
        user_id: userId, name: storeName, description, address, 
        latitude, longitude, profile_image_url: profileUrl, 
        type: type, phone: '+62' + phone 
      }]).select()
      
      if (storeErr) throw storeErr
      const storeId = storeData?.[0].id

      // 6. Upload Gallery Images
      if (storeId && storeImages.length > 0) {
        for (const file of storeImages.slice(0, 3)) {
          const path = `gallery/${storeId}-${Date.now()}-${file.name}`
          const { error: galErr } = await supabase.storage.from('store-images').upload(path, file)
          if (!galErr) {
            const imgUrl = supabase.storage.from('store-images').getPublicUrl(path).data.publicUrl
            await supabase.from('store_images').insert([{ store_id: storeId, image_url: imgUrl }])
          }
        }
      }

      alert('Berhasil Daftar! Silakan login kembali.')
      router.push('/login')
    } catch (err: unknown) { 
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
      alert(message);
    } finally { 
      setLoading(false); 
    }
  }

  return (
    <div className="h-screen w-full flex bg-white font-sans overflow-hidden">
      
      <div className="hidden lg:flex w-[45%] h-full bg-slate-50 flex-col justify-center items-center p-16 relative">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-100 rounded-full blur-3xl opacity-50" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center relative z-10">
          <div className="bg-white p-4 rounded-3xl shadow-xl shadow-slate-200/50 mb-8 inline-block rotate-3">
            <Store className="text-[#3b5998]" size={32} />
          </div>
          <h1 className="text-5xl font-[1000] text-[#1e293b] mb-4 tracking-tighter italic uppercase leading-none">
            GABUNG <br/><span className="text-[#3b5998]">SEKARANG!</span>
          </h1>
          <p className="text-slate-400 font-bold text-sm uppercase tracking-[0.2em] italic">Mulai Bisnis Digitalmu Hari Ini</p>
        </motion.div>
        <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="relative w-full h-[400px] mt-12 drop-shadow-2xl">
          <Image src="/images/gerobak_mikro.png" alt="Hero" fill className="object-contain px-10" priority />
        </motion.div>
      </div>

      <div className="w-full lg:w-[55%] h-full bg-[#3b5998] lg:rounded-l-[80px] relative shadow-[-20px_0_60px_rgba(0,0,0,0.1)] flex flex-col">
        
        {type.toLowerCase() === 'berkembang' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 lg:p-20 text-center relative z-10">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
              <div className="bg-white/10 p-8 rounded-[40px] mb-8 border-4 border-white/20 relative">
                <Lock size={64} className="text-white opacity-90" />
                <div className="absolute -bottom-2 -right-2 bg-blue-400 w-8 h-8 rounded-full border-4 border-[#3b5998] animate-ping" />
              </div>
              <h2 className="text-5xl font-[1000] text-white uppercase italic tracking-tighter mb-4">Coming Soon</h2>
              <p className="text-blue-200 text-sm font-bold max-w-md mx-auto mb-10 leading-relaxed">
                Pendaftaran untuk tipe toko <span className="text-white font-black">Berkembang</span> dengan fitur reservasi masih dalam tahap peracikan. Sabar bentar yak!
              </p>
              <button 
                onClick={() => router.back()} 
                className="bg-white text-[#3b5998] px-10 py-5 rounded-[28px] font-black flex items-center gap-3 hover:scale-105 active:scale-95 transition-all text-[11px] uppercase tracking-widest shadow-xl"
              >
                <ArrowLeft className="w-5 h-5" /> Kembali ke Pilihan
              </button>
            </motion.div>
          </div>
        ) : (
          <>
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/10 rounded-full overflow-hidden z-20">
              <motion.div animate={{ width: `${(step/4)*100}%` }} className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-8 md:p-12 lg:p-20 flex justify-center items-start">
              <div className="max-w-md w-full py-10">
                <header className="mb-10 text-center lg:text-left">
                  <h2 className="text-4xl font-[1000] text-white uppercase italic tracking-tighter">Buat Akun</h2>
                  <div className="flex items-center gap-3 mt-2 justify-center lg:justify-start">
                    <span className="h-[2px] w-8 bg-blue-300 rounded-full" />
                    <p className="text-blue-200 text-[10px] font-black uppercase tracking-[0.3em]">Tahap {step} / 4</p>
                  </div>
                </header>

                <AnimatePresence mode="wait">
                  <motion.div 
                    key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6"
                  >
                    {step === 1 && (
                      <div className="space-y-5">
                        <InputGroup label="Email Store" value={email} onChange={setEmail} placeholder="admin@toko.com" />
                        <InputGroup label="Password" type="password" value={password} onChange={setPassword} />
                        <InputGroup label="Konfirmasi Password" type="password" value={confirmPassword} onChange={setConfirmPassword} />
                        <div className="flex justify-end pt-6"><NextButton onClick={() => setStep(2)} /></div>
                      </div>
                    )}

                    {step === 2 && (
                      <div className="space-y-5">
                        <InputGroup label="Nama Toko" value={storeName} onChange={setStoreName} />
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black text-blue-200 uppercase tracking-widest ml-2">Tentang Toko</label>
                          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="p-5 rounded-[28px] bg-white text-slate-900 text-sm h-28 outline-none focus:ring-8 focus:ring-white/10 shadow-xl transition-all resize-none font-bold" />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-blue-200 uppercase tracking-widest ml-2">Logo</label>
                            <div onClick={() => profileInputRef.current?.click()} className="relative aspect-square border-4 border-dashed border-white/20 rounded-[40px] bg-white/5 hover:bg-white/10 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center">
                              {profilePreview ? <Image src={profilePreview} alt="Logo" fill className="object-cover" /> : <ImageIcon className="w-8 h-8 text-blue-200 opacity-30" />}
                            </div>
                            <input type="file" ref={profileInputRef} hidden accept="image/*" onChange={onSelectProfile} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-blue-200 uppercase tracking-widest ml-2">Gallery</label>
                            <div className="grid grid-cols-2 gap-2">
                              {storeImages.length < 3 && (
                                <div onClick={() => galleryInputRef.current?.click()} className="aspect-square border-4 border-dashed border-white/20 rounded-3xl bg-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-all">
                                  <Upload className="w-5 h-5 text-blue-200 opacity-50" />
                                </div>
                              )}
                              {storeImages.map((f, i) => (
                                <div key={i} className="relative aspect-square rounded-3xl overflow-hidden border-2 border-white/20">
                                  <Image src={URL.createObjectURL(f)} alt="Gallery" fill className="object-cover" />
                                  <button onClick={() => setStoreImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 rounded-full p-1"><X size={10} /></button>
                                </div>
                              ))}
                            </div>
                            <input type="file" ref={galleryInputRef} hidden multiple accept="image/*" onChange={(e) => {
                              const files = e.target.files ? Array.from(e.target.files) : [];
                              if (storeImages.length + files.length > 3) return alert("Maks 3!");
                              setStoreImages(prev => [...prev, ...files]);
                            }} />
                          </div>
                        </div>
                        <div className="flex justify-between pt-6"><BackButton onClick={() => setStep(1)} /><NextButton onClick={() => setStep(3)} /></div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="space-y-5">
                        <InputGroup label="Alamat Lengkap" value={address} onChange={setAddress} />
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-blue-200 uppercase tracking-widest ml-2">Pilih Titik Map</label>
                          <div className="h-80 rounded-[40px] overflow-hidden border-8 border-white/10 shadow-2xl relative">
                            <MapPicker onSelect={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} />
                          </div>
                          {latitude && <p className="text-[8px] text-blue-200 font-bold text-center">LOKASI TERKUNCI: {latitude.toFixed(4)}, {longitude?.toFixed(4)}</p>}
                        </div>
                        <div className="flex justify-between pt-6"><BackButton onClick={() => setStep(2)} /><NextButton onClick={() => setStep(4)} /></div>
                      </div>
                    )}

                    {step === 4 && (
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-blue-200 uppercase tracking-widest ml-2">Foto KTP</label>
                          <div onClick={() => ktpInputRef.current?.click()} className="relative w-full h-52 border-4 border-dashed border-white/20 rounded-[40px] bg-white/5 hover:bg-white/10 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center">
                            {ktpPreview ? <Image src={ktpPreview} alt="KTP" fill className="object-cover" /> : <div className="text-center"><CheckCircle2 className="w-10 h-10 text-blue-200 mx-auto mb-2 opacity-20" /><p className="text-[9px] font-black uppercase text-white/50">Klik Upload KTP</p></div>}
                          </div>
                          <input type="file" ref={ktpInputRef} hidden accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setKtpFile(file);
                            if(file) { const r = new FileReader(); r.onload = () => setKtpPreview(r.result as string); r.readAsDataURL(file); }
                          }} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <InputGroup label="Bank" value={bankName} onChange={setBankName} placeholder="BCA / BRI" />
                          <InputGroup label="No Rekening" value={accountNumber} onChange={setAccountNumber} placeholder="1234..." />
                        </div>
                        <div className="flex justify-between pt-10 items-center">
                          <BackButton onClick={() => setStep(3)} />
                          <button onClick={handleRegister} disabled={loading} className="bg-white text-[#3b5998] px-10 py-5 rounded-[28px] font-black flex items-center gap-3 hover:scale-105 active:scale-95 transition-all text-[11px] uppercase tracking-widest shadow-xl">
                            {loading ? 'Sabar...' : 'Selesai'} <CheckCircle2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Modal Crop */}
            <AnimatePresence>
              {showCropModal && (
                <div className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-6 backdrop-blur-xl">
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-10 rounded-[50px] max-w-lg w-full">
                    <h3 className="font-black text-[#1e293b] uppercase italic mb-6 text-center">Crop Foto Profil</h3>
                    <div className="max-h-[50vh] overflow-hidden rounded-[32px] border-4 border-slate-100">
                      <ReactCrop crop={crop} onChange={(_, p) => setCrop(p)} onComplete={c => setCompletedCrop(c)} aspect={aspect} keepSelection>
                        <img ref={imgRef} src={imgSrc} alt="Crop" onLoad={onImageLoad} />
                      </ReactCrop>
                    </div>
                    <div className="flex justify-center mt-8 gap-4">
                      <button onClick={() => setShowCropModal(false)} className="px-6 py-4 text-slate-400 font-bold uppercase text-[10px]">Batal</button>
                      <button onClick={getCroppedImg} className="bg-[#3b5998] text-white px-10 py-4 rounded-2xl font-black uppercase text-[10px]">Simpan</button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}

export default function SellerFormPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <div className="animate-pulse text-[#3b5998] font-black tracking-widest uppercase text-sm">
          Menyiapkan Form...
        </div>
      </div>
    }>
      <SellerFormContent />
    </Suspense>
  )
}

// --- COMPONENTS ---
interface InputGroupProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
}

function InputGroup({ label, value, onChange, type = "text", placeholder }: InputGroupProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-[10px] font-black text-blue-200 uppercase tracking-widest ml-2">
        {label}
      </label>
      <input 
        type={type} 
        placeholder={placeholder} 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="p-5 rounded-[28px] bg-white text-slate-900 text-sm border-none outline-none focus:ring-8 focus:ring-white/10 shadow-xl transition-all font-bold" 
      />
    </div>
  )
}

function NextButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-white text-[#3b5998] px-12 py-5 rounded-[28px] font-black flex items-center gap-3 text-[10px] uppercase shadow-2xl hover:translate-x-2 transition-all italic tracking-widest">
      Lanjut <ArrowRight className="w-5 h-5" />
    </button>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-blue-100/60 text-[10px] font-black flex items-center gap-2 hover:text-white uppercase tracking-widest italic transition-colors">
      <ArrowLeft className="w-4 h-4" /> Kembali
    </button>
  )
}