import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-[#FDFCF8] overflow-hidden font-sans text-black">
      {/* SIDEBAR DI KIRI (FIXED) */}
      <Sidebar />

      {/* KONTEN KANAN (NAVBAR + MAIN CONTENT) */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        
        {/* AREA HALAMAN UTAMA (SCROLLABLE) */}
        <main className="flex-1 overflow-y-auto bg-[#FDFCF8]">
          {children}
        </main>
      </div>
    </div>
  )
}