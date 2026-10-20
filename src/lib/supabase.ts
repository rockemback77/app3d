import { createClient } from '@supabase/supabase-js';

// URL e anon key são públicas por design (vão no bundle do cliente).
// O acesso aos dados é protegido por Row Level Security no Supabase.
const SUPABASE_URL = 'https://xsfeemdgkdsfdommxztw.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzZmVlbWRna2RzZmRvbW14enR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MTgzNDAsImV4cCI6MjEwODA5NDM0MH0.zl1kdxsza9-qLyqjHXayT7F6Cyarn7_boPhmcSLjIX4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
