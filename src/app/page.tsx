import { redirect } from 'next/navigation'

export default function RootPage() {
  // Langsung pindahin user ke login
  redirect('/login')
  return null 
}