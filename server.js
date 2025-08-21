const express = require("express");
const { getSupabase } = require("./db");
const cors = require("cors");
const authRoutes = require('./routes/auth');
const app = express();

// CORS - Allow all origins for now (you can restrict this later)
app.use(cors({
	origin: true, // Allow all origins
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
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

const PORT = process.env.PORT || 3000;

// Initialize Supabase (throws if env is missing)
getSupabase();

// Test endpoint
app.get('/test', (req, res) => {
	res.json({ 
		message: 'Backend is working!', 
		timestamp: new Date().toISOString(),
		env: {
			SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Missing',
			SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'Set' : 'Missing',
			NODE_ENV: process.env.NODE_ENV || 'Not set'
		}
	});
});

// Routes
app.use('/auth', authRoutes);

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});






