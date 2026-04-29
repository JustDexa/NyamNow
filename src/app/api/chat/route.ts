import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Inisialisasi Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

interface ProductContext {
  name: string;
  price: number;
  description: string | null;
  stores: { name: string } | null;
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API Key Groq hilang bejir' }, { status: 500 })

    const { message } = await req.json()

    // 1. Tarik data dari Supabase
    const { data: rawData, error: dbError } = await supabase
      .from('products')
      .select('name, price, description, stores(name)')
      .limit(20)

    if (dbError) throw new Error('Database Supabase error')

    const products = (rawData as unknown) as ProductContext[]
    const productListString = products?.map(p => 
      `- ${p.name} (Rp${p.price.toLocaleString('id-ID')}) di toko ${p.stores?.name || 'NyamNow'}. Desk: ${p.description || '-'}`
    ).join('\n')

    const systemPrompt = `
      Kamu adalah NyamBot, asisten NyamNow yang super gaul dan ramah.
      Tugas kamu merekomendasikan makanan dari katalog di bawah ini.
      
      KATALOG KAMI:
      ${productListString}

      ATURAN:
      1. Jawab pake bahasa santai/gaul (gas, mantap).
      2. Kalo user tanya bahan (sapi, ayam, dll), cari yang cocok di katalog.
      3. Kalo nggak ada, bilang maaf dengan gaya asik terus kasih saran lain.
    `

    // 2. TEMBAK GROQ API (Llama 3.1 8B)
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7
      })
    })

    const groqData = await groqResponse.json()

    if (!groqResponse.ok) {
      console.error('GROQ ERROR:', groqData)
      throw new Error(groqData.error?.message || 'Groq lagi pusing bejir')
    }

    const replyText = groqData.choices[0]?.message?.content || 'NyamBot lagi mikir keras...'

    return NextResponse.json({ text: replyText })

  } catch (error: unknown) {
    console.error('CATCH ERROR:', error)
    let msg = 'Gagal koneksi backend'
    if (error instanceof Error) msg = error.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}