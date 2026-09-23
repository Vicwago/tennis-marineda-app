// DESHABILITADA (23/09/2026). La versión anterior estaba desplegada sin autenticación y con la
// clave de Resend escrita en el código: cualquiera podía mandar correos con la marca del club.
// Los avisos se entregan dentro de la app (tabla notifications). Si algún día se reactiva el
// email: verify_jwt=true, exigir is_admin() con el JWT recibido, y destinatarios resueltos en
// servidor a partir de match_ids (nunca emails ni HTML enviados por el cliente).
Deno.serve(() => new Response(
  JSON.stringify({ error: 'Función deshabilitada. Los avisos se envían dentro de la app.' }),
  { status: 410, headers: { 'Content-Type': 'application/json' } }
));
