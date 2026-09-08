// Car loan / finance calculator with balloon (residual) payment. Pure functions.

import { guessCurrency, money as _money } from './intl.ts';

export type Freq = 'weekly' | 'fortnightly' | 'monthly';
export const PERIODS: Record<Freq, number> = { weekly: 52, fortnightly: 26, monthly: 12 };

export interface Inputs {
  price: number; // drive-away price
  deposit: number; // cash deposit
  tradeIn: number; // trade-in value
  payout: number; // amount still owing on the trade-in (added back to the loan)
  rate: number; // annual interest rate %
  years: number; // loan term
  freq: Freq;
  balloonPct: number; // residual / balloon as % of price, paid at the end
  feesFinanced: number; // establishment/other fees added to the amount financed
}

export const DEFAULTS: Inputs = {
  price: 35000,
  deposit: 5000,
  tradeIn: 0,
  payout: 0,
  rate: 8.5,
  years: 5,
  freq: 'monthly',
  balloonPct: 0,
  feesFinanced: 400,
};

export interface Result {
  amountFinanced: number;
  balloon: number;
  repayment: number; // per period
  repaymentMonthly: number; // normalised for comparison
  nPeriods: number;
  totalRepayments: number; // sum of periodic repayments (excludes balloon)
  totalCost: number; // repayments + balloon + deposit + trade-in equity used
  totalInterest: number;
  costOfCredit: number; // interest + financed fees
}

// Payment for an amortising loan that leaves `balloon` owing at the end.
// PV = P * (1 - (1+i)^-n)/i  +  balloon * (1+i)^-n
// => P = (PV - balloon*(1+i)^-n) * i / (1 - (1+i)^-n)
export function periodicPayment(pv: number, ratePerPeriod: number, n: number, balloon: number): number {
  if (n <= 0) return pv;
  if (ratePerPeriod === 0) return (pv - balloon) / n;
  const disc = Math.pow(1 + ratePerPeriod, -n);
  return ((pv - balloon * disc) * ratePerPeriod) / (1 - disc);
}

export function calculate(i: Inputs): Result {
  const tradeEquity = Math.max(0, i.tradeIn - i.payout);
  const amountFinanced = Math.max(
    0,
    i.price - i.deposit - i.tradeIn + i.payout + i.feesFinanced,
  );
  const balloon = Math.max(0, (i.balloonPct / 100) * i.price);

  const perYear = PERIODS[i.freq];
  const ratePerPeriod = i.rate / 100 / perYear;
  const n = Math.round(i.years * perYear);

  const cappedBalloon = Math.min(balloon, amountFinanced * 0.999);
  const repayment = periodicPayment(amountFinanced, ratePerPeriod, n, cappedBalloon);
  const totalRepayments = repayment * n;

  // monthly-equivalent for the comparison line
  const rMonthly = i.rate / 100 / 12;
  const nMonthly = Math.round(i.years * 12);
  const repaymentMonthly = periodicPayment(amountFinanced, rMonthly, nMonthly, cappedBalloon);

  const totalInterest = totalRepayments + cappedBalloon - amountFinanced;
  const costOfCredit = totalInterest + i.feesFinanced;

  // total you part with over the life: deposit + trade equity handed over + repayments + balloon
  const totalCost = i.deposit + tradeEquity + totalRepayments + cappedBalloon;

  return {
    amountFinanced,
    balloon: cappedBalloon,
    repayment,
    repaymentMonthly,
    nPeriods: n,
    totalRepayments,
    totalCost,
    totalInterest,
    costOfCredit,
  };
}

let CCY = guessCurrency();
export function setMoneyCurrency(c: string): void {
  CCY = c;
}
export function moneyCurrency(): string {
  return CCY;
}
export const money = (n: number) => _money(n, CCY, 0);
export const money2 = (n: number) => _money(n, CCY, 2);
