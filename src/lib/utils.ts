import { clsx, type ClassValue } from "clsx"
import { Account, Transaction } from "./data"
import { parseISO, addMonths, format } from "date-fns"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function getEffectiveMonth(txDate: string, accountId: string | undefined, accounts: Account[]): string {
  if (!accountId) return txDate.substring(0, 7);
  
  const account = accounts.find(a => a.id === accountId);
  if (!account || account.type !== 'credit-card' || !account.statementDate) {
    return txDate.substring(0, 7);
  }

  const txDay = parseInt(txDate.substring(8, 10), 10);
  if (txDay > account.statementDate) {
    const nextMonth = addMonths(parseISO(txDate), 1);
    return format(nextMonth, 'yyyy-MM');
  }
  
  return txDate.substring(0, 7);
}
