const { getSupabase } = require('../db');

async function requireAuth(req, res, next) {
	try {
		const authHeader = req.headers.authorization || '';
		const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
		if (!token) return res.status(401).json({ error: 'Unauthorized', message: 'Missing Bearer token' });

		const supabase = getSupabase();
		const { data, error } = await supabase.auth.getUser(token);
		if (error || !data || !data.user) return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });

		req.user = data.user;
		return next();
	} catch (err) {
		return res.status(401).json({ error: 'Unauthorized', message: 'Authentication failed' });
	}
}

module.exports = { requireAuth };
