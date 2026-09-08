import { useEffect, useMemo, useState } from 'react';
import { DEFAULTS, type Freq, type Inputs, calculate, money, money2, setMoneyCurrency } from './calc';
import { CURRENCIES, currencySymbol, guessCurrency } from './intl';

const KEYS: (keyof Inputs)[] = [
  'price', 'deposit', 'tradeIn', 'payout', 'rate', 'years', 'balloonPct', 'feesFinanced',
];

function readUrl(): Inputs {
  const out = { ...DEFAULTS };
  try {
    const p = new URLSearchParams(window.location.search);
    for (const k of KEYS) {
      const v = p.get(k);
      if (v != null && v !== '' && Number.isFinite(Number(v))) (out[k] as number) = Number(v);
    }
    const f = p.get('freq');
    if (f === 'weekly' || f === 'fortnightly' || f === 'monthly') out.freq = f;
  } catch {
    /* ignore */
  }
  return out;
}

function Field({
  label, hint, prefix, suffix, value, onChange, step,
}: {
  label: string; hint?: string; prefix?: string; suffix?: string;
  value: number; onChange: (n: number) => void; step?: number;
}) {
  return (
    <label className="field">
      <span>{label}{hint && <em> {hint}</em>}</span>
      <div className="ibox">
        {prefix && <i>{prefix}</i>}
        <input
          type="number"
          inputMode="decimal"
          step={step ?? 1}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        />
        {suffix && <i className="suf">{suffix}</i>}
      </div>
    </label>
  );
}

function readCurrency(): string {
  try {
    const c = new URLSearchParams(window.location.search).get('cur');
    if (c && CURRENCIES.includes(c)) return c;
  } catch {
    /* ignore */
  }
  return guessCurrency();
}

