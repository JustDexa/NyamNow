'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Search, X, Store as StoreIcon, Navigation } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import NavbarBuyer from '@/components/NavbarBuyer'
import 'leaflet/dist/leaflet.css'

export interface StoreData {
  id: string
  name: string
  description: string
  profile_image_url: string
  rating_avg: number
  type: string
  latitude: number
  longitude: number
  products?: {          
    id: string
    name: string
    price: number
    image_url: string
  }[]
}

// Panggil Peta tanpa SSR
const MapExplore = dynamic(() => import('./components/MapExplore'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex flex-col gap-4 items-center justify-center bg-[#FDFCF8]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#B89B6D]"></div>
      <span className="font-black text-[#B89B6D] text-xs uppercase tracking-widest animate-pulse">Menyiapkan Peta NyamNow...</span>
    </div>
  )
})

export default function ExplorePage() {
  const router = useRouter()
  
  // States Navbar & Auth
  const [userName, setUserName] = useState<string | null>(null)
  
  // States Peta & Data
  const [stores, setStores] = useState<StoreData[]>([])
  const [userLocation, setUserLocation] = useState<[number, number]>([-6.2000, 106.8166])
  
  // States Search Bar Melayang
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredStores, setFilteredStores] = useState<StoreData[]>([])
  const [targetCoords, setTargetCoords] = useState<[number, number] | null>(null)

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]), 
        (err) => console.warn("GPS gagal:", err.message), 
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    }

    const fetchInitData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: ud } = await supabase.from('users').select('first_name').eq('id', user.id).single()
        setUserName(ud?.first_name || null)
      }

      const { data, error } = await supabase
        .from('stores')
        .select(`id, name, description, profile_image_url, rating_avg, type, latitude, longitude, products ( id, name, price, image_url )`)
        .not('latitude', 'is', null)

      if (!error && data) setStores(data as unknown as StoreData[])
    }
    
    fetchInitData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Logika Filter Search Bar
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    
    if (query.trim() === '') {
      setFilteredStores([])
    } else {
      const results = stores.filter(s => s.name.toLowerCase().includes(query.toLowerCase()))
      setFilteredStores(results)
    }
  }

  // Pas user nge-klik nama toko di hasil pencarian
  const handleSelectStore = (lat: number, lng: number) => {
    setTargetCoords([lat, lng]) // Kasih tau peta buat geser ke sini
    setSearchQuery('')
    setFilteredStores([])
  }

  return (
    <div className="h-screen w-screen bg-[#FDFCF8] flex flex-col relative overflow-hidden text-left">
      
      <NavbarBuyer userName={userName} handleLogout={handleLogout} />

      {/* --- PETA RENDER AREA (mt-[64px] dihapus biar nggak ada putih-putih) --- */}
      {/* --- PETA RENDER AREA --- */}
      <main className="flex-1 z-0 relative flex flex-col">
        
        {/* 🔍 FLOATING SEARCH BAR PETA (UDAH GANTI JADI z-[9999]) */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-8 md:top-8 z-[9999] w-[90%] md:w-96 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-100 flex items-center px-4 py-3.5 focus-within:ring-2 focus-within:ring-[#B89B6D] transition-all">
            <Search size={20} className="text-[#B89B6D] mr-3" />
            <input
              type="text"
              placeholder="Cari UMKM di sekitar..."
              value={searchQuery}
              onChange={handleSearch}
              className="flex-1 outline-none text-sm font-bold text-gray-800 bg-transparent placeholder:font-medium placeholder:text-gray-400"
            />
            {searchQuery && (
              <X size={18} className="text-gray-400 cursor-pointer hover:text-red-500 transition-colors" onClick={() => {setSearchQuery(''); setFilteredStores([])}} />
            )}
          </div>

          {/* Autocomplete Dropdown */}
          <AnimatePresence>
            {filteredStores.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-h-72 overflow-y-auto border border-gray-100 py-2">
                {filteredStores.map(store => (
                  <div 
                    key={store.id} 
                    onClick={() => handleSelectStore(store.latitude, store.longitude)}
                    className="px-5 py-3 hover:bg-[#FAF4EB] cursor-pointer flex items-center gap-4 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={store.profile_image_url} alt={store.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-black text-gray-900">{store.name}</h4>
                      <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1 mt-0.5"><Navigation size={10}/> Ketuk untuk melihat lokasi</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Kirim targetCoords ke Peta biar tau arah */}
        <MapExplore stores={stores} userLocation={userLocation} targetCoords={targetCoords} />
      </main>

    </div>
  )
}