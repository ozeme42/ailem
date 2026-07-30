"use client";

import * as React from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Trash2, Banknote, Landmark, CreditCard, BarChart2, ArrowUpRight, ArrowDownLeft, Calendar as CalendarIcon, ArrowLeft, ShoppingCart, Utensils, Bus, FileText, Gamepad2, HeartPulse, Shirt, GraduationCap, DollarSign, Briefcase, PlusCircle, CircleEllipsis, Printer, Check, Pencil, Settings, List } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { useAuth } from "@/components/auth-provider";
import {
  onAccountsUpdate, deleteAccount, addAccount, updateAccount, addTransaction,
  updateTransaction, deleteTransaction, onTransactionsUpdate, onBudgetCategoriesUpdate,
  onBillsUpdate, addBill, updateBill, deleteBill, onTransactionTemplatesUpdate, addTransactionTemplate
} from "@/lib/dataService";
import type { Account, Transaction, BudgetCategory, Bill, TransactionTemplate } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import {
  format, startOfYear, endOfYear, subYears, parseISO, addYears, eachMonthOfInterval,
  subMonths, addMonths, getYear, isSameMonth
} from "date-fns";
import { tr } from "date-fns/locale";
import { cn , getEffectiveMonth } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useRouter } from "next/navigation";

// ─── DESIGN SYSTEM TOKENS ──────────────────────────────────────────────────
const theme = {
  grad: "from-[#3B2145] via-[#7A3B57] to-[#C1653F]",
  gradSoft: "from-[#4A2E52] to-[#8A4A63]",
  assetGrad: "from-[#2F6F63] to-[#1B4038]",
  bg: "#EFEAE1",
  surface: "#F8F5EF",
  surfaceAlt: "#F1ECE2",
  surfaceRaised: "#FDFBF7",
  border: "rgba(43,36,28,0.08)",
  borderStrong: "rgba(43,36,28,0.16)",
  textPrimary: "#2B2420",
  textSecondary: "#75695C",
  textMuted: "#A79C8D",
  accent: "#3E7C74",
  income: "#3F7D53",
  incomeBg: "rgba(63,125,83,0.12)",
  expense: "#B5533A",
  expenseBg: "rgba(181,83,58,0.12)",
};

// ─── CARD COLOR PALETTE ─────────────────────────────────────────────────────
const CARD_PALETTE: { name: string; hex: string; grad: string; fromHex: string; toHex: string }[] = [
  { name: "Erik", hex: "#6B3A57", grad: "from-[#6B3A57] to-[#3F2038]", fromHex: "#6B3A57", toHex: "#3F2038" },
  { name: "Çam Yeşili", hex: "#2F6F63", grad: "from-[#2F6F63] to-[#1B4038]", fromHex: "#2F6F63", toHex: "#1B4038" },
  { name: "Toprak", hex: "#B5623F", grad: "from-[#B5623F] to-[#7A3E27]", fromHex: "#B5623F", toHex: "#7A3E27" },
  { name: "Indigo", hex: "#4A4A8E", grad: "from-[#4A4A8E] to-[#2B2B57]", fromHex: "#4A4A8E", toHex: "#2B2B57" },
  { name: "Zeytin", hex: "#6E6E32", grad: "from-[#6E6E32] to-[#40401C]", fromHex: "#6E6E32", toHex: "#40401C" },
  { name: "Gül Kurusu", hex: "#A14B5D", grad: "from-[#A14B5D] to-[#652E3A]", fromHex: "#A14B5D", toHex: "#652E3A" },
  { name: "Arduvaz", hex: "#3E5866", grad: "from-[#3E5866] to-[#25353E]", fromHex: "#3E5866", toHex: "#25353E" },
  { name: "Amber", hex: "#A9762E", grad: "from-[#A9762E] to-[#6B4A1B]", fromHex: "#A9762E", toHex: "#6B4A1B" },
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getCardPalette(acc: any): { name: string; hex: string; grad: string; fromHex: string; toHex: string } {
  const stored = acc?.color;
  const found = CARD_PALETTE.find((p) => p.hex === stored);
  if (found) return found;
  const idx = hashStr(acc?.id || acc?.name || "x") % CARD_PALETTE.length;
  return CARD_PALETTE[idx];
}

// ─── ICON REGISTRY ──────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  ShoppingCart, Utensils, Bus, FileText, Gamepad2, HeartPulse, Shirt,
  GraduationCap, DollarSign, PlusCircle, CircleEllipsis, Wallet, Banknote,
  Landmark, CreditCard, Briefcase, List, Settings, Check, Pencil, ListTree,
};

const DEFAULT_CAT_COLORS: Record<string, string> = {
  Market: "#B5623F", Yemek: "#A9762E", Ulaşım: "#3E5866", Fatura: "#B5533A",
  Eğlence: "#A14B5D", Sağlık: "#3F7D53", Giyim: "#6B3A57", Eğitim: "#4A4A8E",
  Maaş: "#3F7D53", Gelir: "#3F7D53", "Ek Gelir": "#2F6F63", Diğer: "#A79C8D",
};

type CatConf = {
  color: string;
  bgColor: string;
  IconComp: React.ElementType | null;
  emoji: string | null;
};

function getCategoryConfig(
  categoryName: string | undefined,
  type: "income" | "expense",
  customCategories: BudgetCategory[] = []
): CatConf {
  const catName = categoryName || "Diğer";
  const custom = customCategories.find((c) => c.name === catName);

  if (custom) {
    const color = custom.color || (type === "income" ? theme.income : theme.expense);
    const isKnownIcon = custom.icon && ICON_MAP[custom.icon];
    const isEmoji = custom.icon && !isKnownIcon;
    return {
      color,
      bgColor: color + "22",
      IconComp: isKnownIcon
        ? ICON_MAP[custom.icon]
        : isEmoji
        ? null
        : type === "income"
        ? PlusCircle
        : ShoppingCart,
      emoji: isEmoji ? custom.icon! : null,
    };
  }

  const fallbackColor = DEFAULT_CAT_COLORS[catName] || (type === "income" ? theme.income : theme.expense);
  return {
    color: fallbackColor,
    bgColor: fallbackColor + "22",
    IconComp: type === "income" ? PlusCircle : ShoppingCart,
    emoji: null,
  };
}

function CatIcon({ conf, size = 16 }: { conf: CatConf; size?: number }) {
  if (conf.emoji) {
    return <span style={{ fontSize: size }}>{conf.emoji}</span>;
  }
  const Icon = conf.IconComp || CircleEllipsis;
  return <Icon size={size} style={{ color: conf.color }} />;
}

const accountIcons: Record<string, React.ElementType> = {
  cash: Banknote,
  bank: Landmark,
  "credit-card": CreditCard,
  debt: CircleEllipsis,
  other: Wallet,
};

const accountLabels: Record<string, string> = {
  cash: "Nakit",
  bank: "Banka Hesabı",
  "credit-card": "Kredi Kartı",
  other: "Diğer Hesap",
  debt: "Borç Hesabı",
};

function getEffectiveMonth(dateStr: string, accountId: string, accountsList: Account[]): string {
  const acc = accountsList.find(a => a.id === accountId);
  if (acc && acc.type === 'credit-card' && acc.statementDate) {
    const d = parseISO(dateStr);
    const day = d.getDate();
    if (day > acc.statementDate) {
      const nextMonth = addMonths(d, 1);
      return format(nextMonth, 'yyyy-MM');
    }
  }
  return dateStr.substring(0, 7);
}

