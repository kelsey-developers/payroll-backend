"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSites = getSites;
exports.createSite = createSite;
const supabase_1 = require("../lib/supabase");
// GET /api/sites
async function getSites(_req, res) {
    const { data, error } = await supabase_1.supabase
        .from('sites')
        .select('*')
        .order('site_id', { ascending: true });
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.json(data ?? []);
}
// POST /api/sites
// Body: { site_id, name, latitude?, longitude?, radius_m? }
async function createSite(req, res) {
    const { site_id, name, latitude, longitude, radius_m } = req.body;
    if (!site_id || !name) {
        res.status(400).json({ error: 'site_id and name are required' });
        return;
    }
    const { data, error } = await supabase_1.supabase
        .from('sites')
        .insert({
        site_id,
        name,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        radius_m: radius_m ?? 200,
    })
        .select()
        .single();
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    res.status(201).json(data);
}
