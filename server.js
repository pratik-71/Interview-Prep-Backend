const express = require("express");
const { getSupabase } = require("./db");
const cors = require("cors");
const authRoutes = require('./routes/auth');
const app = express();

app.use(express.json());

// CORS
app.use(cors({
	origin: [
		process.env.FRONTEND_URL || 'http://localhost:3000',
		'http://localhost:3001'
	],
	credentials: true
}));

const PORT = process.env.PORT || 3000;

// Initialize Supabase (throws if env is missing)
getSupabase();

// Routes
app.use('/auth', authRoutes);

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});






