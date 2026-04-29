'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Home, Utensils, ClipboardList, BarChart, User } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { icon: Home, path: '/dashboard/seller' },
    { icon: Utensils, path: '/dashboard/seller/menu' },
    { icon: ClipboardList, path: '/dashboard/seller/orders' },
    { icon: BarChart, path: '/dashboard/seller/statistik' },
    { icon: User, path: '/dashboard/seller/profile' },
  ]

  return (
    <div className="w-24 h-full bg-[#CBAE81] flex flex-col items-center py-6 shadow-md z-20">
      <div className="flex-1 flex flex-col items-center gap-6 mt-20 w-full">
        {navItems.map((item, idx) => {
          const isActive = pathname === item.path
          const Icon = item.icon
          
          return (
            <div 
              key={idx} 
              onClick={() => router.push(item.path)}
              className="w-full flex justify-center relative cursor-pointer group"
            >
              {/* Indikator Active (Kotak Gelap) */}
              {isActive && (
                <div className="absolute left-2 right-0 top-0 bottom-0 bg-[#3D3A40] rounded-l-2xl z-0" />
              )}
              
              <div className={`relative z-10 p-3 rounded-xl transition-colors ${isActive ? 'text-[#CBAE81]' : 'text-white hover:bg-white/20'}`}>
                <Icon size={24} strokeWidth={isActive ? 3 : 2} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}