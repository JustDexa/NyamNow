'use client'
import { useState, useRef, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Camera, Trash2, Plus, UtensilsCrossed, Clock, Sparkles, PlusCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { VariantGroup } from '../page'

// --- 1. TYPES & INTERFACES ---
interface InputGroupProps {
    label: string
    placeholder: string
    type?: string
    value: string | number | undefined
    onChange: (v: string) => void
}

interface TagSelectorProps {
    label: string
    options: string[]
    selected: string[]
    onToggle: (tag: string) => void
    color: string
}

// --- 2. SUB-COMPONENTS ---
function InputGroup({ label, placeholder, type = "text", value, onChange }: InputGroupProps) {
    return (
        <div className="space-y-1.5 w-full text-left">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">{label}</label>
            <input 
                type={type} 
                placeholder={placeholder} 
                value={value === undefined ? '' : value} 
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-black border-2 border-transparent focus:border-orange-200 focus:bg-white transition-all outline-none shadow-inner" 
            />
        </div>
    )
}

function TagSelector({ label, options, selected, onToggle, color }: TagSelectorProps) {
    return (
        <div className="space-y-2 text-left">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">{label}</label>
            <div className="flex flex-wrap gap-2">
                {options.map((tag) => {
                    const isActive = selected.includes(tag)
                    return (
                        <button key={tag} type="button" onClick={() => onToggle(tag)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${
                                isActive ? `${color} border-transparent text-white shadow-md scale-105` : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                            }`}
                        >
                            {tag}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// --- 3. MAIN MODAL ---
export default function AddMenuModal({ storeId, onClose, onRefresh }: { storeId: string, onClose: () => void, onRefresh: () => void }) {
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Makanan',
    price: 0,
    stock: 20,
    estimated_time: 15,
    description: '',
  })

    const [flavors, setFlavors] = useState<string[]>([])
    const [ingredients, setIngredients] = useState<string[]>([])
    const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([])

    // --- OPTIONS DINAMIS ---
    const foodFlavorOptions = ['Pedas', 'Manis', 'Gurih', 'Asam', 'Asin', 'Berempah']
    const drinkFlavorOptions = ['Manis', 'Asam', 'Pahit', 'Creamy', 'Segar', 'Fizzy']

    const foodIngredientOptions = ['Ayam', 'Sapi', 'Seafood', 'Telur', 'Nabati', 'Kacang','Bebek']
    const drinkIngredientOptions = ['Kopi', 'Susu', 'Teh', 'Buah', 'Coklat', 'Soda']

    const flavorOptions =
    formData.category === 'Minuman'
        ? drinkFlavorOptions
        : foodFlavorOptions

    const ingredientOptions =
    formData.category === 'Minuman'
        ? drinkIngredientOptions
        : foodIngredientOptions

  const toggleTag = (list: string[], setList: (val: string[]) => void, tag: string) => {
    if (list.includes(tag)) setList(list.filter(t => t !== tag))
    else setList([...list, tag])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); 
    if(!imageFile) return alert('Upload foto menu dulu!')
    
    setLoading(true)
    try {
      const fileExt = imageFile.name.split('.').pop()
      const filePath = `${storeId}/${Date.now()}.${fileExt}`
      
      const { error: uploadErr } = await supabase.storage.from('menu-images').upload(filePath, imageFile)
      if (uploadErr) throw uploadErr
      
      const finalImageUrl = supabase.storage.from('menu-images').getPublicUrl(filePath).data.publicUrl

      const payload = {
        ...formData,
        price: Number(formData.price),
        stock: Number(formData.stock),
        estimated_time: Number(formData.estimated_time),
        flavors,
        ingredients,
        variants: variantGroups,
        image_url: finalImageUrl,
        store_id: storeId
      }

      const { error } = await supabase.from('products').insert([payload])
      if (error) throw error
      onRefresh(); 
      onClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error simpan data'
      alert(errorMessage)
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 text-slate-900">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* HEADER */}
        <div className="px-8 py-5 border-b flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-2.5 rounded-2xl text-orange-400 rotate-3 shadow-lg"><UtensilsCrossed size={20} /></div>
            <div>
                <h2 className="text-xl font-[1000] uppercase italic tracking-tighter leading-none">Tambah <span className="text-orange-500">Menu</span></h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Konfigurasi produk kuliner</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 hover:bg-red-50 hover:text-red-500 rounded-2xl text-slate-400 transition-all active:scale-90"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
          
          {/* MEDIA & BASIC INFO */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4 text-center space-y-2">
                <div 
                    onClick={() => fileInputRef.current?.click()} 
                    className="group relative aspect-square bg-slate-50 rounded-[32px] border-4 border-dashed border-slate-100 cursor-pointer hover:border-orange-400 overflow-hidden flex flex-col items-center justify-center transition-all"
                >
                  {previewUrl ? (
                    <img src={previewUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Preview" />
                  ) : (
                      <>
                        <Camera className="text-slate-300 mb-2" size={32} />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Upload Foto</span>
                      </>
                  )}
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={e => {
                    const f = e.target.files?.[0]; if(f){setImageFile(f); setPreviewUrl(URL.createObjectURL(f))}
                  }}/>
                </div>
            </div>
            <div className="md:col-span-8 space-y-4">
                <div className="space-y-1.5 w-full text-left">
        <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Kategori</label>
                <div className="flex gap-2">
                    {['Makanan', 'Minuman'].map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setFormData({ ...formData, category: cat })}
                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all border-2 ${
                                formData.category === cat 
                                    ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-[1.02]' 
                                    : 'bg-slate-100 border-transparent text-slate-400 hover:border-slate-300'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
                <InputGroup label="Nama Menu" placeholder="Nama menu" value={formData.name} onChange={(v) => setFormData({...formData, name: v})} />
                <div className="space-y-1.5 w-full text-left">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Deskripsi Menu</label>
                <textarea 
                    placeholder="Ceritakan kelezatan menu ini..." 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full bg-slate-100 rounded-xl px-4 py-3 text-sm font-bold text-black border-2 border-transparent focus:border-orange-200 focus:bg-white transition-all outline-none shadow-inner resize-none" 
                />
            </div>
                <div className="grid grid-cols-3 gap-3">
                <InputGroup
                    label="Harga (Rp)"
                    type="text"
                    placeholder="0"
                    value={formData.price}
                    onChange={(v) => {
                    const onlyNumber = v.replace(/\D/g, '')
                    setFormData({ ...formData, price: parseInt(onlyNumber) || 0 })
                    }}
                />

                <InputGroup
                    label="Stok"
                    type="text"
                    placeholder="20"
                    value={formData.stock}
                    onChange={(v) => {
                    const onlyNumber = v.replace(/\D/g, '')
                    setFormData({ ...formData, stock: parseInt(onlyNumber) || 0 })
                    }}
                />

                <InputGroup
                    label="Masak (Min)"
                    type="text"
                    placeholder="15"
                    value={formData.estimated_time}
                    onChange={(v) => {
                    const onlyNumber = v.replace(/\D/g, '')
                    setFormData({ ...formData, estimated_time: parseInt(onlyNumber) || 0 })
                    }}
                />
                </div>  
            </div>
          </div>

          {/* ATTRIBUTES */}
          <div className="grid grid-cols-1 gap-6 p-6 bg-slate-50/50 rounded-[32px] border border-slate-100">
            <TagSelector label="Karakter Rasa" options={flavorOptions} selected={flavors} onToggle={(t) => toggleTag(flavors, setFlavors, t)} color="bg-orange-500" />
            <TagSelector label="Bahan Utama" options={ingredientOptions} selected={ingredients} onToggle={(t) => toggleTag(ingredients, setIngredients, t)} color="bg-blue-600" />
          </div>

          {/* VARIANTS - IMPROVED UX */}
          <div className="space-y-4">
            <div className="flex justify-between items-end px-2">
                <div>
                    <h3 className="text-sm font-[1000] uppercase italic tracking-tight flex items-center gap-2 text-slate-800">
                        <Sparkles size={16} className="text-orange-500"/> Varian Tambahan
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">Tentukan Topping atau Level</p>
                </div>
                <button 
                    type="button" 
                    onClick={() => setVariantGroups([...variantGroups, { group_name: '', options: [{ name: '', extra_price: 0 }] }])} 
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-orange-600 transition-all active:scale-95 shadow-md"
                >
                    <Plus size={14}/> Tambah Grup
                </button>
            </div>

            <AnimatePresence>
                {variantGroups.map((group, gIdx) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        key={gIdx} 
                        className="bg-white border-2 border-slate-100 p-5 rounded-[28px] space-y-4 relative shadow-sm"
                    >
                        <button 
                            type="button" 
                            onClick={() => setVariantGroups(variantGroups.filter((_, i) => i !== gIdx))} 
                            className="absolute -top-2 -right-2 bg-white shadow-md text-red-500 p-1.5 rounded-full border border-slate-100 hover:bg-red-50 z-10"
                        >
                            <X size={14}/>
                        </button>
                        
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nama Grup Varian</label>
                            <input 
                                placeholder="Contoh: Pilih Topping" 
                                className="w-full bg-slate-50 rounded-xl p-3 text-xs font-black uppercase outline-none border-2 border-transparent focus:border-slate-200 focus:bg-white transition-all shadow-inner" 
                                value={group.group_name} 
                                onChange={e => { const n = [...variantGroups]; n[gIdx].group_name = e.target.value; setVariantGroups(n) }} 
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-12 gap-2 px-1">
                                <div className="col-span-7 text-[8px] font-black text-slate-400 uppercase tracking-widest">Nama Opsi</div>
                                <div className="col-span-4 text-[8px] font-black text-slate-400 uppercase tracking-widest">Harga Tambah</div>
                            </div>
                            {group.options.map((opt, oIdx) => (
                                <div key={oIdx} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-7">
                                        <input 
                                            placeholder="E.g. Ekstra Keju" 
                                            className="w-full bg-slate-50/50 rounded-lg p-2.5 text-xs font-bold outline-none border border-slate-100 focus:bg-white focus:border-orange-200 transition-all" 
                                            value={opt.name} 
                                            onChange={e => { const n = [...variantGroups]; n[gIdx].options[oIdx].name = e.target.value; setVariantGroups(n) }} 
                                        />
                                    </div>
                                    <div className="col-span-4 relative flex items-center">
                                        <span className="absolute left-2.5 text-[10px] font-bold text-slate-400">+</span>
                                        <input 
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="0"
                                            className="w-full bg-slate-50/50 rounded-lg p-2.5 pl-5 text-xs font-bold outline-none border border-slate-100 focus:bg-white focus:border-orange-200 text-orange-600 transition-all font-mono"
                                            value={opt.extra_price}
                                            onChange={(e) => {
                                                const onlyNumber = e.target.value.replace(/\D/g, '')
                                                const n = [...variantGroups]
                                                n[gIdx].options[oIdx].extra_price = parseInt(onlyNumber) || 0
                                                setVariantGroups(n)
                                            }}
                                            />
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        {group.options.length > 1 && (
                                            <button 
                                                type="button" 
                                                onClick={() => { const n = [...variantGroups]; n[gIdx].options = n[gIdx].options.filter((_, i) => i !== oIdx); setVariantGroups(n) }} 
                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={14}/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <button 
                                type="button" 
                                onClick={() => { const n = [...variantGroups]; n[gIdx].options.push({ name: '', extra_price: 0 }); setVariantGroups(n) }} 
                                className="flex items-center gap-1.5 text-[9px] font-black text-orange-500 uppercase tracking-[0.2em] mt-2 hover:translate-x-1 transition-all"
                            >
                                <PlusCircle size={12}/> Tambah Opsi
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </form>

        {/* FOOTER */}
        <div className="p-8 bg-slate-50 border-t backdrop-blur-sm">
            <button 
                type="button" 
                onClick={handleSubmit} 
                disabled={loading} 
                className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-[1000] uppercase text-[11px] tracking-[0.3em] shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                    <>Simpan Menu Sekarang</>
                )}
            </button>
        </div>
      </motion.div>
    </div>
  )
}