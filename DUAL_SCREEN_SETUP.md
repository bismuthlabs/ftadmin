# Dual-Screen POS System Setup Guide

## Overview

The SweetWave Cafe POS system is now a dual-screen setup with real-time synchronization between cashier and customer displays.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  BroadcastChannel API                    │
│            (Real-time inter-window communication)        │
└────────────────┬──────────────────────────────┬──────────┘
                 │                              │
         ┌───────▼────────┐          ┌──────────▼──────┐
         │ /pos           │          │ /customer-display│
         │ (Cashier)      │          │ (Customer)       │
         │ - Browse items │          │ - Show items     │
         │ - Create order │          │ - Show total     │
         │ - Process pay  │          │ - Payment status │
         └───────┬────────┘          └──────────┬───────┘
                 │                              │
                 └──────────┬───────────────────┘
                            │
                    ┌───────▼────────┐
                    │    Zustand     │
                    │  Order Store   │
                    │  (Local State) │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │   Supabase     │
                    │(Persistence)   │
                    │  - orders      │
                    │  - order_items │
                    └────────────────┘
```

## Key Technologies

### 1. **BroadcastChannel API**
- Enables real-time communication between browser windows
- Primary sync mechanism for order updates
- No additional dependencies required
- Works across tabs, windows, and same-origin iframes

### 2. **Zustand**
- Lightweight state management
- Local order state (current cart, items, etc.)
- Automatic localStorage persistence
- Strongly typed with TypeScript

### 3. **Supabase**
- PostgreSQL database for order persistence
- Tables: `orders` and `order_items`
- Only used when orders are completed
- Not used for real-time customer display updates

## Setup Instructions

### Step 1: Create Supabase Tables

Run the migration SQL in your Supabase SQL Editor:

```sql
-- See supabase/migrations/001_create_orders_tables.sql
```

Or use Supabase CLI:

```bash
supabase db push
```

### Step 2: Start the Development Server

```bash
npm run dev
```

### Step 3: Open Two Browser Windows

#### Cashier Screen
- Open `http://localhost:3000/pos`
- This is where orders are created and paid
- All actions broadcast to customer display

#### Customer Display
- Open `http://localhost:3000/customer-display` (on another monitor/window)
- Shows real-time order updates
- Displays payment confirmation

### Step 4: Test the System

1. **Add Items**: On the cashier screen, add items to the order
2. **See Updates**: Customer display should immediately show the items
3. **Complete Payment**: Process payment on cashier screen
4. **See Confirmation**: Customer display shows order confirmation
5. **Check Supabase**: Order is automatically persisted

## Project Structure

```
/vercel/share/v0-project/
├── app/
│   ├── pos/
│   │   └── page.tsx              # Cashier screen
│   ├── customer-display/
│   │   └── page.tsx              # Customer display screen
│   ├── components/pos/
│   │   ├── CartPanel.tsx         # Cart for cashier
│   │   ├── ProductGrid.tsx       # Menu
│   │   ├── PaymentModal.tsx      # Payment processing
│   │   └── ...
│   └── layout.tsx
├── lib/
│   ├── stores/
│   │   └── orderStore.ts         # Zustand order store
│   ├── services/
│   │   ├── broadcastService.ts   # BroadcastChannel wrapper
│   │   └── supabaseService.ts    # Supabase operations
│   ├── hooks/
│   │   └── useBroadcast.ts       # Hook for subscribing to broadcasts
│   ├── types.ts
│   ├── currency.ts
│   └── ...
└── supabase/
    └── migrations/
        └── 001_create_orders_tables.sql
```

## Real-Time Synchronization Flow

### Order Update Flow

1. **Cashier adds item** → `addToCart()` in CartPanel
2. **Zustand store updates** → `currentOrder` state changes
3. **useEffect triggers** → Calls `broadcastService.broadcastOrderUpdate()`
4. **BroadcastChannel sends message** → Type: `order-update`
5. **Customer display receives** → Via `useBroadcast('order-update', callback)`
6. **Customer display updates** → Shows new items immediately

### Payment Completion Flow

1. **Cashier processes payment** → Clicks "Complete Payment"
2. **PaymentModal calls** → `broadcastService.broadcastPaymentComplete(order)`
3. **BroadcastChannel sends message** → Type: `payment-complete`
4. **Supabase saves order** → Via `supabaseService.saveOrder()`
5. **Customer display receives** → Shows confirmation screen
6. **Cashier sees** → Order number increments, cart clears

## Important Notes

### ✅ Best Practices Implemented

- **BroadcastChannel is primary**: Real-time sync between screens
- **Supabase is secondary**: Only for persistence, not real-time
- **Zustand for state**: Single source of truth on cashier screen
- **localStorage backup**: Prevents data loss if browser closes
- **Strong TypeScript**: All types properly defined
- **Clean separation**: Services, hooks, stores in separate files

### ⚠️ Considerations

- **Same origin required**: BroadcastChannel works on same domain
- **Development only**: RLS policies are permissive (customize for production)
- **Monospace viewing**: Optimal when screens are side-by-side or on different monitors
- **No polling**: Real-time without constant server requests

## Database Schema

### orders table

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| order_number | INTEGER | Unique, sequential |
| subtotal | DECIMAL | Before tax |
| tax | DECIMAL | 8% of subtotal |
| total | DECIMAL | subtotal + tax |
| payment_method | VARCHAR | cash, card, mobile_pay, split_bill |
| notes | TEXT | Special requests |
| status | VARCHAR | pending, preparing, ready, completed |
| created_at | TIMESTAMP | Order creation time |
| updated_at | TIMESTAMP | Last update time |

### order_items table

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| order_id | UUID | Foreign key to orders |
| product_id | VARCHAR | Product identifier |
| product_name | VARCHAR | Product name |
| quantity | INTEGER | Item quantity |
| price | DECIMAL | Unit price |
| modifiers | JSONB | Selections (ice level, sweetness, etc.) |
| created_at | TIMESTAMP | Creation time |

## Troubleshooting

### Customer Display Not Updating

1. Check that both windows are open on the same domain
2. Check browser console for BroadcastChannel errors
3. Verify `broadcastService` is initialized
4. Check that `useBroadcast` hook is properly called

### Orders Not Saving to Supabase

1. Verify Supabase credentials in `.env.local`
2. Check that tables were created via migration
3. Check RLS policies allow inserts
4. Check browser console for Supabase errors

### Performance Issues

1. Limit number of items in order display
2. Use React.memo for list items to prevent unnecessary re-renders
3. Consider pagination for order history
4. Monitor network requests in DevTools

## Future Enhancements

- [ ] WebSocket for multi-location sync
- [ ] Kitchen display system (KDS)
- [ ] Order queue management
- [ ] Analytics dashboard
- [ ] Inventory tracking
- [ ] Staff management
- [ ] Loyalty program
