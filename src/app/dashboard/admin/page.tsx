'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import {
  BarChart2, Users, ShoppingBag, Megaphone, Bell,
  TrendingUp, Store, Package, Trash2,
  EyeOff, Eye, CheckCircle, Upload,
  Send, Filter, RefreshCw, LogOut, Shield,
  AlertTriangle, Search, X, ImageIcon, Edit, MessageSquare
} from 'lucide-react'

// ─── TYPES ─────────────────────────────────────────────────────
interface Order {
  id: string
  created_at: string
  grand_total: number
  status: string
  users: { first_name: string; last_name: string; email: string }
  stores: { name: string }
}

interface UserRow {
  id: string
  first_name: string
  last_name: string
  email: string
  role: string
  membership: string
  created_at: string
  seller_type?: string
  ktp_url?: string
  bank_name?: string
  account_number?: string
  account_name?: string
}

interface StoreRow {
  id: string
  name: string
  type: string
  address: string
  is_open: boolean
  rating_avg: number
  total_reviews: number
  created_at: string
  users: { first_name: string; email: string }
}

interface ProductRow {
  id: string
  name: string
  price: number
  category: string
  is_available: boolean
  stock: number
  image_url: string
  created_at: string
  stores: { name: string }
}

interface Campaign {
  id: string
  title: string
  banner_url: string
  start_at: string
  end_at: string
  is_active: boolean
  created_at: string
}

interface BroadcastHistory {
  id: string
  title: string
  message: string
  target: string
  sent_count: number
  created_at: string
}

// ─── SIDEBAR NAV ───────────────────────────────────────────────
const NAV = [
  { id: 'transaksi',  label: 'Monitoring Transaksi', icon: BarChart2 },
  { id: 'akun',       label: 'Manajemen Akun & Menu', icon: Users },
  { id: 'campaign',   label: 'Campaign & Promo',      icon: Megaphone },
  { id: 'broadcast',  label: 'Broadcast Notifikasi',  icon: Bell },
]

