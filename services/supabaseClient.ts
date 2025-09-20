import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://yyjuhqurptaknvyfnpml.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5anVocXVycHRha252eWZucG1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTkzOTcsImV4cCI6MjA3Mzc3NTM5N30.mrF9pqFKAUKE4JjAxeC9chDy6Jy-SB0ls3rIMXRgJMs';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and API key are required.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
