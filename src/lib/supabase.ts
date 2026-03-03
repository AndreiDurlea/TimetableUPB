import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string

export const supabase = createClient<Database>(supabaseUrl, supabasePublishableKey)