// ─── ROOT ──────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter()
  const [tab, setTab]           = useState('transaksi')
  const [adminName, setAdminName] = useState('')
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data } = await supabase.from('users').select('first_name, role').eq('id', user.id).single()
      if (!data || data.role !== 'admin') { router.replace('/dashboard/buyer'); return }
      setAdminName(data.first_name || 'Admin')
      setAuthChecked(true)
    }
    check()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!authChecked) return (
    <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#B89B6D] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex">
      {/* SIDEBAR */}
      <aside className="w-60 bg-[#1C1714] flex flex-col fixed h-full z-30">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#B89B6D] rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-black tracking-tight">NyamNow</p>
              <p className="text-[#B89B6D] text-[9px] font-bold uppercase tracking-widest">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-xs font-bold ${
                tab === n.id
                  ? 'bg-[#B89B6D] text-white shadow-lg shadow-[#B89B6D]/30'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <n.icon size={15} />
              {n.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-[#B89B6D]/20 rounded-full flex items-center justify-center">
              <span className="text-[#B89B6D] text-xs font-black">{adminName[0]}</span>
            </div>
            <div>
              <p className="text-white text-xs font-bold">{adminName}</p>
              <p className="text-white/40 text-[9px]">Administrator</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-400/10 text-xs font-bold transition-colors">
            <LogOut size={13} /> Keluar
          </button>
        </div>
      </aside>

      {/* CONTENT */}
      <main className="ml-60 flex-1 p-8 min-h-screen">
        {tab === 'transaksi' && <ModuleTransaksi />}
        {tab === 'akun'      && <ModuleAkun />}
        {tab === 'campaign'  && <ModuleCampaign />}
        {tab === 'broadcast' && <ModuleBroadcast />}
      </main>
    </div>
  )
}

// ─── STAT CARD ─────────────────────────────────────────────────
import type { LucideIcon } from 'lucide-react'
function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: LucideIcon; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MODULE 1: TRANSAKSI
// ══════════════════════════════════════════════════════════════
function ModuleTransaksi() {
  const [orders, setOrders]     = useState<Order[]>([])
  const [loading, setLoading]   = useState(true)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('id, created_at, grand_total, status, users(first_name, last_name, email), stores(name)')
      .eq('status', 'completed')
      .gte('created_at', `${dateFrom}T00:00:00`)
      .lte('created_at', `${dateTo}T23:59:59`)
      .order('created_at', { ascending: false })
    setOrders((data as unknown as Order[]) || [])
    setLoading(false)
  }, [dateFrom, dateTo])

  useEffect(() => {
    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo])

  const gmv = orders.reduce((s, o) => s + (o.grand_total || 0), 0)

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 italic uppercase mb-6">Monitoring Transaksi</h1>

      {/* FILTER */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-end gap-4 mb-6">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Dari Tanggal</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#B89B6D] transition-colors" />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Sampai Tanggal</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#B89B6D] transition-colors" />
        </div>
        <button onClick={fetchOrders} className="flex items-center gap-2 bg-[#B89B6D] text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-[#a08055] transition-colors">
          <Filter size={13} /> Terapkan
        </button>
        <button onClick={fetchOrders} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-gray-400">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total GMV" value={`Rp${(gmv/1000000).toFixed(1)}jt`} sub={`Rp${gmv.toLocaleString('id-ID')}`} icon={TrendingUp} color="bg-[#B89B6D]" />
        <StatCard label="Total Transaksi" value={orders.length.toString()} sub={`${dateFrom} – ${dateTo}`} icon={BarChart2} color="bg-emerald-500" />
        <StatCard label="Avg. Order Value" value={orders.length ? `Rp${Math.round(gmv/orders.length).toLocaleString('id-ID')}` : 'Rp0'} sub="Per transaksi selesai" icon={ShoppingBag} color="bg-violet-500" />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex justify-between items-center">
          <p className="text-sm font-black text-gray-900">Riwayat Transaksi Selesai</p>
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{orders.length} data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px]">
                <th className="px-5 py-3 text-left">Order ID</th>
                <th className="px-5 py-3 text-left">Pembeli</th>
                <th className="px-5 py-3 text-left">Toko</th>
                <th className="px-5 py-3 text-left">Tanggal</th>
                <th className="px-5 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400 font-bold">Memuat data...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400 font-bold">Tidak ada data pada rentang waktu ini.</td></tr>
              ) : orders.map((o, i) => (
                <tr key={o.id} className={`border-t border-gray-50 hover:bg-[#FAF4EB]/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                  <td className="px-5 py-3 font-mono text-[10px] text-gray-400">{o.id.slice(0, 8)}…</td>
                  <td className="px-5 py-3 font-bold text-gray-700">{o.users?.first_name} {o.users?.last_name}</td>
                  <td className="px-5 py-3 text-gray-500">{o.stores?.name}</td>
                  <td className="px-5 py-3 text-gray-400">{new Date(o.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-5 py-3 text-right font-black text-[#2E7D32]">Rp{(o.grand_total||0).toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MODULE 2: AKUN & MENU
// ══════════════════════════════════════════════════════════════
function ModuleAkun() {
  const [subTab, setSubTab] = useState<'users' | 'stores' | 'products'>('users')

  return (
    <div>
      <h1 className="text-2xl font-black text-gray-900 italic uppercase mb-6">Manajemen Akun & Menu</h1>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 flex gap-1 mb-6 w-fit">
        {([['users', 'Users', Users], ['stores', 'Toko', Store], ['products', 'Produk', Package]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setSubTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${subTab === id ? 'bg-[#B89B6D] text-white shadow-sm' : 'text-gray-400 hover:text-gray-700'}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>
      {subTab === 'users'    && <UsersTable />}
      {subTab === 'stores'   && <StoresTable />}
      {subTab === 'products' && <ProductsTable />}
    </div>
  )
}

function UsersTable() {
  const [users, setUsers]     = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [detail, setDetail]   = useState<UserRow | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
      setUsers((data as UserRow[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = users.filter(u =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-4">
          <p className="text-sm font-black text-gray-900">Daftar User ({users.length})</p>
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 w-64">
            <Search size={13} className="text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama / email..." className="bg-transparent text-xs outline-none w-full" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px]">
                <th className="px-5 py-3 text-left">Nama</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-left">Terdaftar</th>
                <th className="px-5 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400 font-bold">Memuat...</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} className="border-t border-gray-50 hover:bg-[#FAF4EB]/30 transition-colors">
                  <td className="px-5 py-3 font-bold text-gray-800">{u.first_name} {u.last_name}</td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                      u.role === 'seller' ? 'bg-[#FAF4EB] text-[#B89B6D]' :
                      'bg-gray-100 text-gray-500'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400">{new Date(u.created_at).toLocaleDateString('id-ID')}</td>
                  <td className="px-5 py-3 text-center">
                    <button onClick={() => setDetail(u)} className="text-[#B89B6D] hover:underline font-bold text-[10px]">Detail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button onClick={() => setDetail(null)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><X size={16} /></button>
            <h2 className="text-base font-black text-gray-900 mb-4">{detail.first_name} {detail.last_name}</h2>
            <div className="space-y-3 text-xs">
              {[
                ['Email', detail.email],
                ['Role', detail.role],
                ['Membership', detail.membership],
                ['Tipe Seller', detail.seller_type || '—'],
                ['Bank', detail.bank_name || '—'],
                ['No. Rekening', detail.account_number || '—'],
                ['Nama Rekening', detail.account_name || '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between gap-4 py-2 border-b border-gray-50">
                  <span className="font-black text-gray-400 uppercase tracking-widest text-[9px]">{label}</span>
                  <span className="font-bold text-gray-700 text-right">{val}</span>
                </div>
              ))}
              {detail.ktp_url && (
                <div className="pt-2">
                  <p className="font-black text-gray-400 uppercase tracking-widest text-[9px] mb-2">Foto KTP</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={detail.ktp_url} alt="KTP" className="w-full rounded-xl border border-gray-100 object-cover" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function StoresTable() {
  const [stores, setStores]   = useState<StoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('stores')
      .select('*, users(first_name, email)')
      .order('created_at', { ascending: false })
    setStores((data as unknown as StoreRow[]) || [])
    setLoading(false)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleOpen = async (id: string, current: boolean) => {
    await supabase.from('stores').update({ is_open: !current }).eq('id', id)
    setStores(prev => prev.map(s => s.id === id ? { ...s, is_open: !current } : s))
  }

  const filtered = stores.filter(s => `${s.name} ${s.address}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-4">
        <p className="text-sm font-black text-gray-900">Daftar Toko ({stores.length})</p>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 w-64">
          <Search size={13} className="text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama toko..." className="bg-transparent text-xs outline-none w-full" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px]">
              <th className="px-5 py-3 text-left">Toko</th>
              <th className="px-5 py-3 text-left">Pemilik</th>
              <th className="px-5 py-3 text-left">Tipe</th>
              <th className="px-5 py-3 text-center">Rating</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 font-bold">Memuat...</td></tr>
            ) : filtered.map(s => (
              <tr key={s.id} className="border-t border-gray-50 hover:bg-[#FAF4EB]/30 transition-colors">
                <td className="px-5 py-3 font-bold text-gray-800">{s.name}</td>
                <td className="px-5 py-3 text-gray-500">{s.users?.first_name} <span className="text-gray-400">({s.users?.email})</span></td>
                <td className="px-5 py-3 text-gray-500 capitalize">{s.type || '—'}</td>
                <td className="px-5 py-3 text-center font-bold text-yellow-500">{s.rating_avg || 0} ★</td>
                <td className="px-5 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${s.is_open ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                    {s.is_open ? 'Buka' : 'Tutup'}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <button onClick={() => toggleOpen(s.id, s.is_open)}
                    className={`text-[10px] font-black px-2 py-1 rounded-lg transition-colors ${s.is_open ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                    {s.is_open ? 'Paksa Tutup' : 'Buka Paksa'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProductsTable() {
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('id, name, price, category, is_available, stock, image_url, created_at, stores(name)')
      .order('created_at', { ascending: false })
    setProducts((data as unknown as ProductRow[]) || [])
    setLoading(false)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleAvailable = async (id: string, current: boolean) => {
    await supabase.from('products').update({ is_available: !current }).eq('id', id)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_available: !current } : p))
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Yakin hapus produk ini? Tindakan ini tidak bisa dibatalkan.')) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  const filtered = products.filter(p => `${p.name} ${p.stores?.name}`.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-4">
        <p className="text-sm font-black text-gray-900">Semua Produk ({products.length})</p>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 w-64">
          <Search size={13} className="text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari produk / toko..." className="bg-transparent text-xs outline-none w-full" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[9px]">
              <th className="px-5 py-3 text-left">Produk</th>
              <th className="px-5 py-3 text-left">Toko</th>
              <th className="px-5 py-3 text-right">Harga</th>
              <th className="px-5 py-3 text-center">Stok</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 font-bold">Memuat...</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className={`border-t border-gray-50 hover:bg-[#FAF4EB]/30 transition-colors ${!p.is_available ? 'opacity-50' : ''}`}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image src={p.image_url} alt={p.name} width={36} height={36} unoptimized className="w-full h-full object-cover" />
                    </div>
                    <span className="font-bold text-gray-800 max-w-[160px] truncate">{p.name}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-500">{p.stores?.name}</td>
                <td className="px-5 py-3 text-right font-black text-[#2E7D32]">Rp{p.price.toLocaleString('id-ID')}</td>
                <td className="px-5 py-3 text-center text-gray-500">{p.stock}</td>
                <td className="px-5 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${p.is_available ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {p.is_available ? 'Aktif' : 'Hidden'}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => toggleAvailable(p.id, p.is_available)}
                      title={p.is_available ? 'Sembunyikan' : 'Tampilkan'}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700">
                      {p.is_available ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button onClick={() => deleteProduct(p.id)}
                      title="Hapus permanen"
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-400 hover:text-red-500">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MODULE 3: CAMPAIGN
// ══════════════════════════════════════════════════════════════
function ModuleCampaign() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)

  const [title, setTitle]       = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [startAt, setStartAt]   = useState('')
  const [endAt, setEndAt]       = useState('')
  const [preview, setPreview]   = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('admin_campaigns').select('*').order('created_at', { ascending: false })
    setCampaigns((data as Campaign[]) || [])
    setLoading(false)
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const path = `campaigns/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('campaigns').upload(path, file, { upsert: true })
    if (!error) {
      const { data: urlData } = supabase.storage.from('campaigns').getPublicUrl(path)
      setBannerUrl(urlData.publicUrl)
      setPreview(urlData.publicUrl)
    }
    setUploading(false)
  }

  const handleSubmit = async () => {
    if (!title || !bannerUrl || !startAt || !endAt) { alert('Semua field wajib diisi.'); return }
    setSaving(true)
    await supabase.from('admin_campaigns').insert({ title, banner_url: bannerUrl, start_at: startAt, end_at: endAt, is_active: true })
    setTitle(''); setBannerUrl(''); setStartAt(''); setEndAt(''); setPreview('')
    setSaving(false)
    setShowForm(false)
    load()
  }

  const toggleCampaign = async (id: string, current: boolean) => {
    await supabase.from('admin_campaigns').update({ is_active: !current }).eq('id', id)
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c))
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm('Hapus campaign ini?')) return
    await supabase.from('admin_campaigns').delete().eq('id', id)
    setCampaigns(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900 italic uppercase">Campaign & Promo Banner</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#B89B6D] text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-[#a08055] transition-colors">
          {showForm ? <X size={13} /> : <Upload size={13} />}
          {showForm ? 'Batal' : 'Buat Campaign Baru'}
        </button>
      </div>

      {/* FORM */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-[#EAE2D3] shadow-sm p-6 mb-6">
          <p className="text-sm font-black text-gray-900 mb-4">Form Campaign Baru</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Judul Campaign</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: Promo Lebaran 2025" className="w-full bg-gray-50 border border-gray-200 focus:border-[#B89B6D] rounded-xl px-4 py-3 text-sm outline-none transition-colors text-gray-900 font-bold" />
            </div>
            <div className="col-span-2 md:col-span-1 flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Tanggal Mulai</label>
                <input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} className="w-full bg-gray-50 border border-gray-200 focus:border-[#B89B6D] rounded-xl px-4 py-3 text-sm outline-none transition-colors text-gray-900 font-bold" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Tanggal Berakhir</label>
                <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} className="w-full bg-gray-50 border border-gray-200 focus:border-[#B89B6D] rounded-xl px-4 py-3 text-sm outline-none transition-colors text-gray-900 font-bold" />
              </div>
            </div>
            
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Banner Image</label>
              <label className="flex items-center justify-center gap-3 w-[300px] h-[150px] border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-[#B89B6D] transition-colors bg-gray-50 overflow-hidden relative shadow-inner">
                {preview ? (
                  <Image src={preview} alt="Preview" width={300} height={150} unoptimized className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-400">
                    <ImageIcon size={24} />
                    <span className="text-[10px] font-bold">{uploading ? 'Mengupload...' : 'Klik untuk upload banner'}</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </div>
          <button onClick={handleSubmit} disabled={saving || uploading}
            className="mt-6 w-[300px] py-3 rounded-xl bg-[#B89B6D] text-white text-xs font-black uppercase tracking-widest hover:bg-[#a08055] transition-colors disabled:opacity-50">
            {saving ? 'Menyimpan...' : 'Simpan Campaign'}
          </button>
        </div>
      )}

      {/* LIST */}
      <div className="flex flex-wrap gap-4">
        {loading ? (
          <p className="w-full text-center py-10 text-gray-400 font-bold">Memuat...</p>
        ) : campaigns.length === 0 ? (
          <p className="w-full text-center py-10 text-gray-400 font-bold">Belum ada campaign.</p>
        ) : campaigns.map(c => (
          <div key={c.id} className={`w-[280px] bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col ${c.is_active ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
            <div className="w-full h-[140px] bg-gray-100 overflow-hidden">
              <Image src={c.banner_url} alt={c.title} width={280} height={140} unoptimized className="w-full h-full object-cover" />
            </div>
            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-black text-gray-900 leading-tight">{c.title}</p>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${c.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {c.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mb-4 font-bold">
                {new Date(c.start_at).toLocaleDateString('id-ID')} – {new Date(c.end_at).toLocaleDateString('id-ID')}
              </p>
              <div className="flex gap-2 mt-auto">
                <button onClick={() => toggleCampaign(c.id, c.is_active)}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-colors ${c.is_active ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                  {c.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
                <button onClick={() => deleteCampaign(c.id)} className="px-3 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MODULE 4: BROADCAST
// ══════════════════════════════════════════════════════════════
function ModuleBroadcast() {
  const [broadcasts, setBroadcasts] = useState<BroadcastHistory[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)

  const [editingId, setEditingId]   = useState<string | null>(null)
  const [title, setTitle]           = useState('')
  const [message, setMessage]       = useState('')
  const [target, setTarget]         = useState<'all' | 'buyer' | 'seller'>('all')
  const [sending, setSending]       = useState(false)
  const [sent, setSent]             = useState<{ count: number } | null>(null)
  const [error, setError]           = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('admin_broadcasts').select('*').order('created_at', { ascending: false })
    setBroadcasts(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditingId(null); setTitle(''); setMessage(''); setTarget('all'); setError(''); setSent(null); setShowForm(true);
  }

    const openEdit = (b: BroadcastHistory) => {
        setEditingId(b.id); 
        setTitle(b.title); 
        setMessage(b.message); 
        setTarget(b.target as 'all' | 'buyer' | 'seller'); 
        setError(''); 
        setSent(null); 
        setShowForm(true);
    }

  const handleSend = async () => {
    setError(''); setSent(null)
    if (!title.trim() || !message.trim()) { setError('Judul dan pesan tidak boleh kosong.'); return }
    setSending(true)

    try {
      if (editingId) {
        // Mode Edit: Update admin_broadcasts
        const { error: updateErr } = await supabase.from('admin_broadcasts').update({ title: title.trim(), message: message.trim() }).eq('id', editingId)
        if (updateErr) throw updateErr

        // Update notifications massal berdasarkan reference_id
        const { error: notifErr } = await supabase.from('notifications').update({ title: title.trim(), message: message.trim() }).eq('reference_id', editingId)
        if (notifErr) throw notifErr
        
        setSent({ count: 0 })
      } else {
        let query = supabase.from('users').select('id')
        if (target === 'buyer')  query = query.eq('role', 'buyer')
        if (target === 'seller') query = query.eq('role', 'seller')

        const { data: targetUsers } = await query
        if (!targetUsers || targetUsers.length === 0) throw new Error('Tidak ada user yang cocok dengan target ini.')

        // Catat ke admin_broadcasts
        const { data: bData, error: bError } = await supabase.from('admin_broadcasts')
          .insert({ title: title.trim(), message: message.trim(), target, sent_count: targetUsers.length })
          .select().single()
        if (bError || !bData) throw bError

        // Sebar notif ke tabel notifications
        const payload = targetUsers.map(u => ({
          user_id: u.id,
          type: 'BROADCAST',
          title: title.trim(),
          message: message.trim(),
          reference_id: bData.id,
          is_read: false,
        }))

        const BATCH = 100
        for (let i = 0; i < payload.length; i += BATCH) {
          const { error: insertError } = await supabase.from('notifications').insert(payload.slice(i, i + BATCH))
          if (insertError) throw insertError
        }

        setSent({ count: targetUsers.length })
      }

      setShowForm(false)
      load()
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(`Gagal! Error: ${err.message}`);
            } else {
                setError('Gagal! Terjadi kesalahan yang tidak diketahui.');
            }
            } finally {
            setSending(false);
            }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menarik (hapus) notifikasi ini dari semua HP user?')) return
    // Hapus dari HP user (notifications)
    await supabase.from('notifications').delete().eq('reference_id', id)
    // Hapus dari history (admin_broadcasts)
    await supabase.from('admin_broadcasts').delete().eq('id', id)
    
    setBroadcasts(prev => prev.filter(b => b.id !== id))
  }

  const targetLabel = { all: 'Semua User', buyer: 'Pembeli', seller: 'Penjual' }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900 italic uppercase">Broadcast Notifikasi</h1>
        <button onClick={showForm ? () => setShowForm(false) : openCreate}
          className="flex items-center gap-2 bg-[#B89B6D] text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-[#a08055] transition-colors">
          {showForm ? <X size={13} /> : <Upload size={13} />}
          {showForm ? 'Batal' : 'Buat Broadcast Baru'}
        </button>
      </div>

      {showForm ? (
        <div className="max-w-xl">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            {/* Target */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Target Audience</label>
              <div className="flex gap-2">
                {(['all', 'buyer', 'seller'] as const).map(t => (
                  <button key={t} onClick={() => setTarget(t)} disabled={!!editingId}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all border ${
                      target === t ? 'bg-[#B89B6D] text-white border-[#B89B6D]' : 'bg-white text-gray-400 border-gray-200 hover:border-[#B89B6D]'
                    } ${editingId ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {targetLabel[t]}
                  </button>
                ))}
              </div>
              {editingId && <p className="text-[9px] text-gray-400 mt-1 italic">Target tidak bisa diubah saat mengedit pesan.</p>}
            </div>

            {/* Judul */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Judul Notifikasi</label>
              <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="Contoh: Promo Spesial Weekend!" className="w-full bg-gray-50 border border-gray-200 focus:border-[#B89B6D] rounded-xl px-4 py-3 text-sm outline-none transition-colors text-gray-900 font-bold" />
              <p className="text-[9px] text-gray-400 mt-1 text-right">{title.length}/80</p>
            </div>

            {/* Pesan */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">Isi Pesan</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={300} rows={4} placeholder="Tulis pesan notifikasi di sini..." className="w-full bg-gray-50 border border-gray-200 focus:border-[#B89B6D] rounded-xl px-4 py-3 text-sm outline-none transition-colors resize-none text-gray-900 font-bold" />
              <p className="text-[9px] text-gray-400 mt-1 text-right">{message.length}/300</p>
            </div>

            {/* Preview */}
            {(title || message) && (
              <div className="bg-[#FAF4EB] rounded-xl p-4 border border-[#EAE2D3]">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#a08055] mb-2">Preview Notifikasi</p>
                <p className="text-xs font-black text-gray-900 mb-1">{title || '(judul)'}</p>
                <p className="text-[11px] text-gray-700 leading-relaxed font-medium">{message || '(pesan)'}</p>
              </div>
            )}

            {/* Error & Success */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-500 font-bold">{error}</p>
              </div>
            )}

            <button onClick={handleSend} disabled={sending}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#1C1714] hover:bg-black text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 active:scale-95 shadow-md">
              {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={13} />}
              {sending ? 'Memproses...' : (editingId ? 'Simpan Perubahan' : `Kirim ke ${targetLabel[target]}`)}
            </button>
          </div>
        </div>
      ) : (
        /* LIST HISTORY BROADCAST */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="col-span-full text-center py-10 text-gray-400 font-bold">Memuat riwayat...</p>
          ) : broadcasts.length === 0 ? (
            <p className="col-span-full text-center py-10 text-gray-400 font-bold">Belum ada riwayat broadcast.</p>
          ) : (
            broadcasts.map(b => (
              <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                    b.target === 'buyer' ? 'bg-blue-50 text-blue-600' :
                    b.target === 'seller' ? 'bg-orange-50 text-orange-600' :
                    'bg-green-50 text-green-600'
                  }`}>
                    {targetLabel[b.target as keyof typeof targetLabel] || b.target}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">
                    {new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                
                <h3 className="text-sm font-black text-gray-900 mb-1 leading-tight line-clamp-1">{b.title}</h3>
                <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-4 line-clamp-2 flex-1">{b.message}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Users size={12} />
                    <span className="text-[10px] font-bold">Terkirim ke {b.sent_count}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(b)} title="Edit Pesan" className="p-1.5 rounded-lg bg-gray-50 hover:bg-[#FAF4EB] text-gray-400 hover:text-[#B89B6D] transition-colors">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => handleDelete(b.id)} title="Tarik / Hapus Notif" className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}