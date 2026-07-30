"use client";

import * as React from "react";
import { Plus, Wallet, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Trash2, Banknote, Landmark, CreditCard, BarChart2, ArrowUpRight, ArrowDownLeft, Calendar as CalendarIcon, ArrowLeft, ShoppingCart, Utensils, Bus, FileText, Gamepad2, HeartPulse, Shirt, GraduationCap, DollarSign, Briefcase, PlusCircle, CircleEllipsis, Printer, Check, Pencil, Settings, List, ListTree, Wifi, MoreHorizontal, Sparkles, Repeat } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { useAuth } from "@/components/auth-provider";
import { NewAccountForm } from "@/components/new-account-form";
import { NewTransactionForm } from "@/components/new-transaction-form";
import { NewBillForm } from "@/components/new-bill-form";
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
const CARD_PALETTE: { name: string; hex: string; grad: string[]; fromHex: string; toHex: string }[] = [
  { name: "Erik", hex: "#6B3A57", grad: ["#6B3A57", "#3F2038"], fromHex: "#6B3A57", toHex: "#3F2038" },
  { name: "Çam Yeşili", hex: "#2F6F63", grad: ["#2F6F63", "#1B4038"], fromHex: "#2F6F63", toHex: "#1B4038" },
  { name: "Toprak", hex: "#B5623F", grad: ["#B5623F", "#7A3E27"], fromHex: "#B5623F", toHex: "#7A3E27" },
  { name: "Indigo", hex: "#4A4A8E", grad: ["#4A4A8E", "#2B2B57"], fromHex: "#4A4A8E", toHex: "#2B2B57" },
  { name: "Zeytin", hex: "#6E6E32", grad: ["#6E6E32", "#40401C"], fromHex: "#6E6E32", toHex: "#40401C" },
  { name: "Gül Kurusu", hex: "#A14B5D", grad: ["#A14B5D", "#652E3A"], fromHex: "#A14B5D", toHex: "#652E3A" },
  { name: "Arduvaz", hex: "#3E5866", grad: ["#3E5866", "#25353E"], fromHex: "#3E5866", toHex: "#25353E" },
  { name: "Amber", hex: "#A9762E", grad: ["#A9762E", "#6B4A1B"], fromHex: "#A9762E", toHex: "#6B4A1B" },
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

const categoryConfig: Record<string, { color: string; icon: any }> = {
    'Market': { color: 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400', icon: ShoppingCart },
    'Yemek': { color: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400', icon: Utensils },
    'Ulaşım': { color: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400', icon: Bus },
    'Fatura': { color: 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400', icon: FileText },
    'Eğlence': { color: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400', icon: Gamepad2 },
    'Sağlık': { color: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', icon: HeartPulse },
    'Giyim': { color: 'bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400', icon: Shirt },
    'Eğitim': { color: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400', icon: GraduationCap },
    'Maaş': { color: 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400', icon: DollarSign },
    'Gelir': { color: 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400', icon: DollarSign },
    'Ek Gelir': { color: 'bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400', icon: PlusCircle },
    'Diğer': { color: 'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400', icon: CircleEllipsis },
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
    const [initialAccountType, setInitialAccountType] = React.useState<Account['type']>('bank');
    const [isBillArchiveOpen, setIsBillArchiveOpen] = React.useState(false);
    const [billArchiveFilter, setBillArchiveFilter] = React.useState<string>('Tümü');



  const [mainTab, setMainTab] = React.useState<"day" | "month" | "bills" | "accounts">("day");

  // Modals
  const [isTransactionModalOpen, setIsTransactionModalOpen] = React.useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = React.useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = React.useState(false);



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

    return {
      monthlyIncome,
      monthlyExpense,
      yearlyIncome,
      yearlyExpense,
      dailyGroups,
      monthlySummaries,
      monthlyCategorySpent,
      recurringExpenses,
      recurringExpensesTotal,
      creditCardStatements,
    };
  }, [allTransactions, currentDate, accounts]);

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
      headerIncome = financialCalculations.yearlyIncome;
      headerExpense = financialCalculations.yearlyExpense;
      headerTotal = headerIncome - headerExpense;
      labelTotal = `${format(currentDate, 'yyyy')} Net Durumu`;
  } else {
      headerIncome = financialCalculations.monthlyIncome;
      headerExpense = financialCalculations.monthlyExpense;
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
        return allTransactions.filter((tx: any) => tx.isRecurring && tx.type === 'expense');
    }, [allTransactions]);
    const recurringExpensesTotal = recurringExpenses.reduce((sum, tx) => sum + tx.amount, 0);

    const dateDisplayFormat = mainTab === 'month' ? 'yyyy' : 'MMMM yyyy';
    const { dailyGroups, monthlySummaries, creditCardStatements } = financialCalculations;

    return (
        <div className="min-h-[100dvh] font-sans pb-[calc(100px+env(safe-area-inset-bottom))] relative bg-[#EFEAE1]">
            
            <div className="bg-gradient-to-br from-[#3B2145] via-[#7A3B57] to-[#C1653F] pt-[calc(env(safe-area-inset-top)+16px)] pb-6 px-5 rounded-b-[32px] relative z-10 overflow-hidden shadow-md">
                <div className="absolute top-[-30px] right-[-20px] w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
                <div className="absolute bottom-[-40px] left-[-30px] w-40 h-40 rounded-full bg-black/10 blur-xl pointer-events-none" />

                <div className="flex justify-between items-center mb-5 relative z-10">
                    <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-black/20 flex items-center justify-center transition-colors hover:bg-black/30">
                        <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-white/85" />
                        <h1 className="text-white text-base font-bold tracking-wide">Bütçe Takibi</h1>
                    </div>
                    <button className="w-9 h-9 rounded-full bg-black/20 flex items-center justify-center transition-colors hover:bg-black/30">
                        <MoreHorizontal className="w-5 h-5 text-white" />
                    </button>
                </div>

                <div className="text-center mb-5 relative z-10">
                    <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">{labelTotal}</p>
                    <p className="text-white text-3xl font-black">₺{headerTotal.toLocaleString('tr-TR')}</p>
                </div>

                <div className="flex gap-3 relative z-10">
                    <div className="flex-1 bg-white/20 rounded-2xl p-3 flex items-center gap-3 backdrop-blur-sm border border-white/10">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <ArrowDownLeft className="w-4 h-4 text-[#EAF4E8]" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider">{labelIncome}</p>
                            <p className="text-white text-sm font-bold truncate">₺{headerIncome.toLocaleString('tr-TR')}</p>
                        </div>
                    </div>
                    <div className="flex-1 bg-white/20 rounded-2xl p-3 flex items-center gap-3 backdrop-blur-sm border border-white/10">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                            <ArrowUpRight className="w-4 h-4 text-[#F7E3DA]" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider">{labelExpense}</p>
                            <p className="text-white text-sm font-bold truncate">₺{headerExpense.toLocaleString('tr-TR')}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-5 -mt-5 relative z-20 max-w-2xl mx-auto">
                <div className="bg-[#F8F5EF] rounded-full p-1.5 flex shadow-sm border border-[rgba(43,36,28,0.08)]">
                    <Tabs value={mainTab} onValueChange={setMainTab as any} className="w-full">
                        <TabsList className="bg-transparent w-full flex p-0 h-[42px] gap-1">
                            <TabsTrigger value="day" className={cn("flex-1 rounded-full h-full flex flex-row items-center justify-center gap-1.5 text-xs font-bold transition-all data-[state=active]:bg-[#2B2420] data-[state=active]:text-white data-[state=active]:shadow-md text-[#A79C8D] hover:bg-[#F1ECE2]")}>
                                <CalendarIcon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Günlük</span>
                            </TabsTrigger>
                            <TabsTrigger value="month" className={cn("flex-1 rounded-full h-full flex flex-row items-center justify-center gap-1.5 text-xs font-bold transition-all data-[state=active]:bg-[#2B2420] data-[state=active]:text-white data-[state=active]:shadow-md text-[#A79C8D] hover:bg-[#F1ECE2]")}>
                                <BarChart2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Aylık</span>
                            </TabsTrigger>
                            <TabsTrigger value="bills" className={cn("flex-1 rounded-full h-full flex flex-row items-center justify-center gap-1.5 text-xs font-bold transition-all data-[state=active]:bg-[#2B2420] data-[state=active]:text-white data-[state=active]:shadow-md text-[#A79C8D] hover:bg-[#F1ECE2]")}>
                                <FileText className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Faturalar</span>
                            </TabsTrigger>
                            <TabsTrigger value="accounts" className={cn("flex-1 rounded-full h-full flex flex-row items-center justify-center gap-1.5 text-xs font-bold transition-all data-[state=active]:bg-[#2B2420] data-[state=active]:text-white data-[state=active]:shadow-md text-[#A79C8D] hover:bg-[#F1ECE2]")}>
                                <Wallet className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Hesaplar</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-5 pb-24 space-y-6">
                
                {mainTab === 'day' && (
                    <>
                        <div className="flex justify-between items-center bg-[#F8F5EF] rounded-2xl p-2 shadow-sm border border-[rgba(43,36,28,0.08)] mb-4">
                            <button onClick={() => handleNavDate('prev')} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#F1ECE2] text-[#3E7C74] transition-colors"><ChevronLeft className="w-5 h-5"/></button>
                            <span className="font-bold text-[#2B2420]">{format(currentDate, "MMMM yyyy", { locale: tr })}</span>
                            <button onClick={() => handleNavDate('next')} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#F1ECE2] text-[#3E7C74] transition-colors"><ChevronRight className="w-5 h-5"/></button>
                        </div>

                        {creditCardStatements.length > 0 && (
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-3 px-1">
                                    <h3 className="text-sm font-black text-[#75695C] uppercase tracking-wider">Kredi Kartları</h3>
                                    <span className="text-xs font-bold text-[#A79C8D]">{creditCardStatements.length} Kart</span>
                                </div>
                                <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
                                    {creditCardStatements.map(acc => {
                                        const palette = getCardPalette(acc);
                                        const hasTarget = !!acc.targetLimit && acc.targetLimit > 0;
                                        const hasLimit = !!acc.creditLimit && acc.creditLimit > 0;
                                        const limitValue = hasTarget ? acc.targetLimit! : hasLimit ? acc.creditLimit! : 0;
                                        const validSpent = Math.max(0, acc.monthSpent);
                                        const pct = limitValue > 0 ? Math.min((validSpent / limitValue) * 100, 100) : 0;
                                        const isOverLimit = pct >= 90;
                                        const remaining = hasTarget ? Math.max(acc.targetLimit! - validSpent, 0) : hasLimit ? Math.max(acc.creditLimit! - acc.balance, 0) : null;
                                        const cardLastFour = (acc.id || "").replace(/\D/g, "").slice(-4) || "4821";

                                        return (
                                            <div key={acc.id} onClick={() => handleOpenAccountDetails(acc)} className="snap-center shrink-0 w-[175px] h-[115px] rounded-[14px] overflow-hidden relative cursor-pointer shadow-md transform active:scale-95 transition-transform" style={{ background: `linear-gradient(to bottom right, ${palette.grad[0]}, ${palette.grad[1]})`, boxShadow: `0 4px 6px ${palette.hex}40` }}>
                                                <div className="absolute -top-[20px] -right-[20px] w-[80px] h-[80px] rounded-full bg-white/10" />
                                                <div className="absolute -bottom-[25px] -left-[10px] w-[90px] h-[90px] rounded-full bg-white/5" />
                                                
                                                <div className="p-2.5 h-full flex flex-col justify-between relative z-10">
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-1 flex-1 pr-1">
                                                            <CreditCard className="w-3 h-3 text-white/90 shrink-0" />
                                                            <span className="text-[11px] font-black text-white tracking-wider uppercase truncate">{acc.name}</span>
                                                        </div>
                                                        <Wifi className="w-3.5 h-3.5 text-white opacity-85 rotate-90" />
                                                    </div>
                                                    <div className="flex justify-between items-center my-0.5">
                                                        <div className="w-[22px] h-[15px] rounded-[3px] bg-[#F59E0B] border border-[#FCD34D] p-[1px] flex items-center justify-center">
                                                            <div className="w-full h-full rounded-[1.5px] border-[0.5px] border-black/20 bg-[#EAB308]" />
                                                        </div>
                                                        <span className="text-white/85 text-[10px] font-bold tracking-[1.2px]">•• {cardLastFour}</span>
                                                    </div>
                                                    <div>
                                                        <div className="flex justify-between items-end mb-[3px]">
                                                            <div className="flex-1">
                                                                <p className="text-[7.5px] font-bold text-white/75 uppercase">Harcama</p>
                                                                <p className="text-[13px] font-black text-white tracking-tight truncate">₺{acc.monthSpent.toLocaleString("tr-TR")}</p>
                                                            </div>
                                                            {remaining !== null && (
                                                                <div className="text-right">
                                                                    <p className="text-[7.5px] font-bold text-white/75 uppercase">Kalan</p>
                                                                    <p className={cn("text-[9.5px] font-extrabold truncate", isOverLimit ? "text-red-300" : "text-white")}>₺{remaining.toLocaleString("tr-TR")}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {limitValue > 0 && (
                                                            <div className="h-[3px] w-full bg-white/25 rounded-full overflow-hidden">
                                                                <div className={cn("h-full rounded-full", isOverLimit ? "bg-red-500" : "bg-white")} style={{ width: `${pct}%` }} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        <h3 className="text-sm font-black text-[#75695C] uppercase tracking-wider mb-3 px-1">İşlemler</h3>
                        {dailyGroups.length === 0 ? (
                            <div className="bg-[#F8F5EF] rounded-[20px] p-8 flex flex-col items-center justify-center border border-[rgba(43,36,28,0.08)]">
                                <Wallet className="w-8 h-8 text-[#A79C8D] mb-2" />
                                <p className="text-sm font-bold text-[#75695C]">Bu ay işlem kaydı bulunmuyor.</p>
                            </div>
                        ) : (
                            dailyGroups.map((group) => (
                                <div key={group.dateISO} className="mb-5">
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <span className="text-[11px] font-black text-[#75695C] uppercase tracking-wider">{group.dateStr}</span>
                                        <div className="flex gap-1.5">
                                            {group.dayIncome > 0 && <span className="text-[10px] font-black text-[#3F7D53] bg-[#3F7D53]/10 px-2 py-0.5 rounded-full">+₺{group.dayIncome.toLocaleString('tr-TR')}</span>}
                                            {group.dayExpense > 0 && <span className="text-[10px] font-black text-[#B5533A] bg-[#B5533A]/10 px-2 py-0.5 rounded-full">-₺{group.dayExpense.toLocaleString('tr-TR')}</span>}
                                        </div>
                                    </div>
                                    <div className="bg-[#F8F5EF] rounded-[20px] border border-[rgba(43,36,28,0.08)] overflow-hidden flex flex-col divide-y divide-[rgba(43,36,28,0.06)] shadow-sm">
                                        {group.transactions.map((tx) => {
                                            const acc = accounts.find(a => a.id === tx.accountId);
                                            let config = categoryConfig[tx.category] || (tx.type === 'income' ? {color: 'bg-[#3F7D53]/20 text-[#3F7D53]', icon: PlusCircle} : {color: 'bg-[#B5533A]/20 text-[#B5533A]', icon: CircleEllipsis});
                                            const TxIcon = config.icon;
                                            
                                            const customCat = categories.find(c => c.name === tx.category);
                                            const isIncome = tx.type === 'income';
                                            const fallbackColor = isIncome ? '#3F7D53' : '#B5533A';
                                            const iconColor = customCat?.color || fallbackColor;
                                            const iconBg = `${iconColor}22`;
                                            
                                            return (
                                                <div key={tx.id} onClick={() => openEditTransaction(tx)} className="flex justify-between items-center p-3 cursor-pointer hover:bg-black/5 active:bg-black/10 transition-colors">
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="w-[38px] h-[38px] rounded-[12px] flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg, color: iconColor }}>
                                                            {(() => {
                                                                if (customCat?.icon) {
                                                                    const CustomIconComponent = ICON_MAP[customCat.icon];
                                                                    if (CustomIconComponent) return <CustomIconComponent className="w-5 h-5" style={{color: iconColor}} />;
                                                                    return <span className="text-[18px]">{customCat.icon}</span>;
                                                                }
                                                                return <TxIcon className="w-5 h-5" style={{color: iconColor}} />;
                                                            })()}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-sm font-bold text-[#2B2420] truncate">{tx.category}</span>
                                                                {tx.isRecurring && <Repeat className="w-3 h-3 text-[#3E7C74]" />}
                                                            </div>
                                                            <span className="text-[11px] font-semibold text-[#A79C8D] truncate block">
                                                                {acc?.name || "—"}{tx.description ? ` · ${tx.description}` : ""}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className={cn("font-black text-sm shrink-0 ml-2", tx.type === 'income' ? "text-[#3F7D53]" : "text-[#2B2420]")}>
                                                        {tx.type === 'expense' ? '-' : '+'}₺{tx.amount.toLocaleString("tr-TR")}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}

                {mainTab === 'month' && (
                    <>
                        <div className="flex justify-between items-center bg-[#F8F5EF] rounded-2xl p-2 shadow-sm border border-[rgba(43,36,28,0.08)] mb-4">
                            <button onClick={() => handleNavDate('prev')} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#F1ECE2] text-[#3E7C74] transition-colors"><ChevronLeft className="w-5 h-5"/></button>
                            <span className="font-bold text-[#2B2420]">{format(currentDate, "yyyy")} YILI</span>
                            <button onClick={() => handleNavDate('next')} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#F1ECE2] text-[#3E7C74] transition-colors"><ChevronRight className="w-5 h-5"/></button>
                        </div>
                        
                        <h3 className="text-sm font-black text-[#75695C] uppercase tracking-wider mb-2 px-1">Aylık Özet</h3>
                        <div className="bg-[#F8F5EF] rounded-[24px] p-1 border border-[rgba(43,36,28,0.08)] divide-y divide-[rgba(43,36,28,0.06)] shadow-sm">
                            {financialCalculations.monthlySummaries.map((summary) => (
                                <Accordion type="single" collapsible key={summary.monthKey} className="w-full">
                                    <AccordionItem value={summary.monthKey} className="border-0">
                                        <AccordionTrigger className="px-4 py-3.5 hover:no-underline hover:bg-black/5 rounded-[20px] transition-colors">
                                            <div className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-2">
                                                    <div>
                                                        <p className="text-sm font-bold text-[#2B2420] text-left capitalize">{summary.monthName}</p>
                                                        <p className="text-[10px] font-semibold text-[#A79C8D] text-left">+{summary.income.toLocaleString()} / -{summary.expense.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                                <span className={cn("font-black text-sm", summary.net >= 0 ? "text-[#3F7D53]" : "text-[#B5533A]")}>
                                                    {summary.net >= 0 ? "+" : ""}₺{summary.net.toLocaleString('tr-TR')}
                                                </span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-4 pb-3">
                                            <div className="bg-white/50 rounded-xl p-3 mt-1">
                                                <div className="flex gap-2">
                                                    <div className="flex-1 text-center bg-[#3F7D53]/10 p-2 rounded-lg">
                                                        <p className="text-[10px] uppercase font-bold text-[#3F7D53] mb-0.5">Gelir</p>
                                                        <p className="text-xs font-black text-[#3F7D53]">₺{summary.income.toLocaleString()}</p>
                                                    </div>
                                                    <div className="flex-1 text-center bg-[#B5533A]/10 p-2 rounded-lg">
                                                        <p className="text-[10px] uppercase font-bold text-[#B5533A] mb-0.5">Gider</p>
                                                        <p className="text-xs font-black text-[#B5533A]">₺{summary.expense.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            ))}
                        </div>

                        {recurringExpenses.length > 0 && (
                            <div className="mt-6">
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <h3 className="text-sm font-black text-[#75695C] uppercase tracking-wider">Sabit Giderler</h3>
                                    <div className="flex items-center gap-1 bg-[#3E7C74]/10 px-2 py-1 rounded-full">
                                        <Repeat className="w-3 h-3 text-[#3E7C74]" />
                                        <span className="text-[10px] font-bold text-[#3E7C74]">Toplam ₺{recurringExpensesTotal.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="bg-[#F8F5EF] rounded-[24px] p-1.5 border border-[rgba(43,36,28,0.08)] divide-y divide-[rgba(43,36,28,0.06)] shadow-sm">
                                    {recurringExpenses.map(tx => (
                                        <div key={tx.id} className="flex justify-between items-center p-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-[34px] h-[34px] rounded-full bg-[#B5533A]/20 flex items-center justify-center">
                                                    <CircleEllipsis className="w-4 h-4 text-[#B5533A]" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[#2B2420]">{tx.category}</p>
                                                    <p className="text-[10px] font-semibold text-[#A79C8D]">Abonelik / Her Ay</p>
                                                </div>
                                            </div>
                                            <span className="font-black text-sm text-[#B5533A]">-₺{tx.amount.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {mainTab === 'accounts' && (
                    <>
                        <div className="flex justify-between items-center mb-3 px-1">
                            <h3 className="text-sm font-black text-[#75695C] uppercase tracking-wider">Nakit & Banka Hesapları</h3>
                            <button onClick={() => openAccountForm(null, 'bank')} className="flex items-center gap-1 bg-[#3E7C74]/10 px-2 py-1 rounded-full hover:bg-[#3E7C74]/20 transition-colors">
                                <Plus className="w-3 h-3 text-[#3E7C74]" />
                                <span className="text-[10px] font-bold text-[#3E7C74] uppercase">Ekle</span>
                            </button>
                        </div>
                        {accountStats.assets.length === 0 ? (
                            <div className="bg-[#F8F5EF] rounded-[20px] p-8 flex flex-col items-center justify-center border border-[rgba(43,36,28,0.08)]">
                                <Wallet className="w-8 h-8 text-[#A79C8D] mb-2" />
                                <p className="text-sm font-bold text-[#75695C]">Kayıtlı hesap bulunamadı.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {accountStats.assets.map((acc) => {
                                    const palette = getCardPalette(acc);
                                    const isBank = acc.type === 'bank';
                                    return (
                                        <div key={acc.id} onClick={() => handleOpenAccountDetails(acc)} className="rounded-[20px] p-4 flex flex-col justify-between h-[130px] cursor-pointer active:scale-95 transition-transform shadow-md relative overflow-hidden" style={{ background: `linear-gradient(to bottom right, ${palette.grad[0]}, ${palette.grad[1]})` }}>
                                            <div className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none">
                                                <Landmark className="w-20 h-20 text-white" />
                                            </div>
                                            <div className="flex justify-between items-start relative z-10 pointer-events-none">
                                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                                    <Landmark className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                            <div className="relative z-10 mt-auto pointer-events-none">
                                                <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider mb-0.5">{isBank ? 'Banka Hesabı' : 'Nakit'}</p>
                                                <p className="text-sm font-black text-white truncate mb-1">{acc.name}</p>
                                                <p className="text-lg font-black text-white tracking-tight">₺{acc.balance.toLocaleString('tr-TR')}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}

                {mainTab === 'bills' && (
                    <>
                        <div className="flex justify-between items-center mb-3 px-1">
                            <h3 className="text-sm font-black text-[#75695C] uppercase tracking-wider">Bekleyen Faturalar</h3>
                            <button onClick={() => openBillForm(null)} className="flex items-center gap-1 bg-[#3E7C74]/10 px-2 py-1 rounded-full hover:bg-[#3E7C74]/20 transition-colors">
                                <Plus className="w-3 h-3 text-[#3E7C74]" />
                                <span className="text-[10px] font-bold text-[#3E7C74] uppercase">Ekle</span>
                            </button>
                        </div>
                        {bills.filter(b => !b.isPaid).length === 0 ? (
                            <div className="bg-[#F8F5EF] rounded-[20px] p-8 flex flex-col items-center justify-center border border-[rgba(43,36,28,0.08)]">
                                <CheckCircle2 className="w-8 h-8 text-[#3F7D53] mb-2" />
                                <p className="text-sm font-bold text-[#75695C]">Ödenmemiş fatura bulunmuyor.</p>
                            </div>
                        ) : (
                            <div className="bg-[#F8F5EF] rounded-[24px] p-1.5 border border-[rgba(43,36,28,0.08)] divide-y divide-[rgba(43,36,28,0.06)] shadow-sm mb-6">
                                {bills.filter(b => !b.isPaid).map(bill => {
                                    const isOverdue = new Date(bill.dueDate) < new Date();
                                    const diffDays = Math.ceil((new Date(bill.dueDate).getTime() - new Date().getTime()) / 86400000);
                                    const isNear = diffDays >= 0 && diffDays <= 3;
                                    const stripColor = isOverdue ? "#B5533A" : isNear ? "#A9762E" : "#3F7D53";
                                    return (
                                        <div key={bill.id} className="flex justify-between items-center p-3 cursor-pointer group relative overflow-hidden hover:bg-black/5 active:bg-black/10 transition-colors" onClick={() => openBillForm(bill)}>
                                            <div className="absolute left-0 top-3 bottom-3 w-[4px] rounded-r-full" style={{backgroundColor: stripColor}} />
                                            <div className="flex items-center gap-3 pl-3">
                                                <div className="w-[38px] h-[38px] rounded-[12px] flex items-center justify-center shrink-0 bg-white shadow-sm border border-[rgba(43,36,28,0.05)]">
                                                    <FileText className="w-5 h-5" style={{color: stripColor}} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[#2B2420] truncate">{bill.title}</p>
                                                    <p className="text-[10px] font-bold" style={{color: stripColor}}>
                                                        {isOverdue ? "Gecikti" : isNear ? `${diffDays} gün kaldı` : "Bekliyor"} · {format(parseISO(bill.dueDate), "d MMM yyyy", {locale:tr})}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="font-black text-sm text-[#2B2420]">₺{bill.amount.toLocaleString()}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                        <div className="flex justify-between items-center mt-6 mb-3 px-1">
                            <h3 className="text-sm font-black text-[#75695C] uppercase tracking-wider">Ödenmiş Arşiv ({bills.filter((b) => b.isPaid).length})</h3>
                        </div>
                        {bills.filter(b => b.isPaid).length > 0 && (
                            <div className="bg-[#F8F5EF] rounded-[24px] p-1.5 border border-[rgba(43,36,28,0.08)] divide-y divide-[rgba(43,36,28,0.06)] shadow-sm">
                                {bills.filter((b) => b.isPaid).sort((a, b) => b.dueDate.localeCompare(a.dueDate)).map((bill) => (
                                    <div key={bill.id} className="flex justify-between items-center p-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-[34px] h-[34px] rounded-full bg-[#3F7D53]/20 flex items-center justify-center">
                                                <Check className="w-4 h-4 text-[#3F7D53]" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-[#2B2420] line-through text-opacity-70">{bill.title}</p>
                                                <p className="text-[10px] font-semibold text-[#A79C8D]">{bill.paidDate ? format(parseISO(bill.paidDate), 'd MMM yyyy', {locale: tr}) : '-'}</p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-sm text-[#A79C8D]">₺{bill.amount.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="fixed bottom-[110px] right-5 z-40 print:hidden">
                <button 
                    className="w-[54px] h-[54px] rounded-[22px] bg-[#3E7C74] text-white flex items-center justify-center shadow-lg hover:bg-[#2F6F63] active:scale-90 transition-all"
                    onClick={() => {
                        if (mainTab === 'accounts') openAccountForm(null, 'bank');
                        else if (mainTab === 'bills') openBillForm(null);
                        else openTransactionForm(null);
                    }}
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>

            <Dialog open={isAccountFormOpen} onOpenChange={(open) => { if (!open) setEditingAccount(null); setIsAccountFormOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-[32px] bg-[#F8F5EF] border border-[rgba(43,36,28,0.08)] shadow-2xl p-0 overflow-hidden text-[#2B2420]">
                    <DialogTitle className="sr-only">Hesap Formu</DialogTitle>
                    <div className="p-6">
                        <NewAccountForm 
                            familyMembers={familyMembers} 
                            onSubmit={handleAccountSubmit} 
                            initialData={editingAccount} 
                            initialType={initialAccountType}
                        />
                        {editingAccount && (
                            <Button variant="destructive" className="w-full mt-4 rounded-2xl h-12 font-bold bg-[#B5533A] text-white hover:bg-[#8A4A63]" onClick={() => {handleDeleteAccount(editingAccount.id); setIsAccountFormOpen(false);}}>
                                Hesabı Sil
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            {/* HESAP DETAYLARI MODALI */}
            <Dialog open={isAccountDetailsOpen} onOpenChange={setIsAccountDetailsOpen}>
                <DialogContent className="max-w-[420px] p-0 overflow-hidden bg-[#F8F5EF] rounded-[24px] border-0" showCloseButton={false}>
                    <DialogTitle className="sr-only">Hesap Detayları</DialogTitle>
                    {selectedAccountDetails && (() => {
                        const isCreditCard = selectedAccountDetails.type === 'credit-card' || selectedAccountDetails.type === 'debt';
                        const palette = getCardPalette(selectedAccountDetails);
                        const bannerGrad = isCreditCard || (selectedAccountDetails as any).color ? palette.grad : theme.assetGrad;
                        
                        // Kredi kartı ise seçili ayın harcamasını göster
                        const creditStatement = isCreditCard 
                            ? creditCardStatements.find((s: any) => s.id === selectedAccountDetails.id)
                            : null;
                        const displayBalance = creditStatement ? creditStatement.monthSpent : selectedAccountDetails.balance;

                        const accountTxs = allTransactions
                            .filter((t: any) => t.accountId === selectedAccountDetails.id)
                            .sort((a: any, b: any) => b.date.localeCompare(a.date));
                        
                        const grouped: Record<string, typeof accountTxs> = {};
                        accountTxs.forEach((tx: any) => {
                            const month = tx.date.substring(0, 7);
                            if (!grouped[month]) grouped[month] = [];
                            grouped[month].push(tx);
                        });

                        return (
                            <div className="flex flex-col h-[85vh] max-h-[800px]">
                                {/* Banner */}
                                <div className="p-5 flex flex-col justify-between shrink-0 rounded-b-[24px] shadow-sm relative overflow-hidden" style={{ background: `linear-gradient(to bottom right, ${bannerGrad[0]}, ${bannerGrad[1]})` }}>
                                    <div className="flex justify-between items-center mb-4 relative z-10">
                                        <button onClick={() => setIsAccountDetailsOpen(false)} className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white hover:bg-black/30 transition-colors">
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => {
                                            setIsAccountDetailsOpen(false);
                                            setEditingAccount(selectedAccountDetails);
                                            setIsAccountFormOpen(true);
                                        }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white text-xs font-bold">
                                            <MoreHorizontal className="w-4 h-4" />
                                            <span>Düzenle</span>
                                        </button>
                                    </div>
                                    <div className="relative z-10">
                                        <p className="text-white/80 text-xs font-black uppercase tracking-wider mb-1">{selectedAccountDetails.name}</p>
                                        {isEditingAccountDetailsBalance ? (
                                            <div className="flex items-center gap-3 mt-1">
                                                <input 
                                                    type="number" 
                                                    className="bg-transparent border-b-2 border-white/40 text-white text-3xl font-black focus:outline-none focus:border-white w-32" 
                                                    value={accountDetailsBalanceEdit}
                                                    onChange={(e) => setAccountDetailsBalanceEdit(e.target.value)}
                                                    autoFocus
                                                />
                                                <button onClick={handleSaveAccountDetailsBalance} className="bg-white/20 text-white px-3 py-1.5 rounded-full text-xs font-black hover:bg-white/30 transition-colors">
                                                    Kaydet
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-end gap-2 mt-1 group">
                                                <p className="text-white text-3xl font-black">₺{displayBalance.toLocaleString('tr-TR')}</p>
                                                {!isCreditCard && (
                                                    <button onClick={() => setIsEditingAccountDetailsBalance(true)} className="mb-2 opacity-50 hover:opacity-100 transition-opacity">
                                                        <Pencil className="w-4 h-4 text-white" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        <p className="text-white/70 text-[10px] font-bold mt-1">
                                            {isCreditCard ? `${format(currentDate, 'MMMM yyyy', { locale: tr })} Harcaması` : "Güncel Bakiye"}
                                        </p>
                                    </div>
                                </div>

                                {/* Transactions */}
                                <div className="flex-1 p-5 overflow-y-auto pb-8">
                                    <h3 className="text-sm font-black text-[#75695C] uppercase tracking-wider mb-4">Hesap Hareketleri</h3>
                                    
                                    {accountTxs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-10 opacity-50">
                                            <Wallet className="w-12 h-12 text-[#A79C8D] mb-3" />
                                            <p className="text-sm font-bold text-[#75695C]">Henüz işlem yok</p>
                                        </div>
                                    ) : (
                                        Object.entries(grouped).map(([month, txs]) => {
                                            const monthTotal = txs.reduce((s: number, tx: any) => s + (tx.type === 'income' ? tx.amount : -tx.amount), 0);
                                            return (
                                                <div key={month} className="mb-6">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <span className="text-xs font-bold text-[#A79C8D] capitalize">
                                                            {format(parseISO(month + '-01'), 'MMMM yyyy', { locale: tr })}
                                                        </span>
                                                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", monthTotal >= 0 ? "bg-[#3E7C74]/10 text-[#3E7C74]" : "bg-red-100 text-red-600")}>
                                                            {monthTotal >= 0 ? "+" : ""}₺{Math.abs(monthTotal).toLocaleString('tr-TR')}
                                                        </span>
                                                    </div>
                                                    <div className="bg-white rounded-[20px] p-2 border border-[rgba(43,36,28,0.06)] shadow-sm divide-y divide-[rgba(43,36,28,0.04)]">
                                                        {txs.map((tx: any) => {
                                                            const customCat = categories.find(c => c.name === tx.category);
                                                            const iconColor = customCat?.color || categoryConfig[tx.category]?.color || '#94a3b8';
                                                            const iconBg = `${iconColor}15`;
                                                            const TxIcon = categoryConfig[tx.category]?.icon || CircleEllipsis;
                                                            return (
                                                                <div key={tx.id} onClick={() => {
                                                                    setIsAccountDetailsOpen(false);
                                                                    setEditingTransaction(tx);
                                                                    setIsTransactionFormOpen(true);
                                                                }} className="flex items-center gap-3 p-2 hover:bg-black/5 rounded-[12px] cursor-pointer transition-colors group">
                                                                    <div className="w-[36px] h-[36px] rounded-[12px] flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg, color: iconColor }}>
                                                                        {(() => {
                                                                            if (customCat?.icon) {
                                                                                const CustomIconComponent = ICON_MAP[customCat.icon];
                                                                                if (CustomIconComponent) return <CustomIconComponent className="w-4 h-4" style={{color: iconColor}} />;
                                                                                return <span className="text-[16px]">{customCat.icon}</span>;
                                                                            }
                                                                            return <TxIcon className="w-4 h-4" style={{color: iconColor}} />;
                                                                        })()}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[13px] font-black text-[#2B241C] truncate">{tx.title || tx.category}</p>
                                                                        <p className="text-[10px] font-bold text-[#A79C8D] truncate">{format(parseISO(tx.date), 'dd MMMM, HH:mm', { locale: tr })}</p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className={cn("text-[13px] font-black", tx.type === 'income' ? 'text-[#3E7C74]' : 'text-[#2B241C]')}>
                                                                            {tx.type === 'income' ? '+' : '-'}₺{tx.amount.toLocaleString('tr-TR')}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
            
            <Dialog open={isTransactionFormOpen} onOpenChange={(open) => { if (!open) setEditingTransaction(null); setIsTransactionFormOpen(open); }}>
                <DialogContent className="w-[96vw] max-w-md max-h-[92dvh] h-auto rounded-[32px] bg-[#F8F5EF] border border-[rgba(43,36,28,0.08)] shadow-2xl p-0 flex flex-col overflow-hidden focus:outline-none">
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
                                <Button variant="destructive" className="w-full rounded-2xl h-12 font-bold bg-[#B5533A] text-white hover:bg-[#8A4A63]" onClick={() => {handleDeleteTransaction(editingTransaction.id); setIsTransactionFormOpen(false);}}>
                                    İşlemi Sil
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isBillFormOpen} onOpenChange={(open) => { if (!open) setEditingBill(null); setIsBillFormOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-[32px] bg-[#F8F5EF] border border-[rgba(43,36,28,0.08)] shadow-2xl p-0 overflow-hidden text-[#2B2420]">
                    <DialogTitle className="sr-only">Fatura Formu</DialogTitle>
                    <div className="p-6">
                        <NewBillForm onSubmit={handleBillSubmit} initialData={editingBill} />
                        {editingBill && (
                            <Button variant="destructive" className="w-full mt-4 rounded-2xl h-12 font-bold bg-[#B5533A] text-white hover:bg-[#8A4A63]" onClick={() => {handleDeleteBill(editingBill.id); setIsBillFormOpen(false);}}>
                                Faturayı Sil
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
