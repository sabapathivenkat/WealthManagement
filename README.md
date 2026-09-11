# Wealth Planner — Personal Wealth Management App

This is your personal finance app: it tracks your savings/investments, your debts,
your monthly income and expenses, one-off yearly expenses, budgets, and gives you a
debt-payoff plan — all in Indian Rupees, with a live Dashboard that turns everything
into one net-worth picture.

This document is written for you as the **user/owner**, not as a developer. It
explains how to start the app, where your data actually lives, how to look at it
yourself, and what you can change safely — versus what you should ask your AI
assistant (Claude) to change for you.

---

## 1. How to start the app

The app has two parts that must **both** be running at the same time:

1. **The backend** (the "engine" — does all the calculations, talks to the database)
2. **The frontend** (the actual web pages you click around in)

### Start the backend

Open a terminal in the `backend` folder and run:

```
./mvnw spring-boot:run
```

Wait until you see a line like `Started WealthManagementApplication in ... seconds`.
That means it's ready. It listens on **http://localhost:8080** (you won't open this
directly — the frontend talks to it automatically).

### Start the frontend

Open a **second** terminal in the `frontend` folder and run:

```
npm run dev
```

It will print a URL, normally **http://localhost:5173**. Open that in your browser.
(If port 5173 is already busy — e.g. another copy is already running — Vite will
automatically use 5174, 5175, etc. instead. Always use the exact URL the terminal
prints.)

### Logging in

- If this is a fresh database (see section 3), click **Sign up** and create your own
  account with any email/password — nothing is emailed anywhere, it's all local.
- There is currently **no "forgot password"** feature. If you forget your password,
  the only fix is to sign up a new account (your old account's data stays in the
  database untouched, just under a different login).

---

## 2. What each page does

| Page | What it's for |
|---|---|
| **Dashboard** | Your one-page financial summary: total assets, total debt, net worth, this month's income/expenses/savings, and charts. Has a **Monthly / Yearly** toggle — Yearly uses the Indian Financial Year (April–March), not the calendar year. |
| **Debt, Savings & Investments** | Add/edit/delete every savings account (bank, mutual fund, gold, etc.) and every debt (loan, credit card, borrowed money). Record a contribution/withdrawal or a debt payment here, and see the full history of every one you've ever recorded (with Edit/Delete on each entry). |
| **Monthly Income & Expenses** | Log income and expense entries for the month, set a budget per category, and log one-off **yearly** expenses (insurance premiums, vehicle maintenance, etc.) separately by year. |
| **Yearly Debt Settlement Plan** | The debt payoff planner. Shows a **Smart recommendation** (based on your real income/expenses over the last 3 months, how much extra you can afford to pay and how much time/interest that saves), plus a manual simulator where you can try different extra-payment amounts and strategies (Avalanche / Snowball / Custom priority). |
| **Settings** (small ⚙ link at the bottom of the sidebar) | Light/Dark/System theme, currency label, financial-year start month, default debt strategy. |

Every category dropdown in the app (for income, expenses, savings, debt type, yearly
expenses) has its own **+ New**, **Edit**, and **Remove** buttons right next to it —
you never need a developer to add or rename a category.

---

## 3. Where your data actually lives

Your data is stored in a **PostgreSQL database** running locally on your own PC (not
in the cloud, not shared with anyone). Specifically:

| Setting | Value |
|---|---|
| Server | `localhost`, port **5433** |
| Database | `wealthdb` |
| Schema (like a "folder" inside the database) | `wealth` |
| App's own login to that database | user `wealth_app`, password `wealth_app_pw` |
| Database admin login (can see everything) | user `postgres`, password `postgres` |

> **Important:** your PC also has a completely separate PostgreSQL server on the
> standard port **5432** (used by other, unrelated projects — you may see databases
> like `TicketApp` or `dvdrental` there). This app has nothing to do with that one —
> don't look for your wealth data there.

### How to look at your data yourself

You don't need to know SQL. Using a free tool like **pgAdmin** or **DBeaver**:

1. Create a new connection: Host `localhost`, Port `5433`, Database `wealthdb`,
   Username `postgres`, Password `postgres` (or use `wealth_app` / `wealth_app_pw` if
   you only want read access to your own data, not the whole server).
2. Navigate: `wealthdb` → **Schemas** → `wealth` → **Tables**.
3. You'll see tables like `users`, `savings_accounts`, `debts`, `transactions`,
   `categories`, `budgets`, `goals`. Every screen in the app is just a view onto
   these tables — e.g. every payment you've ever recorded is a row in `transactions`.

You can safely **look** at any of this data. Please don't edit rows directly in the
database tool unless you know exactly what you're doing — use the app's own Edit
buttons instead, since the app also keeps related numbers (like debt balances) in
sync automatically when you use its own forms.

