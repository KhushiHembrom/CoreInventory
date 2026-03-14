<div align="center">

<img src="https://img.shields.io/badge/CoreInventory-v1.0.0-6366f1?style=for-the-badge&logoColor=white" />

# 📦 CoreInventory

### A modern, real-time Inventory Management System built for teams who mean business.

**Centralize. Track. Control.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20App-6366f1?style=for-the-badge&logo=vercel&logoColor=white)](https://core-inventory-mu.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/KhushiHembrom/CoreInventory)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

---

![CoreInventory Dashboard](https://placehold.co/1200x600/1e3a5f/ffffff?text=CoreInventory+Dashboard)

</div>

---

## 🚀 What is CoreInventory?

CoreInventory is a **full-stack, real-time Inventory Management System** that replaces manual registers, scattered Excel sheets, and outdated tracking methods with a **centralized, digital-first platform**.

Designed for both **Inventory Managers** and **Warehouse Staff**, it gives your team complete visibility and control over every unit of stock — from the moment it arrives to the moment it leaves.

---

## ✨ Features

### 🔐 Authentication
- Email & Password sign up / login
- **Google OAuth** one-click login
- Role-based access — **Manager** or **Staff**
- Secure session management via Supabase Auth

### 📊 Real-Time Dashboard
- **Live KPI cards** — Total Stock, Low Stock, Out of Stock, Pending Receipts, Pending Deliveries, Scheduled Transfers
- **Stock movement charts** — bar, pie, and line (powered by Recharts)
- **Recent activity feed** from the stock ledger
- **Dynamic filters** — by document type, status, warehouse, and category
- Supabase Realtime WebSocket — KPIs update instantly, zero page refresh

### 📦 Product Management
- Create & manage products with Name, SKU, Category, Unit of Measure, and Reorder Level
- Stock availability view per warehouse location
- Low stock & out-of-stock badges per product
- Smart SKU search and category filters

### 🚚 Receipts — Incoming Stock
- Create receipts with supplier info and product lines
- Input expected vs received quantities
- **Validate** → stock automatically increases
- Auto-generated reference numbers (`REC-0001`, `REC-0002`...)
- Status workflow: `Draft → Waiting → Ready → Done`

### 📤 Delivery Orders — Outgoing Stock
- Create delivery orders with customer info
- Pick → Pack → **Validate** → stock automatically decreases
- Insufficient stock check before validation
- Auto-generated reference numbers (`DEL-0001`, `DEL-0002`...)

### 🔄 Internal Transfers
- Move stock between warehouses or locations
- Source warehouse decreases, destination warehouse increases
- Both movements logged in the stock ledger
- Auto-generated reference numbers (`INT-0001`, `INT-0002`...)

### ⚖️ Stock Adjustments
- Fix mismatches between recorded and physical count
- System auto-calculates the difference
- Every adjustment logged with reason and timestamp
- Auto-generated reference numbers (`ADJ-0001`, `ADJ-0002`...)

### 📜 Move History / Stock Ledger
- Append-only, tamper-proof log of every stock movement
- Filter by product, warehouse, operation type, and date range
- Full audit trail — quantity before and after every operation
- Export to CSV

### ⚙️ Settings
- Manage multiple warehouses
- Manage product categories
- Full CRUD with confirmation dialogs

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript |
| **Styling** | Tailwind CSS |
| **UI Components** | shadcn/ui |
| **State Management** | Zustand |
| **Data Fetching** | TanStack Query (React Query) |
| **Charts** | Recharts |
| **Routing** | React Router v6 |
| **Icons** | Lucide React |
| **Backend & DB** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (Email + Google OAuth) |
| **Realtime** | Supabase Realtime (WebSockets) |
| **Build Tool** | Vite |
| **Deployment** | Vercel |

---

## 🗄️ Database Schema

```
profiles          → user accounts + roles
warehouses        → warehouse locations
categories        → product categories
products          → product catalog
stock             → quantity per product per warehouse
receipts          → incoming stock documents
receipt_items     → line items per receipt
deliveries        → outgoing stock documents
delivery_items    → line items per delivery
internal_transfers → stock movement between warehouses
transfer_items    → line items per transfer
stock_adjustments → physical count corrections
adjustment_items  → line items per adjustment
stock_ledger      → append-only audit log of all movements
```

All tables have **Row Level Security (RLS)** enabled. Auto-generated reference numbers via **PostgreSQL triggers**. Stock updates handled by **Supabase database functions**.

---

## ⚡ Getting Started

### Prerequisites
- Node.js v18+ or Bun
- A [Supabase](https://supabase.com) account (free tier works)

### 1. Clone the repo

```bash
git clone https://github.com/KhushiHembrom/CoreInventory.git
cd CoreInventory
```

### 2. Install dependencies

```bash
npm install
# or
bun install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → run the file at `supabase/migrations/*.sql`
3. Go to **Authentication → Providers** → enable **Email** and **Google**
4. For Google OAuth → add your Google Client ID & Secret

### 4. Configure environment variables

Create a `.env` file in the root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from: **Supabase → Project Settings → API**

### 5. Run the app

```bash
npm run dev
# or
bun run dev
```

Open [http://localhost:8080](http://localhost:8080) 🎉

---

## 📁 Project Structure

```
CoreInventory/
├── public/                  # Static assets
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   ├── layout/          # Sidebar, Header
│   │   └── shared/          # Reusable components
│   ├── pages/               # Route pages
│   │   ├── Auth.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Products.tsx
│   │   ├── Receipts.tsx
│   │   ├── Deliveries.tsx
│   │   ├── Transfers.tsx
│   │   ├── Adjustments.tsx
│   │   ├── History.tsx
│   │   ├── Settings.tsx
│   │   └── Account.tsx
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Supabase client, utilities
│   ├── stores/              # Zustand state stores
│   └── types/               # TypeScript interfaces
├── supabase/
│   └── migrations/          # SQL schema files
├── .env                     # Environment variables (not committed)
└── vite.config.ts
```

---

## 🔄 Inventory Flow

```
┌─────────────────────────────────────────────────────┐
│                   INVENTORY FLOW                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Vendor ──► RECEIPT (+stock) ──► Main Warehouse     │
│                                       │             │
│                              INTERNAL TRANSFER      │
│                                       │             │
│                              Production Floor       │
│                                       │             │
│                              DELIVERY (-stock) ──► Customer │
│                                       │             │
│                              ADJUSTMENT (fix count) │
│                                       │             │
│                    Everything logged in STOCK LEDGER│
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment

### Deploy to Vercel

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Import project
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy → your app is live!

The `vercel.json` in the repo already handles SPA routing correctly.

---

## 🎯 Target Users

| Role | Responsibilities |
|---|---|
| **Inventory Manager** | Create operations, validate stock movements, view reports and KPIs |
| **Warehouse Staff** | Perform receipts, deliveries, transfers, and stock counts |

---

## 📸 Screenshots

| Dashboard | Products |
|---|---|
| ![Dashboard](https://placehold.co/600x400/f8fafc/1e3a5f?text=Dashboard) | ![Products](https://placehold.co/600x400/f8fafc/1e3a5f?text=Products) |

| Receipts | Stock Ledger |
|---|---|
| ![Receipts](https://placehold.co/600x400/f8fafc/1e3a5f?text=Receipts) | ![Ledger](https://placehold.co/600x400/f8fafc/1e3a5f?text=Stock+Ledger) |

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ using React, TypeScript, Tailwind CSS & Supabase

⭐ **Star this repo if you found it useful!** ⭐

[![Live Demo](https://img.shields.io/badge/Try%20It%20Live-core--inventory--mu.vercel.app-6366f1?style=for-the-badge&logo=vercel)](https://core-inventory-mu.vercel.app)

</div>
