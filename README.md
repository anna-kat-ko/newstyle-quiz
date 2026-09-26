# Квіз New Style — натяжні стелі

Статичний квіз (`index.html`, `img/`) + функція `api/lead.js`, яка пересилає заявку в Telegram через @NewStyleKyiv_bot.

## Змінні оточення (Vercel → Settings → Environment Variables)
- `BOT_TOKEN` — токен @NewStyleKyiv_bot з @BotFather
- `CHAT_ID` — куди слати заявки (ID групи менеджерів з мінусом або ваш особистий ID)

Після зміни змінних — Redeploy.

## Піксель Meta
`1430213607595002`: PageView, QuizStart (кнопка «Розрахувати»), Lead (відправка форми).
