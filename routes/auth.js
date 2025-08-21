const express = require('express');
const { getSupabase } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function mapUser(u) {
	if (!u) return null;
	return {
		id: u.id,
		email: u.email,
		username: u.user_metadata?.username || null,
		created_at: u.created_at,
	};
}

// Register
router.post('/register', async (req, res) => {
	try {
		const { email, password, username } = req.body || {};
		if (!email || !password || !username) return res.status(400).json({ error: 'BadRequest', message: 'email, username and password are required' });

		const supabase = getSupabase();

		// Create user with email confirmation disabled
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: { 
				data: { username },
				emailRedirectTo: null
			}
		});
		if (error) return res.status(400).json({ error: 'SignUpFailed', message: error.message });

		// Immediately sign in the user
		const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
		if (signInError) return res.status(400).json({ error: 'AuthFailed', message: signInError.message });

		return res.status(201).json({
			message: 'Registered and logged in',
			user: mapUser(signInData.user),
			token: signInData.session?.access_token || null
		});
	} catch (err) {
		return res.status(500).json({ error: 'ServerError', message: 'Registration failed' });
	}
});

// Login
router.post('/login', async (req, res) => {
	try {
		console.log('=== LOGIN REQUEST DEBUG ===');
		console.log('Raw body:', req.body);
		console.log('Body type:', typeof req.body);
		console.log('Body keys:', req.body ? Object.keys(req.body) : 'No body');
		console.log('Content-Type:', req.headers['content-type']);
		
		const { email, password } = req.body || {};
		console.log('Extracted email:', email);
		console.log('Extracted password:', password);
		console.log('Email exists:', !!email);
		console.log('Password exists:', !!password);
		
		if (!email || !password) {
			console.log('Validation failed - missing email or password');
			return res.status(400).json({ 
				error: 'BadRequest', 
				message: 'email and password are required',
				received: { email: !!email, password: !!password },
				body: req.body
			});
		}

		console.log('Validation passed, proceeding with Supabase auth...');
		const supabase = getSupabase();
		const { data, error } = await supabase.auth.signInWithPassword({ email, password });
		if (error) return res.status(401).json({ error: 'AuthFailed', message: error.message });

		return res.json({
			message: 'Login successful',
			user: mapUser(data.user),
			token: data.session?.access_token || null
		});
	} catch (err) {
		console.error('Login error:', err);
		return res.status(500).json({ error: 'ServerError', message: 'Login failed' });
	}
});

// Current user
router.get('/me', requireAuth, async (req, res) => {
	return res.json({ user: mapUser(req.user) });
});

module.exports = router;
