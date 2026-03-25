import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = 'jornadas@tenis-marineda.es'; // cambiar por dominio verificado en Resend

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MatchNotification {
  playerName: string;
  playerEmail: string;
  opponentName: string;
  sport: string;
  category: string;
  group: string;
  matchDate?: string;
  matchTime?: string;
}

function buildEmailHtml(match: MatchNotification): string {
  const sportEmoji = match.sport === 'tennis' ? '🎾' : '🏓';
  const sportLabel = match.sport === 'tennis' ? 'Tenis' : 'Pádel';
  const categoryLabel = match.category === 'adults' ? 'Adultos' : 'Juveniles';
  const dateInfo = match.matchDate
    ? `<p style="margin:0 0 6px 0;font-size:15px;color:#334155;"><strong>📅 Fecha:</strong> ${match.matchDate}</p>
       <p style="margin:0 0 6px 0;font-size:15px;color:#334155;"><strong>🕐 Hora:</strong> ${match.matchTime}</p>`
    : `<p style="margin:0 0 6px 0;font-size:15px;color:#64748b;font-style:italic;">Coordina la fecha con tu rival</p>`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva jornada - Escuela de Tenis Marineda</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#2c03f3,#00193f);border-radius:16px 16px 0 0;padding:32px 32px 24px;text-align:center;">
              <p style="margin:0 0 8px 0;font-size:13px;color:#76c1ff;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Escuela de Tenis Marineda</p>
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;">${sportEmoji} Nueva Jornada</h1>
              <p style="margin:8px 0 0 0;font-size:14px;color:rgba(255,255,255,0.7);">${sportLabel} ${categoryLabel} · ${match.group}</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#1e293b;padding:32px;">

              <p style="margin:0 0 24px 0;font-size:16px;color:#94a3b8;">Hola <strong style="color:#fff;">${match.playerName}</strong>,</p>
              <p style="margin:0 0 24px 0;font-size:15px;color:#94a3b8;line-height:1.6;">Se ha generado la jornada semanal. Aquí está tu partido asignado:</p>

              <!-- MATCH CARD -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:12px;border:1px solid rgba(44,3,243,0.4);overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <p style="margin:0 0 4px 0;font-size:11px;color:#76c1ff;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Tu partido</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="text-align:center;padding:16px 8px;">
                          <p style="margin:0 0 4px 0;font-size:18px;font-weight:700;color:#ffffff;">${match.playerName}</p>
                          <p style="margin:0;font-size:11px;color:#76c1ff;text-transform:uppercase;letter-spacing:1px;">Tú</p>
                        </td>
                        <td style="text-align:center;padding:16px 8px;width:60px;">
                          <p style="margin:0;font-size:22px;font-weight:800;color:#2c03f3;">VS</p>
                        </td>
                        <td style="text-align:center;padding:16px 8px;">
                          <p style="margin:0 0 4px 0;font-size:18px;font-weight:700;color:#ffffff;">${match.opponentName}</p>
                          <p style="margin:0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Rival</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px;">
                    ${dateInfo}
                  </td>
                </tr>
              </table>

              <!-- INSTRUCCIONES -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(44,3,243,0.08);border-radius:8px;border-left:3px solid #2c03f3;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:#76c1ff;text-transform:uppercase;letter-spacing:1px;">Recuerda</p>
                    <p style="margin:0 0 6px 0;font-size:14px;color:#94a3b8;">• Ponte en contacto con tu rival para acordar la fecha y hora</p>
                    <p style="margin:0 0 6px 0;font-size:14px;color:#94a3b8;">• El resultado debe registrarse en la app antes del próximo domingo</p>
                    <p style="margin:0;font-size:14px;color:#94a3b8;">• Cualquier duda, contacta con el coordinador del club</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://tennis-padel-app-sigma.vercel.app"
                       style="display:inline-block;background:linear-gradient(135deg,#2c03f3,#00193f);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.5px;">
                      Ver jornada completa →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#0f172a;border-radius:0 0 16px 16px;padding:20px 32px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0 0 4px 0;font-size:12px;color:#475569;">Escuela de Tenis Marineda · A Coruña</p>
              <p style="margin:0;font-size:11px;color:#475569;">App desarrollada por <a href="https://norteia.com" target="_blank" style="color:#76c1ff;text-decoration:none;font-weight:600;">Víctor Mago · NorteIA</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { notifications } = await req.json() as { notifications: MatchNotification[] };

    if (!notifications?.length) {
      return new Response(JSON.stringify({ error: 'No notifications provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const results = await Promise.allSettled(
      notifications.map(async (match) => {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: match.playerEmail,
            subject: `🎾 Tu partido esta semana — ${match.group} · Escuela de Tenis Marineda`,
            html: buildEmailHtml(match),
          }),
        });
        const data = await res.json();
        return { email: match.playerEmail, status: res.ok ? 'sent' : 'failed', data };
      })
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return new Response(JSON.stringify({ sent, failed, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
