// Dedicated password recovery sender; no legacy database calls or mock delivery.
export async function sendTursoAdminResetEmail({ email, token, expiresMinutes }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw Error('RESEND_CREDENTIAL_NOT_CONFIGURED');
  const base = new URL(process.env.ADMIN_RESET_PUBLIC_URL || 'https://tasteofgratitude.shop');
  if (base.protocol !== 'https:' || base.hostname !== 'tasteofgratitude.shop' ||
      base.username || base.password || base.search || base.hash) {
    throw Error('ADMIN_RESET_ORIGIN_UNTRUSTED');
  }
  const link = new URL('/admin/reset-password', base);
  link.searchParams.set('token', token);
  const payload = {
    from: 'Taste of Gratitude Support <support@tasteofgratitude.shop>',
    to: [email],
    subject: 'Reset your Taste of Gratitude admin password',
    html: '<p>A password reset was requested for your Taste of Gratitude admin account.</p><p><a href="' +
      link.href + '">Reset your password</a></p><p>This single-use link expires in ' +
      expiresMinutes + ' minutes. If you did not request this, ignore it.</p>',
    text: 'Reset your Taste of Gratitude admin password: ' + link.href +
      '\n\nThis single-use link expires in ' + expiresMinutes + ' minutes. If you did not request this, ignore it.'
  };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12000)
  });
  if (!res.ok) throw Error('ADMIN_RESET_PROVIDER_REJECTED_' + res.status);
  const json = await res.json();
  if (typeof json?.id !== 'string') throw Error('ADMIN_RESET_PROVIDER_ACK_MISSING');
  return json.id;
}
