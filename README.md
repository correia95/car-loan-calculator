# car-loan-calculator

Car loan / finance calculator with a **balloon (residual) payment**. Enter the
drive-away price, deposit, trade-in (and any payout still owing on it), rate,
term, repayment frequency, balloon % and financed fees → periodic repayment,
amount financed, total interest, cost of the finance, and a "what the balloon
costs you" comparison (lower repayment, more total interest).

**Live:** https://car-loan-calculator.correia95.workers.dev/

## Stack

- React 18 + TypeScript + Vite, no runtime deps beyond React
- Static-assets Cloudflare Worker

## Engine

[`src/calc.ts`](src/calc.ts): `periodicPayment(pv, i, n, balloon)` = the
balloon-aware amortised payment `(pv − balloon·(1+i)^-n)·i / (1 − (1+i)^-n)`.
`calculate` builds the amount financed (price − deposit − trade-in + payout +
fees), applies it, and computes a monthly-equivalent + a no-balloon baseline for
the comparison.

Verified in Node: $30,400 @ 8.5% / 5y monthly → $623.70 (matches standard PMT);
30% balloon → repayment $482.65 but total interest rises $7,022 → $9,059; 0%
finance → $583.33 / $0 interest; trade-in with payout maths.

## Develop / deploy

```bash
npm install
npm run dev
npm run deploy
```
