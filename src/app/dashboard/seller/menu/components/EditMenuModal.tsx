'use client'
import { useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Camera, Trash2, Save, Upload, Sparkles, PlusCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Product, VariantGroup } from '../page'

export default function EditMenuModal({ 
  menu, 
  onClose, 
  onRefresh 
}: { 
  menu: Product, 
  onClose: () => void, 
  onRefresh: () => void 
}) {
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(menu.image_url)
  
  const [formData, setFormData] = useState<Product>({ ...menu })
  const [flavors, setFlavors] = useState<string[]>(menu.flavors || [])
  const [ingredients, setIngredients] = useState<string[]>(menu.ingredients || [])
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>(menu.variants || [])

  // --- OPSI DINAMIS ---
  const foodFlavorOptions = ['Pedas', 'Manis', 'Gurih', 'Asam', 'Asin', 'Berempah']
  const drinkFlavorOptions = ['Manis', 'Asam', 'Pahit', 'Creamy', 'Segar', 'Fizzy']
  const foodIngredientOptions = ['Ayam', 'Sapi', 'Seafood', 'Telur', 'Nabati', 'Kacang']
  const drinkIngredientOptions = ['Kopi', 'Susu', 'Teh', 'Buah', 'Coklat', 'Soda']

  const flavorOptions = formData.category === 'Minuman' ? drinkFlavorOptions : foodFlavorOptions
  const ingredientOptions = formData.category === 'Minuman' ? drinkIngredientOptions : foodIngredientOptions

  const toggleTag = (list: string[], setList: (val: string[]) => void, tag: string) => {
    if (list.includes(tag)) setList(list.filter(t => t !== tag))
    else setList([...list, tag])
  }

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault(); 
    setLoading(true)
    try {
      let finalImageUrl = formData.image_url
      if (imageFile) {
        const path = `${menu.id}/${Date.now()}.${imageFile.name.split('.').pop()}`
        const { error: uploadError } = await supabase.storage.from('menu-images').upload(path, imageFile)
        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('menu-images').getPublicUrl(path)
        finalImageUrl = data.publicUrl
      }

      const payload = {
        name: formData.name,
        description: formData.description, // Simpan deskripsi
        category: formData.category,
        price: Number(formData.price),
        stock: Number(formData.stock),
        estimated_time: Number(formData.estimated_time),
        is_available: formData.is_available,
        image_url: finalImageUrl,
        flavors,
        ingredients,
        variants: variantGroups
      }

      const { error } = await supabase.from('products').update(payload).eq('id', menu.id)
      if (error) throw error
      onRefresh(); onClose()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal update')
    } finally { setLoading(false) }
  }

  const handleDelete = async () => {
    if (!confirm('Hapus menu permanen?')) return
    setLoading(true)
    try {
      const { error } = await supabase.from('products').delete().eq('id', menu.id)
      if (error) throw error
      onRefresh(); onClose()
    } catch (err: unknown) {
      alert('Gagal menghapus')
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* HEADER */}
        <div className="p-8 border-b flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-[40px]">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Edit Menu 📝</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">ID: {menu.id.slice(0,8)}...</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all active:scale-90">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          {/* PHOTO UPLOAD */}
          <div className="flex flex-col items-center">
            <label className="relative cursor-pointer group">
              <div className="w-28 h-28 bg-slate-50 border-4 border-dashed border-slate-100 rounded-[32px] overflow-hidden flex items-center justify-center group-hover:border-orange-400 transition-all">
                {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="preview" /> : <Camera className="text-slate-300" />}
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={e => {
                const f = e.target.files?.[0]; if(f){setImageFile(f); setPreviewUrl(URL.createObjectURL(f))}
              }}/>
              <div className="absolute -bottom-1 -right-1 bg-slate-900 text-white p-2 rounded-xl border-4 border-white shadow-lg group-hover:bg-orange-500 transition-colors">
                <Upload size={14}/>
              </div>
            </label>
          </div>

          {/* BASIC INFO */}
          <div className="space-y-4">
            
            {/* KATEGORI TOGGLE */}
            <div className="space-y-1.5 w-full text-left">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Kategori</label>
                <div className="flex gap-2">
                    {['Makanan', 'Minuman'].map((cat) => (
                        <button
                            key={cat} type="button" onClick={() => setFormData({ ...formData, category: cat })}
                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all border-2 ${
                                formData.category === cat ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-[1.02]' : 'bg-slate-100 border-transparent text-slate-400 hover:border-slate-300'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* NAMA MENU */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Nama Menu</label>
              <input required className="w-full bg-slate-50 text-slate-700 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-slate-200 focus:bg-white outline-none transition-all" 
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>

            {/* DESKRIPSI MENU */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Deskripsi Menu</label>
              <textarea rows={3} placeholder="Ceritakan detail menu ini..." className="w-full bg-slate-50 text-slate-700 rounded-2xl p-4 text-sm font-bold border-2 border-transparent focus:border-slate-200 focus:bg-white outline-none transition-all resize-none" 
                value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            
            {/* HARGA, STOK, WAKTU */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-tighter">Harga</label>
                <input type="text" inputMode="numeric" className="w-full bg-slate-50 text-slate-700 rounded-xl p-3 text-xs font-bold border-none outline-none" 
                  value={formData.price} onChange={e => setFormData({...formData, price: parseInt(e.target.value.replace(/\D/g, '')) || 0})} />
              </div>
              <div className="col-span-1 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-tighter">Stok</label>
                <input type="text" inputMode="numeric" className="w-full bg-slate-50 text-slate-700 rounded-xl p-3 text-xs font-bold border-none outline-none" 
                  value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value.replace(/\D/g, '')) || 0})} />
              </div>
              <div className="col-span-1 space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-tighter">Waktu (M)</label>
                <input type="text" inputMode="numeric" className="w-full bg-slate-50 text-slate-700 rounded-xl p-3 text-xs font-bold border-none outline-none" 
                  value={formData.estimated_time || 0} onChange={e => setFormData({...formData, estimated_time: parseInt(e.target.value.replace(/\D/g, '')) || 0})} />
              </div>
            </div>
          </div>

          {/* ATTRIBUTES */}
          <div className="space-y-6 bg-slate-50/50 p-6 rounded-[32px] border border-slate-100">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Karakter Rasa</label>
              <div className="flex flex-wrap gap-2">
                {flavorOptions.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleTag(flavors, setFlavors, tag)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${
                      flavors.includes(tag) ? 'bg-orange-500 text-white border-transparent shadow-md scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                    }`}>{tag}</button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Bahan Utama</label>
              <div className="flex flex-wrap gap-2">
                {ingredientOptions.map(tag => (
                  <button key={tag} type="button" onClick={() => toggleTag(ingredients, setIngredients, tag)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${
                      ingredients.includes(tag) ? 'bg-blue-600 text-white border-transparent shadow-md scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                    }`}>{tag}</button>
                ))}
              </div>
            </div>
          </div>

          {/* VARIANTS */}
          <div className="space-y-4 border-t border-slate-100 pt-6">
            <div className="flex justify-between items-end px-1">
                <div>
                    <h3 className="text-xs font-black uppercase italic tracking-tight flex items-center gap-2 text-slate-800"><Sparkles size={14} className="text-orange-500"/> Kustomisasi Varian</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">Topping / Level / Pilihan</p>
                </div>
                <button type="button" onClick={() => setVariantGroups([...variantGroups, { group_name: '', options: [{ name: '', extra_price: 0 }] }])} 
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-orange-600 transition-all active:scale-95 shadow-md">
                    + Grup Baru
                </button>
            </div>

            <AnimatePresence>
                {variantGroups.map((group, gIdx) => (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={gIdx} className="bg-white border-2 border-slate-100 p-5 rounded-[28px] space-y-4 relative shadow-sm">
                        <button type="button" onClick={() => setVariantGroups(variantGroups.filter((_, i) => i !== gIdx))} 
                            className="absolute -top-2 -right-2 bg-white shadow-md text-red-500 p-1.5 rounded-full border border-slate-100 hover:bg-red-50 z-10"><X size={14}/></button>
                        
                        <input placeholder="Nama Grup (e.g. Pilih Sambal)" className="w-full bg-slate-50 rounded-xl p-3 text-xs font-black uppercase outline-none border-2 border-transparent focus:border-slate-200 focus:bg-white transition-all shadow-inner" 
                            value={group.group_name} onChange={e => { const n = [...variantGroups]; n[gIdx].group_name = e.target.value; setVariantGroups(n) }} />

                        <div className="space-y-3">
                            <div className="grid grid-cols-12 gap-2 px-1">
                                <div className="col-span-7 text-[8px] font-black text-slate-400 uppercase tracking-widest">Nama Opsi</div>
                                <div className="col-span-4 text-[8px] font-black text-slate-400 uppercase tracking-widest">Harga Tambah</div>
                            </div>
                            {group.options.map((opt, oIdx) => (
                                <div key={oIdx} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-7">
                                        <input placeholder="Opsi" className="w-full bg-slate-50/50 rounded-lg p-2.5 text-xs font-bold outline-none border border-slate-100 focus:bg-white focus:border-orange-200 transition-all" 
                                            value={opt.name} onChange={e => { const n = [...variantGroups]; n[gIdx].options[oIdx].name = e.target.value; setVariantGroups(n) }} />
                                    </div>
                                    <div className="col-span-4 relative flex items-center">
                                        <span className="absolute left-2.5 text-[10px] font-bold text-slate-400">+</span>
                                        <input type="text" inputMode="numeric" placeholder="0" className="w-full bg-slate-50/50 rounded-lg p-2.5 pl-5 text-xs font-bold font-mono outline-none border border-slate-100 focus:bg-white focus:border-orange-200 text-orange-600 transition-all" 
                                            value={opt.extra_price} onChange={e => { const n = [...variantGroups]; n[gIdx].options[oIdx].extra_price = parseInt(e.target.value.replace(/\D/g, '')) || 0; setVariantGroups(n) }} />
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        <button type="button" onClick={() => { const n = [...variantGroups]; n[gIdx].options = n[gIdx].options.filter((_, i) => i !== oIdx); setVariantGroups(n) }} 
                                            className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={() => { const n = [...variantGroups]; n[gIdx].options.push({ name: '', extra_price: 0 }); setVariantGroups(n) }} 
                                className="flex items-center gap-1.5 text-[9px] font-black text-orange-500 uppercase tracking-[0.2em] mt-1 hover:translate-x-1 transition-all">
                                <PlusCircle size={12}/> Tambah Opsi
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </form>

        {/* FOOTER */}
        <div className="p-8 bg-slate-50 border-t rounded-b-[40px] flex flex-col gap-3">
          <button type="submit" onClick={handleUpdate} disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-[0.3em] shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
            {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <><Save size={18}/> Update Menu</>}
          </button>
          <button type="button" onClick={handleDelete} disabled={loading} className="text-red-500 font-black text-[10px] uppercase tracking-[0.2em] py-2 hover:underline disabled:opacity-50 text-center flex items-center justify-center gap-1">
            <Trash2 size={12}/> Hapus Menu Permanen
          </button>
        </div>
      </motion.div>
    </div>
  )
}