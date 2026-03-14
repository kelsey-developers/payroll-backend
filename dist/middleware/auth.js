"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL ?? 'http://localhost:3000';
/**
 * Validates the Bearer token by calling auth-service /api/auth/userinfo.
 * Attaches req.user = { id, email, firstName, lastName, roles, ... } on success.
 * Returns 401 if token missing or invalid.
 */
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authorization token required' });
        return;
    }
    const token = authHeader.substring(7);
    try {
        const resp = await fetch(`${AUTH_SERVICE_URL}/api/auth/userinfo`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            res.status(resp.status).json(err.error ? { error: err.error } : { error: 'Invalid or expired token' });
            return;
        }
        const user = await resp.json();
        req.user = user;
        next();
    }
    catch (e) {
        console.error('Auth middleware error:', e);
        res.status(500).json({ error: 'Authentication service unavailable' });
    }
}
