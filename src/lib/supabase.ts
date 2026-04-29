import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://tptstggeqppqmqvsnqor.supabase.co'
const supabaseKey = 'sb_publishable_9CouqQigANgv-XDFetrz5g_THkKqY-O'

export const supabase = createClient(supabaseUrl, supabaseKey)