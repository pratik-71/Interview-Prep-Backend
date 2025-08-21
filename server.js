const express = require("express");
const { getSupabase } = require("./db");
const cors = require("cors");
const authRoutes = require('./routes/auth');
const config = require('./config');
const app = express();

// Validate configuration
try {
	config.validate();
	console.log('✅ Configuration validated successfully');
} catch (error) {
	console.error('❌ Configuration validation failed:', error.message);
	process.exit(1);
}

// CORS configuration
app.use(cors({
	origin: function (origin, callback) {
		// Allow requests with no origin (like mobile apps or Postman)
		if (!origin) return callback(null, true);
		
		if (config.cors.allowedOrigins.indexOf(origin) !== -1) {
			callback(null, true);
		} else {
			console.log('🚫 CORS blocked origin:', origin);
			callback(new Error('Not allowed by CORS'));
		}
	},
	credentials: config.cors.credentials,
	methods: config.cors.methods,
	allowedHeaders: config.cors.allowedHeaders,
	preflightContinue: false,
	optionsSuccessStatus: 204
}));

app.use(express.json());

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

const PORT = config.server.port;
const HOST = config.server.host;

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
} catch (error) {
	console.error('❌ Failed to initialize Supabase:', error.message);
	console.error('Please check your environment variables');
}

// Health check endpoint
app.get('/health', (req, res) => {
	res.json({ 
		status: 'healthy',
		timestamp: new Date().toISOString(),
		uptime: process.uptime(),
		environment: process.env.NODE_ENV || 'development'
	});
});

// Test endpoint
app.get('/test', (req, res) => {
	res.json({ 
		message: 'Backend is working!', 
		timestamp: new Date().toISOString(),
		configuration: config.getSummary()
	});
});

// Routes
app.use('/auth', authRoutes);

// 404 handler
app.use('*', (req, res) => {
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
	console.log(`📍 Health check: http://${HOST}:${PORT}/health`);
	console.log(`🧪 Test endpoint: http://${HOST}:${PORT}/test`);
	console.log(`🔐 Auth endpoint: http://${HOST}:${PORT}/auth`);
	console.log('📋 Configuration:', config.getSummary());
});






