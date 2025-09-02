const { getSupabase } = require('../db');

async function requireAuth(req, res, next) {
	try {
		const authHeader = req.headers.authorization || '';
		const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
		

		
		if (!token) return res.status(401).json({ error: 'Unauthorized', message: 'Missing Bearer token' });

		const supabase = getSupabase();
		// First try to get user with current token
		let { data, error } = await supabase.auth.getUser(token);
		
		// If token is expired, try to refresh it
		if (error && error.message && error.message.includes('expired')) {
			try {
				// Try to refresh the token
				const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
				if (!refreshError && refreshData.session) {
					data = refreshData;
					error = null;
				}
			} catch (refreshErr) {
				// Token refresh failed, continue with error
			}
		}
		
		if (error || !data || !data.user) return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });

		req.user = data.user;
		return next();
	} catch (err) {
		return res.status(401).json({ error: 'Unauthorized', message: 'Authentication failed' });
	}
}

module.exports = { requireAuth };
