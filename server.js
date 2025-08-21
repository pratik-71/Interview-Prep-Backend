const express = require("express");
const { getSupabase } = require("./db");
const cors = require("cors");
const authRoutes = require('./routes/auth');
const app = express();

// Configuration check
console.log('✅ Server configuration loaded');

// CORS configuration - simplified for now
app.use(cors({
	origin: true, // Allow all origins temporarily
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// Body parsing middleware with specific options
app.use(express.json({
	limit: '10mb',
	verify: (req, res, buf) => {
		console.log('🔍 Raw body buffer length:', buf.length);
		console.log('🔍 Raw body buffer:', buf.toString());
	}
}));

// Also parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware - log all requests
app.use((req, res, next) => {
	console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
	console.log('Headers:', req.headers);
	console.log('Body:', req.body);
	console.log('Body type:', typeof req.body);
	console.log('Body keys:', req.body ? Object.keys(req.body) : 'No body');
	console.log('Content-Type:', req.headers['content-type']);
	next();
});

const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

// Initialize Supabase (throws if env is missing)
try {
	getSupabase();
	console.log('✅ Supabase initialized successfully');
	console.log('Environment check:', {
		SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Missing',
		SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'Set' : 'Missing',
		SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
		PORT: process.env.PORT || 10000
	});
	
	// Check if required environment variables are missing
	if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
		console.warn('⚠️  Warning: Some Supabase environment variables are missing');
		console.warn('   The server will start but authentication may not work properly');
		console.warn('   Please set SUPABASE_URL and either SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY');
	}
} catch (error) {
	console.error('❌ Failed to initialize Supabase:', error.message);
	console.error('Please check your environment variables');
	console.warn('⚠️  Server will continue to start but authentication will not work');
}



// Routes
app.use('/auth', authRoutes);

// 404 handler - use proper catch-all pattern
app.use((req, res) => {
	res.status(404).json({ 
		error: 'Not Found', 
		message: `Route ${req.originalUrl} not found`,
		timestamp: new Date().toISOString()
	});
});

// Error handling middleware
app.use((error, req, res, next) => {
	console.error('❌ Server error:', error);
	res.status(500).json({ 
		error: 'Internal Server Error', 
		message: error.message || 'Something went wrong',
		timestamp: new Date().toISOString()
	});
});

app.listen(PORT, HOST, () => {
	console.log(`🚀 Server is running on ${HOST}:${PORT}`);
	console.log(`🔐 Auth endpoint: http://${HOST}:${PORT}/auth`);
	console.log('📋 Environment variables checked');
});