export default function App() {
  const [inp, setInp] = useState<Inputs>(readUrl);
  const [currency, setCurrency] = useState<string>(readCurrency);
  const [copied, setCopied] = useState(false);
  const set = (patch: Partial<Inputs>) => setInp((p) => ({ ...p, ...patch }));

  setMoneyCurrency(currency);

  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      for (const k of KEYS) u.searchParams.set(k, String(inp[k]));
      u.searchParams.set('freq', inp.freq);
      u.searchParams.set('cur', currency);
      window.history.replaceState(null, '', u.toString());
    } catch {
      /* ignore */
    }
  }, [inp, currency]);

  const r = useMemo(() => calculate(inp), [inp]);
  const noBalloon = useMemo(() => calculate({ ...inp, balloonPct: 0 }), [inp]);
  const freqWord = { weekly: 'week', fortnightly: 'fortnight', monthly: 'month' }[inp.freq];
  const hasBalloon = r.balloon > 0;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Car Loan Calculator</h1>
        <p className="tag">
          Work out the repayment on a car loan — including a deposit, a trade-in, financed fees and a
          balloon (residual) payment. See the real cost of the finance and what a balloon does to it.
        </p>
      </header>

      <div className="cols">
        <form className="panel form" onSubmit={(e) => e.preventDefault()}>
          <h2>The car</h2>
          <label className="field">
            <span>Currency</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <Field label="Drive-away price" prefix={currencySymbol(currency)} value={inp.price} onChange={(n) => set({ price: n })} step={500} />
          <Field label="Cash deposit" prefix={currencySymbol(currency)} value={inp.deposit} onChange={(n) => set({ deposit: n })} step={500} />
          <div className="two">
            <Field label="Trade-in value" prefix={currencySymbol(currency)} value={inp.tradeIn} onChange={(n) => set({ tradeIn: n })} step={500} />
            <Field label="Owing on trade-in" prefix={currencySymbol(currency)} value={inp.payout} onChange={(n) => set({ payout: n })} step={500} />
          </div>

          <h2>The finance</h2>
          <div className="two">
            <Field label="Interest rate" suffix="% p.a." value={inp.rate} onChange={(n) => set({ rate: n })} step={0.1} />
            <Field label="Loan term" suffix="years" value={inp.years} onChange={(n) => set({ years: n })} step={1} />
          </div>
          <label className="field">
            <span>Repayment frequency</span>
            <select value={inp.freq} onChange={(e) => set({ freq: e.target.value as Freq })}>
              <option value="weekly">Weekly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <div className="two">
            <Field label="Balloon / residual" hint="% of price" suffix="%" value={inp.balloonPct} onChange={(n) => set({ balloonPct: n })} step={5} />
            <Field label="Fees added to loan" prefix={currencySymbol(currency)} value={inp.feesFinanced} onChange={(n) => set({ feesFinanced: n })} step={50} />
          </div>
          <p className="note">Nothing is uploaded — figures stay in your browser and the page link.</p>
        </form>

        <div className="panel result">
          <div className="headline">
            <span>Repayment</span>
            <strong>{money2(r.repayment)}</strong>
            <span>per {freqWord}</span>
          </div>

          <table className="bd">
            <tbody>
              <tr><th>Amount financed</th><td>{money(r.amountFinanced)}</td></tr>
              {hasBalloon && <tr><th>Balloon due at the end</th><td>{money(r.balloon)}</td></tr>}
              <tr><th>{r.nPeriods} repayments total</th><td>{money(r.totalRepayments)}</td></tr>
              <tr className="cost"><th>Interest paid</th><td>{money(r.totalInterest)}</td></tr>
              <tr className="cost"><th>+ financed fees</th><td>{money(inp.feesFinanced)}</td></tr>
              <tr className="sub"><th>Cost of the finance</th><td>{money(r.costOfCredit)}</td></tr>
              <tr className="sub"><th>Total you'll pay*</th><td>{money(r.totalCost)}</td></tr>
            </tbody>
          </table>
          <p className="fineprint">
            * deposit + trade-in equity + all repayments{hasBalloon ? ' + the balloon' : ''}.
          </p>

          {hasBalloon && (
            <div className="callout">
              <h3>What the balloon costs you</h3>
              <p>
                The {inp.balloonPct}% balloon drops your repayment from{' '}
                <b>{money2(noBalloon.repayment)}</b> to <b>{money2(r.repayment)}</b> per {freqWord} —
                but you still owe <b>{money(r.balloon)}</b> at the end, and because that amount sits on
                the loan the whole term you pay <b>{money(r.totalInterest - noBalloon.totalInterest)}</b>{' '}
                more interest overall. A balloon lowers the monthly cost, not the total.
              </p>
            </div>
          )}

          {inp.freq !== 'monthly' && (
            <p className="compare">
              Monthly equivalent: {money2(r.repaymentMonthly)} / month.
            </p>
          )}

          <button className="share" onClick={share}>
            {copied ? 'Link copied' : 'Copy shareable link'}
          </button>
        </div>
      </div>

      <p className="disclaimer">
        Estimate only. Assumes a fixed rate for the whole term and equal repayments. It does not
        include stamp duty, registration, insurance, GST treatment, dealer add-ons, or comparison-rate
        effects, and lenders round and apply fees differently. Always check the exact figures and the
        comparison rate in the lender's contract before signing.
      </p>

      <section className="explainer">
        <h2>How a car loan repayment is worked out</h2>
        <p>
          The <strong>amount financed</strong> is the price minus your deposit and trade-in, plus
          anything still owing on the trade-in and any fees rolled into the loan. The repayment is
          the fixed amount that pays that balance down to zero (or down to the balloon) over the term,
          with interest charged each period on what is still owed.
        </p>
        <h3>What is a balloon or residual payment?</h3>
        <p>
          A balloon (also called a residual) is a lump sum — usually a set percentage of the purchase
          price — that is <em>not</em> paid off during the loan and falls due as a single payment at
          the end. It makes the regular repayments smaller, which is why dealers offer it, but you
          pay interest on that amount for the entire term, so the <strong>total</strong> interest is
          higher. At the end you either pay the balloon in cash, refinance it into a new loan, or
          sell/trade the car to cover it — and if the car is worth less than the balloon, you are out
          of pocket.
        </p>
        <h3>Deposit and trade-in</h3>
        <p>
          A bigger deposit or trade-in lowers the amount financed and therefore both the repayment and
          the total interest. If you still owe money on the car you are trading in, that payout amount
          is added back onto the new loan (negative equity), which increases what you finance.
        </p>
        <h3>Comparison rate</h3>
        <p>
          The advertised interest rate is not the whole story. A lender's <em>comparison rate</em>{' '}
          folds in most fees, so it is the better number for comparing offers. This calculator lets
          you add financed fees separately; for a quick comparison, enter the comparison rate as the
          interest rate and set fees to zero.
        </p>
        <h3>Weekly vs monthly</h3>
        <p>
          Paying weekly or fortnightly instead of monthly barely changes the total on a car loan
          (the term is short), but it can make budgeting easier if you are paid weekly. The monthly
          equivalent is shown so you can compare like with like.
        </p>
        <h3>Is anything sent to a server?</h3>
        <p>No. The calculation runs in your browser; your inputs are only stored in the page link.</p>
        <footer>Car Loan Calculator · estimate only · runs in your browser · no sign-up</footer>
      </section>
    </div>
  );
}
