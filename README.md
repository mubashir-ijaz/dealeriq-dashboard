# DealerIQ — Dealer Analytics Dashboard

A live analytics dashboard for **Major Auto Sales LLC** that reads directly from your Google Sheets — no database, no API key for sheets, completely free.

## 📊 Data Sources

| Source | Sheet Tab | Rows |
|--------|-----------|------|
| Edge Pipeline | `edgepipeline_purchased_all` | 4,744 |
| CarMax | `last year now carmax` | 1,929 |
| OpenLane | `openlane_invoices_full` | 884 |

**Total: ~7,500+ vehicles tracked**

---

## ✅ Features

- **Overview** — Grand KPIs, per-source breakdown, top makes, model years
- **Charts** — 8 charts: vehicles per source, spend, monthly trends, top makes, price ranges, year dist, seller rankings, source pie
- **Cross-Match VINs** — Finds VINs appearing in multiple sheets (potential duplicates or resells)
- **AI Assistant** — Claude-powered chatbot with full knowledge of your data
- **Sheet Viewer** — Browse, search, and sort raw data from any sheet
- **Live sync** — Reads directly from Google Sheets every page load (free, no API key)

---

## 🚀 Setup (5 minutes)

### Step 1 — Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/dealeriq-dashboard.git
cd dealeriq-dashboard
npm install
```

### Step 2 — Google Sheets (already done ✅)
Your sheets are already public. No API key needed. The app reads them using Google's free `gviz` endpoint.

If you ever change sheet names or IDs, update `src/utils/sheets.js`:
```js
const SHEETS = [
  { id: 'YOUR_SHEET_ID', tab: 'TAB_NAME', label: 'Display Name', source: 'edge' },
  ...
];
```

### Step 3 — AI Chatbot (optional)
To enable the AI assistant, get a free API key from [console.anthropic.com](https://console.anthropic.com).

Create a `.env` file:
```bash
cp .env.example .env
```

Edit `.env`:
```
REACT_APP_ANTHROPIC_KEY=sk-ant-your-key-here
```

> **Note:** The dashboard works fully without the AI key — only the chatbot tab is affected.

### Step 4 — Run locally
```bash
npm start
```
Visit `http://localhost:3000`

---

## 📤 Deploy to GitHub + Vercel (free)

### Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit — DealerIQ dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dealeriq-dashboard.git
git push -u origin main
```

### Deploy on Vercel (free)
1. Go to [vercel.com](https://vercel.com) → Sign in with GitHub
2. Click **"Add New Project"**
3. Import your `dealeriq-dashboard` repo
4. In **Environment Variables**, add:
   ```
   REACT_APP_ANTHROPIC_KEY = sk-ant-your-key-here
   ```
5. Click **Deploy** — live in ~60 seconds ✅

### Auto-deploy
Every `git push` to `main` automatically redeploys on Vercel.

---

## 📁 Project Structure

```
dealeriq-dashboard/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Sidebar.js       — Left navigation
│   │   ├── Overview.js      — KPIs and source breakdown
│   │   ├── ChartsPage.js    — 8 Recharts visualizations
│   │   ├── CrossMatch.js    — VIN cross-sheet matching
│   │   ├── SheetView.js     — Browsable data table
│   │   └── ChatBot.js       — AI assistant UI
│   ├── context/
│   │   └── DataContext.js   — Global data state
│   ├── hooks/
│   │   └── useChat.js       — Claude AI chat logic
│   ├── pages/
│   │   └── Dashboard.js     — Main layout
│   ├── utils/
│   │   ├── sheets.js        — Google Sheets fetcher (free)
│   │   └── schema.js        — Column mappings + analytics
│   ├── App.js
│   ├── index.js
│   └── index.css
├── .env.example
├── .gitignore
├── vercel.json
└── package.json
```

---

## 🔧 Updating Sheet Data

The app reads live from Google Sheets on every load — no action needed. Just update your sheet and refresh the browser.

To add a new sheet tab:
1. Add it to `src/utils/sheets.js` in the `SHEETS` array
2. Add column mapping in `src/utils/schema.js`
3. Push to GitHub → auto-deploys on Vercel

---

## 🛠 Tech Stack

- **React 18** — UI framework
- **Recharts** — Charts
- **Lucide React** — Icons
- **Claude Sonnet** — AI chatbot (Anthropic)
- **Google Sheets gviz API** — Free sheet reading, no API key
- **Vercel** — Free hosting with auto-deploy

---

## ❓ FAQ

**Q: Do I need to pay for anything?**
A: No. Google Sheets reading is free. Vercel hosting is free. The only optional cost is Anthropic API credits for the AI chatbot (very cheap — ~$0.01 per conversation).

**Q: How do I update the sheet IDs?**
A: Edit `src/utils/sheets.js` — the `SHEETS` array at the top.

**Q: The data looks wrong for a source?**
A: Check column mappings in `src/utils/schema.js` — each source has an exact column map.

**Q: Can I add a 4th sheet?**
A: Yes — add it to `SHEETS` in `sheets.js` and add a `normalize*` function in `schema.js`.
