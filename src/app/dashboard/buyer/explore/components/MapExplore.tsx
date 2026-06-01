'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import { Navigation, Store, X, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'


// Fix Icon Leaflet
// @ts-expect-error - Internal Leaflet override
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface StoreData {
  id: string; name: string; description: string; profile_image_url: string;
  rating_avg: number; type: string; latitude: number; longitude: number;
  products?: { id: string; name: string; price: number; image_url: string }[];
}

function MapMover({ coords }: { coords: [number, number] | null | undefined }) {
  const map = useMap()
  useEffect(() => {
    if (coords) {
      map.flyTo(coords, 17, { animate: true, duration: 1.5 })
    }
  }, [coords, map])
  return null
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView(center, 15)
    }
  }, [center, map])
  return null
}


export default function MapExplore({ 
  stores, 
  userLocation, 
  targetCoords 
}: { 
  stores: StoreData[], 
  userLocation: [number, number],
  targetCoords?: [number, number] | null 
}) {
  const router = useRouter()
  const [selectedStore, setSelectedStore] = useState<StoreData | null>(null)
  const mapCenter = useMemo(() => userLocation, [userLocation]);
  
  // Mencegah re-render icon yang tidak perlu
  const userIcon = useMemo(() => L.divIcon({
    className: 'user-pin',
    html: `<div class="relative">
            <div class="w-10 h-10 bg-blue-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-white relative z-10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <div class="absolute inset-0 w-10 h-10 bg-blue-400 rounded-full animate-ping opacity-50"></div>
          </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  }), [])

  const createStoreIcon = useCallback((url: string) => L.divIcon({
    className: 'custom-pin',
    html: `<div class="group relative flex items-center justify-center">
            <div class="w-12 h-12 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white transition-all group-hover:scale-110 group-hover:border-[#B89B6D]">
              <img src="${url || '/images/iconNyamnow.png'}" class="w-full h-full object-cover" />
            </div>
          </div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 48]
  }), [])

  return (
    <div className="h-full w-full relative bg-[#FDFCF8]">
      <MapContainer 
        center={mapCenter} 
        zoom={15} 
        className="h-full w-full"
        zoomControl={false}
        scrollWheelZoom={true}
      >
      <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ChangeView center={mapCenter} />
        <MapMover coords={targetCoords} />

        <Marker position={mapCenter} icon={userIcon} />

        {stores.map((store) => (
          <Marker 
            key={store.id} 
            position={[store.latitude, store.longitude]} 
            icon={createStoreIcon(store.profile_image_url)}
            eventHandlers={{
              click: () => setSelectedStore(store)
            }}
          />
        ))}
      </MapContainer>

      {/* POPUP DETAIL TOKO */}
      <AnimatePresence>
        {selectedStore && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedStore(null)}
              className="absolute inset-0 z-[1000] bg-black/5 backdrop-blur-[1px]" 
            />
            <motion.div
              initial={{ y: 300, opacity: 0, x: '-50%' }}
              animate={{ y: 0, opacity: 1, x: '-50%' }}
              exit={{ y: 300, opacity: 0, x: '-50%' }}
              className="fixed bottom-10 left-1/2 w-[90%] max-w-2xl bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] z-[2000] p-6 flex flex-col md:flex-row gap-6 border border-gray-100"
            >
              <button onClick={() => setSelectedStore(null)} className="absolute top-5 right-5 p-2 bg-gray-100 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all z-10">
                <X size={18} />
              </button>

              <div className="w-full md:w-40 h-40 rounded-3xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-inner relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedStore.profile_image_url || '/images/iconNyamnow.png'} className="w-full h-full object-cover" alt={selectedStore.name}/>
              </div>

              <div className="flex-1 text-left flex flex-col justify-between overflow-hidden">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 leading-tight mb-1 uppercase tracking-tight pr-8 truncate">
                    {selectedStore.name}
                  </h2>
                  <div className="flex items-center gap-1 mb-3">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} size={16} className={s <= Math.round(selectedStore.rating_avg || 0) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"} />
                    ))}
                    <span className="ml-2 bg-gray-100 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-gray-200">
                      {Number(selectedStore.rating_avg || 0).toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-400 line-clamp-2 leading-relaxed italic mb-4">
                    {selectedStore.description || 'UMKM ini menyediakan menu terbaik untukmu.'}
                  </p>
                </div>

                {/* MENU REKOMENDASI */}
                {selectedStore.products && selectedStore.products.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Menu Populer</h3>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                      {selectedStore.products.slice(0, 3).map((product) => (
                        <div key={product.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 p-2 rounded-2xl min-w-[160px] max-w-[180px]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={product.image_url || '/images/iconNyamnow.png'} alt={product.name} className="w-10 h-10 rounded-xl object-cover bg-white shadow-sm flex-shrink-0" />
                          <div className="flex flex-col justify-center overflow-hidden">
                            <span className="text-[11px] font-black text-gray-800 truncate">{product.name}</span>
                            <span className="text-[10px] font-bold text-[#D4C18D]">Rp{product.price.toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-auto">
                  {/* ✅ FIX BUG LINK RUTE GOOGLE MAPS */}
                  <button onClick={() => window.open(`https://maps.google.com/?q=${selectedStore.latitude},${selectedStore.longitude}`, '_blank')} className="flex-1 bg-[#D4C18D] hover:bg-[#c2ae7a] text-white px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
                    <Navigation size={16} fill="currentColor" /> Rute
                  </button>
                  <button onClick={() => router.push(`/dashboard/buyer/store/${selectedStore.id}`)} className="flex-1 bg-white border-2 border-[#D4C18D] text-[#D4C18D] hover:bg-[#FDFCF8] px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95">
                    <Store size={16} /> Lihat Toko
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}