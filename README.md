# Ksheera · AI-Powered Milk Delivery E-Commerce Website

Working front-end prototype for the final-year project **“AI-Powered Milk Delivery E-Commerce
Website”** (student: Sharmila). Every module in the synopsis and the features document can be
clicked through end to end on sample data: customer site, admin dashboard and delivery partner app.

The home page tells one story, **4:00 AM to 6:15 AM**: as you scroll, the sky lightens from
pre-dawn navy to morning cream, the clock ticks forward, and a field of milk droplets regroups into
each chapter's shape: a drop, the cow, the milk can, “4°C”, the lab flask, the bottle, the delivery
route and a glass of milk.

> **AI is not connected.** The AI features run on transparent rules and small calculations in the
> browser, so they can be demonstrated without a backend. Each one is labelled “demo” on screen,
> and the code comments say which model replaces it in the full system.

## Run it

Needs Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # serve the production build
npm run lint
```

No environment variables and no database: data lives in the browser (localStorage), seeded with
sample customers, 75 days of orders, subscriptions, reviews, lab readings and sign-in events,
relative to today's date. **Reset demo data** in the admin sidebar regenerates it.

## Demo accounts

| Role | Email | Password | Lands on |
| --- | --- | --- | --- |
| Customer | `priya@example.com` | `demo123` | `/account` |
| Admin | `admin@ksheera.example` | `admin123` | `/admin` |
| Delivery partner | `ravi@ksheera.example` | `delivery123` | `/delivery` |

The sign-in page has a “Fill” button for each, and every protected page offers a one-tap “Continue
as demo …” button. Demo OTP for password reset and the unusual-sign-in check: `482913`.

## Where everything is

| Synopsis module | Page | Code |
| --- | --- | --- |
| 9.1 Registration and login | `/register`, `/login` | `components/account/LoginView.tsx`, `lib/actions.ts` |
| 9.2 Catalogue and cart | `/shop`, `/shop/[slug]`, `/cart` | `components/shop/*`, `data/products.ts` |
| 9.3 Milk subscriptions | `/subscribe`, `/account?tab=subscriptions` | `components/account/SubscribeView.tsx` |
| 9.4 Orders and payments | `/checkout`, `/account/order`, `/account/invoice` | `components/account/OrderView.tsx` |
| 9.5 AI chatbot | “Ask Ksheera” button on every page | `lib/chat.ts`, `components/chat/ChatWidget.tsx` |
| 9.6 Recommendations | Home, shop, product, cart, account | `lib/ai.ts` → `recommend()` |
| 9.7 Demand prediction | `/admin?tab=insights`, `/admin?tab=inventory` | `lib/ai.ts` → `forecastDemand()` |
| 9.8 Admin dashboard | `/admin` | `components/admin/*` |
| 9.9 Delivery staff | `/delivery` | `components/admin/DeliveryView.tsx` |
| Project overview for the panel | `/project` | `app/(site)/project/page.tsx` |

More AI, all simulated and labelled “demo” (logic in `src/lib/ai.ts` and `src/lib/ai-plus.ts`):

| Feature | Where to see it |
| --- | --- |
| Voice ordering: “two litres of A2 milk and a paneer” (English, Tamil, Hindi numbers) | “Say your order” on the home hero, header mic, shop |
| Order from the chatbot, recipes, product doubts | “Ask Ksheera” button |
| Ask about this product (“Is it good for kids?”) | Every product page |
| Your usual basket, predicted, one tap to add | Home (signed in), My account |
| Arrival time estimate from the optimised route | Order tracking, My account |
| Ask your data: “Which product sells the most?” with the SQL it would run | Admin overview |
| Smart substitutes when out of stock | Shop, product pages |
| Write with AI (product descriptions) | Admin → Products → Add product |
| Demand forecast, procurement plan, weather nudge | Admin → AI insights, Inventory, Overview |
| Route optimisation | Delivery app |
| Review sentiment, milk quality flags, unusual sign-in and payment flags, customers ordering less | Admin → AI insights, Orders, Customers |
| Milk estimate for subscriptions, personalised reminder timing, voice search | Subscribe page, My account, shop search |

## The chatbot's sample questions

The assistant matches what you type against intents in `src/lib/chat.ts`. Each intent has example
questions and keywords; the closest one wins, and the panel shows the matched intent and a
confidence score. Some answers read live data (prices, your latest order, your subscriptions).
Anything else gets a “demo mode” fallback.

Try: *When will my milk arrive?* · *What is A2 milk?* · *How do I pause my subscription?* · *Track
my order* · *How much is a litre of milk?* · *Which payment methods do you accept?* · *Do you deliver
to Velachery?* · *Suggest something for me* · *My milk was sour* (hands over to a person) · *Talk to
a person*.

To add one, copy an entry in `INTENTS` and change its `examples`, `keywords` and `answer`.
To connect a real model later, replace the body of `reply()` with a call to the Flask endpoint and
keep the intents as the fallback.

## From prototype to the full system

The prototype is shaped so the proposed stack (Flask + MySQL + Pandas/Scikit-learn) can replace the
browser parts one at a time:

- `src/lib/types.ts` mirrors the MySQL tables: `users`, `products`, `orders`/`order_items`,
  `payments`, `subscriptions`, `reviews`, `quality_tests`, `login_events`.
- `src/lib/actions.ts` holds one function per backend route (login, register, placeOrder,
  createSubscription, setOrderStatus, …). Swap each body for a `fetch` to Flask.
- `src/lib/ai.ts` holds one function per model, each commented with its production replacement.

## Editing content

| What | Where |
| --- | --- |
| Brand name, phone, email, delivery promise, stats | `src/config/site.ts` |
| Products, prices, nutrition, stock | `src/data/products.ts` |
| Sample customers, orders, reviews, lab readings | `src/data/seed.ts` (bump `DB_VERSION` to re-seed browsers) |
| Home story chapters (times, words, photos, shapes) | `src/components/home/chapters.ts` |
| Particle shapes | `src/components/home/shapes.ts` |
| Colours, type scale, buttons | `src/app/globals.css` |

## Built with

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 and Lenis. Charts, the route map,
the particle story and the ghee illustration are hand-drawn SVG and canvas. Photographs are Unsplash
placeholders: see [CREDITS.md](CREDITS.md).
