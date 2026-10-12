/* global process */
// Envía una notificación al móvil (Web Push) a los dispositivos que manda la base de datos.
// La llama SOLO el trigger notify_push de Supabase (pg_net), con el secreto compartido.
import webpush from 'web-push';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
    const secret = process.env.PUSH_HOOK_SECRET;
    if (!secret || req.headers['x-push-secret'] !== secret) return res.status(401).json({ error: 'unauthorized' });

    let data = req.body;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch { data = {}; } }
    const { title, body, url, tag, subscriptions } = data || {};
    if (!Array.isArray(subscriptions) || subscriptions.length === 0) return res.status(200).json({ sent: 0 });

    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:victor@norteia.es', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const payload = JSON.stringify({ title: title || 'Escuela de Tenis Marineda', body: body || '', url: url || '/', tag: tag || null });

    let sent = 0;
    const gone = [];
    const errors = [];
    await Promise.all(subscriptions.slice(0, 20).map(async (s) => {
        try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 * 3, urgency: 'high' });
            sent++;
        } catch (e) {
            if (e?.statusCode === 404 || e?.statusCode === 410) gone.push(s.endpoint);
            else errors.push(`${e?.statusCode || ''} ${String(e?.body || e?.message || e).slice(0, 120)}`);
        }
    }));

    // Móviles que ya no existen (app desinstalada, avisos quitados): se borran de la base de datos
    if (gone.length) {
        const base = process.env.VITE_SUPABASE_URL;
        const anon = process.env.VITE_SUPABASE_ANON_KEY;
        if (base && anon) {
            try {
                await fetch(`${base}/rest/v1/rpc/push_prune`, {
                    method: 'POST',
                    headers: { apikey: anon, Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ p_secret: secret, p_endpoints: gone })
                });
            } catch { /* se reintentará en el próximo aviso */ }
        }
    }
    return res.status(200).json({ sent, gone: gone.length, errors });
}
