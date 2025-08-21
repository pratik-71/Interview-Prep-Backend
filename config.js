// Backend Configuration
require('dotenv').config();

const config = {
	// Server configuration
	server: {
		port: process.env.PORT || 10000,
		host: process.env.HOST || '0.0.0.0',
		environment: process.env.NODE_ENV || 'development'
	},

	// Supabase configuration
	supabase: {
		url: process.env.SUPABASE_URL || process.env.DATABASE_URL,
		anonKey: process.env.SUPABASE_ANON_KEY || process.env.DATABASE_ANON_URL,
		serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	},

	// CORS configuration
	cors: {
		allowedOrigins: [
			'http://localhost:3000',           // Local development
			'http://localhost:3001',           // Alternative local port
			'https://interview-prep-backend-viok.onrender.com', // Production backend
			'https://prepmaster.vercel.app',   // If you deploy frontend to Vercel
			'https://prepmaster.netlify.app'   // If you deploy frontend to Netlify
		],
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
	},

	// Validation
	validate: function() {
		const errors = [];
		
		if (!this.supabase.url) {
			errors.push('SUPABASE_URL is required');
		}
		
		if (!this.supabase.anonKey && !this.supabase.serviceRoleKey) {
			errors.push('Either SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY is required');
		}
		
		if (errors.length > 0) {
			throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
		}
		
		return true;
	},

	// Get configuration summary
	getSummary: function() {
		return {
			server: {
				port: this.server.port,
				host: this.server.host,
				environment: this.server.environment
			},
			supabase: {
				url: this.supabase.url ? 'Set' : 'Missing',
				anonKey: this.supabase.anonKey ? 'Set' : 'Missing',
				serviceRoleKey: this.supabase.serviceRoleKey ? 'Set' : 'Missing'
			},
			cors: {
				allowedOrigins: this.cors.allowedOrigins,
				credentials: this.cors.credentials
			}
		};
	}
};

module.exports = config;
