'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRight, ChevronLeft, User, Heart, Bell, Phone, ShieldCheck,
  HelpCircle, LogOut, Camera, Check, X, Star, Store, Trash2,
  Mail, MessageCircle, FileText, BookOpen, ChevronDown, Lock, Eye, EyeOff, AlertCircle
} from 'lucide-react'
import NavbarBuyer from '@/components/NavbarBuyer'

// ─── INTERFACES ────────────────────────────────────────────────
interface UserProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  username: string
  phone: string
  profile_image_url?: string
}

interface FavStore {
  store_id: string
  stores: {
    id: string
    name: string
    address: string
    profile_image_url: string
    rating_avg: number
  }
}

interface FavProduct {
  product_id: string
  products: {
    id: string
    name: string
    price: number
    image_url: string
    store_id: string
    stores: { name: string }
  }
}

interface NotificationItem {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  reference_id: string
  is_read: boolean
  created_at: string
}

// ─── FAQ DATA ───────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'Bagaimana cara memesan makanan di NyamNow?',
    a: 'Pilih toko atau menu yang kamu suka dari halaman utama, tambahkan ke keranjang, lalu tekan Checkout. Ikuti langkah pembayaran dan pesananmu akan segera diproses oleh penjual.'
  },
  {
    q: 'Apakah saya bisa membatalkan pesanan?',
    a: 'Pesanan hanya bisa dibatalkan selama status masih "Menunggu Konfirmasi" dari penjual. Setelah penjual mengkonfirmasi, pesanan tidak dapat dibatalkan.'
  },
  {
    q: 'Metode pembayaran apa saja yang tersedia?',
    a: 'Saat ini NyamNow mendukung pembayaran tunai di tempat (COD) dan simulasi transfer. Kami terus bekerja untuk menghadirkan lebih banyak metode pembayaran digital.'
  },
  {
    q: 'Bagaimana cara memberi ulasan?',
    a: 'Setelah pesananmu berstatus "Selesai", akan muncul tombol Beri Ulasan di halaman Riwayat Pesanan. Kamu bisa memberi bintang dan komentar untuk toko tersebut.'
  },
  {
    q: 'Kenapa pesanan saya tidak dikonfirmasi?',
    a: 'Penjual memiliki waktu terbatas untuk mengkonfirmasi pesananmu. Jika melewati batas waktu, pesanan akan otomatis dibatalkan dan kamu bisa memesan ulang.'
  },
  {
    q: 'Bagaimana cara menghubungi penjual?',
    a: 'Di halaman detail toko, ada tombol "Hubungi Penjual" yang akan membuka fitur chat langsung antara kamu dan penjual.'
  },
  {
    q: 'Apakah data pribadi saya aman?',
    a: 'Data kamu disimpan dengan enkripsi dan tidak pernah dijual ke pihak ketiga. Kami menggunakan standar keamanan industri untuk melindungi informasi pribadimu.'
  },
]

