const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load .env from project root, then from backend folder (backend overrides if present)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

let supabaseClient;

function getSupabase() {
	if (!supabaseClient) {
		const supabaseUrl =
			process.env.SUPABASE_URL ||
			process.env.DATABASE_URL;

		const supabaseKey =
			process.env.SUPABASE_SERVICE_ROLE_KEY ||
			process.env.SUPABASE_ANON_KEY ||
			process.env.DATABASE_ANON_URL;

		if (!supabaseUrl || !supabaseKey) {
			throw new Error(
				"Missing Supabase env. Set SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env (project root or backend/.env)."
			);
		}

		supabaseClient = createClient(supabaseUrl, supabaseKey, {
			auth: { 
				autoRefreshToken: true,  // Enable auto-refresh
				persistSession: true,    // Enable session persistence
				detectSessionInUrl: false // Don't detect session in URL
			},
			db: { schema: 'public' },
		});
	}
	return supabaseClient;
}

module.exports = { getSupabase };
