// Vercel Function: приймає анкету кандидата з лендінгів вакансій (/vakansiya — монтажник, /pidsobnyk — role: 'helper') і пересилає в Telegram (@NewStyleKyiv_bot).
// Змінні оточення у Vercel: BOT_TOKEN, CHAT_ID; VACANCY_CHAT_ID — необов'язково, окремий чат для кандидатів.

const esc = s => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])).slice(0, 300);
const TIER = { A: '🔥 ГАРЯЧИЙ — підходить', B: '👍 ТЕПЛИЙ — уточнити на дзвінку', C: '❄️ ХОЛОДНИЙ — не пріоритет' };

export async function POST(req) {
  const env = process.env;
  const chat = env.VACANCY_CHAT_ID || env.CHAT_ID;
  if (!env.BOT_TOKEN || !chat) return Response.json({ ok: false, error: 'BOT_TOKEN/CHAT_ID not set' }, { status: 500 });

  let d;
  try { d = await req.json(); } catch { return Response.json({ ok: false, error: 'bad json' }, { status: 400 }); }
  if (!d.name || !d.phone) return Response.json({ ok: false, error: 'name + phone required' }, { status: 400 });

  const utm = Object.entries(d.utm || {}).map(([k, v]) => `${k.replace('utm_', '')}: ${esc(v)}`).join(', ');
  const answers = (Array.isArray(d.answers) ? d.answers : []).slice(0, 12)
    .map(a => `▫️ ${esc(a.q)}\n     <b>${esc(a.a)}</b>`).join('\n');
  const lines = [
    d.role === 'helper' ? '🧰 <b>Кандидат — підсобник у бригаду</b>' : '👷 <b>Кандидат — монтажник натяжних стель (з досвідом)</b>',
    (TIER[d.tier] || esc(d.tier)) + (d.score ? ` · бали ${esc(d.score)}` : ''),
    '',
    `👤 ${esc(d.name)}`,
    `📞 ${esc(d.phone)}`,
    `💬 Зв'язок: <b>${esc(d.messenger)}</b>`,
    d.portfolio && `📸 Роботи: ${esc(d.portfolio)}`,
    '',
    answers,
    utm && `\n📊 ${utm}`,
  ].filter(x => typeof x === "string");

  const send = (chat_id, text) => fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  let r = await send(chat, lines.join('\n'));
  // Група кандидатів недоступна (бота прибрали / змінився ID) — шлемо в основний чат, щоб анкета не загубилась.
  if (!r.ok && env.CHAT_ID && chat !== env.CHAT_ID) {
    console.error('telegram vacancy chat', r.status, await r.text());
    r = await send(env.CHAT_ID, '⚠️ <i>Група кандидатів недоступна для бота — анкета прийшла сюди.</i>\n\n' + lines.join('\n'));
  }
  if (!r.ok) console.error('telegram', r.status, await r.text());
  return Response.json({ ok: r.ok }, { status: r.ok ? 200 : 502 });
}
