import { addMonths, lastDayOfMonth, startOfDay, endOfDay, parseISO, isWithinInterval } from 'date-fns';

// Types used by the helper — adapt to your project's real models if different
export type Transaction = {
  id: string;
  date: string; // ISO string
  amount: number; // positive number. For expenses, treat as positive; for incomes, type distinguishes
  type: 'income' | 'expense';
  accountType: 'card' | 'bank' | 'cash' | string; // 'card' transactions are allocated by card statement day
  cardId?: string; // present when accountType === 'card'
};

export type Card = {
  id: string;
  name?: string;
  statementDay: number; // 1-31 preferred; will be clamped to month length
};

export type BudgetBreakdown = {
  monthStart: Date;
  monthEnd: Date;
  income: number;
  nonCardExpenses: number;
  cardExpensesByCard: Record<string, number>;
  totalCardExpenses: number;
  net: number; // income - (nonCardExpenses + totalCardExpenses)
};

function clampDayToMonth(year: number, monthIndex: number, day: number) {
  const last = lastDayOfMonth(new Date(year, monthIndex, 1)).getDate();
  return Math.min(Math.max(1, day), last);
}

// Given a target month (any date inside the month) and a card statement day D,
// return the inclusive statement interval that should be considered for that card's "month".
// Convention: A card with cut day D has statement that ends on day D of the target month,
// and starts on day D+1 of the previous month. Example: D=5 and target July => start = Jun 6, end = Jul 5.
export function getCardStatementPeriodForMonth(targetMonthDate: Date, statementDay: number) {
  const year = targetMonthDate.getFullYear();
  const monthIndex = targetMonthDate.getMonth(); // 0-based

  // clamp statement day to valid day in each month
  const endDay = clampDayToMonth(year, monthIndex, statementDay);
  const periodEnd = endOfDay(new Date(year, monthIndex, endDay));

  const prev = addMonths(periodEnd, -1);
  const startDay = clampDayToMonth(prev.getFullYear(), prev.getMonth(), statementDay + 1);
  const periodStart = startOfDay(new Date(prev.getFullYear(), prev.getMonth(), startDay));

  return { start: periodStart, end: periodEnd };
}

function parseDateToDayBounds(isoOrDate: string | Date) {
  const d = typeof isoOrDate === 'string' ? parseISO(isoOrDate) : isoOrDate;
  return d;
}

export function computeBudgetNetForMonth(targetMonthDate: Date, transactions: Transaction[], cards: Card[]): BudgetBreakdown {
  const monthStart = startOfDay(new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), 1));
  const monthEnd = endOfDay(lastDayOfMonth(monthStart));

  // Income within calendar month
  const income = transactions
    .filter(t => t.type === 'income')
    .filter(t => {
      const d = parseDateToDayBounds(t.date);
      return isWithinInterval(d, { start: monthStart, end: monthEnd });
    })
    .reduce((s, t) => s + t.amount, 0);

  // Non-card expenses use calendar month
  const nonCardExpenses = transactions
    .filter(t => t.type === 'expense' && t.accountType !== 'card')
    .filter(t => {
      const d = parseDateToDayBounds(t.date);
      return isWithinInterval(d, { start: monthStart, end: monthEnd });
    })
    .reduce((s, t) => s + t.amount, 0);

  // Card expenses: allocate per-card using statement period
  const cardExpensesByCard: Record<string, number> = {};

  for (const card of cards) {
    const { start, end } = getCardStatementPeriodForMonth(targetMonthDate, card.statementDay);

    const sumForCard = transactions
      .filter(t => t.type === 'expense' && t.accountType === 'card' && t.cardId === card.id)
      .filter(t => {
        const d = parseDateToDayBounds(t.date);
        return isWithinInterval(d, { start, end });
      })
      .reduce((s, t) => s + t.amount, 0);

    cardExpensesByCard[card.id] = sumForCard;
  }

  const totalCardExpenses = Object.values(cardExpensesByCard).reduce((s, v) => s + v, 0);

  const net = income - (nonCardExpenses + totalCardExpenses);

  return {
    monthStart,
    monthEnd,
    income,
    nonCardExpenses,
    cardExpensesByCard,
    totalCardExpenses,
    net,
  };
}

// Example usage (in code comments):
// const target = new Date(2026, 6, 1); // July 2026 (month is 0-based)
// const result = computeBudgetNetForMonth(target, transactionsArray, cardsArray);
// result.cardExpensesByCard will show each card's allocated expense for that statement month.
