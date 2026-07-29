"use client";

import * as React from "react";
import {
  Plus, Wallet, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Trash2,
  Banknote, Landmark, CreditCard, BarChart2, ArrowUpRight, ArrowDownLeft,
  Calendar as CalendarIcon, ArrowLeft, ShoppingCart, Utensils, Bus, FileText,
  Gamepad2, HeartPulse, Shirt, GraduationCap, DollarSign, Briefcase, PlusCircle,
  CircleEllipsis, Printer, Check, CheckCircle2, ListTree, Sparkles, MoreHorizontal,
  Pencil, Repeat, RefreshCw, Settings, Clock, Receipt, Edit2, List, X
} from "lucide-react";
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
import { cn } from "@/lib/utils";
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
  const { familyId } = useAuth();
  const { toast } = useToast();

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

    return {
      creditCardStatements,
      monthlyIncome,
      monthlyExpense,
      yearlyIncome,
      yearlyExpense,
      dailyGroups,
      monthlySummaries,
      monthlyCategorySpent,
      recurringExpenses,
      recurringExpensesTotal,
    };
  }, [allTransactions, categories, currentDate, accounts]);

  const statementAccount = React.useMemo(() => {
    if (!statementAccountId) return null;
    return (
      financialCalculations.creditCardStatements.find((a) => a.id === statementAccountId) || null
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

            {/* Kredi Kartları (Gerçek Fiziksel Kart Görünümü) */}
            {financialCalculations.creditCardStatements.length > 0 && (
              <div>
                <p style={{ color: theme.textMuted }} className="font-black text-[10px] uppercase tracking-widest ml-1 mb-2">
                  Kredi Kartları
                </p>
                <div className="space-y-3">
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
                        className="w-full relative rounded-3xl p-5 text-white text-left shadow-lg overflow-hidden transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group"
                      >
                        {/* Ambient decorative circles */}
                        <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
                        <div className="absolute -bottom-10 -left-6 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />

                        {/* Top: Chip + Card Name + Icon */}
                        <div className="relative z-10 flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {/* Metallic Chip */}
                            <div className="w-9 h-6 rounded-md bg-yellow-300/80 border border-yellow-400/50 flex items-center justify-center relative overflow-hidden shadow-inner shrink-0">
                              <div className="w-full h-[1px] bg-yellow-600/40 my-0.5" />
                              <div className="absolute h-full w-[1px] bg-yellow-600/40 left-3" />
                            </div>
                            <div>
                              <span className="text-white/70 text-[9px] font-extrabold uppercase tracking-widest block">Kredi Kartı</span>
                              <span className="font-extrabold text-base leading-tight drop-shadow-sm">{acc.name}</span>
                            </div>
                          </div>
                          <CreditCard size={22} className="text-white/40 group-hover:text-white/60 transition-colors" />
                        </div>

                        {/* Middle: Masked card number */}
                        <div className="relative z-10 flex items-center gap-2 text-white/50 text-xs font-mono mb-3">
                          <span>••••</span>
                          <span>••••</span>
                          <span>••••</span>
                          <span className="text-white/80 font-bold">****</span>
                        </div>

                        {/* Bottom: Spent amount, remaining balance, and progress bar */}
                        <div className="relative z-10 pt-2 border-t border-white/15">
                          <div className="flex justify-between items-end mb-1.5">
                            <div>
                              <span className="text-white/60 text-[9px] font-bold uppercase tracking-wider block">Net Harcama</span>
                              <span className="text-white font-black text-xl tracking-tight">₺{acc.monthSpent.toLocaleString("tr-TR")}</span>
                            </div>
                            {remaining !== null && (
                              <div className="text-right">
                                <span className="text-white/60 text-[9px] font-bold uppercase tracking-wider block">Kalan Bakiye</span>
                                <span className="text-white/90 font-bold text-sm">₺{remaining.toLocaleString("tr-TR")}</span>
                              </div>
                            )}
                          </div>

                          {(hasTarget || hasLimit) && (
                            <div>
                              <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full transition-all duration-500", pct >= 90 ? "bg-rose-300" : "bg-white/90")}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center mt-1 text-[9px] font-bold text-white/60">
                                <span>%{pct} Harcandı</span>
                                <span>{hasTarget ? `Hedef: ₺${((acc as any).targetLimit || 0).toLocaleString("tr-TR")}` : `Limit: ₺${acc.creditLimit?.toLocaleString("tr-TR")}`}</span>
                              </div>
                            </div>
                          )}
                        </div>
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
