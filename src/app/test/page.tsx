'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleRegister = async () => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    console.log(error)
    return
  }

  // CEK USER
  if (!data.user) {
    console.log('User null')
    return
  }

  const user = data.user

  await supabase.from('users').insert([
    {
    id: user.id,
    email: user.email,
    role: 'buyer',
    seller_type: null,
    },
  ])

  console.log('REGISTER SUCCESS')
}

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log('LOGIN:', data, error)
  }

  const checkUser = async () => {
    const { data } = await supabase.auth.getUser()
    console.log('USER:', data)
  }

  return (
    <div className="p-10 flex flex-col gap-3">
      <input
        placeholder="email"
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2"
      />

      <input
        placeholder="password"
        type="password"
        onChange={(e) => setPassword(e.target.value)}
        className="border p-2"
      />

      <button onClick={handleRegister} className="bg-black text-white p-2">
        Register
      </button>

      <button onClick={handleLogin} className="bg-blue-500 text-white p-2">
        Login
      </button>

      <button onClick={checkUser} className="bg-green-500 text-white p-2">
        Check User
      </button>
      <button onClick={() => alert('klik')}>
  TEST
</button>
    </div>
  )
}