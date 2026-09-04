# Business Hotel Almaty

Корпоративтік/маркетингтік веб-сайт — 4★ бизнес-отель, Алматы (пр. Райымбека, 298А).

Статикалық бір беттік сайт (KZ / RU / EN / ZH), брондау WhatsApp арқылы жүзеге асады — админ-панель мен дерекқор жоқ.

## Іске қосу

```bash
npm install
node serve.mjs
```

Сайт `http://localhost:3000` мекенжайында ашылады.

## Скриншот (QA)

```bash
node screenshot.mjs http://localhost:3000 [label] [width] [height]
```

Скриншоттар `./temporary screenshots/` қалтасына сақталады.

## Құрылым

- `index.html` — сайттың барлық мазмұны (HTML + CSS + JS, аудармалар `STRINGS` объектісінде)
- `images/` — қонақ үйдің нақты фотолары
- `serve.mjs` / `screenshot.mjs` — жергілікті сервер және Puppeteer скриншот құралы
