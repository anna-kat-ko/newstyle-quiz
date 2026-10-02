// Vercel Function: приймає заявку з квізу і пересилає в Telegram від @NewStyleKyiv_bot.
// Змінні оточення у Vercel (Settings → Environment Variables): BOT_TOKEN, CHAT_ID.

const esc = s => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])).slice(0, 300);

export async function POST(req) {
  const env = process.env;
  if (!env.BOT_TOKEN || !env.CHAT_ID) return Response.json({ ok: false, error: 'BOT_TOKEN/CHAT_ID not set' }, { status: 500 });

  let d;
  try { d = await req.json(); } catch { return Response.json({ ok: false, error: 'bad json' }, { status: 400 }); }
  if (!d.name || !(d.phone || d.telegram)) return Response.json({ ok: false, error: 'name + phone required' }, { status: 400 });
  if (d.location === 'Інша область') return Response.json({ ok: false, error: 'out of region' }, { status: 422 });

  // Бот-телефоніст (BOT_URL + FORM_SECRET): сам напише в Telegram, запише в таблицю й подзвонить клієнту
  // (заявки лише з Telegram-ніком теж ідуть у таблицю, просто без дзвінка).
  // Якщо бот не задано або недоступний — шлемо в Telegram як раніше, щоб заявка не загубилась.
  if (env.BOT_URL && env.FORM_SECRET) {
    try {
      const r = await fetch(`${env.BOT_URL.replace(/\/$/, '')}/api/lead`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-form-secret': env.FORM_SECRET },
        body: JSON.stringify({
          name: d.name, phone: d.phone, source: 'quiz',
          details: {
            'Локація': d.location, 'Площа': d.area, 'Полотно': d.canvas, 'Освітлення': d.light,
            'Надіслати в': d.messenger, 'Telegram': d.telegram && `@${d.telegram}`,
            'UTM': Object.entries(d.utm || {}).filter(([k]) => k.startsWith('utm_')).map(([k, v]) => `${k.slice(4)}: ${v}`).join(', '),
          },
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) return Response.json({ ok: true });
      console.error('bot-telefonist', r.status, await r.text());
    } catch (e) { console.error('bot-telefonist', e); }
  }

  const utm = Object.entries(d.utm || {}).filter(([k]) => k.startsWith('utm_')).map(([k, v]) => `${k.slice(4)}: ${esc(v)}`).join(', ');
  const lines = [
    '🆕 <b>Заявка з квізу — натяжні стелі</b>',
    '',
    `👤 ${esc(d.name)}`,
    d.phone && `📞 ${esc(d.phone)}`,
    d.telegram && `✈️ @${esc(d.telegram)} — https://t.me/${encodeURIComponent(d.telegram)}`,
    `💬 Надіслати в: <b>${esc(d.messenger)}</b>`,
    '',
    d.location && `📍 Локація: ${esc(d.location)}`,
    `📐 Площа: ${esc(d.area)}`,
    `🎨 Полотно: ${esc(d.canvas)}`,
    `💡 Освітлення: ${esc(d.light)}`,
    utm && `\n📊 ${utm}`,
  ].filter(Boolean);

  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: env.CHAT_ID, text: lines.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!r.ok) console.error('telegram', r.status, await r.text());
  return Response.json({ ok: r.ok }, { status: r.ok ? 200 : 502 });
}
