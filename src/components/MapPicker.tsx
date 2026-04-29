'use client'

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from 'react-leaflet'
import { useState, useEffect, useRef } from 'react'
import type { LeafletMouseEvent, LatLngExpression } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
// --- IMPORT SEARCH BAR ---
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch'
import 'leaflet-geosearch/dist/geosearch.css'

// FIX ICON
const DefaultIcon = L.icon({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

// --- INTERFACE UNTUK SEARCH RESULT ---
interface GeoSearchResult {
  location: {
    x: number; // longitude
    y: number; // latitude
    label: string;
  };
}

// --- KOMPONEN SEARCH BAR (INTERNAL MAP) ---
function LeafletSearch({ onLocationFound }: { onLocationFound: (lat: number, lng: number) => void }) {
  const map = useMap()

  useEffect(() => {
    const provider = new OpenStreetMapProvider()

    // @ts-expect-error - GeoSearchControl types mismatch with latest leaflet
    const searchControl = new GeoSearchControl({
      provider,
      style: 'bar',
      showMarker: false,
      showPopup: false,
      autoClose: true,
      retainZoomLevel: false,
      animateZoom: true,
      keepResult: true,
      searchLabel: 'Cari lokasi atau alamat...',
    })

    map.addControl(searchControl)

    const handleSearchShow = (result: GeoSearchResult) => {
      onLocationFound(result.location.y, result.location.x)
    }

    // @ts-expect-error - Custom event from leaflet-geosearch
    map.on('geosearch/showlocation', handleSearchShow)

    return () => {
      map.removeControl(searchControl)
      // @ts-expect-error - Cleanup event
      map.off('geosearch/showlocation', handleSearchShow)
    }
  }, [map, onLocationFound])

  return null
}

// --- KOMPONEN CHANGE VIEW ---
function ChangeView({ position }: { position: [number, number] }) {
  const map = useMap()
  const prevPosRef = useRef<string>('')

  useEffect(() => {
    const posString = JSON.stringify(position)
    if (position && posString !== prevPosRef.current) {
      map.setView(position, 16, { animate: true })
      prevPosRef.current = posString
    }
  }, [map, position])

  return null
}

type Props = {
  onSelect: (lat: number, lng: number) => void
  externalPosition?: [number, number] | null
}

export default function MapPicker({ onSelect, externalPosition }: Props) {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const defaultCenter: LatLngExpression = [-7.5484, 110.7466] // Kartasura

  useEffect(() => {
    if (externalPosition) {
      setPosition(externalPosition)
    }
  }, [externalPosition])

  function LocationMarker() {
    useMapEvents({
      click(e: LeafletMouseEvent) {
        const { lat, lng } = e.latlng
        const newPos: [number, number] = [lat, lng]
        setPosition(newPos)
        onSelect(lat, lng)
      },
    })

    return position ? <Marker position={position} /> : null
  }

  return (
    <div className="w-full h-full relative border-none outline-none">
      <MapContainer
        center={externalPosition || position || defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        <LeafletSearch onLocationFound={(lat, lng) => {
          setPosition([lat, lng])
          onSelect(lat, lng)
        }} />

        {position && <ChangeView position={position} />}
        
        <LocationMarker />
      </MapContainer>

      <style jsx global>{`
        /* Warna teks di dalam input search */
        .leaflet-control-geosearch form input {
          color: #1e293b !important;
          background-color: white !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          outline: none !important;
        }

        /* Warna teks di dropdown suggest */
        .leaflet-control-geosearch .results > * {
          color: #334155 !important;
          background-color: white !important;
          border-bottom: 1px solid #f1f5f9 !important;
          padding: 10px !important;
          font-size: 12px !important;
          cursor: pointer !important;
          text-align: left !important;
        }

        .leaflet-control-geosearch .results > *:hover {
          background-color: #f8fafc !important;
          color: #2563eb !important;
        }

        .leaflet-control-geosearch form {
          background-color: white !important;
          border-radius: 16px !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
          overflow: hidden !important;
        }

        .leaflet-control-geosearch .results.not-found {
          display: none !important;
        }
      `}</style>
    </div>
  )
}