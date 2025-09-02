const express = require("express");
const { getSupabase } = require("./db");
const cors = require("cors");
const authRoutes = require('./routes/auth');
const analyticsRoutes = require('./routes/analytics');
const app = express();

// Configuration check

// CORS configuration - simplified for now
app.use(cors({
	origin: true, // Allow all origins temporarily
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// Body parsing middleware with specific options
app.use(express.json({
	limit: '10mb'
}));

// Also parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (production-ready)
app.use((req, res, next) => {
	// Log only essential request info in production
	next();
});

const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

// Initialize Supabase (throws if env is missing)
try {
	getSupabase();
	
	// Check if required environment variables are missing
	if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
		// Environment variables missing - server will start but auth may not work
	}
} catch (error) {
	// Supabase initialization failed - server will start but auth will not work
}



// Routes
app.use('/auth', authRoutes);
app.use('/analytics', analyticsRoutes);

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
	res.status(500).json({ 
		error: 'Internal Server Error', 
		message: error.message || 'Something went wrong',
		timestamp: new Date().toISOString()
	});
});

app.listen(PORT, HOST, () => {
	console.log(`🚀 Backend server is running on http://${HOST}:${PORT}`);
	console.log(`📊 Analytics API: http://${HOST}:${PORT}/analytics`);
	console.log(`🔐 Auth API: http://${HOST}:${PORT}/auth`);
	console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
});






