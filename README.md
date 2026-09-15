# QA Tool

Персональний QA-інструмент на React, Vite, TypeScript і shadcn/ui.

Перед зміною доменних сутностей прочитайте [QA Domain Model](docs/QA_DOMAIN_MODEL.md):
власники state, спільні сутності, зв’язки, snapshots і відомі обмеження.

Доступні Requirements, Test Plan, Test Cases, Coverage, Test Runs, Defects,
Checklists, Smoke та Audit. QA-дані працюють у React mock state, зберігаються
при переходах у SPA та скидаються після reload/logout. Новий проєкт порожній;
Voicli містить демонстраційні дані, QP Notes початково порожній.

Авторизація підключена до PHP API: джерело істини — session cookie та
`/auth/me.php`. Усі auth-запити використовують `credentials: 'include'`.
QA-модулі до backend не підключені. Membership проєктів поки демонстраційний:
поточний користувач отримує доступ до mock-проєктів і створених ним проєктів.

```sh
npm install
npm run dev
```

Налаштування API та публічного Turnstile site key описані в `.env.example`.
Secret key у frontend не зберігається.

```sh
npm test
npm run lint
npm run build
```

Моделі: `src/types.ts`. Mock-дані: `src/data/`.
Спільний Area catalog: `src/data/projectAreasMockData.ts`.
UI налаштований через `components.json`, Tailwind Vite plugin та alias `@/`.
