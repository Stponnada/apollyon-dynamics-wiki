/* Public Supabase connection for the wiki. This is the SAME project Lighthouse signs in against, so
   employees use their Lighthouse credentials. Both values are public by design (the anon key only
   grants what RLS allows); the service-role key must never appear in this repo. */
export const SUPABASE_URL = 'https://ksduthezfybznuxmdbbo.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZHV0aGV6Znliem51eG1kYmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyODg3NDUsImV4cCI6MjA5NDg2NDc0NX0.6PPiphZris38iX84s4H78_WKAWBbmiJ-3bwHWFgQPu4';