export function BudgetClient() {
    const router = useRouter();
    const { familyId, familyMembers } = useAuth();
    const { toast } = useToast();
    
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [accounts, setAccounts] = React.useState<Account[]>([]);
    const [allTransactions, setAllTransactions] = React.useState<Transaction[]>([]);
    const [categories, setCategories] = React.useState<BudgetCategory[]>([]);
    const [bills, setBills] = React.useState<Bill[]>([]);
    const [transactionTemplates, setTransactionTemplates] = React.useState<TransactionTemplate[]>([]);
    
    const [selectedAccountDetails, setSelectedAccountDetails] = React.useState<Account | null>(null);
    const [isAccountDetailsOpen, setIsAccountDetailsOpen] = React.useState(false);
    const [accountDetailsBalanceEdit, setAccountDetailsBalanceEdit] = React.useState<string>("");
    const [isEditingAccountDetailsBalance, setIsEditingAccountDetailsBalance] = React.useState(false);

    const handleOpenAccountDetails = (acc: Account) => {
        setSelectedAccountDetails(acc);
        setAccountDetailsBalanceEdit(acc.balance.toString());
        setIsEditingAccountDetailsBalance(false);
        setIsAccountDetailsOpen(true);
    };

    const handleSaveAccountDetailsBalance = async () => {
        if (selectedAccountDetails) {
            const newBal = parseFloat(accountDetailsBalanceEdit);
            if (!isNaN(newBal)) {
                await updateAccount(selectedAccountDetails.id, { balance: newBal });
                setSelectedAccountDetails({ ...selectedAccountDetails, balance: newBal });
                setIsEditingAccountDetailsBalance(false);
                toast({ title: "Bakiye güncellendi", variant: "default" });
            }
        }
    };

    const [isAccountFormOpen, setIsAccountFormOpen] = React.useState(false);
    const [isTransactionFormOpen, setIsTransactionFormOpen] = React.useState(false);
    const [isBillFormOpen, setIsBillFormOpen] = React.useState(false);
    const [isBillArchiveOpen, setIsBillArchiveOpen] = React.useState(false);
    const [billArchiveFilter, setBillArchiveFilter] = React.useState<string>('Tümü');

  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [allTransactions, setAllTransactions] = React.useState<Transaction[]>([]);
  const [categories, setCategories] = React.useState<BudgetCategory[]>([]);
  const [bills, setBills] = React.useState<Bill[]>([]);
  const [transactionTemplates, setTransactionTemplates] = React.useState<TransactionTemplate[]>([]);

  const [mainTab, setMainTab] = React.useState<"day" | "month" | "bills" | "accounts">("day");

  // Modals
  const [isTransactionModalOpen, setIsTransactionModalOpen] = React.useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = React.useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = React.useState(false);

  const [selectedAccountDetails, setSelectedAccountDetails] = React.useState<Account | null>(null);
  const [isAccountDetailsOpen, setIsAccountDetailsOpen] = React.useState(false);
  const [accountDetailsBalanceEdit, setAccountDetailsBalanceEdit] = React.useState<string>("");
  const [isEditingAccountDetailsBalance, setIsEditingAccountDetailsBalance] = React.useState(false);

  const [statementAccountId, setStatementAccountId] = React.useState<string | null>(null);
  const [isEditingStatementTotal, setIsEditingStatementTotal] = React.useState(false);
  const [statementTotalEdit, setStatementTotalEdit] = React.useState("");

  const [isAdjustmentFormOpen, setIsAdjustmentFormOpen] = React.useState(false);
  const [adjType, setAdjType] = React.useState<"expense" | "income">("expense");
  const [adjAmount, setAdjAmount] = React.useState("");
  const [adjDescription, setAdjDescription] = React.useState("");
  const [adjDate, setAdjDate] = React.useState(format(new Date(), "yyyy-MM-dd"));

  const [isAccountActionsOpen, setIsAccountActionsOpen] = React.useState(false);
  const [isTransactionActionsOpen, setIsTransactionActionsOpen] = React.useState(false);
  const [isBillActionsOpen, setIsBillActionsOpen] = React.useState(false);
  const [isBudgetSettingsOpen, setIsBudgetSettingsOpen] = React.useState(false);

  const [editingAccount, setEditingAccount] = React.useState<Account | null>(null);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
  const [editingBill, setEditingBill] = React.useState<Bill | null>(null);
  const [payingBill, setPayingBill] = React.useState<Bill | null>(null);
  const [selectedMenuListAccount, setSelectedMenuListAccount] = React.useState<Account | null>(null);
  const [selectedMenuListTransaction, setSelectedMenuListTransaction] = React.useState<Transaction | null>(null);
  const [selectedMenuListBill, setSelectedMenuListBill] = React.useState<Bill | null>(null);

  // Transaction form
  const [txAmount, setTxAmount] = React.useState("");
  const [txType, setTxType] = React.useState<"income" | "expense">("expense");
  const [txCategory, setTxCategory] = React.useState("Diğer");
  const [txAccountId, setTxAccountId] = React.useState("");
  const [txDate, setTxDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [txDescription, setTxDescription] = React.useState("");
  const [txIsInstallment, setTxIsInstallment] = React.useState(false);
  const [txInstallmentsCount, setTxInstallmentsCount] = React.useState("3");
  const [txIsRecurring, setTxIsRecurring] = React.useState(false);
  const [txIsAppliedToAccount, setTxIsAppliedToAccount] = React.useState(true);

  // Account form
  const [accName, setAccName] = React.useState("");
  const [accType, setAccType] = React.useState<"cash" | "bank" | "credit-card" | "other" | "debt">("bank");
  const [accBalance, setAccBalance] = React.useState("");
  const [accCreditLimit, setAccCreditLimit] = React.useState("");
  const [accTargetLimit, setAccTargetLimit] = React.useState("");
  const [accStatementDate, setAccStatementDate] = React.useState("");
  const [accColor, setAccColor] = React.useState<string>(CARD_PALETTE[0].hex);

  // Bill form
  const [billTitle, setBillTitle] = React.useState("");
  const [billAmount, setBillAmount] = React.useState("");
  const [billDueDate, setBillDueDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [billCategory, setBillCategory] = React.useState("Fatura");
  const [billIsRecurring, setBillIsRecurring] = React.useState(false);

  const [paymentAccountId, setPaymentAccountId] = React.useState("");
  const [isPaidBillsArchiveOpen, setIsPaidBillsArchiveOpen] = React.useState(false);
  const [expandedMonth, setExpandedMonth] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!familyId) return;
    const unsubAccounts = onAccountsUpdate(setAccounts);
    const unsubTransactions = onTransactionsUpdate(setAllTransactions, subYears(new Date(), 5), addYears(new Date(), 5));
    const unsubCategories = onBudgetCategoriesUpdate(setCategories);
    const unsubBills = onBillsUpdate(setBills);
    const unsubTemplates = onTransactionTemplatesUpdate(setTransactionTemplates);
    return () => {
      unsubAccounts(); unsubTransactions(); unsubCategories(); unsubBills(); unsubTemplates();
    };
  }, [familyId]);

  // Apply pending transactions
  React.useEffect(() => {
    if (accounts.length === 0 || allTransactions.length === 0) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const pendingTxs = allTransactions.filter(tx => tx.isApplied === false && tx.date <= todayStr);
    if (pendingTxs.length > 0) {
      const applyPending = async () => {
        try {
          const accountDeltas: Record<string, number> = {};
          for (const tx of pendingTxs) {
            if (!accountDeltas[tx.accountId]) accountDeltas[tx.accountId] = 0;
            accountDeltas[tx.accountId] += tx.type === 'income' ? tx.amount : -tx.amount;
          }
          for (const [accId, delta] of Object.entries(accountDeltas)) {
            const acc = accounts.find(a => a.id === accId);
            if (acc && delta !== 0) {
              await updateAccount(acc.id, { balance: acc.balance + delta });
            }
          }
          for (const tx of pendingTxs) {
            await updateTransaction(tx.id, { isApplied: true });
          }
        } catch (err) {
          console.error("Pending tx apply error:", err);
        }
      };
      applyPending();
    }
  }, [allTransactions, accounts]);

  const calculateNewBalance = (
    acc: Account,
    type: "income" | "expense",
    amount: number,
    isRevert = false
  ): number => {
    let multiplier = type === "income" ? 1 : -1;
    if (isRevert) multiplier *= -1;
    if (acc.type === "credit-card" || acc.type === "debt") {
      multiplier *= -1;
    }
    return acc.balance + amount * multiplier;
  };

  const handleNavDate = (direction: "prev" | "next") => {
    if (mainTab === "month") {
      setCurrentDate((prev) => (direction === "prev" ? subYears(prev, 1) : addYears(prev, 1)));
    } else {
      setCurrentDate((prev) => (direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1)));
    }
  };

  const accountStats = React.useMemo(() => {
    const assets = accounts.filter(a => a.type === "cash" || a.type === "bank" || a.type === "other");
    const debts = accounts.filter(a => a.type === "credit-card" || a.type === "debt");
    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalDebts = debts.reduce((sum, a) => sum + a.balance, 0);
    return {
      assets,
      debts,
      totalAssets,
      totalDebts,
      netWorth: totalAssets - totalDebts,
    };
  }, [accounts]);

  const financialCalculations = React.useMemo(() => {
    const currentMonthStr = format(currentDate, "yyyy-MM");
    const currentYearStr = format(currentDate, "yyyy");

    const monthTransactions = allTransactions.filter(
      (t) => getEffectiveMonth(t.date, t.accountId, accounts) === currentMonthStr
    );
    const yearTransactions = allTransactions.filter(
      (t) => t.date.substring(0, 4) === currentYearStr
    );

    const monthlyIncome = monthTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const monthlyExpense = monthTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const yearlyIncome = yearTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const yearlyExpense = yearTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    const daily: Record<
      string,
      {
        dateStr: string;
        dateISO: string;
        dayIncome: number;
        dayExpense: number;
        transactions: Transaction[];
      }
    > = {};

    monthTransactions
      .filter((t) => accounts.find((a) => a.id === t.accountId)?.type !== "credit-card")
      .forEach((t) => {
        if (!daily[t.date]) {
          daily[t.date] = {
            dateStr: format(parseISO(t.date), "d MMMM EEEE", { locale: tr }),
            dateISO: t.date,
            dayIncome: 0,
            dayExpense: 0,
            transactions: [],
          };
        }
        if (t.type === "income") daily[t.date].dayIncome += t.amount;
        else daily[t.date].dayExpense += t.amount;
        daily[t.date].transactions.push(t);
      });

    const dailyGroups = Object.values(daily).sort((a, b) => b.dateISO.localeCompare(a.dateISO));
    dailyGroups.forEach((g) => g.transactions.sort((a, b) => b.date.localeCompare(a.date)));

    const months = eachMonthOfInterval({
      start: startOfYear(currentDate),
      end: endOfYear(currentDate),
    });

    const monthlySummaries = months.map((mStart) => {
      const monthKey = format(mStart, "yyyy-MM");
      const txs = allTransactions.filter(
        (t) => getEffectiveMonth(t.date, t.accountId, accounts) === monthKey
      );
      const inc = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const exp = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      return {
        monthKey,
        monthName: format(mStart, "MMMM", { locale: tr }),
        income: inc,
        expense: exp,
        net: inc - exp,
      };
    });

    const monthlyCategorySpent = categories
      .filter((c) => c.limit && c.limit > 0 && c.type === "expense")
      .map((cat) => {
        const spent = monthTransactions
          .filter((t) => t.type === "expense" && t.category === cat.name)
          .reduce((s, t) => s + t.amount, 0);
        const percent = Math.min(Math.round((spent / cat.limit!) * 100), 100);
        return { ...cat, spent, percent };
      });

    const recurringExpenses = allTransactions.filter(
      (tx) =>
        tx.isRecurring &&
        tx.type === "expense" &&
        getEffectiveMonth(tx.date, tx.accountId, accounts) === currentMonthStr
    );
    const recurringExpensesTotal = recurringExpenses.reduce((s, t) => s + t.amount, 0);

    const creditCardStatements = accounts
      .filter((a) => a.type === "credit-card")
      .map((card) => {
        const targetYear = currentDate.getFullYear();
        const targetMonth = currentDate.getMonth();
        const stmtDay = card.statementDate || 31;

        const endDate = new Date(targetYear, targetMonth, stmtDay);
        if (endDate.getMonth() !== targetMonth) endDate.setDate(0);

        const prevMonthDate = new Date(targetYear, targetMonth - 1, stmtDay);
        if (prevMonthDate.getMonth() !== (targetMonth === 0 ? 11 : targetMonth - 1)) {
          prevMonthDate.setDate(0);
        }
        const startDate = new Date(prevMonthDate);
        startDate.setDate(startDate.getDate() + 1);

        const startStr = format(startDate, "yyyy-MM-dd");
        const endStr = format(endDate, "yyyy-MM-dd");

        const cardTxs = allTransactions.filter(
          (t) => t.accountId === card.id && t.date >= startStr && t.date <= endStr
        );

        const expenses = cardTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
        const incomes = cardTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
        const monthSpent = expenses - incomes;

        return {
          ...card,
          monthSpent,
          statementStart: startStr,
          statementEnd: endStr,
          transactions: cardTxs.sort((a, b) => b.date.localeCompare(a.date)),
        };
      });

    const { creditCardStatements, monthlyIncome, monthlyExpense, yearlyIncome, yearlyExpense, monthlySummaries, dailyGroups } = React.useMemo(() => {
        const yearInterval = eachMonthOfInterval({ start: startOfYear(currentDate), end: endOfYear(currentDate) });
        const monthSummaries: {[key: string]: {income: number, expense: number, total: number, transactions: Transaction[]}} = {};
        
        yearInterval.forEach(monthStart => {
            const monthKey = format(monthStart, 'yyyy-MM');
            monthSummaries[monthKey] = { income: 0, expense: 0, total: 0, transactions: [] };
        });
        
        const daily: { [key: string]: { date: string; dateISO: string; dayTotalIncome: number; dayTotalExpense: number; transactions: Transaction[] } } = {};

        const filteredTransactionsForMonth = allTransactions.filter(t => {
            const transactionMonth = getEffectiveMonth(t.date, t.accountId, accounts);
            const currentMonth = format(currentDate, 'yyyy-MM');
            return transactionMonth === currentMonth;
        });
        
        allTransactions.forEach(t => {
            const transactionYear = getYear(parseISO(t.date));
             if (transactionYear === getYear(currentDate)) {
                const monthKey = getEffectiveMonth(t.date, t.accountId, accounts);
                if(monthSummaries[monthKey]) {
                    if (t.type === 'income') monthSummaries[monthKey].income += t.amount;
                    else monthSummaries[monthKey].expense += t.amount;
                    monthSummaries[monthKey].transactions.push(t);
                }
             }
        });

        filteredTransactionsForMonth.filter(t => {
             const acc = accounts.find(a => a.id === t.accountId);
             return acc?.type !== 'credit-card';
        }).forEach(t => {
             if (!daily[t.date]) {
                daily[t.date] = { date: format(parseISO(t.date), 'd EEEE', {locale: tr}), dateISO: t.date, dayTotalIncome: 0, dayTotalExpense: 0, transactions: [] };
            }
            if (t.type === 'income') daily[t.date].dayTotalIncome += t.amount;
            else daily[t.date].dayTotalExpense += t.amount;
            daily[t.date].transactions.push(t);
        });
        
        const finalSummaries = Object.entries(monthSummaries)
            .map(([monthKey, values]) => ({
                monthKey, month: format(new Date(monthKey + '-02'), 'MMMM', { locale: tr }), ...values, total: values.income - values.expense
            }))
            .sort((a,b) => a.monthKey.localeCompare(b.monthKey));

        finalSummaries.forEach(summary => summary.transactions.sort((a, b) => b.date.localeCompare(a.date)));
        const finalDailyGroups = Object.values(daily).sort((a,b) => b.dateISO.localeCompare(a.dateISO));
        
        const currentMonthKey = format(currentDate, 'yyyy-MM');
        const monthStats = monthSummaries[currentMonthKey] || { income: 0, expense: 0 };
        const yearlyIncomeTotal = Object.values(monthSummaries).reduce((s, m) => s + m.income, 0);
        const yearlyExpenseTotal = Object.values(monthSummaries).reduce((s, m) => s + m.expense, 0);

        const creditCardStatements = accounts
            .filter(a => a.type === 'credit-card')
            .map(card => {
                const cardTxs = filteredTransactionsForMonth.filter(t => t.accountId === card.id);
                const monthSpent = cardTxs
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0);
                return {
                    ...card,
                    monthSpent,
                    transactions: cardTxs.sort((a,b) => b.date.localeCompare(a.date))
                };
            });

        return { 
            creditCardStatements,
            monthlyIncome: monthStats.income, monthlyExpense: monthStats.expense,
            yearlyIncome: yearlyIncomeTotal, yearlyExpense: yearlyExpenseTotal,
            monthlySummaries: finalSummaries, dailyGroups: finalDailyGroups,
        };
    }, [allTransactions, currentDate]);

    let headerIncome = 0;
    let headerExpense = 0;
    let headerTotal = 0;
    let labelIncome = 'Gelir';
    let labelExpense = 'Gider';
    let labelTotal = 'Net Durum';

    if (mainTab === 'accounts') {
        headerIncome = accountStats.totalAssets;
        headerExpense = accountStats.totalDebts;
        headerTotal = headerIncome - headerExpense; 
        labelIncome = 'Varlıklar';
        labelExpense = 'Borçlar';
        labelTotal = 'Net Varlık';
    } else if (mainTab === 'month') {
        headerIncome = yearlyIncome;
        headerExpense = yearlyExpense;
        headerTotal = headerIncome - headerExpense;
        labelTotal = `${format(currentDate, 'yyyy')} Net Durumu`;
    } else {
        headerIncome = monthlyIncome;
        headerExpense = monthlyExpense;
        headerTotal = headerIncome - headerExpense;
        labelTotal = `${format(currentDate, 'MMMM', { locale: tr })} Net Durumu`;
    }

    const handleAccountSubmit = async (data: Omit<Account, 'id' | 'familyId'>) => {
        try {
            if (editingAccount) { await updateAccount(editingAccount.id, data); toast({ title: "Hesap güncellendi" }); } 
            else { await addAccount(data); toast({ title: "Yeni hesap eklendi" }); }
            setIsAccountFormOpen(false); setEditingAccount(null);
        } catch (error) { toast({ variant: "destructive", title: "Hata oluştu" }); }
    };
  }, [allTransactions, categories, currentDate, accounts]);

    const handleTransactionSubmit = async (data: any) => {
    const calculateNewBalance = (acc, type, amount, isRevert = false) => {
        let multiplier = type === 'income' ? 1 : -1;
        if (acc.type === 'credit-card' || acc.type === 'debt') {
            multiplier = type === 'expense' ? 1 : -1;
        }
        if (isRevert) multiplier *= -1;
        return acc.balance + (amount * multiplier);
    };

        try {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            
            if (editingTransaction) { 
                const oldTx = editingTransaction;
                let targetAccount1 = accounts.find(a => a.id === oldTx.accountId);
                let targetAccount2 = accounts.find(a => a.id === data.accountId);
                
                const isSameAccount = oldTx.accountId === data.accountId;
                const newIsApplied = data.date <= todayStr;
                data.isApplied = newIsApplied;
                
                if (isSameAccount && targetAccount1) {
                     let tempBalance = targetAccount1.balance;
                     if ((oldTx.isApplied || oldTx.isApplied === undefined) && oldTx.isAppliedToAccount !== false) {
                         tempBalance = calculateNewBalance({ type: targetAccount1.type, balance: tempBalance }, oldTx.type, oldTx.amount, true);
                     }
                     if (newIsApplied && data.isAppliedToAccount !== false) {
                         tempBalance = calculateNewBalance({ type: targetAccount1.type, balance: tempBalance }, data.type, data.amount, false);
                     }
                     await updateAccount(targetAccount1.id, { balance: tempBalance });
                } else {
                     if ((oldTx.isApplied || oldTx.isApplied === undefined) && oldTx.isAppliedToAccount !== false && targetAccount1) {
                         const revertedBalance = calculateNewBalance(targetAccount1, oldTx.type, oldTx.amount, true);
                         await updateAccount(targetAccount1.id, { balance: revertedBalance });
                     }
                     if (newIsApplied && data.isAppliedToAccount !== false && targetAccount2) {
                         const newBalance = calculateNewBalance(targetAccount2, data.type, data.amount, false);
                         await updateAccount(targetAccount2.id, { balance: newBalance });
                     }
                }
                await updateTransaction(editingTransaction.id, data); 
                toast({ title: "İşlem güncellendi" }); 
            } 
            else { 
                if (data.isInstallment && data.installmentDetails?.total > 1) {
                    const totalCount = data.installmentDetails.total;
                    const amountPerInstallment = Math.round((data.amount / totalCount) * 100) / 100;
                    
                    for (let i = 0; i < totalCount; i++) {
                        const date = addMonths(parseISO(data.date), i);
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const isApplied = dateStr <= todayStr;
                        
                        const txData = {
                            ...data,
                            amount: amountPerInstallment,
                            date: dateStr,
                            isApplied,
                            title: `${data.category || 'Taksit'} (${i + 1}/${totalCount})`,
                            installmentDetails: { current: i + 1, total: totalCount }
                        };
                        
                        if (isApplied && txData.isAppliedToAccount !== false) {
                            const acc = accounts.find(a => a.id === txData.accountId);
                            if (acc) {
                                const newBalance = calculateNewBalance(acc, txData.type, txData.amount, false);
                                await updateAccount(acc.id, { balance: newBalance });
                            }
                        }
                        await addTransaction(txData);
                    }
                    toast({ title: "Taksitli işlemler eklendi" });
                } else {
                    const isApplied = data.date <= todayStr;
                    data.isApplied = isApplied;
                    
                    if (isApplied && data.isAppliedToAccount !== false) {
                        const acc = accounts.find(a => a.id === data.accountId);
                        if (acc) {
                            const newBalance = calculateNewBalance(acc, data.type, data.amount, false);
                            await updateAccount(acc.id, { balance: newBalance });
                        }
                    }
                    await addTransaction(data); 
                    toast({ title: "Yeni işlem eklendi" }); 
                }
            }
            setIsTransactionFormOpen(false); setEditingTransaction(null);
        } catch (error) { toast({ variant: "destructive", title: "Hata oluştu" }); }
    }
    
    const handleDeleteAccount = async (id: string) => {
        try { await deleteAccount(id); toast({ title: "Hesap Silindi", variant: 'destructive'}); } 
        catch (error) { toast({ variant: "destructive", title: "Hata oluştu" }); }
    }
    
    const handleDeleteTransaction = async (id: string) => {
        try { 
            const tx = allTransactions.find(t => t.id === id);
            if (tx) {
                if (tx.isApplied || tx.isApplied === undefined) {
                    const acc = accounts.find(a => a.id === tx.accountId);
                    if (acc) {
                        const newBalance = tx.type === 'income' ? acc.balance - tx.amount : acc.balance + tx.amount;
                        await updateAccount(acc.id, { balance: newBalance });
                    }
                }
            }
            await deleteTransaction(id); 
            toast({ title: "İşlem silindi", variant: 'destructive' }); 
        } 
        catch (error: any) { console.error("İşlem silme hatası:", error); toast({ variant: "destructive", title: "Hata oluştu", description: error?.message || "Bilinmeyen hata" }); }
    }
    
    const openAccountForm = (account: Account | null, type: Account['type'] = 'bank') => { 
        setEditingAccount(account); 
        setInitialAccountType(type);
        setIsAccountFormOpen(true); 
    }
    const openTransactionForm = (transaction: Transaction | null) => { setEditingTransaction(transaction); setIsTransactionFormOpen(true); }

    const handleBillSubmit = async (data: any) => {
        try {
            if (editingBill) { await updateBill(editingBill.id, data); toast({ title: "Fatura güncellendi" }); } 
            else { await addBill(data); toast({ title: "Yeni fatura eklendi" }); }
            setIsBillFormOpen(false); setEditingBill(null);
        } catch (error) { toast({ variant: "destructive", title: "Hata oluştu" }); }
    };
    
    const handleDeleteBill = async (id: string) => {
        try { await deleteBill(id); toast({ title: "Fatura silindi", variant: 'destructive'}); } 
        catch (error: any) { console.error("Fatura silme hatası:", error); toast({ variant: "destructive", title: "Hata oluştu", description: error?.message || "Bilinmeyen hata" }); }
    };
    
    const openBillForm = (bill: Bill | null) => { setEditingBill(bill); setIsBillFormOpen(true); };

    const handlePayBill = async () => {
        if (!payingBill || !paymentAccountId) return;
        try {
            const acc = accounts.find(a => a.id === paymentAccountId);
            if (acc) {
                await updateAccount(acc.id, { balance: acc.balance - payingBill.amount });
            }
            
            const txData = {
                amount: payingBill.amount,
                type: 'expense' as const,
                accountId: paymentAccountId,
                category: 'Fatura',
                date: format(new Date(), 'yyyy-MM-dd'),
                isInstallment: false,
                isRecurring: false,
                isApplied: true,
                description: payingBill.title
            };
            await addTransaction(txData);
            await updateBill(payingBill.id, {
                isPaid: true,
                paidDate: new Date().toISOString(),
                paidAccountId: paymentAccountId
            });
            toast({ title: "Fatura başarıyla ödendi" });
            setPayingBill(null);
            setPaymentAccountId("");
        } catch (error) {
            toast({ variant: "destructive", title: "Ödeme başarısız" });
        }
    };

    const billArchiveData = React.useMemo(() => {
        const paidBills = bills.filter(b => b.isPaid && b.paidDate);
        if (paidBills.length === 0) return [];
        
        const last6Months = Array.from({length: 6}).map((_, i) => subMonths(new Date(), 5 - i));
        
        const data = last6Months.map(monthDate => {
            const monthName = format(monthDate, 'MMM', { locale: tr });
            const monthBills = paidBills.filter(b => isSameMonth(parseISO(b.paidDate!), monthDate));
            
            const point: any = { name: monthName };
            
            if (billArchiveFilter === 'Tümü') {
                point['Toplam'] = monthBills.reduce((acc, b) => acc + b.amount, 0);
            } else {
                point[billArchiveFilter] = monthBills
                    .filter(b => b.title === billArchiveFilter)
                    .reduce((acc, b) => acc + b.amount, 0);
            }
            return point;
        });
        
        return data;
    }, [bills, billArchiveFilter]);

    const uniqueBillTitles = React.useMemo(() => {
        const titles = new Set<string>();
        bills.filter(b => b.isPaid).forEach(b => titles.add(b.title));
        return Array.from(titles);
    }, [bills]);

    // --- KATEGORİ BÜTÇE LİMİTLERİ (Aylık) ---
    const limitedCategories = React.useMemo(() => {
        const limited = categories.filter(c => c.limit && c.limit > 0 && c.type === 'expense');
        
        return limited.map(cat => {
            const spent = allTransactions.filter(tx => 
                tx.type === 'expense' && 
                tx.category === cat.name &&
                getEffectiveMonth(tx.date, tx.accountId, accounts) === format(currentDate, 'yyyy-MM')
            ).reduce((sum, tx) => sum + tx.amount, 0);
            
            return {
                ...cat,
                spent,
                percent: Math.min(Math.round((spent / cat.limit!) * 100), 100)
            };
        });
    }, [categories, allTransactions, currentDate]);

    // --- SABİT GİDERLER (Abonelikler vb.) ---
    const recurringExpenses = React.useMemo(() => {
        return allTransactions.filter(tx => tx.isRecurring && tx.type === 'expense');
    }, [allTransactions]);

    return (
        <div className="min-h-[100dvh] font-sans pb-[calc(100px+env(safe-area-inset-bottom))] relative bg-slate-50 dark:bg-[#0a0a14] transition-colors duration-500">
            
            {/* HERO ALANI (FinPlan Tarzı Koyu Gradyan) */}
            <div className="bg-gradient-to-b from-indigo-950 via-indigo-900 to-slate-900 dark:from-black dark:to-[#0a0a14] text-white pt-[calc(env(safe-area-inset-top)+20px)] pb-12 px-4 rounded-b-[40px] relative z-10 overflow-hidden shadow-[0_10px_40px_rgb(0,0,0,0.2)]">
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] left-[-10%] w-[300px] h-[300px] bg-indigo-500/20 rounded-full blur-[80px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[250px] h-[250px] bg-purple-500/20 rounded-full blur-[80px]" />
                </div>
                
                <div className="flex justify-between items-center mb-6 relative z-10 max-w-2xl mx-auto">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white hover:bg-white/10 rounded-full">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-[17px] font-bold tracking-wide">Bütçe Takibi</h1>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => window.print()} className="text-white hover:bg-white/10 rounded-full print:hidden">
                            <Printer className="w-5 h-5" />
                        </Button>
                        <Link href="/budget/stats" className="print:hidden">
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
                                <BarChart2 className="w-5 h-5" />
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="text-center relative z-10 mb-8 max-w-2xl mx-auto">
                    <p className="text-indigo-200/80 text-xs font-bold uppercase tracking-widest mb-1">{labelTotal}</p>
                    <h2 className="text-5xl font-black tracking-tighter flex items-center justify-center gap-1">
                        {headerTotal.toLocaleString('tr-TR')} <span className="text-3xl text-indigo-300 font-bold">₺</span>
                    </h2>
                </div>

                <div className="flex justify-between gap-3 relative z-10 max-w-2xl mx-auto">
                    <div className="flex-1 bg-white/10 backdrop-blur-md rounded-3xl p-3 sm:p-4 border border-white/10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{labelIncome}</p>
                            <p className="text-lg sm:text-xl font-bold text-white truncate">{headerIncome.toLocaleString('tr-TR')} ₺</p>
                        </div>
                    </div>
                    <div className="flex-1 bg-white/10 backdrop-blur-md rounded-3xl p-3 sm:p-4 border border-white/10 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                            <ArrowUpRight className="w-5 h-5 text-rose-400" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{labelExpense}</p>
                            <p className="text-lg sm:text-xl font-bold text-white truncate">{headerExpense.toLocaleString('tr-TR')} ₺</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABS (FinPlan tarzı modern ikonlu) */}
            <div className="px-4 -mt-6 relative z-20 max-w-2xl mx-auto">
                <div className="bg-white dark:bg-slate-900 rounded-[24px] p-1.5 flex shadow-lg border border-slate-100 dark:border-slate-800">
                    <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
                        <TabsList className="bg-transparent w-full flex p-0 h-[50px] gap-1">
                            <TabsTrigger value="day" className="flex-1 rounded-[18px] h-full flex flex-col items-center justify-center gap-0.5 text-[10px] sm:text-xs font-bold data-[state=active]:bg-indigo-50 dark:data-[state=active]:bg-indigo-900/30 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" /> Günlük
                            </TabsTrigger>
                            <TabsTrigger value="month" className="flex-1 rounded-[18px] h-full flex flex-col items-center justify-center gap-0.5 text-[10px] sm:text-xs font-bold data-[state=active]:bg-indigo-50 dark:data-[state=active]:bg-indigo-900/30 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" /> Aylık
                            </TabsTrigger>
                            <TabsTrigger value="bills" className="flex-1 rounded-[18px] h-full flex flex-col items-center justify-center gap-0.5 text-[10px] sm:text-xs font-bold data-[state=active]:bg-indigo-50 dark:data-[state=active]:bg-indigo-900/30 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                <FileText className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" /> Faturalar
                            </TabsTrigger>
                            <TabsTrigger value="accounts" className="flex-1 rounded-[18px] h-full flex flex-col items-center justify-center gap-0.5 text-[10px] sm:text-xs font-bold data-[state=active]:bg-indigo-50 dark:data-[state=active]:bg-indigo-900/30 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" /> Hesaplar
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            <div className="max-w-2xl mx-auto pt-6 relative z-10 space-y-6">
                
                {/* TARİH SEÇİCİ (Günlük/Aylık sekmelerinde) */}
                {(mainTab === 'day' || mainTab === 'month') && (
                    <div className="flex items-center justify-between px-4">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400" onClick={() => handleNavDate('prev')}><ChevronLeft className="h-5 w-5"/></Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" className="h-10 text-[16px] font-bold text-slate-800 dark:text-white hover:bg-transparent px-4">
                                    {format(currentDate, dateDisplayFormat, { locale: tr })}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl border-0 shadow-xl" align="center">
                                <Calendar
                                    mode="single"
                                    selected={currentDate}
                                    onSelect={(date) => date && setCurrentDate(date)}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400" onClick={() => handleNavDate('next')}><ChevronRight className="h-5 w-5"/></Button>
                    </div>
                )}

                {/* BÜTÇE LİMİTLERİ (Progress Barlar - Sadece Günlük/Aylık'ta gösterilir) */}
                {limitedCategories.length > 0 && (mainTab === 'day' || mainTab === 'month') && (
                    <div className="px-4">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Bütçe Durumu</h3>
                        <div className="space-y-4 bg-white dark:bg-slate-900 rounded-[24px] p-5 shadow-sm border border-slate-100 dark:border-slate-800">
                            {limitedCategories.map(cat => (
                                <div key={cat.id} className="relative">
                                    <div className="flex justify-between items-end mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shadow-sm">
                                                {cat.icon}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{cat.name}</p>
                                                <p className="text-[11px] font-bold text-slate-400">{cat.percent}% kullanıldı</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-800 dark:text-slate-200">{cat.spent.toLocaleString('tr-TR')} ₺</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Limit: {cat.limit!.toLocaleString('tr-TR')} ₺</p>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className={cn("h-full rounded-full transition-all duration-1000", cat.percent >= 90 ? "bg-rose-500" : cat.percent >= 75 ? "bg-orange-500" : "bg-indigo-500")}
                                            style={{ width: `${cat.percent}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- İÇERİK ALANI --- */}
                <div className="pb-24">
                    {/* GÜNLÜK GÖRÜNÜM - İşlem Listesi */}
                    {mainTab === 'day' && dailyGroups.length > 0 && (
                        <div className="space-y-5 px-4">
                            {dailyGroups.map((group, groupIdx) => (
                                <div key={group.dateISO} className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${groupIdx * 100}ms` }}>
                                     <div className="flex justify-between items-center mb-2.5">
                                         <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{group.date}</h3>
                                         <div className="flex gap-1.5">
                                             {group.dayTotalIncome > 0 && <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-black tracking-tight">+{group.dayTotalIncome.toLocaleString('tr-TR')} ₺</span>}
                                             {group.dayTotalExpense > 0 && <span className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2.5 py-0.5 rounded-full font-black tracking-tight">-{group.dayTotalExpense.toLocaleString('tr-TR')} ₺</span>}
                                         </div>
                                     </div>
                                     
                                     <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-100/80 dark:border-slate-800/60 overflow-hidden divide-y divide-slate-100/80 dark:divide-slate-800/40">
                                         {group.transactions.map((tx) => {
                                             const account = accounts.find(a => a.id === tx.accountId);
                                             const dynamicCategory = categories.find(c => c.name === tx.category);
                                             let config = categoryConfig[tx.category];
                                             if (!config) {
                                                 config = tx.type === 'income' 
                                                     ? { color: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', icon: PlusCircle }
                                                     : { color: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400', icon: CircleEllipsis };
                                             }
                                             const CategoryIcon = config.icon;
                                             const bgClass = config.color.split(' ').find(c => c.startsWith('bg-')) || 'bg-slate-100';
                                             const textClass = config.color.split(' ').find(c => c.startsWith('text-')) || 'text-slate-800';

                                             return (
                                                 <div 
                                                     key={tx.id} 
                                                     className="flex items-center justify-between px-4 py-3.5 active:bg-slate-50/80 dark:active:bg-white/5 transition-colors cursor-pointer group"
                                                     onClick={() => openTransactionForm(tx)}
                                                 >
                                                     <div className="flex items-center gap-3 min-w-0">
                                                         <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", bgClass, textClass)}>
                                                             {dynamicCategory ? <span className="text-xl">{dynamicCategory.icon}</span> : <CategoryIcon className="w-5 h-5" />}
                                                         </div>
                                                         <div className="min-w-0">
                                                             <p className="text-[14px] font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                                                                 {tx.category}
                                                             </p>
                                                             <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold truncate mt-0.5">
                                                                 {account?.name || '—'}
                                                                 {tx.description && <span> · {tx.description}</span>}
                                                             </p>
                                                         </div>
                                                     </div>
                                                     <div className="flex flex-col items-end shrink-0 ml-2">
                                                         <p className={cn("font-black text-[15px]", tx.type === 'expense' ? 'text-slate-800 dark:text-slate-100' : 'text-emerald-500')}>
                                                             {tx.type === 'expense' ? '-' : '+'}{tx.amount.toLocaleString('tr-TR')} ₺
                                                         </p>
                                                         <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors mt-0.5" />
                                                     </div>
                                                 </div>
                                             )
                                         })}
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}
                     
                    {/* Kredi Kartları Alanı */}
                     {mainTab === 'day' && (
                         <div className="px-4 mb-8 mt-6">
                             <div className="flex justify-between items-center mb-4">
                                 <div>
                                     <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Kredi Kartları</h3>
                                 </div>
                                 <button onClick={() => openAccountForm(null, 'credit-card')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors text-[11px] font-bold">
                                     <Plus className="w-3.5 h-3.5"/> Kart Ekle
                                 </button>
                             </div>
                             <div className="flex flex-col gap-5">
                                 {creditCardStatements.map((account, idx) => {
                                     const Icon = accountIcons[account.type] || Wallet;
                                     const pct = account.targetLimit && account.targetLimit > 0 ? Math.min((account.monthSpent / account.targetLimit) * 100, 100) : 0;
                                     const gradients = [
                                         'from-violet-600 via-purple-600 to-indigo-700',
                                         'from-rose-600 via-pink-600 to-red-700',
                                         'from-slate-700 via-slate-800 to-slate-900',
                                         'from-blue-600 via-indigo-600 to-blue-800',
                                     ];
                                     const grad = gradients[idx % gradients.length];
                                     return (
                                         <div key={account.id} className="relative">
                                             {/* Premium Card */}
                                             <div
                                                 onClick={() => handleOpenAccountDetails(account)}
                                                 className={`w-full rounded-3xl p-5 text-white bg-gradient-to-br ${grad} shadow-2xl relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-300 border border-white/10`}
                                                 style={{ boxShadow: '0 20px 60px -15px rgba(0,0,0,0.4)' }}
                                             >
                                                 {/* Shimmer overlay */}
                                                 <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/10 pointer-events-none" />
                                                 {/* Watermark Icon */}
                                                 <div className="absolute -bottom-6 -right-6 opacity-[0.07]">
                                                     <Icon className="w-40 h-40" />
                                                 </div>

                                                 {/* Top row */}
                                                 <div className="flex items-start justify-between mb-5">
                                                     <div className="flex items-center gap-3">
                                                         <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                                                             <Icon className="w-5 h-5 text-white" />
                                                         </div>
                                                         <div>
                                                             <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest">Kredi Kartı</p>
                                                             <p className="text-white font-bold text-[15px] leading-tight">{account.name}</p>
                                                         </div>
                                                     </div>
                                                     <div className="text-right">
                                                         <p className="text-white/60 text-[9px] font-bold uppercase tracking-widest mb-0.5">Bu Ay Harcama</p>
                                                         <p className="text-white font-black text-2xl tracking-tight">{account.monthSpent.toLocaleString('tr-TR')} ₺</p>
                                                     </div>
                                                 </div>

                                                 {/* Progress bar */}
                                                 {account.targetLimit && account.targetLimit > 0 && (
                                                     <div className="mb-4">
                                                         <div className="flex justify-between items-center mb-1.5">
                                                             <span className="text-white/70 text-[10px] font-bold uppercase tracking-wider">Aylık Limit</span>
                                                             <span className="text-white text-[11px] font-black">{account.targetLimit.toLocaleString('tr-TR')} ₺</span>
                                                         </div>
                                                         <div className="h-2 w-full bg-black/25 rounded-full overflow-hidden">
                                                             <div
                                                                 className={`h-full rounded-full transition-all duration-1000 ease-out ${pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-white'}`}
                                                                 style={{ width: `${pct}%` }}
                                                             />
                                                         </div>
                                                         <div className="flex justify-between items-center mt-1.5">
                                                             <span className="text-white/60 text-[10px] font-semibold">%{Math.round(pct)} kullanıldı</span>
                                                             <span className="text-white text-[10px] font-black">{Math.max(account.targetLimit - account.monthSpent, 0).toLocaleString('tr-TR')} ₺ kaldı</span>
                                                         </div>
                                                     </div>
                                                 )}

                                                 {/* Bottom chip stripe */}
                                                 <div className="flex items-center gap-1 mt-1">
                                                     {[...Array(4)].map((_,i) => <div key={i} className="h-0.5 flex-1 bg-white/20 rounded-full" />)}
                                                 </div>
                                             </div>

                                             {/* Transactions below card */}
                                             {account.transactions && account.transactions.length > 0 && (
                                                 <div className="mt-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-100/80 dark:border-slate-800/60 overflow-hidden divide-y divide-slate-100/80 dark:divide-slate-800/40">
                                                     {account.transactions.map(tx => {
                                                         let txConfig = categoryConfig[tx.category];
                                                         if (!txConfig) txConfig = tx.type === 'income'
                                                             ? { color: 'bg-emerald-500/10 text-emerald-600', icon: PlusCircle }
                                                             : { color: 'bg-rose-500/10 text-rose-600', icon: CircleEllipsis };
                                                         const TxIcon = txConfig.icon;
                                                         const txBg = txConfig.color.split(' ').find(c => c.startsWith('bg-')) || 'bg-slate-100';
                                                         const txTxt = txConfig.color.split(' ').find(c => c.startsWith('text-')) || 'text-slate-600';
                                                         return (
                                                             <div
                                                                 key={tx.id}
                                                                 className="flex items-center justify-between px-4 py-3 cursor-pointer active:bg-slate-50 dark:active:bg-white/5 transition-colors group"
                                                                 onClick={(e) => { e.stopPropagation(); openTransactionForm(tx); }}
                                                             >
                                                                 <div className="flex items-center gap-3 min-w-0">
                                                                     <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', txBg, txTxt)}>
                                                                         <TxIcon className="w-3.5 h-3.5" />
                                                                     </div>
                                                                     <div className="min-w-0">
                                                                         <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">{tx.description || tx.category}</p>
                                                                         <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{format(parseISO(tx.date), 'dd MMM', {locale:tr})}</p>
                                                                     </div>
                                                                 </div>
                                                                 <div className="flex items-center gap-1.5 shrink-0">
                                                                     <p className={"text-[13px] font-black " + (tx.type === 'expense' ? 'text-slate-700 dark:text-slate-200' : 'text-emerald-500')}>
                                                                         {tx.type === 'expense' ? '-' : '+'}₺{tx.amount.toLocaleString('tr-TR')}
                                                                     </p>
                                                                     <ArrowUpRight className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors" />
                                                                 </div>
                                                             </div>
                                                         );
                                                     })}
                                                 </div>
                                             )}
                                         </div>
                                     );
                                 })}
                                 {creditCardStatements.length === 0 && (
                                     <div
                                         className="w-full rounded-3xl p-8 border-2 border-dashed border-slate-200 dark:border-slate-700/50 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-rose-300 hover:text-rose-400 dark:hover:border-rose-700 transition-all duration-300 group"
                                         onClick={() => openAccountForm(null, 'credit-card')}
                                     >
                                         <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                             <CreditCard className="w-6 h-6 text-rose-400" />
                                         </div>
                                         <p className="font-black text-sm">Kredi Kartı Ekle</p>
                                         <p className="text-xs mt-1 opacity-70">Harcamalarını takip et</p>
                                     </div>
                                 )}
                             </div>
                         </div>
                     )}
                     
                    {mainTab === 'day' && dailyGroups.length === 0 && (
                        <div className="text-center py-20 px-4 text-slate-500">
                            <Wallet className="w-16 h-16 mx-auto mb-4 opacity-20" />
                            <p className="font-bold">İşlem Yok</p>
                            <p className="text-sm mt-1">Bu ay hiç işlem kaydetmediniz.</p>
                        </div>
                    )}

                    {/* AYLIK GÖRÜNÜM */}
                    {mainTab === 'month' && (
                        <div className="px-4 space-y-6">
                            {/* Sabit Giderler Kartı */}
                            {recurringExpenses.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Sabit Giderler</h3>
                                    <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {recurringExpenses.map((tx) => {
                                            let config = categoryConfig[tx.category];
                                            if (!config) {
                                                config = tx.type === 'income' 
                                                    ? { color: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', icon: PlusCircle }
                                                    : { color: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400', icon: CircleEllipsis };
                                            }
                                            const CategoryIcon = config.icon;
                                            const bgClass = config.color.split(' ').find(c => c.startsWith('bg-')) || 'bg-slate-100';
                                            const textClass = config.color.split(' ').find(c => c.startsWith('text-')) || 'text-slate-800';

                                            return (
                                                <div key={tx.id} className="flex items-center justify-between p-4 first:rounded-t-[24px] last:rounded-b-[24px]">
                                                    <div className="flex items-center gap-3.5 min-w-0">
                                                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", bgClass, textClass)}>
                                                            <CategoryIcon className="w-5 h-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                                                                {tx.category} {tx.description && <span className="font-medium text-slate-500">({tx.description})</span>}
                                                            </p>
                                                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Her Ay</p>
                                                        </div>
                                                    </div>
                                                    <p className={cn("font-black text-[15px] shrink-0 text-rose-500")}>
                                                        -{tx.amount.toLocaleString('tr-TR')} ₺
                                                    </p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            <div>
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Aylık Özet</h3>
                                <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {monthlySummaries.map((summary) => (
                                        <Accordion type="single" collapsible key={summary.monthKey} className="w-full">
                                            <AccordionItem value={summary.monthKey} className="border-0">
                                                <AccordionTrigger className="px-5 py-4 hover:no-underline active:bg-slate-50 dark:active:bg-white/5">
                                                    <div className="flex items-center justify-between w-full">
                                                        <span className="text-[15px] font-bold capitalize text-slate-800 dark:text-slate-200">{summary.month}</span>
                                                        <div className="text-right pr-2">
                                                            <p className={cn("font-black text-[15px]", summary.total >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                                                {summary.total >= 0 ? '+' : ''}{summary.total.toLocaleString('tr-TR')} ₺
                                                            </p>
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="px-5 pb-5">
                                                    <div className="flex gap-3">
                                                        <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-4 text-center border border-emerald-100 dark:border-emerald-800/30">
                                                            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Gelir</p>
                                                            <p className="font-black text-emerald-600 text-lg">{summary.income.toLocaleString()} ₺</p>
                                                        </div>
                                                        <div className="flex-1 bg-rose-50 dark:bg-rose-900/10 rounded-2xl p-4 text-center border border-rose-100 dark:border-rose-800/30">
                                                            <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider mb-1">Gider</p>
                                                            <p className="font-black text-rose-600 text-lg">{summary.expense.toLocaleString()} ₺</p>
                                                        </div>
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HESAPLAR GÖRÜNÜMÜ - Yatay Kartlar */}
                    {mainTab === 'accounts' && (
                        <div className="space-y-8 pl-4">
                            {/* Varlıklar */}
                            <div>
                                <div className="flex justify-between items-center pr-4 mb-3">
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Varlıklar</h3>
                                    <button onClick={() => openAccountForm(null, 'bank')} className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 transition-colors">
                                        <Plus className="w-5 h-5"/>
                                    </button>
                                </div>
                                <div className="flex flex-col gap-4 pb-4 pr-4">
                                    {accountStats.assets.map((account) => {
                                        const Icon = accountIcons[account.type] || Wallet;
                                        return (
                                            <div key={account.id} onClick={() => handleOpenAccountDetails(account)} className="w-full rounded-2xl sm:rounded-[32px] p-4 sm:p-6 text-white bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg relative overflow-hidden cursor-pointer active:scale-95 transition-transform border border-white/20">
                                                <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 p-4 opacity-10">
                                                    <Icon className="w-24 h-24 sm:w-32 sm:h-32" />
                                                </div>
                                                <div className="relative z-10 flex items-center justify-between sm:block">
                                                    <div>
                                                        <div className="flex items-center gap-3 sm:block">
                                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center sm:mb-6 backdrop-blur-md shadow-sm">
                                                                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                                            </div>
                                                            <div className="sm:mt-0">
                                                                <p className="text-emerald-100 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mb-0.5 sm:mb-1">{account.type === 'bank' ? 'Banka Hesabı' : 'Nakit'}</p>
                                                                <p className="text-base sm:text-lg font-bold mb-0 sm:mb-1 truncate">{account.name}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <p className="text-2xl sm:text-3xl font-black sm:mt-2 tracking-tight text-right sm:text-left">{account.balance.toLocaleString()} ₺</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {accountStats.assets.length === 0 && (
                                        <div className="w-full rounded-2xl sm:rounded-[32px] p-4 sm:p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => openAccountForm(null, 'bank')}>
                                            <Plus className="w-6 h-6 sm:w-8 sm:h-8 mb-2 opacity-50" />
                                            <p className="font-bold text-sm sm:text-base">Hesap Ekle</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Account Details Dialog - Premium */}
                            <Dialog open={isAccountDetailsOpen} onOpenChange={setIsAccountDetailsOpen}>
                                <DialogContent className="max-w-md h-[88vh] flex flex-col p-0 overflow-hidden rounded-3xl bg-slate-50 dark:bg-[#111113] border border-slate-200/60 dark:border-slate-800/60 shadow-2xl">
                                    {selectedAccountDetails && (() => {
                                        const isCreditCard = selectedAccountDetails.type === 'credit-card';
                                        const bannerGrad = isCreditCard ? 'from-violet-600 via-purple-700 to-indigo-800' : 'from-emerald-500 via-teal-600 to-cyan-700';
                                        const AccIcon = accountIcons[selectedAccountDetails.type] || Wallet;
                                        return (
                                            <div className={`bg-gradient-to-br ${bannerGrad} px-6 pt-6 pb-8 relative overflow-hidden flex-shrink-0`}>
                                                <div className="absolute -bottom-8 -right-8 opacity-[0.08]">
                                                    <AccIcon className="w-40 h-40" />
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/10 pointer-events-none" />
                                                <div className="relative z-10">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <button onClick={() => setIsAccountDetailsOpen(false)} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors">
                                                            <ChevronLeft className="w-4 h-4 text-white" />
                                                        </button>
                                                        <button onClick={() => { setIsAccountDetailsOpen(false); if(selectedAccountDetails) openAccountForm(selectedAccountDetails); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors text-white text-[11px] font-bold">
                                                            <Pencil className="w-3 h-3" /> Düzenle
                                                        </button>
                                                    </div>
                                                    <div>
                                                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">{selectedAccountDetails.name}</p>
                                                        {isEditingAccountDetailsBalance ? (
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="number"
                                                                    className="text-3xl font-black bg-transparent border-b-2 border-white/40 text-white text-center w-40 focus:outline-none placeholder-white/40"
                                                                    value={accountDetailsBalanceEdit}
                                                                    onChange={e => setAccountDetailsBalanceEdit(e.target.value)}
                                                                    autoFocus
                                                                />
                                                                <button onClick={handleSaveAccountDetailsBalance} className="px-3 py-1.5 rounded-full bg-white text-slate-800 text-xs font-black">Kaydet</button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-end gap-2">
                                                                <h2 className="text-4xl font-black text-white tracking-tight">
                                                                    {selectedAccountDetails.balance.toLocaleString('tr-TR')} ₺
                                                                </h2>
                                                                <button onClick={() => setIsEditingAccountDetailsBalance(true)} className="mb-1 w-7 h-7 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors">
                                                                    <Pencil className="w-3 h-3 text-white" />
                                                                </button>
                                                            </div>
                                                        )}
                                                        <p className="text-white/50 text-[11px] font-semibold mt-1">{isCreditCard ? 'Güncel Borç' : 'Güncel Bakiye'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {selectedAccountDetails && (
                                        <div className="flex flex-col flex-1 overflow-hidden">
                                            <div className="px-6 pt-4 pb-2 flex-shrink-0">
                                                <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Hesap Hareketleri</p>
                                            </div>
                                            <div className="flex-1 overflow-y-auto px-6 pb-8">
                                                {(() => {
                                                    const accountTxs = allTransactions.filter(t => t.accountId === selectedAccountDetails.id).sort((a,b) => b.date.localeCompare(a.date));
                                                    if (accountTxs.length === 0) return (
                                                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                                            <Wallet className="w-12 h-12 mb-3 opacity-30" />
                                                            <p className="font-bold text-sm">Henüz işlem yok</p>
                                                            <p className="text-xs mt-1 opacity-70">Bu hesaba ait kayıt bulunamadı.</p>
                                                        </div>
                                                    );

                                                    const grouped: Record<string, typeof accountTxs> = {};
                                                    accountTxs.forEach(tx => {
                                                        const month = tx.date.substring(0, 7);
                                                        if (!grouped[month]) grouped[month] = [];
                                                        grouped[month].push(tx);
                                                    });

                                                    return Object.entries(grouped).map(([month, txs]) => {
                                                        const monthTotal = txs.reduce((sum, tx) => sum + (tx.type === 'income' ? tx.amount : -tx.amount), 0);
                                                        return (
                                                        <div key={month} className="mb-5">
                                                            <div className="flex justify-between items-center mb-2.5">
                                                                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{format(parseISO(month + '-01'), 'MMMM yyyy', { locale: tr })}</h4>
                                                                <span className={cn("text-[10px] font-black px-2.5 py-0.5 rounded-full", monthTotal >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400')}>
                                                                    {monthTotal >= 0 ? '+' : ''}{monthTotal.toLocaleString('tr-TR')} ₺
                                                                </span>
                                                            </div>
                                                            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-100/80 dark:border-slate-800/60 overflow-hidden divide-y divide-slate-100/80 dark:divide-slate-800/40">
                                                                {txs.map(tx => {
                                                                    let txConfig = categoryConfig[tx.category];
                                                                    if (!txConfig) txConfig = tx.type === 'income'
                                                                        ? { color: 'bg-emerald-500/10 text-emerald-600', icon: PlusCircle }
                                                                        : { color: 'bg-rose-500/10 text-rose-600', icon: CircleEllipsis };
                                                                    const TxIcon = txConfig.icon;
                                                                    const txBg = txConfig.color.split(' ').find(c => c.startsWith('bg-')) || 'bg-slate-100';
                                                                    const txTxt = txConfig.color.split(' ').find(c => c.startsWith('text-')) || 'text-slate-600';
                                                                    return (
                                                                        <div key={tx.id} className="flex items-center justify-between px-4 py-3 cursor-pointer active:bg-slate-50 dark:active:bg-white/5 transition-colors group" onClick={() => { setIsAccountDetailsOpen(false); openTransactionForm(tx); }}>
                                                                            <div className="flex items-center gap-3 min-w-0">
                                                                                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', txBg, txTxt)}>
                                                                                    <TxIcon className="w-4 h-4" />
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">{tx.description || tx.category}</p>
                                                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{format(parseISO(tx.date), 'dd MMM yyyy', {locale:tr})}</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                                <p className={cn('text-[13px] font-black', tx.type === 'income' ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-200')}>
                                                                                    {tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('tr-TR')} ₺
                                                                                </p>
                                                                                <ArrowUpRight className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors" />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </DialogContent>
                            </Dialog>

                            {/* Dialogs */}
                        </div>
                    )}

                    {/* FATURALAR GÖRÜNÜMÜ - Kart Grid */}
                    {mainTab === 'bills' && (
                        <div className="px-4 space-y-8">
                            {/* Bekleyenler */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Ödenmeyi Bekleyenler</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {bills.filter(b => !b.isPaid).sort((a,b) => a.dueDate.localeCompare(b.dueDate)).map(bill => {
                                        const isOverdue = new Date(bill.dueDate) < new Date();
                                        return (
                                            <div key={bill.id} className="bg-white dark:bg-slate-900 p-5 rounded-[28px] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between relative overflow-hidden group">
                                                {isOverdue && <div className="absolute top-0 right-0 w-full h-1 bg-rose-500" />}
                                                <div className="mb-4" onClick={() => openBillForm(bill)}>
                                                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mb-3 shadow-sm", isOverdue ? "bg-rose-100 text-rose-600" : "bg-orange-100 text-orange-500")}>
                                                        <FileText className="w-6 h-6" />
                                                    </div>
                                                    <p className="font-bold text-slate-800 dark:text-slate-200 text-[15px] leading-tight mb-1">{bill.title}</p>
                                                    <p className={cn("text-[11px] font-bold uppercase tracking-wider", isOverdue ? "text-rose-500" : "text-slate-400")}>
                                                        Son: {format(parseISO(bill.dueDate), 'd MMM', {locale: tr})}
                                                    </p>
                                                </div>
                                                <div className="flex items-end justify-between mt-auto">
                                                    <p className="font-black text-xl text-slate-900 dark:text-white tracking-tight">{bill.amount.toLocaleString()} ₺</p>
                                                    <button onClick={() => setPayingBill(bill)} className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-colors active:scale-95 shadow-sm">
                                                        <Check className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {bills.filter(b => !b.isPaid).length === 0 && (
                                    <div className="text-center py-10 bg-emerald-50 dark:bg-emerald-900/10 rounded-[28px] border border-emerald-100 dark:border-emerald-800/30">
                                        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-800/50 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                                            <Check className="w-8 h-8" />
                                        </div>
                                        <p className="font-bold text-emerald-700 dark:text-emerald-400">Bekleyen fatura yok!</p>
                                        <p className="text-xs text-emerald-600/70 mt-1">Her şey yolunda.</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Ödenmiş Faturalar */}
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Ödenmiş Faturalar</h3>
                                    <button onClick={() => setIsBillArchiveOpen(true)} className="text-indigo-600 text-xs font-bold uppercase tracking-wider bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">
                                        Arşivi Gör
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {Object.entries(
                                        bills.filter(b => b.isPaid)
                                            .sort((a,b) => (b.paidDate || "").localeCompare(a.paidDate || ""))
                                            .reverse()
                                            .slice(0, 5)
                                            .reduce((groups, bill) => {
                                                const month = bill.paidDate ? format(parseISO(bill.paidDate), 'MMMM yyyy', {locale: tr}) : 'Bilinmeyen Tarih';
                                                if (!groups[month]) groups[month] = [];
                                                groups[month].push(bill);
                                                return groups;
                                            }, {} as Record<string, typeof bills>)
                                    ).map(([month, monthBills]) => (
                                        <div key={month}>
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-4">{month}</h4>
                                            <div className="bg-white dark:bg-slate-900 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/50">
                                                {monthBills.map(bill => (
                                                    <div key={bill.id} className="flex items-center justify-between p-4 opacity-70 hover:opacity-100 transition-opacity cursor-pointer first:rounded-t-[24px] last:rounded-b-[24px]" onClick={() => openBillForm(bill)}>
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
                                                                <FileText className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[14px] font-bold text-slate-800 dark:text-slate-200 line-through decoration-slate-400">{bill.title}</p>
                                                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Ödendi: {bill.paidDate ? format(parseISO(bill.paidDate), 'd MMM', {locale: tr}) : '-'}</p>
                                                            </div>
                                                        </div>
                                                        <p className="font-bold text-[15px] text-slate-500">{bill.amount.toLocaleString()} ₺</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* YENİ İŞLEM EKLE BUTONU (FAB - FinPlan Tarzı Büyük ve Belirgin) */}
            <div className="fixed bottom-24 right-6 z-40 print:hidden">
                <Button 
                    className="h-16 w-16 rounded-full shadow-[0_10px_30px_rgb(79,70,229,0.5)] bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-1 active:scale-95 transition-all duration-300 p-0 flex items-center justify-center group"
                    onClick={() => {
                        if (mainTab === 'accounts') openAccountForm(null, 'bank');
                        else if (mainTab === 'bills') openBillForm(null);
                        else openTransactionForm(null);
                    }}
                >
                    <Plus className="h-8 w-8 text-white group-hover:rotate-90 transition-transform duration-300" />
                </Button>
            </div>

            {/* --- Dialoglar (Modallar) --- */}
            <Dialog open={isAccountFormOpen} onOpenChange={(open) => { if (!open) setEditingAccount(null); setIsAccountFormOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-[32px] bg-white dark:bg-[#1C1C1E] border border-white/20 dark:border-white/10 shadow-2xl p-0 overflow-hidden text-[#1C1C1E] dark:text-white">
                    <DialogTitle className="sr-only">Hesap Formu</DialogTitle>
                    <div className="p-6">
                        <NewAccountForm 
                            familyMembers={familyMembers} 
                            onSubmit={handleAccountSubmit} 
                            initialData={editingAccount} 
                            initialType={initialAccountType}
                        />
                        {editingAccount && (
                             <Button variant="destructive" className="w-full mt-4 rounded-2xl h-12 font-bold" onClick={() => {handleDeleteAccount(editingAccount.id); setIsAccountFormOpen(false);}}>
                                Hesabı Sil
                             </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            
            <Dialog open={isTransactionFormOpen} onOpenChange={(open) => { if (!open) setEditingTransaction(null); setIsTransactionFormOpen(open); }}>
                <DialogContent className="w-[96vw] max-w-md max-h-[92dvh] h-auto rounded-[32px] bg-white dark:bg-slate-950 border border-white/20 dark:border-white/10 shadow-2xl p-0 flex flex-col overflow-hidden focus:outline-none">
                    <DialogTitle className="sr-only">İşlem Formu</DialogTitle>
                    <div className="flex-1 overflow-hidden flex flex-col h-full w-full">
                        <NewTransactionForm 
                            accounts={accounts} 
                            familyMembers={familyMembers} 
                            onSubmit={handleTransactionSubmit} 
                            initialData={editingTransaction} 
                            transactionTemplates={transactionTemplates}
                            onSaveTemplate={async (data) => {
                                try {
                                    await addTransactionTemplate(data);
                                } catch (error) {
                                    console.error("Error saving template:", error);
                                }
                            }}
                            onAddNewAccount={() => { setIsTransactionFormOpen(false); setIsAccountFormOpen(true); }} 
                        />
                        {editingTransaction && (
                             <div className="px-4 pb-4">
                                <Button variant="destructive" className="w-full rounded-2xl h-12 font-bold" onClick={() => {handleDeleteTransaction(editingTransaction.id); setIsTransactionFormOpen(false);}}>
                                    İşlemi Sil
                                </Button>
                             </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isBillFormOpen} onOpenChange={(open) => { if (!open) setEditingBill(null); setIsBillFormOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-[32px] bg-white dark:bg-[#1C1C1E] border border-white/20 dark:border-white/10 shadow-2xl p-0 overflow-hidden text-[#1C1C1E] dark:text-white">
                    <DialogTitle className="sr-only">Fatura Formu</DialogTitle>
                    <div className="p-6">
                        <NewBillForm onSubmit={handleBillSubmit} initialData={editingBill} />
                        {editingBill && (
                             <Button variant="destructive" className="w-full mt-4 rounded-2xl h-12 font-bold" onClick={() => {handleDeleteBill(editingBill.id); setIsBillFormOpen(false);}}>
                                Faturayı Sil
                             </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* PAY BILL MODAL */}
            <Dialog open={!!payingBill} onOpenChange={(open) => { if (!open) setPayingBill(null); }}>
                <DialogContent className="sm:max-w-md rounded-[32px] bg-white dark:bg-[#1C1C1E] border border-white/20 shadow-2xl p-6 text-[#1C1C1E] dark:text-white">
                    <div className="space-y-4">
                        <DialogTitle className="text-xl font-bold text-center">Faturayı Öde</DialogTitle>
                        <div className="text-center p-6 bg-slate-50 dark:bg-white/5 rounded-[24px]">
                            <p className="text-sm font-bold text-slate-500">{payingBill?.title}</p>
                            <p className="text-4xl font-black text-rose-600 mt-2">{payingBill?.amount.toLocaleString()} ₺</p>
                        </div>
                        <div className="space-y-3 mt-6">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Hangi hesaptan ödenecek?</label>
                            <div className="grid grid-cols-2 gap-3">
                                {accounts.map(acc => {
                                    const Icon = accountIcons[acc.type] || Banknote;
                                    const isSelected = paymentAccountId === acc.id;
                                    return (
                                        <div key={acc.id} onClick={() => setPaymentAccountId(acc.id)} className={cn("relative cursor-pointer flex items-center gap-3 p-4 rounded-[20px] border-2 transition-all", isSelected ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md" : "bg-white border-slate-100 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50")}>
                                            <Icon className="h-5 w-5 shrink-0"/>
                                            <span className="text-sm font-bold truncate">{acc.name}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                        <Button 
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[20px] mt-6 text-lg font-bold shadow-md"
                            onClick={handlePayBill}
                            disabled={!paymentAccountId}
                        >
                            Ödemeyi Onayla
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* BILL ARCHIVE MODAL */}
            <Dialog open={isBillArchiveOpen} onOpenChange={setIsBillArchiveOpen}>
                <DialogContent className="sm:max-w-xl rounded-[32px] bg-white dark:bg-[#1C1C1E] border border-white/20 shadow-2xl p-6 text-[#1C1C1E] dark:text-white max-h-[85vh] overflow-y-auto w-[95%]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-center mb-2">Fatura Arşivi ve Analizi</DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <Button 
                            variant={billArchiveFilter === 'Tümü' ? 'default' : 'outline'} 
                            size="sm" 
                            className={cn("rounded-full font-bold", billArchiveFilter === 'Tümü' ? "bg-indigo-600" : "")}
                            onClick={() => setBillArchiveFilter('Tümü')}
                        >
                            Tümü
                        </Button>
                        {uniqueBillTitles.map(title => (
                            <Button 
                                key={title} 
                                variant={billArchiveFilter === title ? 'default' : 'outline'} 
                                size="sm" 
                                className={cn("rounded-full font-bold", billArchiveFilter === title ? "bg-indigo-600" : "")}
                                onClick={() => setBillArchiveFilter(title)}
                            >
                                {title}
                            </Button>
                        ))}
                    </div>

                    <div className="h-64 w-full mt-4 bg-slate-50 dark:bg-white/5 rounded-2xl p-4">
                        {billArchiveData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={billArchiveData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} tickFormatter={(value) => `₺${value}`} width={40} />
                                    <RechartsTooltip 
                                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)'}} 
                                        formatter={(value) => [`${value.toLocaleString()} ₺`, billArchiveFilter]}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey={billArchiveFilter === 'Tümü' ? 'Toplam' : billArchiveFilter} 
                                        stroke="#4f46e5" 
                                        strokeWidth={4} 
                                        dot={{r: 4, strokeWidth: 2}} 
                                        activeDot={{r: 6}} 
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-slate-500 font-medium">Yeterli veri yok</div>
                        )}
                    </div>

                    <div className="mt-6">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Geçmiş Faturalar Listesi</h4>
                        <div className="space-y-6">
                            {Object.entries(
                                bills.filter(b => b.isPaid && (billArchiveFilter === 'Tümü' || b.title === billArchiveFilter))
                                    .sort((a,b) => (b.paidDate || "").localeCompare(a.paidDate || ""))
                                    .reverse()
                                    .reduce((groups, bill) => {
                                        const month = bill.paidDate ? format(parseISO(bill.paidDate), 'MMMM yyyy', {locale: tr}) : 'Bilinmeyen Tarih';
                                        if (!groups[month]) groups[month] = [];
                                        groups[month].push(bill);
                                        return groups;
                                    }, {} as Record<string, typeof bills>)
                            ).map(([month, monthBills]) => (
                                <div key={month}>
                                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-2">{month}</h5>
                                    <div className="space-y-2">
                                        {monthBills.map(bill => (
                                            <div key={bill.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-white/5 rounded-[20px] border border-slate-100 dark:border-white/5">
                                                <div>
                                                    <p className="font-bold text-[15px]">{bill.title}</p>
                                                    <p className="text-[12px] font-medium text-slate-500">{bill.paidDate ? format(parseISO(bill.paidDate), 'd MMMM yyyy', {locale: tr}) : '-'}</p>
                                                </div>
                                                <p className="font-black text-lg text-slate-700 dark:text-slate-200">{bill.amount.toLocaleString()} ₺</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {bills.filter(b => b.isPaid && (billArchiveFilter === 'Tümü' || b.title === billArchiveFilter)).length === 0 && (
                                <p className="text-center text-sm text-slate-500 py-4">Fatura bulunamadı.</p>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
  }, [financialCalculations, statementAccountId]);

  let headerTitle = "Net Durum";
  let headerIncome = 0;
  let headerExpense = 0;
  let headerTotal = 0;
  let labelIncome = "Gelir";
  let labelExpense = "Gider";
  if (mainTab === "accounts") {
    headerIncome = accountStats.totalAssets;
    headerExpense = accountStats.totalDebts;
    headerTotal = accountStats.netWorth;
    headerTitle = "Net Varlık";
    labelIncome = "Varlıklar";
    labelExpense = "Borçlar";
  } else if (mainTab === "month") {
    headerIncome = financialCalculations.yearlyIncome;
    headerExpense = financialCalculations.yearlyExpense;
    headerTotal = headerIncome - headerExpense;
    headerTitle = `${format(currentDate, "yyyy")} Net Birikim`;
  } else if (mainTab === "bills") {
    const unpaidAmt = bills.filter((b) => !b.isPaid).reduce((s, b) => s + b.amount, 0);
    const paidAmt = bills.filter((b) => b.isPaid).reduce((s, b) => s + b.amount, 0);
    headerIncome = paidAmt;
    headerExpense = unpaidAmt;
    headerTotal = unpaidAmt;
    headerTitle = "Toplam Borç";
    labelIncome = "Ödenen";
    labelExpense = "Bekleyen";
  } else {
    headerIncome = financialCalculations.monthlyIncome;
    headerExpense = financialCalculations.monthlyExpense;
    headerTotal = headerIncome - headerExpense;
    headerTitle = `${format(currentDate, "MMMM", { locale: tr })} Net Kalan`;
  }

  // --- ACTIONS ---
  const handleSaveAccount = async () => {
    if (!accName.trim() || !accBalance.trim()) {
      toast({ variant: "destructive", title: "Lütfen hesap adı ve bakiyesini doldurun." });
      return;
    }
    const balanceVal = parseFloat(accBalance.replace(",", "."));
    const limitVal = accCreditLimit ? parseFloat(accCreditLimit.replace(",", ".")) : 0;
    const targetLimitVal = accTargetLimit ? parseFloat(accTargetLimit.replace(",", ".")) : 0;
    const statementDateVal = accStatementDate ? parseInt(accStatementDate, 10) : undefined;
    if (isNaN(balanceVal)) {
      toast({ variant: "destructive", title: "Geçersiz bakiye miktarı." });
      return;
    }
    try {
      const data: any = {
        name: accName.trim(),
        type: accType,
        balance: balanceVal,
        creditLimit: limitVal,
        targetLimit: targetLimitVal,
        statementDate: statementDateVal,
        color: accColor,
        ownerId: "",
      };
      if (editingAccount) {
        await updateAccount(editingAccount.id, data);
        toast({ title: "Hesap güncellendi." });
      } else {
        await addAccount(data);
        toast({ title: "Yeni hesap eklendi." });
      }
      setIsAccountModalOpen(false);
      setEditingAccount(null);
    } catch (e) {
      toast({ variant: "destructive", title: "İşlem başarısız oldu." });
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (window.confirm("Bu hesabı ve ilişkili verileri silmek istediğinize emin misiniz?")) {
      try {
        await deleteAccount(id);
        setIsAccountActionsOpen(false);
        toast({ title: "Hesap silindi.", variant: "destructive" });
      } catch (e) {
        toast({ variant: "destructive", title: "Hata oluştu." });
      }
    }
  };

  const handleSaveTransaction = async () => {
    if (!txAmount.trim() || !txAccountId) {
      toast({ variant: "destructive", title: "Lütfen tutar ve hesap alanlarını doldurun." });
      return;
    }
    const amountVal = parseFloat(txAmount.replace(",", "."));
    if (isNaN(amountVal) || amountVal <= 0) {
      toast({ variant: "destructive", title: "Geçersiz tutar miktarı." });
      return;
    }
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const txData: any = {
        amount: amountVal,
        type: txType,
        accountId: txAccountId,
        category: txCategory,
        date: txDate,
        description: txDescription,
        isInstallment: txIsInstallment,
        isRecurring: txIsRecurring,
        isAppliedToAccount: txIsAppliedToAccount,
        isApplied: false,
      };

      if (editingTransaction) {
        const oldTx = editingTransaction;
        const oldAcc = accounts.find((a) => a.id === oldTx.accountId);
        const newAcc = accounts.find((a) => a.id === txAccountId);
        const isAppliedNow = txDate <= todayStr;
        txData.isApplied = isAppliedNow;

        if (oldTx.accountId === txAccountId && oldAcc) {
          let tempBal = oldAcc.balance;
          if (oldTx.isApplied) {
            tempBal = oldTx.type === "income" ? tempBal - oldTx.amount : tempBal + oldTx.amount;
          }
          if (isAppliedNow) {
            tempBal = txType === "income" ? tempBal + amountVal : tempBal - amountVal;
          }
          await updateAccount(oldAcc.id, { balance: tempBal });
        } else {
          if (oldTx.isApplied && oldAcc) {
            if (oldTx.isAppliedToAccount !== false) {
              const reverted = calculateNewBalance(oldAcc, oldTx.type, oldTx.amount, true);
              await updateAccount(oldAcc.id, { balance: reverted });
            }
          }
          if (isAppliedNow && newAcc) {
            const applied = txType === "income" ? newAcc.balance + amountVal : newAcc.balance - amountVal;
            await updateAccount(newAcc.id, { balance: applied });
          }
        }
        await updateTransaction(editingTransaction.id, txData);
        toast({ title: "İşlem güncellendi." });
      } else {
        const totalInstallments = txIsInstallment ? parseInt(txInstallmentsCount) : 1;
        if (txIsInstallment && totalInstallments > 1) {
          const splitAmount = Math.round((amountVal / totalInstallments) * 100) / 100;
          for (let i = 0; i < totalInstallments; i++) {
            const itemDate = addMonths(parseISO(txDate), i);
            const itemDateStr = format(itemDate, "yyyy-MM-dd");
            const isApplied = itemDateStr <= todayStr;
            const instData = {
              ...txData,
              amount: splitAmount,
              date: itemDateStr,
              isApplied,
              description: `${txDescription.trim() || txCategory} (${i + 1}/${totalInstallments})`,
              installmentDetails: { current: i + 1, total: totalInstallments },
            };
            if (isApplied) {
              const acc = accounts.find((a) => a.id === txAccountId);
              if (acc) {
                const newBal = txType === "income" ? acc.balance + splitAmount : acc.balance - splitAmount;
                await updateAccount(acc.id, { balance: newBal });
              }
            }
            await addTransaction(instData);
          }
          toast({ title: `${totalInstallments} adet taksitli işlem eklendi.` });
        } else {
          const isApplied = txDate <= todayStr;
          txData.isApplied = isApplied;
          if (isApplied) {
            const acc = accounts.find((a) => a.id === txAccountId);
            if (acc) {
              const newBal = txType === "income" ? acc.balance + amountVal : acc.balance - amountVal;
              await updateAccount(acc.id, { balance: newBal });
            }
          }
          await addTransaction(txData);
          toast({ title: "İşlem eklendi." });
        }
      }
      setIsTransactionModalOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "İşlem başarısız oldu." });
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm("Bu işlemi silmek istediğinize emin misiniz?")) {
      try {
        const tx = allTransactions.find((t) => t.id === id);
        if (tx && tx.isApplied) {
          const acc = accounts.find((a) => a.id === tx.accountId);
          if (acc && tx.isAppliedToAccount !== false) {
            const reverted = calculateNewBalance(acc, tx.type, tx.amount, true);
            await updateAccount(acc.id, { balance: reverted });
          }
        }
        await deleteTransaction(id);
        setIsTransactionActionsOpen(false);
        toast({ title: "İşlem silindi.", variant: "destructive" });
      } catch (e) {
        toast({ variant: "destructive", title: "Hata oluştu." });
      }
    }
  };

  const handleSaveBill = async () => {
    if (!billTitle.trim() || !billAmount.trim()) {
      toast({ variant: "destructive", title: "Lütfen fatura başlığını ve tutarını girin." });
      return;
    }
    const amtVal = parseFloat(billAmount.replace(",", "."));
    if (isNaN(amtVal) || amtVal <= 0) {
      toast({ variant: "destructive", title: "Geçersiz fatura tutarı." });
      return;
    }
    try {
      const data = {
        title: billTitle.trim(),
        amount: amtVal,
        dueDate: billDueDate,
        category: billCategory,
        isRecurring: billIsRecurring,
        isPaid: editingBill ? editingBill.isPaid : false,
      };
      if (editingBill) {
        await updateBill(editingBill.id, data);
        toast({ title: "Fatura güncellendi." });
      } else {
        await addBill(data);
        toast({ title: "Fatura eklendi." });
      }
      setIsBillModalOpen(false);
      setEditingBill(null);
    } catch (e) {
      toast({ variant: "destructive", title: "İşlem kaydedilemedi." });
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (window.confirm("Bu faturayı silmek istediğinize emin misiniz?")) {
      try {
        await deleteBill(id);
        setIsBillActionsOpen(false);
        toast({ title: "Fatura silindi.", variant: "destructive" });
      } catch (e) {
        toast({ variant: "destructive", title: "Hata oluştu." });
      }
    }
  };

  const handlePayBill = async () => {
    if (!payingBill || !paymentAccountId) return;
    try {
      const acc = accounts.find((a) => a.id === paymentAccountId);
      if (!acc) return;
      if (acc.balance < payingBill.amount) {
        const confirmed = window.confirm("Seçilen hesap bakiyesi fatura tutarından düşüktür. Yine de ödemek ister misiniz?");
        if (!confirmed) return;
      }
      await proceedBillPayment(acc);
    } catch (e) {
      toast({ variant: "destructive", title: "Hata oluştu." });
    }
  };

  const proceedBillPayment = async (acc: Account) => {
    if (!payingBill) return;
    try {
      await updateAccount(acc.id, { balance: acc.balance - payingBill.amount });
      const txData = {
        amount: payingBill.amount,
        type: "expense" as const,
        accountId: acc.id,
        category: "Fatura",
        date: format(new Date(), "yyyy-MM-dd"),
        isInstallment: false,
        isRecurring: false,
        isApplied: true,
        description: payingBill.title,
      };
      await addTransaction(txData);
      await updateBill(payingBill.id, {
        isPaid: true,
        paidDate: new Date().toISOString(),
        paidAccountId: acc.id,
      });
      setIsPayBillModalOpen(false);
      setPayingBill(null);
      setPaymentAccountId("");
      toast({ title: "Fatura ödendi." });
    } catch (e) {
      toast({ variant: "destructive", title: "Fatura ödenirken hata oluştu." });
    }
  };

  const handleFabPress = () => {
    if (mainTab === "day" || mainTab === "month") openNewTransaction();
    else if (mainTab === "accounts") openNewAccount();
    else if (mainTab === "bills") openNewBill();
  };

  const openNewTransaction = () => {
    setEditingTransaction(null);
    setTxAmount("");
    setTxType("expense");
    setTxCategory("Diğer");
    setTxAccountId(accounts[0]?.id || "");
    setTxDate(format(new Date(), "yyyy-MM-dd"));
    setTxDescription("");
    setTxIsInstallment(false);
    setTxInstallmentsCount("3");
    setTxIsRecurring(false);
    setTxIsAppliedToAccount(true);
    setIsTransactionModalOpen(true);
  };

  const openEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setTxAmount(tx.amount.toString());
    setTxType(tx.type);
    setTxCategory(tx.category || "Diğer");
    setTxAccountId(tx.accountId);
    setTxDate(tx.date);
    setTxDescription(tx.description || "");
    setTxIsInstallment(tx.isInstallment || false);
    setTxInstallmentsCount(tx.installmentDetails?.total?.toString() || "3");
    setTxIsRecurring(tx.isRecurring || false);
    setTxIsAppliedToAccount(tx.isAppliedToAccount !== false);
    setIsTransactionModalOpen(true);
  };

  const openNewAccount = () => {
    setEditingAccount(null);
    setAccName("");
    setAccType("bank");
    setAccBalance("");
    setAccCreditLimit("");
    setAccTargetLimit("");
    setAccStatementDate("");
    setAccColor(CARD_PALETTE[hashStr(Date.now().toString()) % CARD_PALETTE.length].hex);
    setIsAccountModalOpen(true);
  };

  const openEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccBalance(acc.balance.toString());
    setAccCreditLimit(acc.creditLimit?.toString() || "");
    setAccTargetLimit((acc as any).targetLimit?.toString() || "");
    setAccStatementDate(acc.statementDate?.toString() || "");
    setAccColor((acc as any).color || getCardPalette(acc).hex);
    setIsAccountModalOpen(true);
  };

  const openNewBill = () => {
    setEditingBill(null);
    setBillTitle("");
    setBillAmount("");
    setBillDueDate(format(new Date(), "yyyy-MM-dd"));
    setBillCategory("Fatura");
    setBillIsRecurring(false);
    setIsBillModalOpen(true);
  };

  const openEditBill = (b: Bill) => {
    setEditingBill(b);
    setBillTitle(b.title);
    setBillAmount(b.amount.toString());
    setBillDueDate(b.dueDate);
    setBillCategory(b.category || "Fatura");
    setBillIsRecurring(b.isRecurring || false);
    setIsBillModalOpen(true);
  };

  const handleOpenStatement = (acc: any) => {
    setStatementAccountId(acc.id);
    setIsAdjustmentFormOpen(false);
    setAdjType("expense");
    setAdjAmount("");
    setAdjDescription("");
    setAdjDate(format(new Date(), "yyyy-MM-dd"));
  };

  const handleCloseStatement = () => {
    setStatementAccountId(null);
    setIsAdjustmentFormOpen(false);
  };

  const handleSaveStatementTotal = async () => {
    if (statementAccount) {
      const newTotal = parseFloat(statementTotalEdit.replace(",", "."));
      if (!isNaN(newTotal)) {
        const diff = newTotal - statementAccount.monthSpent;
        if (diff !== 0) {
          const adjTx = {
            accountId: statementAccount.id,
            amount: Math.abs(diff),
            type: diff > 0 ? ("expense" as const) : ("income" as const),
            category: "Diğer",
            date: format(new Date(), "yyyy-MM-dd"),
            description: "Ekstre Tutarı Düzeltmesi",
            isAppliedToAccount: true,
          };
          await addTransaction(adjTx as any);
        }
        setIsEditingStatementTotal(false);
        toast({ title: "Ekstre tutarı güncellendi." });
      }
    }
  };

  const handleSaveAdjustment = async () => {
    if (!statementAccountId || !adjAmount.trim()) {
      toast({ variant: "destructive", title: "Lütfen bir tutar girin." });
      return;
    }
    const amountVal = parseFloat(adjAmount.replace(",", "."));
    if (isNaN(amountVal) || amountVal <= 0) {
      toast({ variant: "destructive", title: "Geçersiz tutar." });
      return;
    }
    const acc = accounts.find((a) => a.id === statementAccountId);
    if (!acc) return;
    try {
      const newBal = calculateNewBalance(acc, adjType, amountVal);
      await updateAccount(acc.id, { balance: newBal });
      await addTransaction({
        amount: amountVal,
        type: adjType,
        accountId: acc.id,
        category: adjType === "income" ? "İade" : "Düzeltme",
        date: adjDate,
        description: adjDescription.trim() || (adjType === "income" ? "Manuel İade" : "Manuel Düzeltme"),
        isInstallment: false,
        isRecurring: false,
        isApplied: true,
      } as any);
      setAdjAmount("");
      setAdjDescription("");
      setIsAdjustmentFormOpen(false);
      toast({ title: "Ekstreye yansıtıldı." });
    } catch (e) {
      toast({ variant: "destructive", title: "Düzeltme eklenemedi." });
    }
  };

  const handleOpenAccountDetails = (acc: Account) => {
    setSelectedAccountDetails(acc);
    setAccountDetailsBalanceEdit(acc.balance.toString());
    setIsEditingAccountDetailsBalance(false);
    setIsAccountDetailsOpen(true);
  };

  const handleSaveAccountDetailsBalance = async () => {
    if (selectedAccountDetails) {
      const newBal = parseFloat(accountDetailsBalanceEdit.replace(",", "."));
      if (!isNaN(newBal)) {
        await updateAccount(selectedAccountDetails.id, { balance: newBal });
        setSelectedAccountDetails({
          ...selectedAccountDetails,
          balance: newBal,
        });
        setIsEditingAccountDetailsBalance(false);
        toast({ title: "Bakiye güncellendi." });
      }
    }
  };

  return (
    <div style={{ backgroundColor: theme.bg }} className="min-h-screen font-sans pb-28 relative text-[#2B2420]">
      {/* ─── STICKY / COMPACT HEADER (Plum Gradient) ─── */}
      <div className={`bg-gradient-to-br ${theme.grad} text-white pt-6 pb-6 px-4 rounded-b-[32px] shadow-xl relative overflow-hidden`}>
        {/* Ambient Decorative Glow Circles */}
        <div className="absolute -top-12 -right-8 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-16 -left-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

        <div className="max-w-xl mx-auto relative z-10">
          <div className="flex justify-between items-center mb-3">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
            >
              <ChevronLeft size={18} className="text-white" />
            </button>
            <div className="flex items-center gap-1.5 font-extrabold text-sm tracking-wide">
              <Sparkles size={13} className="text-white/90" />
              <span>Bütçe Takibi</span>
            </div>
            <button
              onClick={() => setIsBudgetSettingsOpen(true)}
              className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
            >
              <MoreHorizontal size={18} className="text-white" />
            </button>
          </div>

          <div className="text-center mb-4">
            <p className="text-white/70 text-[9.5px] font-extrabold uppercase tracking-widest mb-0.5">{headerTitle}</p>
            <h2 className="text-3xl font-black tracking-tight">₺{headerTotal.toLocaleString("tr-TR")}</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 flex items-center gap-2.5 border border-white/10">
              <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <ArrowDownLeft size={13} className="text-[#EAF4E8]" />
              </div>
              <div className="min-w-0">
                <p className="text-white/65 text-[9px] font-extrabold uppercase tracking-wider">{labelIncome}</p>
                <p className="text-white font-bold text-xs truncate">₺{headerIncome.toLocaleString("tr-TR")}</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 flex items-center gap-2.5 border border-white/10">
              <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                <ArrowUpRight size={13} className="text-[#F7E3DA]" />
              </div>
              <div className="min-w-0">
                <p className="text-white/65 text-[9px] font-extrabold uppercase tracking-wider">{labelExpense}</p>
                <p className="text-white font-bold text-xs truncate">₺{headerExpense.toLocaleString("tr-TR")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── TABS ─── */}
      <div className="px-4 mt-3 max-w-xl mx-auto relative z-20">
        <div style={{ backgroundColor: theme.surfaceRaised, borderColor: theme.borderStrong }} className="rounded-full p-1 flex border shadow-md">
          {(["day", "month", "bills", "accounts"] as const).map((tab) => {
            const isActive = mainTab === tab;
            let label = "Günlük";
            let TabIcon: any = CalendarIcon;
            if (tab === "month") {
              label = "Aylık";
              TabIcon = BarChart2;
            } else if (tab === "bills") {
              label = "Faturalar";
              TabIcon = FileText;
            } else if (tab === "accounts") {
              label = "Hesaplar";
              TabIcon = Wallet;
            }
            return (
              <button
                key={tab}
                onClick={() => setMainTab(tab)}
                style={isActive ? { backgroundColor: theme.accent, color: "#ffffff" } : { color: theme.textMuted }}
                className={cn(
                  "flex-1 py-2 rounded-full flex items-center justify-center gap-1.5 font-extrabold text-[11px] transition-all duration-200",
                  isActive ? "shadow-sm" : "hover:bg-black/5"
                )}
              >
                <TabIcon size={13} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="max-w-xl mx-auto px-4 pt-4 space-y-5">
        {/* ─── DAY TAB ─── */}
        {mainTab === "day" && (
          <div className="space-y-5">
            {/* Month Nav */}
            <div style={{ backgroundColor: theme.surface, borderColor: theme.border }} className="flex justify-between items-center px-4 py-2.5 rounded-2xl border">
              <button onClick={() => handleNavDate("prev")} style={{ backgroundColor: theme.surfaceAlt }} className="w-7 h-7 rounded-full flex items-center justify-center">
                <ChevronLeft size={16} style={{ color: theme.accent }} />
              </button>
              <span className="font-extrabold text-xs uppercase tracking-wider text-[#2B2420]">
                {format(currentDate, "MMMM yyyy", { locale: tr })}
              </span>
              <button onClick={() => handleNavDate("next")} style={{ backgroundColor: theme.surfaceAlt }} className="w-7 h-7 rounded-full flex items-center justify-center">
                <ChevronRight size={16} style={{ color: theme.accent }} />
              </button>
            </div>

            {/* Kredi Kartları (Yan Yana 2 Kart Grid Görünümü) */}
            {financialCalculations.creditCardStatements.length > 0 && (
              <div>
                <p style={{ color: theme.textMuted }} className="font-black text-[10px] uppercase tracking-widest ml-1 mb-2">
                  Kredi Kartları
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {financialCalculations.creditCardStatements.map((acc) => {
                    const palette = getCardPalette(acc);
                    const hasTarget = !!(acc as any).targetLimit && (acc as any).targetLimit > 0;
                    const hasLimit = !!acc.creditLimit && acc.creditLimit > 0;
                    const validSpent = Math.max(0, acc.monthSpent);

                    const pct = hasTarget
                      ? Math.min((validSpent / ((acc as any).targetLimit || 1)) * 100, 100)
                      : hasLimit
                      ? Math.min((acc.balance / (acc.creditLimit || 1)) * 100, 100)
                      : 0;

                    const remaining = hasTarget
                      ? Math.max(((acc as any).targetLimit || 0) - validSpent, 0)
                      : hasLimit
                      ? Math.max((acc.creditLimit || 0) - acc.balance, 0)
                      : null;

                    return (
                      <button
                        key={acc.id}
                        onClick={() => handleOpenStatement(acc)}
                        style={{
                          background: `linear-gradient(135deg, ${palette.fromHex}, ${palette.toHex})`,
                        }}
                        className="w-full h-[110px] relative rounded-2xl p-2.5 text-white text-left shadow-md overflow-hidden transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between group"
                      >
                        {/* Ambient decorative glow */}
                        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />

                        {/* Top: Chip + Card Name */}
                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0 mr-1">
                            {/* Metallic Chip Mini */}
                            <div className="w-5 h-3.5 rounded bg-yellow-300/80 border border-yellow-400/50 flex items-center justify-center relative overflow-hidden shrink-0">
                              <div className="w-full h-[1px] bg-yellow-600/40 my-0.5" />
                            </div>
                            <span className="font-extrabold text-[11px] truncate leading-tight drop-shadow-sm">{acc.name}</span>
                          </div>
                          <CreditCard size={13} className="text-white/50 shrink-0" />
                        </div>

                        {/* Middle: Net Harcama & Kalan */}
                        <div className="relative z-10">
                          <div className="flex justify-between items-baseline">
                            <div className="min-w-0">
                              <span className="text-white/60 text-[7.5px] font-extrabold uppercase tracking-wider block">Net Harcama</span>
                              <span className="text-white font-black text-sm tracking-tight truncate block">₺{acc.monthSpent.toLocaleString("tr-TR")}</span>
                            </div>
                            {remaining !== null && (
                              <div className="text-right shrink-0 ml-1">
                                <span className="text-white/60 text-[7.5px] font-extrabold uppercase tracking-wider block">Kalan</span>
                                <span className="text-white/90 font-extrabold text-[10px]">₺{remaining.toLocaleString("tr-TR")}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bottom: Mini Progress Bar */}
                        {(hasTarget || hasLimit) && (
                          <div className="relative z-10">
                            <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all duration-500", pct >= 90 ? "bg-rose-300" : "bg-white/90")}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center mt-0.5 text-[7.5px] font-bold text-white/60">
                              <span>%{pct} Harcandı</span>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Daily Transactions */}
            <div>
              <p style={{ color: theme.textMuted }} className="font-black text-[10px] uppercase tracking-widest ml-1 mb-2">İşlemler</p>
              {financialCalculations.dailyGroups.length === 0 ? (
                <div style={{ backgroundColor: theme.surface, borderColor: theme.border }} className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed text-center">
                  <Wallet size={30} style={{ color: theme.textMuted }} />
                  <p style={{ color: theme.textMuted }} className="font-bold text-xs mt-2">Bu ay işlem kaydı bulunmuyor.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {financialCalculations.dailyGroups.map((group) => (
                    <div key={group.dateISO}>
                      <div className="flex justify-between items-center px-1 mb-1.5">
                        <span style={{ color: theme.textMuted }} className="font-black text-[10px] uppercase tracking-wider">{group.dateStr}</span>
                        <div className="flex gap-1.5">
                          {group.dayIncome > 0 && (
                            <span style={{ backgroundColor: theme.incomeBg, color: theme.income }} className="text-[10px] px-2 py-0.5 rounded-full font-black">
                              +₺{group.dayIncome.toLocaleString("tr-TR")}
                            </span>
                          )}
                          {group.dayExpense > 0 && (
                            <span style={{ backgroundColor: theme.expenseBg, color: theme.expense }} className="text-[10px] px-2 py-0.5 rounded-full font-black">
                              -₺{group.dayExpense.toLocaleString("tr-TR")}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ backgroundColor: theme.surface, borderColor: theme.border }} className="rounded-2xl border overflow-hidden divide-y divide-black/[0.05]">
                        {group.transactions.map((tx) => {
                          const acc = accounts.find((a) => a.id === tx.accountId);
                          const conf = getCategoryConfig(tx.category, tx.type, categories);

                          return (
                            <div
                              key={tx.id}
                              onClick={() => {
                                setSelectedMenuListTransaction(tx);
                                setIsTransactionActionsOpen(true);
                              }}
                              className="flex items-center justify-between p-3.5 hover:bg-black/5 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0 mr-3">
                                <div style={{ backgroundColor: conf.bgColor }} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                                  <CatIcon conf={conf} size={17} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-[13px] text-[#2B2420] truncate">{tx.category}</span>
                                    {tx.isRecurring && <Repeat size={11} style={{ color: theme.accent }} />}
                                  </div>
                                  <p style={{ color: theme.textMuted }} className="text-[10px] font-bold truncate mt-0.5">
                                    {acc?.name || "—"}{tx.description ? ` · ${tx.description}` : ""}
                                  </p>
                                </div>
                              </div>
                              <span style={{ color: tx.type === "income" ? theme.income : theme.textPrimary }} className="font-black text-[13px] shrink-0">
                                {tx.type === "expense" ? "-" : "+"}₺{tx.amount.toLocaleString("tr-TR")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── MONTH TAB ─── */}
        {mainTab === "month" && (
          <div className="space-y-5">
            {/* Year Nav */}
            <div style={{ backgroundColor: theme.surface, borderColor: theme.border }} className="flex justify-between items-center px-4 py-2.5 rounded-2xl border">
              <button onClick={() => handleNavDate("prev")} style={{ backgroundColor: theme.surfaceAlt }} className="w-7 h-7 rounded-full flex items-center justify-center">
                <ChevronLeft size={16} style={{ color: theme.accent }} />
              </button>
              <span className="font-extrabold text-xs uppercase tracking-wider text-[#2B2420]">
                {format(currentDate, "yyyy")} YILI
              </span>
              <button onClick={() => handleNavDate("next")} style={{ backgroundColor: theme.surfaceAlt }} className="w-7 h-7 rounded-full flex items-center justify-center">
                <ChevronRight size={16} style={{ color: theme.accent }} />
              </button>
            </div>

            {/* Financial Trend Line Chart */}
            {(() => {
              const summaries = financialCalculations.monthlySummaries;
              const chartData = summaries.map((s) => ({
                name: s.monthName.substring(0, 3),
                Gelir: s.income,
                Gider: s.expense,
              }));
              const hasData = summaries.some((s) => s.income > 0 || s.expense > 0);
              if (!hasData) return null;

              return (
                <div style={{ backgroundColor: theme.surface, borderColor: theme.border }} className="p-4 rounded-2xl border space-y-3">
                  <p style={{ color: theme.textMuted }} className="font-black text-[10px] uppercase tracking-widest">Finansal Trend (Gelir / Gider)</p>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(43,36,28,0.06)" />
                        <XAxis dataKey="name" stroke={theme.textMuted} fontSize={10} />
                        <YAxis stroke={theme.textMuted} fontSize={10} />
                        <RechartsTooltip />
                        <Line type="monotone" dataKey="Gelir" stroke={theme.income} strokeWidth={2.5} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="Gider" stroke={theme.expense} strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}

            {/* Monthly Summaries List */}
            <div>
              <p style={{ color: theme.textMuted }} className="font-black text-[10px] uppercase tracking-widest ml-1 mb-2">Aylık Özet</p>
              <div style={{ backgroundColor: theme.surface, borderColor: theme.border }} className="rounded-2xl border divide-y divide-black/[0.05]">
                {financialCalculations.monthlySummaries.map((summary) => {
                  const isExpanded = expandedMonth === summary.monthKey;
                  const monthExpenses = allTransactions
                    .filter(
                      (t) =>
                        getEffectiveMonth(t.date, t.accountId, accounts) === summary.monthKey &&
                        t.type === "expense"
                    )
                    .sort((a, b) => b.date.localeCompare(a.date));

                  return (
                    <div key={summary.monthKey}>
                      <button
                        onClick={() => setExpandedMonth(isExpanded ? null : summary.monthKey)}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-black/5 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronRight
                            size={16}
                            style={{ color: theme.textMuted }}
                            className={cn("transition-transform duration-200", isExpanded && "rotate-90")}
                          />
                          <div>
                            <p className="font-bold text-[13px] text-[#2B2420] capitalize">{summary.monthName}</p>
                            <p style={{ color: theme.textMuted }} className="text-[9px] font-bold">
                              +{summary.income.toLocaleString("tr-TR")} / -{summary.expense.toLocaleString("tr-TR")}
                            </p>
                          </div>
                        </div>
                        <span style={{ color: summary.net >= 0 ? theme.income : theme.expense }} className="font-black text-[13px]">
                          {summary.net >= 0 ? "+" : ""}₺{summary.net.toLocaleString("tr-TR")}
                        </span>
                      </button>

                      {isExpanded && (
                        <div style={{ backgroundColor: theme.surfaceAlt }} className="mx-3 mb-3 p-3 rounded-xl space-y-2">
                          {monthExpenses.length === 0 ? (
                            <p style={{ color: theme.textMuted }} className="text-xs text-center py-2 font-semibold">Harcama bulunamadı.</p>
                          ) : (
                            monthExpenses.map((tx) => {
                              const conf = getCategoryConfig(tx.category, tx.type, categories);
                              return (
                                <div key={tx.id} className="flex justify-between items-center py-1.5 border-b border-black/[0.04] last:border-0">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div style={{ backgroundColor: conf.bgColor }} className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0">
                                      <CatIcon conf={conf} size={13} />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-[#2B2420] truncate">{tx.description || tx.category}</p>
                                      <p style={{ color: theme.textMuted }} className="text-[9px] font-bold">{tx.date.substring(8, 10)} {summary.monthName.substring(0, 3)}</p>
                                    </div>
                                  </div>
                                  <span style={{ color: theme.textSecondary }} className="font-extrabold text-xs shrink-0">-₺{tx.amount.toLocaleString("tr-TR")}</span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sabit Giderler */}
            {financialCalculations.recurringExpenses.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p style={{ color: theme.textMuted }} className="font-black text-[10px] uppercase tracking-widest ml-1">Sabit Giderler</p>
                  <div style={{ backgroundColor: theme.accent + "1A", color: theme.accent }} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black">
                    <Repeat size={11} />
                    <span>Toplam ₺{financialCalculations.recurringExpensesTotal.toLocaleString("tr-TR")}</span>
                  </div>
                </div>
                <div style={{ backgroundColor: theme.surface, borderColor: theme.border }} className="rounded-2xl border divide-y divide-black/[0.05]">
                  {financialCalculations.recurringExpenses.map((tx) => {
                    const conf = getCategoryConfig(tx.category, tx.type, categories);
                    return (
                      <div key={tx.id} className="flex justify-between items-center p-3.5">
                        <div className="flex items-center gap-3">
                          <div style={{ backgroundColor: conf.bgColor }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                            <CatIcon conf={conf} size={16} />
                          </div>
                          <div>
                            <p className="font-bold text-xs text-[#2B2420]">{tx.category}</p>
                            <p style={{ color: theme.textMuted }} className="text-[9px] font-bold uppercase tracking-wider">Abonelik / Her Ay</p>
                          </div>
                        </div>
                        <span style={{ color: theme.expense }} className="font-black text-xs">-₺{tx.amount.toLocaleString("tr-TR")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── BILLS TAB ─── */}
        {mainTab === "bills" && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <p style={{ color: theme.textMuted }} className="font-black text-[10px] uppercase tracking-widest ml-1">Bekleyen Faturalar</p>
              <button
                onClick={openNewBill}
                style={{ backgroundColor: theme.accent + "1A", color: theme.accent }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black hover:opacity-80 transition-opacity"
              >
                <Plus size={12} />
                <span>Ekle</span>
              </button>
            </div>

            {bills.filter((b) => !b.isPaid).length === 0 ? (
              <div style={{ backgroundColor: theme.surface, borderColor: theme.border }} className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed text-center">
                <CheckCircle2 size={30} style={{ color: theme.income }} />
                <p style={{ color: theme.textMuted }} className="font-bold text-xs mt-2">Ödenmemiş fatura bulunmuyor.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {bills.filter((b) => !b.isPaid).map((bill) => {
                  const config = getCategoryConfig(bill.category, "expense", categories);
                  const today = new Date();
                  const dueDateObj = new Date(bill.dueDate);
                  const diffDays = Math.ceil((dueDateObj.getTime() - today.getTime()) / 86400000);
                  const isLate = diffDays < 0;
                  const isNear = diffDays >= 0 && diffDays <= 3;
                  const stripColor = isLate ? theme.expense : isNear ? "#A9762E" : theme.income;

                  return (
                    <div
                      key={bill.id}
                      onClick={() => {
                        setSelectedMenuListBill(bill);
                        setIsBillActionsOpen(true);
                      }}
                      style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                      className="relative rounded-2xl p-3.5 border flex items-center justify-between overflow-hidden cursor-pointer hover:bg-black/5 transition-colors"
                    >
                      <div style={{ backgroundColor: stripColor }} className="absolute left-0 top-0 bottom-0 w-1" />
                      <div className="flex items-center gap-3 pl-2 min-w-0 mr-3">
                        <div style={{ backgroundColor: config.bgColor }} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                          <CatIcon conf={config} size={17} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[13px] text-[#2B2420] truncate leading-tight">{bill.title}</p>
                          <p style={{ color: stripColor }} className="text-[10px] font-bold mt-0.5">
                            {isLate ? "Gecikti" : isNear ? `${diffDays} gün kaldı` : "Bekliyor"} · {format(parseISO(bill.dueDate), "d MMM yyyy", { locale: tr })}
                          </p>
                        </div>
                      </div>
                      <span className="font-black text-[13px] text-[#2B2420] shrink-0">₺{bill.amount.toLocaleString("tr-TR")}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Paid Bills Archive */}
            <div>
              <button
                onClick={() => setIsPaidBillsArchiveOpen(!isPaidBillsArchiveOpen)}
                style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                className="w-full flex items-center justify-between p-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest text-left"
              >
                <span style={{ color: theme.textMuted }}>Ödenmiş Arşiv ({bills.filter((b) => b.isPaid).length})</span>
                <ChevronRight size={14} style={{ color: theme.textMuted }} className={cn("transition-transform duration-200", isPaidBillsArchiveOpen && "rotate-90")} />
              </button>

              {isPaidBillsArchiveOpen && (
                <div style={{ backgroundColor: theme.surface, borderColor: theme.border }} className="mt-2 p-3 rounded-2xl border divide-y divide-black/[0.05] space-y-2">
                  {bills.filter((b) => b.isPaid).length === 0 ? (
                    <p style={{ color: theme.textMuted }} className="text-xs text-center py-4 font-semibold">Arşiv temiz.</p>
                  ) : (
                    bills
                      .filter((b) => b.isPaid)
                      .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
                      .map((bill) => {
                        const acc = accounts.find((a) => a.id === bill.paidAccountId);
                        return (
                          <div key={bill.id} className="flex justify-between items-center py-2.5">
                            <div className="flex items-center gap-3">
                              <div style={{ backgroundColor: theme.incomeBg }} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                                <Check size={14} style={{ color: theme.income }} />
                              </div>
                              <div>
                                <p className="font-bold text-xs text-[#2B2420]">{bill.title}</p>
                                <p style={{ color: theme.textMuted }} className="text-[10px] font-bold">{acc?.name || "Hesap"} üzerinden</p>
                              </div>
                            </div>
                            <span style={{ color: theme.textSecondary }} className="font-extrabold text-xs">₺{bill.amount.toLocaleString("tr-TR")}</span>
                          </div>
                        );
                      })
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── ACCOUNTS TAB ─── */}
        {mainTab === "accounts" && (
          <div className="space-y-6">
            {/* Nakit & Banka Hesapları Grid */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <p style={{ color: theme.textMuted }} className="font-black text-[10px] uppercase tracking-widest ml-1">Nakit & Banka Hesapları</p>
                <button
                  onClick={openNewAccount}
                  style={{ backgroundColor: theme.accent + "1A", color: theme.accent }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black hover:opacity-80 transition-opacity"
                >
                  <Plus size={12} />
                  <span>Ekle</span>
                </button>
              </div>

              {accountStats.assets.length === 0 ? (
                <div style={{ backgroundColor: theme.surface, borderColor: theme.border }} className="flex flex-col items-center justify-center py-10 rounded-2xl border border-dashed text-center">
                  <Wallet size={30} style={{ color: theme.textMuted }} />
                  <p style={{ color: theme.textMuted }} className="font-bold text-xs mt-2">Kayıtlı hesap bulunamadı.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {accountStats.assets.map((acc) => {
                    const AccIcon = accountIcons[acc.type] || Wallet;
                    const palette = getCardPalette(acc);

                    return (
                      <button
                        key={acc.id}
                        onClick={() => handleOpenAccountDetails(acc)}
                        style={{
                          background: `linear-gradient(135deg, ${palette.fromHex}, ${palette.toHex})`,
                        }}
                        className="p-4 rounded-2xl text-white text-left h-28 flex flex-col justify-between shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        <div className="flex justify-between items-center">
                          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
                            <AccIcon size={15} className="text-white" />
                          </div>
                          <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-70">
                            {accountLabels[acc.type]}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-xs truncate leading-tight mb-0.5">{acc.name}</p>
                          <p className="font-black text-base tracking-tight">₺{acc.balance.toLocaleString("tr-TR")}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Kredi Kartı & Borçlar Grid */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <p style={{ color: theme.textMuted }} className="font-black text-[10px] uppercase tracking-widest ml-1">Kredi Kartı & Borçlar</p>
                <button
                  onClick={openNewAccount}
                  style={{ backgroundColor: theme.expenseBg, color: theme.expense }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black hover:opacity-80 transition-opacity"
                >
                  <Plus size={12} />
                  <span>Ekle</span>
                </button>
              </div>

              {accountStats.debts.length === 0 ? (
                <div style={{ backgroundColor: theme.surface, borderColor: theme.border }} className="flex flex-col items-center justify-center py-10 rounded-2xl border border-dashed text-center">
                  <CreditCard size={30} style={{ color: theme.textMuted }} />
                  <p style={{ color: theme.textMuted }} className="font-bold text-xs mt-2">Kayıtlı borç hesabı bulunamadı.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {accountStats.debts.map((acc) => {
                    const AccIcon = accountIcons[acc.type] || CreditCard;
                    const palette = getCardPalette(acc);

                    return (
                      <button
                        key={acc.id}
                        onClick={() => handleOpenAccountDetails(acc)}
                        style={{
                          background: `linear-gradient(135deg, ${palette.fromHex}, ${palette.toHex})`,
                        }}
                        className="p-4 rounded-2xl text-white text-left h-28 flex flex-col justify-between shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        <div className="flex justify-between items-center">
                          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
                            <AccIcon size={15} className="text-white" />
                          </div>
                          <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-70">
                            {accountLabels[acc.type] || "Borç"}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-xs truncate leading-tight mb-0.5">{acc.name}</p>
                          <p className="font-black text-base tracking-tight">₺{acc.balance.toLocaleString("tr-TR")}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── FAB ─── */}
      <button
        onClick={handleFabPress}
        style={{
          background: `linear-gradient(135deg, #3B2145, #7A3B57, #C1653F)`,
        }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all z-40"
      >
        <Plus size={26} />
      </button>

      {/* ─── MODAL: CREDIT CARD STATEMENT SHEET ─── */}
      <Dialog open={!!statementAccountId} onOpenChange={(open) => !open && handleCloseStatement()}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 rounded-3xl bg-[#F8F5EF] text-[#2B2420]">
          <DialogTitle className="sr-only">Kredi Kartı Ekstresi</DialogTitle>
          {statementAccount && (() => {
            const palette = getCardPalette(statementAccount);
            return (
              <div>
                <div
                  style={{
                    background: `linear-gradient(135deg, ${palette.fromHex}, ${palette.toHex})`,
                  }}
                  className="p-6 text-white relative overflow-hidden"
                >
                  <div className="flex justify-between items-center mb-4">
                    <button onClick={handleCloseStatement} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <ChevronLeft size={18} className="text-white" />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <Receipt size={18} className="text-white" />
                    </div>
                  </div>

                  <p className="text-white/70 text-[10px] font-extrabold uppercase tracking-widest">{statementAccount.name}</p>
                  <p className="text-white/60 text-xs font-semibold mt-0.5">
                    {format(parseISO(statementAccount.statementStart), "d MMM", { locale: tr })} –{" "}
                    {format(parseISO(statementAccount.statementEnd), "d MMM yyyy", { locale: tr })}
                  </p>

                  {isEditingStatementTotal ? (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-3xl font-black">₺</span>
                      <input
                        type="number"
                        value={statementTotalEdit}
                        onChange={(e) => setStatementTotalEdit(e.target.value)}
                        className="bg-transparent border-b-2 border-white/40 text-3xl font-black w-32 focus:outline-none text-white"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveStatementTotal}
                        className="px-3 py-1 bg-white/20 rounded-full font-bold text-xs hover:bg-white/30"
                      >
                        Kaydet
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3xl font-black">₺{statementAccount.monthSpent.toLocaleString("tr-TR")}</span>
                      <button
                        onClick={() => {
                          setStatementTotalEdit(statementAccount.monthSpent.toString());
                          setIsEditingStatementTotal(true);
                        }}
                        className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                      >
                        <Pencil size={12} className="text-white" />
                      </button>
                    </div>
                  )}
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mt-1">Bu dönem harcama (Net)</p>
                </div>

                <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
                  {/* Toggle adjustment form */}
                  <button
                    onClick={() => setIsAdjustmentFormOpen(!isAdjustmentFormOpen)}
                    style={{ backgroundColor: theme.accent + "18", borderColor: theme.accent + "33", color: theme.accent }}
                    className="w-full flex items-center gap-2 p-3 rounded-xl border font-extrabold text-xs hover:opacity-80 transition-opacity"
                  >
                    <RefreshCw size={14} />
                    <span>{isAdjustmentFormOpen ? "Düzeltme formunu kapat" : "Unutulan harcama / iade ekle"}</span>
                  </button>

                  {isAdjustmentFormOpen && (
                    <div style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }} className="p-4 rounded-2xl border space-y-3">
                      <div style={{ backgroundColor: theme.surface }} className="p-1 rounded-xl flex gap-1 border border-black/[0.05]">
                        <button
                          onClick={() => setAdjType("expense")}
                          style={adjType === "expense" ? { backgroundColor: theme.expenseBg, color: theme.expense } : { color: theme.textMuted }}
                          className="flex-1 py-1.5 rounded-lg font-black text-xs"
                        >
                          Harcama
                        </button>
                        <button
                          onClick={() => setAdjType("income")}
                          style={adjType === "income" ? { backgroundColor: theme.incomeBg, color: theme.income } : { color: theme.textMuted }}
                          className="flex-1 py-1.5 rounded-lg font-black text-xs"
                        >
                          İade (Gelir)
                        </button>
                      </div>

                      <div>
                        <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1">Tutar (₺)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={adjAmount}
                          onChange={(e) => setAdjAmount(e.target.value)}
                          style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                          className="w-full px-3 py-2 rounded-xl border text-sm font-bold focus:outline-none"
                        />
                      </div>

                      <div>
                        <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1">Açıklama</label>
                        <input
                          type="text"
                          placeholder="Örn: Unutulan market fişi..."
                          value={adjDescription}
                          onChange={(e) => setAdjDescription(e.target.value)}
                          style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                          className="w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none"
                        />
                      </div>

                      <button
                        onClick={handleSaveAdjustment}
                        style={{ background: `linear-gradient(135deg, #3B2145, #7A3B57, #C1653F)` }}
                        className="w-full py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md hover:opacity-90"
                      >
                        Ekstreye Yansıt
                      </button>
                    </div>
                  )}

                  <div>
                    <p style={{ color: theme.textMuted }} className="font-black text-[10px] uppercase tracking-widest mb-2">Ekstre İşlemleri</p>
                    {statementAccount.transactions.length === 0 ? (
                      <div style={{ backgroundColor: theme.surface, borderColor: theme.border }} className="flex flex-col items-center justify-center py-8 rounded-2xl border border-dashed text-center">
                        <Clock size={28} style={{ color: theme.textMuted }} />
                        <p style={{ color: theme.textMuted }} className="font-bold text-xs mt-2">Bu dönemde işlem yok.</p>
                      </div>
                    ) : (
                      <div style={{ backgroundColor: theme.surface, borderColor: theme.border }} className="rounded-2xl border divide-y divide-black/[0.05]">
                        {statementAccount.transactions.map((tx: Transaction) => {
                          const conf = getCategoryConfig(tx.category, tx.type, categories);
                          return (
                            <div
                              key={tx.id}
                              onClick={() => {
                                setIsAccountDetailsOpen(false);
                                setSelectedMenuListTransaction(tx);
                                setIsTransactionActionsOpen(true);
                              }}
                              className="flex items-center justify-between p-3 hover:bg-black/5 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0 mr-3">
                                <div style={{ backgroundColor: conf.bgColor }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                                  <CatIcon conf={conf} size={16} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-xs text-[#2B2420] truncate">{tx.description || tx.category}</p>
                                  <p style={{ color: theme.textMuted }} className="text-[9px] font-bold">
                                    {format(parseISO(tx.date), "d MMMM yyyy", { locale: tr })}
                                  </p>
                                </div>
                              </div>
                              <span style={{ color: tx.type === "income" ? theme.income : theme.textPrimary }} className="font-black text-xs shrink-0">
                                {tx.type === "income" ? "+" : "-"}₺{tx.amount.toLocaleString("tr-TR")}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: ACCOUNT DETAILS ─── */}
      <Dialog open={isAccountDetailsOpen} onOpenChange={setIsAccountDetailsOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 rounded-3xl bg-[#F8F5EF] text-[#2B2420]">
          <DialogTitle className="sr-only">Hesap Detayı</DialogTitle>
          {selectedAccountDetails && (() => {
            const isCreditCard = selectedAccountDetails.type === "credit-card" || selectedAccountDetails.type === "debt";
            const palette = getCardPalette(selectedAccountDetails);

            return (
              <div>
                <div
                  style={{
                    background: `linear-gradient(135deg, ${palette.fromHex}, ${palette.toHex})`,
                  }}
                  className="p-6 text-white relative overflow-hidden"
                >
                  <div className="flex justify-between items-center mb-4">
                    <button onClick={() => setIsAccountDetailsOpen(false)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <ChevronLeft size={18} className="text-white" />
                    </button>
                    <button
                      onClick={() => {
                        setIsAccountDetailsOpen(false);
                        setSelectedMenuListAccount(selectedAccountDetails);
                        setTimeout(() => setIsAccountActionsOpen(true), 200);
                      }}
                      className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 font-extrabold text-xs hover:bg-white/30"
                    >
                      <MoreHorizontal size={14} />
                      <span>Düzenle</span>
                    </button>
                  </div>

                  <p className="text-white/70 text-[10px] font-extrabold uppercase tracking-widest">{selectedAccountDetails.name}</p>
                  {isEditingAccountDetailsBalance ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        value={accountDetailsBalanceEdit}
                        onChange={(e) => setAccountDetailsBalanceEdit(e.target.value)}
                        className="bg-transparent border-b-2 border-white/40 text-3xl font-black w-36 focus:outline-none text-white"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveAccountDetailsBalance}
                        className="px-3 py-1 bg-white/20 rounded-full font-bold text-xs hover:bg-white/30"
                      >
                        Kaydet
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3xl font-black">₺{selectedAccountDetails.balance.toLocaleString("tr-TR")}</span>
                      <button
                        onClick={() => setIsEditingAccountDetailsBalance(true)}
                        className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                      >
                        <Pencil size={12} className="text-white" />
                      </button>
                    </div>
                  )}
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mt-1">
                    {isCreditCard ? "Güncel Borç" : "Güncel Bakiye"}
                  </p>
                </div>

                <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
                  <p style={{ color: theme.textMuted }} className="font-black text-[10px] uppercase tracking-widest">Hesap Hareketleri</p>

                  {(() => {
                    const accountTxs = allTransactions
                      .filter((t) => t.accountId === selectedAccountDetails.id)
                      .sort((a, b) => b.date.localeCompare(a.date));

                    if (accountTxs.length === 0) {
                      return (
                        <div style={{ backgroundColor: theme.surface, borderColor: theme.border }} className="flex flex-col items-center justify-center py-8 rounded-2xl border border-dashed text-center">
                          <Wallet size={32} style={{ color: theme.textMuted }} />
                          <p style={{ color: theme.textMuted }} className="font-bold text-xs mt-2">Henüz işlem yok.</p>
                        </div>
                      );
                    }

                    const grouped: Record<string, typeof accountTxs> = {};
                    accountTxs.forEach((tx) => {
                      const month = tx.date.substring(0, 7);
                      if (!grouped[month]) grouped[month] = [];
                      grouped[month].push(tx);
                    });

                    return Object.entries(grouped).map(([month, txs]) => {
                      const monthTotal = txs.reduce(
                        (s, tx) => s + (tx.type === "income" ? tx.amount : -tx.amount),
                        0
                      );

                      return (
                        <div key={month} className="space-y-2">
                          <div className="flex justify-between items-center px-1">
                            <span style={{ color: theme.textMuted }} className="font-black text-[10px] uppercase tracking-wider">
                              {format(parseISO(month + "-01"), "MMMM yyyy", { locale: tr })}
                            </span>
                            <span
                              style={{
                                backgroundColor: monthTotal >= 0 ? theme.incomeBg : theme.expenseBg,
                                color: monthTotal >= 0 ? theme.income : theme.expense,
                              }}
                              className="text-[10px] px-2 py-0.5 rounded-full font-black"
                            >
                              {monthTotal >= 0 ? "+" : ""}₺{monthTotal.toLocaleString("tr-TR")}
                            </span>
                          </div>

                          <div style={{ backgroundColor: theme.surface, borderColor: theme.border }} className="rounded-2xl border divide-y divide-black/[0.05]">
                            {txs.map((tx) => {
                              const conf = getCategoryConfig(tx.category, tx.type, categories);
                              return (
                                <div
                                  key={tx.id}
                                  onClick={() => {
                                    setIsAccountDetailsOpen(false);
                                    setSelectedMenuListTransaction(tx);
                                    setIsTransactionActionsOpen(true);
                                  }}
                                  className="flex items-center justify-between p-3 hover:bg-black/5 transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-3 min-w-0 mr-3">
                                    <div style={{ backgroundColor: conf.bgColor }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0">
                                      <CatIcon conf={conf} size={16} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-xs text-[#2B2420] truncate">{tx.description || tx.category}</span>
                                        {tx.isRecurring && <Repeat size={11} style={{ color: theme.accent }} />}
                                      </div>
                                      <p style={{ color: theme.textMuted }} className="text-[10px] font-bold">
                                        {format(parseISO(tx.date), "dd MMM yyyy", { locale: tr })}
                                      </p>
                                    </div>
                                  </div>
                                  <span style={{ color: tx.type === "income" ? theme.income : theme.textPrimary }} className="font-black text-xs shrink-0">
                                    {tx.type === "income" ? "+" : "-"}₺{tx.amount.toLocaleString("tr-TR")}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: TRANSACTION FORM ─── */}
      <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl bg-[#F8F5EF] text-[#2B2420]">
          <DialogHeader>
            <DialogTitle className="text-base font-black">{editingTransaction ? "İşlemi Düzenle" : "Yeni İşlem"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Quick Templates */}
            {!editingTransaction && transactionTemplates.filter((t) => t.type === txType).length > 0 && (
              <div>
                <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1.5">Hızlı Şablonlar</label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {transactionTemplates.filter((t) => t.type === txType).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTxType(t.type);
                        setTxCategory(t.category);
                        if (t.accountId) setTxAccountId(t.accountId);
                        setTxDescription(t.name || "");
                        if (t.amount && t.amount > 0) setTxAmount(t.amount.toString());
                      }}
                      style={{ backgroundColor: theme.accent + "18", borderColor: theme.accent + "33", color: theme.accent }}
                      className="px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 hover:opacity-80 transition-opacity"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Type Switcher */}
            <div style={{ backgroundColor: theme.surfaceAlt }} className="p-1.5 rounded-2xl flex gap-1 border border-black/[0.05]">
              <button
                onClick={() => {
                  setTxType("expense");
                  const validCats = categories.filter((c) => c.type === "expense");
                  if (validCats.length > 0 && !validCats.find((c) => c.name === txCategory)) {
                    setTxCategory(validCats[0].name);
                  }
                }}
                style={txType === "expense" ? { backgroundColor: theme.expenseBg, color: theme.expense } : { color: theme.textMuted }}
                className="flex-1 py-2 rounded-xl font-black text-xs transition-colors"
              >
                Gider
              </button>
              <button
                onClick={() => {
                  setTxType("income");
                  const validAccounts = accounts.filter((a) => a.type !== "credit-card" && a.type !== "debt");
                  if (validAccounts.length > 0 && !validAccounts.find((a) => a.id === txAccountId)) {
                    setTxAccountId(validAccounts[0].id);
                  }
                  const validCats = categories.filter((c) => c.type === "income");
                  if (validCats.length > 0 && !validCats.find((c) => c.name === txCategory)) {
                    setTxCategory(validCats[0].name);
                  }
                }}
                style={txType === "income" ? { backgroundColor: theme.incomeBg, color: theme.income } : { color: theme.textMuted }}
                className="flex-1 py-2 rounded-xl font-black text-xs transition-colors"
              >
                Gelir
              </button>
            </div>

            <div>
              <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1">Tutar (₺)</label>
              <input
                type="number"
                placeholder="0.00"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
                className="w-full px-4 py-3 rounded-2xl border text-base font-black focus:outline-none"
              />
            </div>

            <div>
              <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1">Açıklama (Opsiyonel)</label>
              <input
                type="text"
                placeholder="Örn: Haftalık market alışverişi..."
                value={txDescription}
                onChange={(e) => setTxDescription(e.target.value)}
                style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
                className="w-full px-4 py-2.5 rounded-2xl border text-xs font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1.5">Kategori</label>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categories.filter((c) => c.type === txType).map((cat) => {
                  const isSelected = txCategory === cat.name;
                  const conf = getCategoryConfig(cat.name, txType, categories);
                  return (
                    <button
                      key={cat.id || cat.name}
                      onClick={() => setTxCategory(cat.name)}
                      style={
                        isSelected
                          ? { backgroundColor: conf.color, borderColor: conf.color, color: "#ffffff" }
                          : { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.textSecondary }
                      }
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-xs font-bold shrink-0 transition-all"
                    >
                      <CatIcon conf={conf} size={13} />
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1.5">Hesap</label>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {accounts
                  .filter((acc) => (txType === "income" ? acc.type !== "credit-card" && acc.type !== "debt" : true))
                  .map((acc) => {
                    const isSelected = txAccountId === acc.id;
                    return (
                      <button
                        key={acc.id}
                        onClick={() => setTxAccountId(acc.id)}
                        style={
                          isSelected
                            ? { backgroundColor: theme.accent, borderColor: theme.accent, color: "#ffffff" }
                            : { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.textSecondary }
                        }
                        className="px-3.5 py-2 rounded-full border text-xs font-bold shrink-0 transition-all"
                      >
                        {acc.name}
                      </button>
                    );
                  })}
              </div>
            </div>

            {txAccountId && (() => {
              const acc = accounts.find((a) => a.id === txAccountId);
              const isCreditCard = acc?.type === "credit-card";
              return (
                <div style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }} className="p-3.5 rounded-2xl border flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-xs text-[#2B2420]">
                      {isCreditCard ? "Kredi Kartı Borcuna Ekle" : "Hesap Bakiyesine Yansıt"}
                    </p>
                    <p style={{ color: theme.textMuted }} className="text-[10px] font-semibold">
                      {isCreditCard ? "Bu işlem kartın toplam borcuna eklensin mi?" : "Bu işlem hesap bakiyesinden düşülsün mü?"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={txIsAppliedToAccount}
                    onChange={(e) => setTxIsAppliedToAccount(e.target.checked)}
                    className="w-4 h-4 accent-[#3E7C74]"
                  />
                </div>
              );
            })()}

            <div>
              <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1">Tarih</label>
              <input
                type="date"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
                className="w-full px-4 py-2.5 rounded-2xl border text-xs font-semibold focus:outline-none"
              />
            </div>

            {txType === "expense" && !editingTransaction && (
              <div className="space-y-2">
                <div style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }} className="p-3.5 rounded-2xl border flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-xs text-[#2B2420]">Taksitlendir</p>
                    <p style={{ color: theme.textMuted }} className="text-[10px] font-semibold">Tutarı aylara böl</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={txIsInstallment}
                    onChange={(e) => setTxIsInstallment(e.target.checked)}
                    className="w-4 h-4 accent-[#3E7C74]"
                  />
                </div>

                {txIsInstallment && (
                  <div style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }} className="p-3.5 rounded-2xl border flex items-center justify-between">
                    <span className="font-extrabold text-xs text-[#2B2420]">Taksit Sayısı</span>
                    <input
                      type="number"
                      placeholder="3"
                      value={txInstallmentsCount}
                      onChange={(e) => setTxInstallmentsCount(e.target.value)}
                      style={{ backgroundColor: theme.surface, borderColor: theme.border }}
                      className="w-20 px-3 py-1.5 rounded-xl border text-xs font-bold text-center focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            <div style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }} className="p-3.5 rounded-2xl border flex items-center justify-between">
              <div>
                <p className="font-extrabold text-xs text-[#2B2420]">Düzenli İşlem</p>
                <p style={{ color: theme.textMuted }} className="text-[10px] font-semibold">Her ay aynı gün otomatik uygulansın.</p>
              </div>
              <input
                type="checkbox"
                checked={txIsRecurring}
                onChange={(e) => setTxIsRecurring(e.target.checked)}
                className="w-4 h-4 accent-[#3E7C74]"
              />
            </div>

            <button
              onClick={handleSaveTransaction}
              style={{ background: `linear-gradient(135deg, #3B2145, #7A3B57, #C1653F)` }}
              className="w-full py-3 rounded-2xl text-white font-black text-sm shadow-md hover:opacity-90 transition-opacity"
            >
              Kaydet
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: ACCOUNT FORM ─── */}
      <Dialog open={isAccountModalOpen} onOpenChange={setIsAccountModalOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl bg-[#F8F5EF] text-[#2B2420]">
          <DialogHeader>
            <DialogTitle className="text-base font-black">{editingAccount ? "Hesabı Düzenle" : "Yeni Hesap"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div>
              <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1">Hesap Adı</label>
              <input
                type="text"
                placeholder="Örn: Garanti Maaş..."
                value={accName}
                onChange={(e) => setAccName(e.target.value)}
                style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
                className="w-full px-4 py-2.5 rounded-2xl border text-xs font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1.5">Hesap Türü</label>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {Object.keys(accountLabels).map((typeKey) => {
                  const isSelected = accType === typeKey;
                  return (
                    <button
                      key={typeKey}
                      onClick={() => setAccType(typeKey as any)}
                      style={
                        isSelected
                          ? { backgroundColor: theme.accent, borderColor: theme.accent, color: "#ffffff" }
                          : { backgroundColor: theme.surfaceAlt, borderColor: theme.border, color: theme.textSecondary }
                      }
                      className="px-3.5 py-2 rounded-full border text-xs font-bold shrink-0 transition-all"
                    >
                      {accountLabels[typeKey]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1.5">Kart Rengi</label>
              <div className="flex flex-wrap gap-2.5">
                {CARD_PALETTE.map((p) => {
                  const isSelected = accColor === p.hex;
                  return (
                    <button
                      key={p.hex}
                      onClick={() => setAccColor(p.hex)}
                      style={{ backgroundColor: p.hex }}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-transform",
                        isSelected && "ring-2 ring-offset-2 ring-black/40 scale-110"
                      )}
                    >
                      {isSelected && <Check size={14} className="text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1">
                {accType === "credit-card" ? "GÜNCEL KREDİ KARTI BORCU (₺)" : "MEVCUT BAKİYE (₺)"}
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={accBalance}
                onChange={(e) => setAccBalance(e.target.value)}
                style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
                className="w-full px-4 py-3 rounded-2xl border text-base font-black focus:outline-none"
              />
            </div>

            {accType === "credit-card" && (
              <>
                <div>
                  <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1">Aylık Harcama Hedefi (₺)</label>
                  <input
                    type="number"
                    placeholder="Örn: 10000"
                    value={accTargetLimit}
                    onChange={(e) => setAccTargetLimit(e.target.value)}
                    style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
                    className="w-full px-4 py-2.5 rounded-2xl border text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1">Kredi Limiti (₺)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={accCreditLimit}
                    onChange={(e) => setAccCreditLimit(e.target.value)}
                    style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
                    className="w-full px-4 py-2.5 rounded-2xl border text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1">Ekstre Kesim Tarihi (Gün)</label>
                  <input
                    type="number"
                    placeholder="Ayın 27'si ise 27 girin"
                    value={accStatementDate}
                    onChange={(e) => setAccStatementDate(e.target.value)}
                    style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
                    className="w-full px-4 py-2.5 rounded-2xl border text-xs font-semibold focus:outline-none"
                  />
                </div>
              </>
            )}

            <button
              onClick={handleSaveAccount}
              style={{ background: `linear-gradient(135deg, #3B2145, #7A3B57, #C1653F)` }}
              className="w-full py-3 rounded-2xl text-white font-black text-sm shadow-md hover:opacity-90 transition-opacity"
            >
              Kaydet
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: BILL FORM ─── */}
      <Dialog open={isBillModalOpen} onOpenChange={setIsBillModalOpen}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl bg-[#F8F5EF] text-[#2B2420]">
          <DialogHeader>
            <DialogTitle className="text-base font-black">{editingBill ? "Faturayı Düzenle" : "Yeni Fatura"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {!editingBill && (
              <div>
                <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1.5">Hızlı Şablonlar</label>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {["Elektrik", "Su", "Doğalgaz", "Telefon", "İnternet", "Kira", "Aidat"].map((bt) => (
                    <button
                      key={bt}
                      onClick={() => {
                        setBillTitle(`${bt} Faturası`);
                        setBillCategory("Fatura");
                      }}
                      style={{ backgroundColor: theme.accent + "18", borderColor: theme.accent + "33", color: theme.accent }}
                      className="px-3 py-1.5 rounded-xl border text-xs font-bold shrink-0 hover:opacity-80 transition-opacity"
                    >
                      {bt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1">Fatura Başlığı</label>
              <input
                type="text"
                placeholder="Örn: Elektrik Faturası..."
                value={billTitle}
                onChange={(e) => setBillTitle(e.target.value)}
                style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
                className="w-full px-4 py-2.5 rounded-2xl border text-xs font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1">Fatura Tutarı (₺)</label>
              <input
                type="number"
                placeholder="0.00"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
                className="w-full px-4 py-3 rounded-2xl border text-base font-black focus:outline-none"
              />
            </div>

            <div>
              <label style={{ color: theme.textMuted }} className="block font-extrabold text-[9px] uppercase tracking-wider mb-1">Son Ödeme Tarihi</label>
              <input
                type="date"
                value={billDueDate}
                onChange={(e) => setBillDueDate(e.target.value)}
                style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
                className="w-full px-4 py-2.5 rounded-2xl border text-xs font-semibold focus:outline-none"
              />
            </div>

            <div style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }} className="p-3.5 rounded-2xl border flex items-center justify-between">
              <div>
                <p className="font-extrabold text-xs text-[#2B2420]">Aylık Tekrarla</p>
                <p style={{ color: theme.textMuted }} className="text-[10px] font-semibold">Her ay aynı gün otomatik oluşturulsun.</p>
              </div>
              <input
                type="checkbox"
                checked={billIsRecurring}
                onChange={(e) => setBillIsRecurring(e.target.checked)}
                className="w-4 h-4 accent-[#3E7C74]"
              />
            </div>

            <button
              onClick={handleSaveBill}
              style={{ background: `linear-gradient(135deg, #3B2145, #7A3B57, #C1653F)` }}
              className="w-full py-3 rounded-2xl text-white font-black text-sm shadow-md hover:opacity-90 transition-opacity"
            >
              Kaydet
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL: PAY BILL ─── */}
      <Dialog open={!!payingBill} onOpenChange={(open) => !open && setPayingBill(null)}>
        <DialogContent className="sm:max-w-md p-6 rounded-3xl bg-[#F8F5EF] text-[#2B2420]">
          <DialogHeader>
            <DialogTitle className="text-base font-black">Fatura Ödeme Hesabı</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p style={{ color: theme.textMuted }} className="text-xs font-bold">
              "{payingBill?.title}" faturasını ödemek için hesap seçin:
            </p>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {accounts.map((acc) => {
                const isSelected = paymentAccountId === acc.id;
                const AccIcon = accountIcons[acc.type] || Wallet;

                return (
                  <div
                    key={acc.id}
                    onClick={() => setPaymentAccountId(acc.id)}
                    style={
                      isSelected
                        ? { backgroundColor: theme.accent + "1A", borderColor: theme.accent }
                        : { backgroundColor: theme.surfaceAlt, borderColor: theme.border }
                    }
                    className="p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <AccIcon size={16} style={{ color: isSelected ? theme.accent : theme.textMuted }} />
                      <span className="font-bold text-xs text-[#2B2420]">{acc.name}</span>
                    </div>
                    <span style={{ color: theme.textSecondary }} className="font-black text-xs">₺{acc.balance.toLocaleString("tr-TR")}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPayingBill(null)}
                style={{ backgroundColor: theme.surfaceAlt, color: theme.textSecondary }}
                className="flex-1 py-2.5 rounded-xl font-extrabold text-xs"
              >
                İptal
              </button>
              <button
                onClick={handlePayBill}
                disabled={!paymentAccountId}
                style={{ background: `linear-gradient(135deg, #3B2145, #7A3B57, #C1653F)` }}
                className="flex-1 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md disabled:opacity-50"
              >
                Ödemeyi Onayla
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── ACTION SHEET: ACCOUNT ─── */}
      <Dialog open={isAccountActionsOpen} onOpenChange={setIsAccountActionsOpen}>
        <DialogContent className="sm:max-w-xs p-5 rounded-3xl bg-[#F8F5EF] text-[#2B2420]">
          <DialogHeader>
            <DialogTitle className="text-center text-sm font-black">{selectedMenuListAccount?.name || "Hesap İşlemleri"}</DialogTitle>
          </DialogHeader>

          {selectedMenuListAccount && (
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setIsAccountActionsOpen(false);
                  openEditAccount(selectedMenuListAccount);
                }}
                style={{ backgroundColor: theme.surfaceAlt }}
                className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-xs hover:opacity-80"
              >
                <Edit2 size={16} style={{ color: theme.textSecondary }} />
                <span>Düzenle</span>
              </button>
              <button
                onClick={() => handleDeleteAccount(selectedMenuListAccount.id)}
                style={{ backgroundColor: theme.expenseBg, color: theme.expense }}
                className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-xs hover:opacity-80"
              >
                <Trash2 size={16} />
                <span>Sil</span>
              </button>
              <button
                onClick={() => setIsAccountActionsOpen(false)}
                style={{ backgroundColor: theme.surfaceAlt, color: theme.textSecondary }}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-center"
              >
                İptal
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── ACTION SHEET: TRANSACTION ─── */}
      <Dialog open={isTransactionActionsOpen} onOpenChange={setIsTransactionActionsOpen}>
        <DialogContent className="sm:max-w-xs p-5 rounded-3xl bg-[#F8F5EF] text-[#2B2420]">
          <DialogHeader>
            <DialogTitle className="text-center text-sm font-black">{selectedMenuListTransaction?.category || "İşlem Eylemleri"}</DialogTitle>
          </DialogHeader>

          {selectedMenuListTransaction && (
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setIsTransactionActionsOpen(false);
                  openEditTransaction(selectedMenuListTransaction);
                }}
                style={{ backgroundColor: theme.surfaceAlt }}
                className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-xs hover:opacity-80"
              >
                <Edit2 size={16} style={{ color: theme.textSecondary }} />
                <span>Düzenle</span>
              </button>
              <button
                onClick={() => handleDeleteTransaction(selectedMenuListTransaction.id)}
                style={{ backgroundColor: theme.expenseBg, color: theme.expense }}
                className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-xs hover:opacity-80"
              >
                <Trash2 size={16} />
                <span>Sil</span>
              </button>
              <button
                onClick={() => setIsTransactionActionsOpen(false)}
                style={{ backgroundColor: theme.surfaceAlt, color: theme.textSecondary }}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-center"
              >
                İptal
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── ACTION SHEET: BILL ─── */}
      <Dialog open={isBillActionsOpen} onOpenChange={setIsBillActionsOpen}>
        <DialogContent className="sm:max-w-xs p-5 rounded-3xl bg-[#F8F5EF] text-[#2B2420]">
          <DialogHeader>
            <DialogTitle className="text-center text-sm font-black">{selectedMenuListBill?.title || "Fatura Eylemleri"}</DialogTitle>
          </DialogHeader>

          {selectedMenuListBill && (
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setPayingBill(selectedMenuListBill);
                  setPaymentAccountId(accounts[0]?.id || "");
                  setIsBillActionsOpen(false);
                  setIsPayBillModalOpen(true);
                }}
                style={{ backgroundColor: theme.incomeBg, color: theme.income }}
                className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-xs hover:opacity-80"
              >
                <Check size={16} />
                <span>Faturayı Öde (Kapat)</span>
              </button>
              <button
                onClick={() => {
                  setIsBillActionsOpen(false);
                  openEditBill(selectedMenuListBill);
                }}
                style={{ backgroundColor: theme.surfaceAlt }}
                className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-xs hover:opacity-80"
              >
                <Edit2 size={16} style={{ color: theme.textSecondary }} />
                <span>Düzenle</span>
              </button>
              <button
                onClick={() => handleDeleteBill(selectedMenuListBill.id)}
                style={{ backgroundColor: theme.expenseBg, color: theme.expense }}
                className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-xs hover:opacity-80"
              >
                <Trash2 size={16} />
                <span>Sil</span>
              </button>
              <button
                onClick={() => setIsBillActionsOpen(false)}
                style={{ backgroundColor: theme.surfaceAlt, color: theme.textSecondary }}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-center"
              >
                İptal
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── SETTINGS SHEET ─── */}
      <Dialog open={isBudgetSettingsOpen} onOpenChange={setIsBudgetSettingsOpen}>
        <DialogContent className="sm:max-w-xs p-5 rounded-3xl bg-[#F8F5EF] text-[#2B2420]">
          <DialogHeader>
            <DialogTitle className="text-center text-sm font-black">Bütçe Seçenekleri</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                setIsBudgetSettingsOpen(false);
                router.push("/budget/stats");
              }}
              style={{ backgroundColor: theme.surfaceAlt }}
              className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-xs hover:opacity-80"
            >
              <div style={{ backgroundColor: theme.accent + "1E" }} className="w-7 h-7 rounded-full flex items-center justify-center">
                <BarChart2 size={15} style={{ color: theme.accent }} />
              </div>
              <span>Bütçe Raporları</span>
            </button>
            <button
              onClick={() => {
                setIsBudgetSettingsOpen(false);
                router.push("/transaction-templates");
              }}
              style={{ backgroundColor: theme.surfaceAlt }}
              className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-xs hover:opacity-80"
            >
              <div style={{ backgroundColor: "#3E586622" }} className="w-7 h-7 rounded-full flex items-center justify-center">
                <FileText size={15} style={{ color: "#3E5866" }} />
              </div>
              <span>İşlem Şablonları</span>
            </button>
            <button
              onClick={() => {
                setIsBudgetSettingsOpen(false);
                router.push("/budget-categories");
              }}
              style={{ backgroundColor: theme.surfaceAlt }}
              className="w-full flex items-center gap-3 p-3 rounded-xl font-bold text-xs hover:opacity-80"
            >
              <div style={{ backgroundColor: "#A9762E22" }} className="w-7 h-7 rounded-full flex items-center justify-center">
                <Settings size={15} style={{ color: "#A9762E" }} />
              </div>
              <span>Kategori Yönetimi</span>
            </button>
            <button
              onClick={() => setIsBudgetSettingsOpen(false)}
              style={{ backgroundColor: theme.surfaceAlt, color: theme.textSecondary }}
              className="w-full py-2.5 rounded-xl font-bold text-xs text-center mt-2"
            >
              Kapat
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
