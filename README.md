# VironaX Campaign Dashboard

A comprehensive analytics dashboard for VironaX that combines Meta Ads data, Salla orders, and manual order entry into a single unified view.

## Features

- **Real-time KPIs**: Revenue, Spend, Orders, AOV, CAC, ROAS with trends
- **Campaign Performance**: Full funnel metrics from Meta (Upper/Mid/Lower funnel)
- **Country Analytics**: Combined view of Meta spend + Salla + Manual orders
- **Budget Efficiency**: Marginal CAC analysis, scaling headroom, recommendations
- **Funnel Diagnostics**: Automatic detection of issues and opportunities
- **Manual Orders**: Add WhatsApp orders, corrections with permanent storage

---

## Quick Setup (15 minutes)

### Step 1: Get Your API Credentials

**Meta Ads (5 min):**
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create an App → Select "Business" type
3. Add "Marketing API" product
4. Go to Business Settings → System Users → Create token
5. Copy your Ad Account ID from Ads Manager URL (looks like `act_123456789`)

**Salla (2 min):**
1. Log into your Salla dashboard
2. Go to Settings → API & Integrations
3. Generate an access token
4. Copy the token

### Step 2: Deploy (10 min)

**Option A: Railway (Recommended - Easiest)**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new)

1. Click the button above
2. Connect your GitHub
3. Fork this repo
4. Add environment variables:
   - `META_AD_ACCOUNT_ID` = your account ID
   - `META_ACCESS_TOKEN` = your token
   - `SALLA_ACCESS_TOKEN` = your token
5. Click Deploy
6. Done! Your dashboard is live.

**Option B: Manual Deployment**

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/vironax-dashboard.git
cd vironax-dashboard

# Install dependencies
npm run install:all

# Create .env file
cp .env.example server/.env
# Edit server/.env with your credentials

# Initialize database
npm run setup

# Start development
npm run dev
```

Visit `http://localhost:3000`

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `META_AD_ACCOUNT_ID` | Yes | Your Meta Ads account ID (without `act_` prefix) |
| `META_ACCESS_TOKEN` | Yes | System user access token from Meta |
| `SALLA_ACCESS_TOKEN` | Yes | API token from Salla dashboard |
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | `development` or `production` |

---

## How It Works

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR DASHBOARD                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────────┐             │
│  │ Meta    │    │ Salla   │    │ Manual      │             │
│  │ API     │    │ API     │    │ Input       │             │
│  └────┬────┘    └────┬────┘    └──────┬──────┘             │
│       │              │                │                     │
│       ▼              ▼                ▼                     │
│  ┌─────────────────────────────────────────────┐           │
│  │            SQLite Database                   │           │
│  │  • Campaign metrics (daily)                 │           │
│  │  • Salla orders                             │           │
│  │  • Manual orders                            │           │
│  └─────────────────────────────────────────────┘           │
│                       │                                     │
│                       ▼                                     │
│  ┌─────────────────────────────────────────────┐           │
│  │          Analytics Engine                    │           │
│  │  • Calculate KPIs                           │           │
│  │  • Detect anomalies                         │           │
│  │  • Generate recommendations                 │           │
│  └─────────────────────────────────────────────┘           │
│                       │                                     │
│                       ▼                                     │
│  ┌─────────────────────────────────────────────┐           │
│  │              Dashboard UI                    │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Auto-Sync

Data syncs automatically:
- **Daily at 8 AM UTC** via cron job
- **On demand** via the Refresh button
- **On first load** if database is empty

### Metrics Calculation

| Metric | Formula | Source |
|--------|---------|--------|
| Revenue | Salla Revenue + Manual Revenue | Salla + Manual |
| Spend | Total Campaign Spend | Meta API |
| Orders | Salla Orders + Manual Orders | Salla + Manual |
| AOV | Revenue ÷ Orders | Calculated |
| CAC | Spend ÷ Orders | Calculated |
| ROAS | Revenue ÷ Spend | Calculated |
| Marginal CAC | (Current Spend - Prev Spend) ÷ (Current Orders - Prev Orders) | Calculated |

---

## Demo Mode

If you don't add API credentials, the dashboard runs with realistic demo data. This is useful for:
- Testing the interface
- Showing stakeholders
- Development

---

## Project Structure

```
vironax-dashboard/
├── client/                 # React frontend
│   ├── src/
│   │   ├── App.jsx        # Main dashboard component
│   │   ├── utils/api.js   # API utilities
│   │   └── index.css      # Styles
│   └── package.json
├── server/                 # Node.js backend
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   ├── db/                # Database setup
│   └── server.js          # Express app
├── .env.example           # Environment template
└── package.json           # Root package
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/dashboard` | GET | All dashboard data |
| `/api/analytics/efficiency` | GET | Budget efficiency analysis |
| `/api/analytics/recommendations` | GET | Smart recommendations |
| `/api/manual` | GET/POST | Manual orders CRUD |
| `/api/sync` | POST | Trigger data sync |

---

## Troubleshooting

**"Failed to fetch dashboard"**
- Check your API credentials in `.env`
- Ensure the server is running on port 5000

**Data not updating**
- Click Refresh button
- Check sync logs in console

**Meta API errors**
- Verify your access token hasn't expired
- Check you have Marketing API permissions

---

## Support

Questions? Issues? Open a GitHub issue or contact support.