// ─── MAIN COMPONENT ────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const menuItems = [
    { id: 'profile',    icon: User,        label: 'Edit Profil',        sub: 'Ubah nama & foto profilmu' },
    { id: 'favorites',  icon: Heart,       label: 'Favoritku',          sub: 'Toko & menu yang kamu suka' },
    { id: 'notifikasi', icon: Bell,        label: 'Notifikasi',         sub: 'Pusat pemberitahuan' },
    { id: 'kontak',     icon: Phone,       label: 'Kontak Kami',        sub: 'Hubungi tim NyamNow' },
    { id: 'kebijakan',  icon: ShieldCheck, label: 'Kebijakan',          sub: 'Syarat & ketentuan layanan' },
    { id: 'bantuan',    icon: HelpCircle,  label: 'Pusat Bantuan & FAQ',sub: 'Pertanyaan yang sering ditanya' },
  ]

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('users').select('first_name').eq('id', user.id).single()
        if (data) setUserName(data.first_name)
      }
    }
    getUser()
  }, [])

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-black font-sans antialiased">
      <NavbarBuyer userName={userName} handleLogout={handleLogout} />

      <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
        {/* HEADER */}
        <div className="flex items-center gap-3 mb-6">
          {activeSection && (
            <button onClick={() => setActiveSection(null)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronLeft size={20} className="text-gray-700" />
            </button>
          )}
          <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight italic">
            {activeSection ? menuItems.find(m => m.id === activeSection)?.label : 'Pengaturan'}
          </h1>
        </div>

        <AnimatePresence mode="wait">
          {!activeSection ? (
            <motion.div key="menu" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
                {menuItems.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#FAF4EB] transition-colors ${i < menuItems.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <div className="w-9 h-9 bg-[#FAF4EB] rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon size={16} className="text-[#B89B6D]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-gray-900">{item.label}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{item.sub}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300" />
                  </button>
                ))}
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-5 py-4 bg-white rounded-2xl border border-red-100 shadow-sm text-left hover:bg-red-50 transition-colors"
              >
                <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <LogOut size={16} className="text-red-500" />
                </div>
                <p className="text-sm font-black text-red-500">Keluar</p>
              </button>
            </motion.div>
          ) : (
            <motion.div key={activeSection} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              {activeSection === 'profile'    && <SectionProfile />}
              {activeSection === 'favorites'  && <SectionFavorites router={router} />}
              {activeSection === 'notifikasi' && <SectionNotifikasi />}
              {activeSection === 'kontak'     && <SectionKontak />}
              {activeSection === 'kebijakan'  && <SectionKebijakan />}
              {activeSection === 'bantuan'    && <SectionBantuan />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── SECTION: EDIT PROFIL ──────────────────────────────────────
function SectionProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Password states
  const [showPwForm, setShowPwForm] = useState(false)
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (data) {
        setProfile({ ...data, email: user.email || '' })
        setFirstName(data.first_name || '')
        setLastName(data.last_name || '')
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    await supabase.from('users').update({ first_name: firstName, last_name: lastName }).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploadError('')
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`

    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '0' })

    if (upErr) {
      setUploadError(`Gagal upload: ${upErr.message}`)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const freshUrl = `${urlData.publicUrl}?t=${Date.now()}`

    await supabase.from('users').update({ profile_image_url: freshUrl }).eq('id', profile.id)
    setProfile(prev => prev ? { ...prev, profile_image_url: freshUrl } : prev)
    setUploading(false)
  }

  const handleChangePassword = async () => {
    setPwError('')
    if (!oldPw || !newPw || !confirmPw) { setPwError('Semua field wajib diisi.'); return }
    if (newPw.length < 8) { setPwError('Password baru minimal 8 karakter.'); return }
    if (!/\d/.test(newPw)) { setPwError('Password baru harus mengandung minimal 1 angka.'); return }
    if (newPw !== confirmPw) { setPwError('Konfirmasi password tidak cocok.'); return }
    if (oldPw === newPw) { setPwError('Password baru tidak boleh sama dengan password lama.'); return }

    setPwSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setPwError('Sesi tidak ditemukan, coba login ulang.'); setPwSaving(false); return }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPw,
    })

    if (signInErr) {
      setPwError('Password lama salah.')
      setPwSaving(false)
      return
    }
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw })

    if (updateErr) {
      setPwError(`Gagal update password: ${updateErr.message}`)
      setPwSaving(false)
      return
    }

    setPwSaving(false)
    setPwSaved(true)
    setOldPw(''); setNewPw(''); setConfirmPw('')
    setTimeout(() => { setPwSaved(false); setShowPwForm(false) }, 2500)
  }

  if (!profile) return <div className="text-center py-12 text-gray-400 text-sm font-bold animate-pulse">Memuat profil...</div>

  return (
    <div className="space-y-4">
      {/* FOTO */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-[#FAF4EB] border-4 border-white shadow-md overflow-hidden">
            <img
              src={profile.profile_image_url || '/images/iconNyamnow.png'}
              alt="Foto Profil"
              className="w-full h-full object-cover"
            />
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-8 h-8 bg-[#B89B6D] rounded-full flex items-center justify-center shadow-md border-2 border-white hover:bg-[#a08055] transition-colors"
          >
            {uploading
              ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Camera size={14} className="text-white" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} />
        </div>
        <div className="text-center">
          <p className="font-black text-gray-900">{firstName} {lastName}</p>
          <p className="text-xs text-gray-400">{profile.email}</p>
        </div>
        {uploadError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2 w-full">
            <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
            <p className="text-[10px] text-red-500 font-bold">{uploadError}</p>
          </div>
        )}
      </div>

      {/* FORM NAMA */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Email</label>
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3">
            <Mail size={14} className="text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-400 font-medium">{profile.email}</p>
          </div>
          <p className="text-[9px] text-gray-400 mt-1 ml-1">Email tidak dapat diubah</p>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Nama Depan</label>
          <input
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="Nama depanmu"
            className="w-full bg-gray-50 border border-transparent focus:border-[#B89B6D] rounded-xl px-4 py-3 text-sm font-medium outline-none transition-colors"
          />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Nama Belakang</label>
          <input
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="Nama belakangmu"
            className="w-full bg-gray-50 border border-transparent focus:border-[#B89B6D] rounded-xl px-4 py-3 text-sm font-medium outline-none transition-colors"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 ${saved ? 'bg-green-500 text-white' : 'bg-[#B89B6D] hover:bg-[#a08055] text-white'}`}
        >
          {saving
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : saved ? <><Check size={14} /> Tersimpan!</> : 'Simpan Perubahan'}
        </button>
      </div>

      {/* GANTI PASSWORD */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => { setShowPwForm(!showPwForm); setPwError(''); setPwSaved(false) }}
          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="w-9 h-9 bg-[#FAF4EB] rounded-xl flex items-center justify-center flex-shrink-0">
            <Lock size={16} className="text-[#B89B6D]" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-black text-gray-900">Ganti Password</p>
            <p className="text-[10px] text-gray-400">Perbarui kata sandi akunmu</p>
          </div>
          <motion.div animate={{ rotate: showPwForm ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={16} className="text-gray-300" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showPwForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-1 space-y-3 border-t border-gray-50">
                {/* Password Lama */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Password Lama</label>
                  <div className="flex items-center bg-gray-50 border border-transparent focus-within:border-[#B89B6D] rounded-xl px-4 py-3 transition-colors">
                    <input
                      type={showOld ? 'text' : 'password'}
                      value={oldPw}
                      onChange={e => setOldPw(e.target.value)}
                      placeholder="Masukkan password lama"
                      className="flex-1 bg-transparent text-sm font-medium outline-none"
                    />
                    <button type="button" onClick={() => setShowOld(!showOld)} className="text-gray-400 hover:text-gray-600 ml-2">
                      {showOld ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Password Baru */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Password Baru</label>
                  <div className="flex items-center bg-gray-50 border border-transparent focus-within:border-[#B89B6D] rounded-xl px-4 py-3 transition-colors">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPw}
                      onChange={e => setNewPw(e.target.value)}
                      placeholder="Min. 8 karakter + angka"
                      className="flex-1 bg-transparent text-sm font-medium outline-none"
                    />
                    <button type="button" onClick={() => setShowNew(!showNew)} className="text-gray-400 hover:text-gray-600 ml-2">
                      {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Konfirmasi Password */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Konfirmasi Password Baru</label>
                  <div className="flex items-center bg-gray-50 border border-transparent focus-within:border-[#B89B6D] rounded-xl px-4 py-3 transition-colors">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      placeholder="Ulangi password baru"
                      className="flex-1 bg-transparent text-sm font-medium outline-none"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-gray-400 hover:text-gray-600 ml-2">
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {pwError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                    <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                    <p className="text-[11px] text-red-500 font-bold">{pwError}</p>
                  </div>
                )}

                <button
                  onClick={handleChangePassword}
                  disabled={pwSaving}
                  className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${pwSaved ? 'bg-green-500 text-white' : 'bg-gray-900 hover:bg-gray-700 text-white'}`}
                >
                  {pwSaving
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : pwSaved ? <><Check size={14} /> Password Berhasil Diubah!</> : 'Simpan Password'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── SECTION: FAVORITKU ────────────────────────────────────────
function SectionFavorites({ router }: { router: ReturnType<typeof useRouter> }) {
  const [tab, setTab] = useState<'toko' | 'menu'>('toko')
  const [favStores, setFavStores] = useState<FavStore[]>([])
  const [favProducts, setFavProducts] = useState<FavProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [storeRes, prodRes] = await Promise.all([
        supabase.from('store_favorites').select('store_id, stores(id, name, address, profile_image_url, rating_avg)').eq('user_id', user.id),
        supabase.from('product_favorites').select('product_id, products(id, name, price, image_url, store_id, stores(name))').eq('user_id', user.id),
      ])
      setFavStores((storeRes.data as unknown as FavStore[]) || [])
      setFavProducts((prodRes.data as unknown as FavProduct[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const unfavStore = async (storeId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('store_favorites').delete().match({ user_id: user.id, store_id: storeId })
    setFavStores(prev => prev.filter(f => f.store_id !== storeId))
  }

  const unfavProduct = async (productId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('product_favorites').delete().match({ user_id: user.id, product_id: productId })
    setFavProducts(prev => prev.filter(f => f.product_id !== productId))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 flex gap-1">
        {(['toko', 'menu'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === t ? 'bg-[#B89B6D] text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            {t === 'toko' ? `Toko (${favStores.length})` : `Menu (${favProducts.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm font-bold animate-pulse">Memuat...</div>
      ) : tab === 'toko' ? (
        favStores.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm font-bold">Belum ada toko favorit nih.</div>
        ) : (
          <div className="space-y-2">
            {favStores.map(f => (
              <div key={f.store_id} onClick={() => router.push(`/dashboard/buyer/store/${f.stores.id}`)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={f.stores.profile_image_url || '/images/iconNyamnow.png'} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate">{f.stores.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{f.stores.address || '—'}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Star size={9} className="fill-yellow-400 text-yellow-400" />
                    <span className="text-[9px] font-bold text-gray-500">{f.stores.rating_avg || 0}</span>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); unfavStore(f.store_id) }} className="p-2 rounded-xl hover:bg-red-50 transition-colors">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        favProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm font-bold">Belum ada menu favorit nih.</div>
        ) : (
          <div className="space-y-2">
            {favProducts.map(f => (
              <div key={f.product_id} onClick={() => router.push(`/dashboard/buyer/store/${f.products.store_id}`)} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={f.products.image_url} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate">{f.products.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{f.products.stores?.name || '—'}</p>
                  <p className="text-xs font-black text-[#2E7D32]">Rp{f.products.price.toLocaleString('id-ID')}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); unfavProduct(f.product_id) }} className="p-2 rounded-xl hover:bg-red-50 transition-colors">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

// ─── SECTION: NOTIFIKASI ───────────────────────────────────────
function SectionNotifikasi() {
  const router = useRouter()
  const [notifs, setNotifs] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(30)
      setNotifs((data as NotificationItem[]) || [])
      setLoading(false)

      // mark all as read
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
    }
    load()
  }, [])

  const handleClick = async (notif: NotificationItem) => {
    try {
      if (notif.type === 'NEW_MENU') {
        const { data } = await supabase.from('products').select('store_id').eq('id', notif.reference_id).single()
        if (data?.store_id) router.push(`/dashboard/buyer/store/${data.store_id}`)
      } else if (notif.type === 'ORDER_STATUS') {
        const { data } = await supabase.from('orders').select('status').eq('id', notif.reference_id).single()
        router.push(`/dashboard/buyer/orders?tab=${data?.status || ''}`)
      }
    } catch {}
  }

  if (loading) return <div className="text-center py-12 text-gray-400 text-sm font-bold animate-pulse">Memuat...</div>

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {notifs.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm font-bold">
          <Bell size={32} className="mx-auto mb-3 opacity-20" />
          Belum ada notifikasi.
        </div>
      ) : notifs.map((n, i) => (
        <div
          key={n.id}
          onClick={() => handleClick(n)}
          className={`px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${i < notifs.length - 1 ? 'border-b border-gray-50' : ''} ${!n.is_read ? 'bg-[#FAF4EB]/40' : ''}`}
        >
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <p className="text-xs font-black text-gray-900">{n.title}</p>
            <span className="text-[9px] text-gray-400 font-medium shrink-0">
              {new Date(n.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">{n.message}</p>
        </div>
      ))}
    </div>
  )
}

// ─── SECTION: KONTAK KAMI ──────────────────────────────────────
function SectionKontak() {
  const contacts = [
    {
      icon: Mail,
      label: 'Email',
      value: 'nyamnow.services@gmail.com',
      sub: 'Respon dalam 1×24 jam',
      href: 'mailto:nyamnow.services@gmail.com',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: FileText,
      label: 'Instagram',
      value: '@sakgangsal',
      sub: 'Ikuti kami untuk update terbaru',
      href: 'https://instagram.com/sakgangsal',
      color: 'bg-pink-50 text-pink-600',
    },
  ]

  return (
    <div className="space-y-3">
      <div className="bg-[#FAF4EB] rounded-2xl p-4 border border-[#EAE2D3]">
        <p className="text-xs font-black text-[#a08055] mb-1">Tim Support NyamNow</p>
        <p className="text-[11px] text-[#a08055]/80 leading-relaxed">
          Kami siap membantu kamu! Hubungi kami melalui salah satu channel di bawah dan tim kami akan segera merespons.
        </p>
      </div>

      {contacts.map(c => (
        <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 hover:shadow-md transition-shadow">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.color}`}>
            <c.icon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-gray-900">{c.label}</p>
            <p className="text-sm font-bold text-gray-700">{c.value}</p>
            <p className="text-[9px] text-gray-400">{c.sub}</p>
          </div>
          <ChevronRight size={16} className="text-gray-300" />
        </a>
      ))}
    </div>
  )
}

// ─── SECTION: KEBIJAKAN ────────────────────────────────────────
function SectionKebijakan() {
  const sections = [
    {
      title: '1. Ketentuan Umum',
      body: 'Dengan menggunakan aplikasi NyamNow, kamu menyetujui seluruh syarat dan ketentuan yang berlaku. NyamNow adalah platform yang menghubungkan pembeli dengan UMKM kuliner lokal. Kami berhak mengubah ketentuan ini sewaktu-waktu dengan pemberitahuan sebelumnya.',
    },
    {
      title: '2. Akun Pengguna',
      body: 'Setiap pengguna bertanggung jawab menjaga kerahasiaan akun dan kata sandinya. Dilarang menggunakan akun orang lain tanpa izin. NyamNow berhak menangguhkan akun yang melanggar ketentuan penggunaan.',
    },
    {
      title: '3. Pemesanan & Pembayaran',
      body: 'Pesanan yang telah dikonfirmasi penjual tidak dapat dibatalkan sepihak. Pembayaran dilakukan sesuai metode yang tersedia. NyamNow tidak bertanggung jawab atas keterlambatan yang disebabkan oleh penjual atau kondisi di luar kendali platform.',
    },
    {
      title: '4. Privasi Data',
      body: 'Kami mengumpulkan data pribadi (nama, email, nomor telepon) untuk keperluan layanan. Data tidak dijual atau dibagikan ke pihak ketiga tanpa persetujuanmu, kecuali diwajibkan oleh hukum. Data disimpan dengan enkripsi standar industri.',
    },
    {
      title: '5. Ulasan & Konten',
      body: 'Ulasan yang diberikan harus jujur dan tidak mengandung SARA, ujaran kebencian, atau konten tidak pantas. NyamNow berhak menghapus konten yang melanggar aturan komunitas tanpa pemberitahuan.',
    },
    {
      title: '6. Tanggung Jawab',
      body: 'NyamNow berperan sebagai perantara antara pembeli dan penjual. Kualitas produk sepenuhnya menjadi tanggung jawab masing-masing penjual. Kami tidak bertanggung jawab atas kerugian yang timbul akibat transaksi di luar platform.',
    },
    {
      title: '7. Perubahan Layanan',
      body: 'NyamNow berhak mengubah, menunda, atau menghentikan fitur tertentu sewaktu-waktu. Perubahan signifikan akan diinformasikan melalui notifikasi aplikasi atau email terdaftar.',
    },
  ]

  return (
    <div className="space-y-3">
      <div className="bg-[#FAF4EB] rounded-2xl p-4 border border-[#EAE2D3]">
        <p className="text-[10px] font-black text-[#a08055] uppercase tracking-widest mb-0.5">Terakhir diperbarui</p>
        <p className="text-xs font-bold text-[#a08055]/80">1 Januari 2026</p>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
        {sections.map(s => (
          <div key={s.title} className="px-5 py-4">
            <p className="text-xs font-black text-gray-900 mb-1.5">{s.title}</p>
            <p className="text-[11px] text-gray-500 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SECTION: BANTUAN & FAQ ────────────────────────────────────
function SectionBantuan() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      <div className="bg-[#FAF4EB] rounded-2xl p-4 border border-[#EAE2D3] flex items-start gap-3">
        <BookOpen size={18} className="text-[#B89B6D] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-black text-[#a08055] mb-0.5">Pusat Bantuan NyamNow</p>
          <p className="text-[11px] text-[#a08055]/80 leading-relaxed">
            Temukan jawaban atas pertanyaan umum seputar penggunaan NyamNow di bawah ini.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className={i < FAQ_ITEMS.length - 1 ? 'border-b border-gray-50' : ''}>
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full px-5 py-4 text-left flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors"
            >
              <p className="text-xs font-black text-gray-900 leading-snug">{item.q}</p>
              <motion.div animate={{ rotate: openIdx === i ? 180 : 0 }} transition={{ duration: 0.2 }} className="flex-shrink-0 mt-0.5">
                <ChevronDown size={16} className="text-gray-400" />
              </motion.div>
            </button>
            <AnimatePresence>
              {openIdx === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-4 text-[11px] text-gray-500 leading-relaxed">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}