### If the app looks empty

The database was reset partway through development to give you a clean start (an
earlier version had test data mixed in with real entries). If you had already entered
real debts/savings before that reset and want them back, tell Claude — that old data
still exists in a different, older database on the same server and can be copied over
on request; it wasn't deleted, just not currently connected to.

---

## 4. How the app is organized (architecture, in plain terms)

```
WealthManagement/
├── backend/     ← the "engine": all calculations, security, and database access
│   └── src/main/java/com/vexsa/wealth/
│       ├── auth/          sign up / log in
│       ├── category/      the "+New / Edit / Remove" category system
│       ├── savings/       savings accounts
│       ├── debt/          debts + the payoff planner math
│       ├── transaction/   every income/expense/payment/contribution entry
│       ├── budget/        budgets
│       ├── goal/          savings goals (not currently shown in the menu)
│       ├── dashboard/     the numbers behind the Dashboard page
│       ├── settings/      your theme/currency/strategy preferences
│       └── ledger/        the shared "add up all the transactions" logic
│       (each folder above has its own database migration file under
│        src/main/resources/db/migration — that's the history of every
│        change ever made to the database structure)
│
└── frontend/    ← the web pages you actually see and click
    └── src/
        ├── pages/         one file per screen (Dashboard.tsx, Portfolio.tsx, ...)
        ├── components/    small reusable pieces (the category picker, popup
        │                  confirmation dialogs, the transaction history table)
        ├── api/           how the frontend talks to the backend
        └── index.css      all the colors, spacing, and visual styling
```

**In one sentence:** you click something in `frontend/`, it sends a request to
`backend/`, the backend reads/writes `wealthdb`, and sends the answer back to be
displayed.

---

## 5. What you can change yourself (no coding needed)

All of these are just clicking around in the app:

- **Categories** (income types, expense types, savings types, debt types, yearly
  expense types) — use the **+ New**/**Edit**/**Remove** buttons next to any category
  dropdown.
- **Theme** (light/dark) and **currency label**, **financial year start month**,
  **default debt strategy** — Settings page.
- **Any entry** (an income row, an expense row, a debt payment, a savings
  contribution, a budget) — every table has **Edit** and **Delete** buttons.
- **Debt priority** for the "Custom priority" payoff strategy — edit a debt and set
  its Priority number in "More details."

## 6. What needs a code change (ask Claude)

These live in actual code files, so ask your AI assistant rather than editing them
by hand:

| What you want to change | Where it lives |
|---|---|
| The 4 main menu items in the sidebar | `frontend/src/components/Layout.tsx` |
| Colors, fonts, spacing, the glass/blur look | `frontend/src/index.css` |
| Which database/server the app connects to | `backend/src/main/resources/application.yml` |
| Any calculation (e.g. how the debt payoff simulator works, how net worth is calculated) | `backend/src/main/java/com/vexsa/wealth/...` (see the folder map above) |
| Adding a brand-new page or feature | Both `frontend/src/pages/` and the matching backend folder |

You do **not** need to know how to write this code — just describe in plain English
what you want changed, and point out (or let Claude find) which page/screen it's on.

---

## 7. Troubleshooting

- **"This site can't be reached" in the browser** → one or both servers aren't
  running. Re-run the two `npm run dev` / `./mvnw spring-boot:run` commands from
  section 1.
- **Login fails with "Invalid email or password" even though you're sure it's
  right** → double check you're on the right browser tab/port (see the note in
  section 1 about 5173 vs 5174), and that you're not accidentally trying to log into
  an account that only exists in the old database (section 3).
- **A payment/contribution amount looks wrong** → open the row's **History** button
  on the Debt/Savings page — every single payment, contribution, and withdrawal ever
  recorded is listed there with the date, so you can see exactly what added up to the
  current balance, and Edit or Delete any entry that's wrong.
- **"Port already in use" when starting a server** → something is already running on
  that port (maybe you already started it in another terminal). Check your open
  terminals before starting a new one.

---

## 8. Technical appendix (for reference)

- **Backend:** Java 21, Spring Boot 4, Spring Security (JWT login), Spring Data JPA,
  PostgreSQL, Flyway (manages database structure changes safely, in order)
- **Frontend:** React 19 + TypeScript, Vite, React Router, Recharts (charts), Axios
- **Database migrations:** every structural change to the database is a numbered
  file in `backend/src/main/resources/db/migration/` (V1, V2, V3, ...) — this is the
  complete history of how the database got to its current shape, and lets the app
  rebuild the exact same structure on any machine.
- **Currency formatting:** Indian digit grouping (₹1,00,000) and compact Lakh/Crore
  notation (₹1.5L, ₹2.3Cr) on chart axes.
# WealthManagement
# WealthManagement
# WealthManagement
# WealthManagement
