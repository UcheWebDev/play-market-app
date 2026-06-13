import { createClient } from '@supabase/supabase-js';

const supabaseUrl =  "https://xdmxgynkyodgvbnsbupy.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkbXhneW5reW9kZ3ZibnNidXB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzODUyNjcsImV4cCI6MjA4NDk2MTI2N30.2uLO71jxhA-lfpq0E2bL1KyEE-3n0_0u1ZHmyIremcY";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
