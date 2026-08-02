import DateTimePicker from "@react-native-community/datetimepicker";
import {
    addMonths,
    addYears,
    eachMonthOfInterval,
    endOfYear,
    format,
    parseISO,
    startOfYear,
    subMonths,
    subYears,
} from "date-fns";
import { tr } from "date-fns/locale";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
    ArrowDownLeft,
    ArrowUpRight,
    Banknote,
    BarChart2,
    Briefcase,
    Bus,
    Calendar as CalendarIcon,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    CircleEllipsis,
    Clock,
    CreditCard,
    DollarSign,
    Edit2,
    FileText,
    Gamepad2,
    GraduationCap,
    HeartPulse,
    Landmark,
    List,
    ListTree,
    MoreHorizontal,
    Pencil,
    Plus,
    PlusCircle,
    Receipt,
    RefreshCw,
    Repeat,
    Settings,
    Shirt,
    ShoppingCart,
    Sparkles,
    Trash2,
    Utensils,
    Wallet,
    Wifi,
    X,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    LayoutAnimation,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    NativeModules,
    Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Rect, Path, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import {
    Account,
    Bill,
    BudgetCategory,
    Transaction,
    TransactionTemplate,
    getEffectiveMonth,
} from "../lib/data";
import {
    addAccount,
    addBill,
    addTransaction,
    deleteAccount,
    deleteBill,
    deleteTransaction,
    onAccountsUpdate,
    onBillsUpdate,
    onBudgetCategoriesUpdate,
    onTransactionTemplatesUpdate,
    onTransactionsUpdate,
    updateAccount,
    updateBill,
    updateBudgetCategory,
    updateTransaction,
} from "../lib/dataService";

// ─── DESIGN SYSTEM ──────────────────────────────────────────────────────────
const theme = {
  grad: ["#3B2145", "#7A3B57", "#C1653F"] as [string, string, ...string[]],
  gradSoft: ["#4A2E52", "#8A4A63"] as [string, string, ...string[]],
  assetGrad: ["#2F6F63", "#1B4038"] as [string, string, ...string[]],
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
const CARD_PALETTE: { name: string; hex: string; grad: [string, string] }[] = [
  { name: "Erik", hex: "#6B3A57", grad: ["#6B3A57", "#3F2038"] },
  { name: "Çam Yeşili", hex: "#2F6F63", grad: ["#2F6F63", "#1B4038"] },
  { name: "Toprak", hex: "#B5623F", grad: ["#B5623F", "#7A3E27"] },
  { name: "Indigo", hex: "#4A4A8E", grad: ["#4A4A8E", "#2B2B57"] },
  { name: "Zeytin", hex: "#6E6E32", grad: ["#6E6E32", "#40401C"] },
  { name: "Gül Kurusu", hex: "#A14B5D", grad: ["#A14B5D", "#652E3A"] },
  { name: "Arduvaz", hex: "#3E5866", grad: ["#3E5866", "#25353E"] },
  { name: "Amber", hex: "#A9762E", grad: ["#A9762E", "#6B4A1B"] },
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getCardPalette(acc: any): {
  name: string;
  hex: string;
  grad: [string, string];
} {
  const stored = acc?.color;
  const found = CARD_PALETTE.find((p) => p.hex === stored);
  if (found) return found;
  const idx = hashStr(acc?.id || acc?.name || "x") % CARD_PALETTE.length;
  return CARD_PALETTE[idx];
}

// ─── ICON REGISTRY ──────────────────────────────────────────────────────────
const ICON_MAP: Record<string, any> = {
  ShoppingCart,
  Utensils,
  Bus,
  FileText,
  Gamepad2,
  HeartPulse,
  Shirt,
  GraduationCap,
  DollarSign,
  PlusCircle,
  CircleEllipsis,
  Wallet,
  Banknote,
  Landmark,
  CreditCard,
  Briefcase,
  List,
  Settings,
  Check,
  Pencil,
  ListTree,
};

const DEFAULT_CAT_COLORS: Record<string, string> = {
  Market: "#B5623F",
  Yemek: "#A9762E",
  Ulaşım: "#3E5866",
  Fatura: "#B5533A",
  Eğlence: "#A14B5D",
  Sağlık: "#3F7D53",
  Giyim: "#6B3A57",
  Eğitim: "#4A4A8E",
  Maaş: "#3F7D53",
  Gelir: "#3F7D53",
  "Ek Gelir": "#2F6F63",
  Diğer: "#A79C8D",
};

type CatConf = {
  color: string;
  bgColor: string;
  IconComp: any | null;
  emoji: string | null;
};

function getCategoryConfig(
  categoryName: string | undefined,
  type: "income" | "expense",
  customCategories: BudgetCategory[] = [],
): CatConf {
  const catName = categoryName || "Diğer";
  const custom = customCategories.find((c) => c.name === catName);

  if (custom) {
    const color =
      custom.color || (type === "income" ? theme.income : theme.expense);
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

  const fallbackColor =
    DEFAULT_CAT_COLORS[catName] ||
    (type === "income" ? theme.income : theme.expense);
  return {
    color: fallbackColor,
    bgColor: fallbackColor + "22",
    IconComp: type === "income" ? PlusCircle : ShoppingCart,
    emoji: null,
  };
}

function CatIcon({ conf, size = 16 }: { conf: CatConf; size?: number }) {
  if (conf.emoji) {
    return <Text style={{ fontSize: size }}>{conf.emoji}</Text>;
  }
  const Icon = conf.IconComp || CircleEllipsis;
  return <Icon size={size} color={conf.color} />;
}

const accountIcons: Record<string, any> = {
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

export default function BudgetMainScreen() {
  const insets = useSafeAreaInsets();

  const calculateNewBalance = (
    acc: Account,
    type: "income" | "expense",
    amount: number,
    isRevert = false,
  ): number => {
    let multiplier = type === "income" ? 1 : -1;
    if (isRevert) multiplier *= -1;
    if (acc.type === "credit-card" || acc.type === "debt") {
      multiplier *= -1;
    }
    return acc.balance + amount * multiplier;
  };

  const [refreshing, setRefreshing] = useState(false);
  const [trendTab, setTrendTab] = useState<'all' | 'income' | 'expense'>('all');
  const [expandedAccDetailsMonth, setExpandedAccDetailsMonth] = useState<string | null>(null);
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    if (now.getDate() > 15) {
      return addMonths(now, 1);
    }
    return now;
  });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [transactionTemplates, setTransactionTemplates] = useState<
    TransactionTemplate[]
  >([]);
  const [loading, setLoading] = useState(true);

  const [mainTab, setMainTab] = useState<
    "day" | "month" | "bills" | "accounts"
  >("day");

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isPayBillModalOpen, setIsPayBillModalOpen] = useState(false);

  const [selectedAccountDetails, setSelectedAccountDetails] =
    useState<Account | null>(null);
  const [isAccountDetailsOpen, setIsAccountDetailsOpen] = useState(false);
  const [accountDetailsBalanceEdit, setAccountDetailsBalanceEdit] =
    useState<string>("");
  const [isEditingAccountDetailsBalance, setIsEditingAccountDetailsBalance] =
    useState(false);

  const [isEditingStatementTotal, setIsEditingStatementTotal] = useState(false);
  const [statementTotalEdit, setStatementTotalEdit] = useState("");

  const handleSaveStatementTotal = async () => {
    if (statementAccount) {
      const newTotal = parseFloat(statementTotalEdit.replace(",", "."));
      if (!isNaN(newTotal)) {
        const diff = newTotal - statementAccount.monthSpent;
        if (diff !== 0) {
          const adjTx = {
            accountId: statementAccount.id,
            amount: Math.abs(diff),
            type: diff > 0 ? "expense" : "income",
            category: "Diğer",
            date: format(new Date(), "yyyy-MM-dd"),
            description: "Ekstre Tutarı Düzeltmesi",
            isAppliedToAccount: true,
          };
          // Try adding the transaction
          if (typeof addTransaction === "function") {
            await addTransaction(adjTx);
          }
        }
        setIsEditingStatementTotal(false);
        Alert.alert("Başarılı", "Ekstre tutarı güncellendi.");
      }
    }
  };

  const [statementAccountId, setStatementAccountId] = useState<string | null>(
    null,
  );
  const [isAdjustmentFormOpen, setIsAdjustmentFormOpen] = useState(false);
  const [adjType, setAdjType] = useState<"expense" | "income">("expense");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjDescription, setAdjDescription] = useState("");
  const [adjDate, setAdjDate] = useState(format(new Date(), "yyyy-MM-dd"));

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
        Alert.alert("Başarılı", "Bakiye güncellendi.");
      }
    }
  };

  const [isAccountActionsOpen, setIsAccountActionsOpen] = useState(false);
  const [isTransactionActionsOpen, setIsTransactionActionsOpen] =
    useState(false);
  const [isBillActionsOpen, setIsBillActionsOpen] = useState(false);
  const [isBudgetSettingsOpen, setIsBudgetSettingsOpen] = useState(false);

  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [selectedMenuListAccount, setSelectedMenuListAccount] =
    useState<Account | null>(null);
  const [selectedMenuListTransaction, setSelectedMenuListTransaction] =
    useState<Transaction | null>(null);
  const [selectedMenuListBill, setSelectedMenuListBill] = useState<Bill | null>(
    null,
  );

  // Transaction form
  const [txAmount, setTxAmount] = useState("");
  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [txCategory, setTxCategory] = useState("Diğer");
  const [txAccountId, setTxAccountId] = useState("");
  const [txDate, setTxDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showTxDatePicker, setShowTxDatePicker] = useState(false);
  const [txDescription, setTxDescription] = useState("");
  const [txIsInstallment, setTxIsInstallment] = useState(false);
  const [txInstallmentsCount, setTxInstallmentsCount] = useState("3");
  const [txIsRecurring, setTxIsRecurring] = useState(false);
  const [txIsAppliedToAccount, setTxIsAppliedToAccount] = useState(true);

  // Category and Account Reordering states & handlers
  const [isReorderingCats, setIsReorderingCats] = useState(false);
  const [isReorderingAccounts, setIsReorderingAccounts] = useState(false);

  const handleMoveCategory = async (
    catKey: string,
    direction: -1 | 1,
    filteredCats: BudgetCategory[],
  ) => {
    const index = filteredCats.findIndex(
      (c) => (c.id && c.id === catKey) || c.name === catKey,
    );
    if (index === -1) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= filteredCats.length) return;

    const newFiltered = [...filteredCats];
    const temp = newFiltered[index];
    newFiltered[index] = newFiltered[targetIndex];
    newFiltered[targetIndex] = temp;

    const updatedCategories = categories.map((c) => {
      const fIndex = newFiltered.findIndex(
        (fc) => (fc.id && fc.id === c.id) || fc.name === c.name,
      );
      if (fIndex !== -1) {
        return { ...c, order: fIndex };
      }
      return c;
    });

    setCategories(updatedCategories);

    for (let i = 0; i < newFiltered.length; i++) {
      const item = newFiltered[i];
      if (item.id) {
        updateBudgetCategory(item.id, { order: i }).catch(() => {});
      }
    }
  };

  const handleMoveAccount = async (
    accId: string,
    direction: -1 | 1,
    filteredAccs: Account[],
  ) => {
    const index = filteredAccs.findIndex((a) => a.id === accId);
    if (index === -1) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= filteredAccs.length) return;

    const newFiltered = [...filteredAccs];
    const temp = newFiltered[index];
    newFiltered[index] = newFiltered[targetIndex];
    newFiltered[targetIndex] = temp;

    const updatedAccounts = accounts.map((a) => {
      const fIndex = newFiltered.findIndex((fa) => fa.id === a.id);
      if (fIndex !== -1) {
        return { ...a, order: fIndex };
      }
      return a;
    });

    setAccounts(updatedAccounts);

    for (let i = 0; i < newFiltered.length; i++) {
      const item = newFiltered[i];
      if (item.id) {
        updateAccount(item.id, { order: i }).catch(() => {});
      }
    }
  };

  // Account form
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState<
    "cash" | "bank" | "credit-card" | "other" | "debt"
  >("bank");
  const [accBalance, setAccBalance] = useState("");
  const [accCreditLimit, setAccCreditLimit] = useState("");
  const [accTargetLimit, setAccTargetLimit] = useState("");
  const [accStatementDate, setAccStatementDate] = useState("");
  const [accColor, setAccColor] = useState<string>(CARD_PALETTE[0].hex);

  // Bill form
  const [billTitle, setBillTitle] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState(
    format(new Date(), "yyyy-MM-dd"),
  );
  const [showBillDatePicker, setShowBillDatePicker] = useState(false);
  const [billCategory, setBillCategory] = useState("Fatura");
  const [billIsRecurring, setBillIsRecurring] = useState(false);

  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [isPaidBillsArchiveOpen, setIsPaidBillsArchiveOpen] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);


  useEffect(() => {
    let unsubs: any[] = [];
    try {
      unsubs.push(onAccountsUpdate((data) => setAccounts(data)));
      unsubs.push(
        onTransactionsUpdate(
          (data) => {
            setAllTransactions(data);
            setLoading(false);
          },
          subYears(new Date(), 3),
          addYears(new Date(), 3),
        ),
      );
      unsubs.push(onBudgetCategoriesUpdate((data) => setCategories(data)));
      unsubs.push(onBillsUpdate((data) => setBills(data)));
      unsubs.push(
        onTransactionTemplatesUpdate((data) => setTransactionTemplates(data)),
      );
    } catch (e) {
      console.log("Error starting subscriptions:", e);
      setLoading(false);
    }
    return () => unsubs.forEach((u) => typeof u === "function" && u());
  }, []);

  useEffect(() => {
    if (accounts.length === 0 || allTransactions.length === 0) return;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const pendingTxs = allTransactions.filter(
      (tx) => tx.isApplied === false && tx.date <= todayStr,
    );
    if (pendingTxs.length > 0) {
      const applyPending = async () => {
        try {
          const accountDeltas: Record<string, number> = {};
          for (const tx of pendingTxs) {
            if (!accountDeltas[tx.accountId]) accountDeltas[tx.accountId] = 0;
            accountDeltas[tx.accountId] +=
              tx.type === "income" ? tx.amount : -tx.amount;
          }
          for (const [accId, delta] of Object.entries(accountDeltas)) {
            const acc = accounts.find((a) => a.id === accId);
            if (acc && delta !== 0) {
              await updateAccount(acc.id, { balance: acc.balance + delta });
            }
          }
          for (const tx of pendingTxs) {
            await updateTransaction(tx.id, { isApplied: true });
          }
        } catch (err) {
          console.error("Error applying pending transactions:", err);
        }
      };
      applyPending();
    }
  }, [allTransactions, accounts]);

  const handleNavDate = (direction: "prev" | "next") => {
    if (mainTab === "month") {
      setCurrentDate((prev) =>
        direction === "prev" ? subYears(prev, 1) : addYears(prev, 1),
      );
    } else {
      setCurrentDate((prev) =>
        direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1),
      );
    }
  };

  const accountStats = useMemo(() => {
    const assets = accounts.filter(
      (a) => a.type === "cash" || a.type === "bank" || a.type === "other",
    );
    const debts = accounts.filter(
      (a) => a.type === "credit-card" || a.type === "debt",
    );
    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalDebts = debts.reduce((sum, a) => sum + a.balance, 0);

    // Tüm aylık net tutarların (Gelir - Gider) toplamı
    const totalNetFromTransactions = allTransactions.reduce((sum, t) => {
      return sum + (t.type === "income" ? t.amount : -t.amount);
    }, 0);

    return {
      assets,
      debts,
      totalAssets,
      totalDebts,
      netWorth: totalNetFromTransactions,
    };
  }, [accounts, allTransactions]);

  const financialCalculations = useMemo(() => {
    const currentMonthStr = format(currentDate, "yyyy-MM");
    const currentYearStr = format(currentDate, "yyyy");

    const monthTransactions = allTransactions.filter(
      (t) =>
        getEffectiveMonth(t.date, t.accountId, accounts) === currentMonthStr,
    );
    const yearTransactions = allTransactions.filter(
      (t) => t.date.substring(0, 4) === currentYearStr,
    );

    const monthlyIncome = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const monthlyExpense = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const yearlyIncome = yearTransactions
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const yearlyExpense = yearTransactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);

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
      .filter(
        (t) =>
          accounts.find((a) => a.id === t.accountId)?.type !== "credit-card",
      )
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
    const dailyGroups = Object.values(daily).sort((a, b) =>
      b.dateISO.localeCompare(a.dateISO),
    );
    dailyGroups.forEach((g) =>
      g.transactions.sort((a, b) => b.date.localeCompare(a.date)),
    );

    const months = eachMonthOfInterval({
      start: startOfYear(currentDate),
      end: endOfYear(currentDate),
    });
    const monthlySummaries = months.map((mStart) => {
      const monthKey = format(mStart, "yyyy-MM");
      const txs = allTransactions.filter(
        (t) => getEffectiveMonth(t.date, t.accountId, accounts) === monthKey,
      );
      const inc = txs
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0);
      const exp = txs
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0);
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
        getEffectiveMonth(tx.date, tx.accountId, accounts) === currentMonthStr,
    );
    const recurringExpensesTotal = recurringExpenses.reduce(
      (s, t) => s + t.amount,
      0,
    );

    const creditCardStatements = accounts
      .filter((a) => a.type === "credit-card")
      .map((card) => {
        const targetYear = currentDate.getFullYear();
        const targetMonth = currentDate.getMonth();
        const stmtDay = card.statementDate || 31;

        const endDate = new Date(targetYear, targetMonth, stmtDay);
        if (endDate.getMonth() !== targetMonth) endDate.setDate(0);

        const prevMonthDate = new Date(targetYear, targetMonth - 1, stmtDay);
        if (
          prevMonthDate.getMonth() !==
          (targetMonth === 0 ? 11 : targetMonth - 1)
        ) {
          prevMonthDate.setDate(0);
        }
        const startDate = new Date(prevMonthDate);
        startDate.setDate(startDate.getDate() + 1);

        const startStr = format(startDate, "yyyy-MM-dd");
        const endStr = format(endDate, "yyyy-MM-dd");

        const cardTxs = allTransactions.filter(
          (t) =>
            t.accountId === card.id && t.date >= startStr && t.date <= endStr,
        );

        // NET HARCAMA HESAPLAMASI (Giderler - İadeler/Düzeltmeler)
        const expenses = cardTxs
          .filter((t) => t.type === "expense")
          .reduce((s, t) => s + t.amount, 0);
        const incomes = cardTxs
          .filter((t) => t.type === "income")
          .reduce((s, t) => s + t.amount, 0);
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

  // Sync credit card data to Android home screen widget (statement-period-based)
  useEffect(() => {
    if (Platform.OS !== 'android' || !NativeModules.WidgetModule) return;
    const creditCards = accounts.filter(a => a.type === 'credit-card');
    if (creditCards.length === 0 || allTransactions.length === 0) return;

    const MONTH_TR = ['Ocak','Subat','Mart','Nisan','Mayis','Haziran',
                      'Temmuz','Agustos','Eylul','Ekim','Kasim','Aralik'];
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    // Use primary card's statement day to determine "current" period
    const primaryStmtDay = creditCards[0]?.statementDate || 31;
    const today = new Date();

    // If today's day > statementDate, we're in the NEXT month's billing period
    // e.g. today=July21, stmtDay=5 → current open period ends August 5
    let baseEndMonth = today.getMonth();
    let baseEndYear = today.getFullYear();
    if (today.getDate() > primaryStmtDay) {
      baseEndMonth++;
      if (baseEndMonth > 11) { baseEndMonth = 0; baseEndYear++; }
    }

    // Build 9 periods: index 0 = 2 months future, index 2 = current open, index 8 = 6 months past
    const TOTAL = 9;
    const DEFAULT_INDEX = 2;
    const periodsData: any[] = [];

    for (let i = 0; i < TOTAL; i++) {
      // periodShift > 0 = future, < 0 = past
      const shift = DEFAULT_INDEX - i;

      let endMonth = baseEndMonth + shift;
      let endYear = baseEndYear;
      while (endMonth > 11) { endMonth -= 12; endYear++; }
      while (endMonth < 0) { endMonth += 12; endYear--; }

      const label = `${MONTH_TR[endMonth]} ${endYear}`;

      const cards = creditCards.slice(0, 3).map(card => {
        const stmtDay = card.statementDate || 31;

        // End date of this period
        const endDate = new Date(endYear, endMonth, stmtDay);
        if (endDate.getMonth() !== endMonth) endDate.setDate(0);

        // Start date = day after statementDate of previous month
        const prevMonth = endMonth === 0 ? 11 : endMonth - 1;
        const prevYear = endMonth === 0 ? endYear - 1 : endYear;
        const prevStmt = new Date(prevYear, prevMonth, stmtDay);
        if (prevStmt.getMonth() !== prevMonth) prevStmt.setDate(0);
        const startDate = new Date(prevStmt);
        startDate.setDate(startDate.getDate() + 1);

        const startStr = fmt(startDate);
        const endStr = fmt(endDate);

        const txs = allTransactions.filter(
          t => t.accountId === card.id && t.date >= startStr && t.date <= endStr
        );
        const spent = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
                    - txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

        const limit = (card.targetLimit && card.targetLimit > 0)
          ? card.targetLimit
          : (card.creditLimit || 0);

        return { name: card.name, spent: Math.max(0, spent), limit };
      });

      periodsData.push({ label, cards });
    }

    NativeModules.WidgetModule.setWidgetData(JSON.stringify({ periods: periodsData, defaultIndex: DEFAULT_INDEX }));
  }, [allTransactions, accounts]);

  const statementAccount = useMemo(() => {
    if (!statementAccountId) return null;
    return (
      financialCalculations.creditCardStatements.find(
        (a) => a.id === statementAccountId,
      ) || null
    );
  }, [financialCalculations, statementAccountId]);

  const accountMonthlyStatements = useMemo(() => {
    if (!statementAccountId) return [];
    const accTxs = allTransactions.filter((t) => t.accountId === statementAccountId);
    if (accTxs.length === 0) return [];

    const grouped: Record<
      string,
      {
        monthKey: string;
        monthLabel: string;
        totalSpent: number;
        totalIncome: number;
        netTotal: number;
        transactions: Transaction[];
      }
    > = {};

    accTxs.forEach((tx) => {
      const monthKey = tx.date.substring(0, 7);
      if (!grouped[monthKey]) {
        let label = monthKey;
        try {
          label = format(parseISO(tx.date), "MMMM yyyy", { locale: tr });
        } catch {}
        grouped[monthKey] = {
          monthKey,
          monthLabel: label,
          totalSpent: 0,
          totalIncome: 0,
          netTotal: 0,
          transactions: [],
        };
      }
      if (tx.type === "expense") {
        grouped[monthKey].totalSpent += tx.amount;
      } else {
        grouped[monthKey].totalIncome += tx.amount;
      }
      grouped[monthKey].transactions.push(tx);
    });

    Object.values(grouped).forEach((g) => {
      g.netTotal = g.totalSpent - g.totalIncome;
      g.transactions.sort((a, b) => b.date.localeCompare(a.date));
    });

    return Object.values(grouped).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [allTransactions, statementAccountId]);

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
    const unpaidAmt = bills
      .filter((b) => !b.isPaid)
      .reduce((s, b) => s + b.amount, 0);
    const paidAmt = bills
      .filter((b) => b.isPaid)
      .reduce((s, b) => s + b.amount, 0);
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
      Alert.alert("Hata", "Lütfen hesap adı ve başlangıç bakiyesini doldurun.");
      return;
    }
    const balanceVal = parseFloat(accBalance.replace(",", "."));
    const limitVal = accCreditLimit
      ? parseFloat(accCreditLimit.replace(",", "."))
      : 0;
    const targetLimitVal = accTargetLimit
      ? parseFloat(accTargetLimit.replace(",", "."))
      : 0;
    const statementDateVal = accStatementDate
      ? parseInt(accStatementDate, 10)
      : undefined;
    if (isNaN(balanceVal)) {
      Alert.alert("Hata", "Geçersiz bakiye miktarı.");
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
      } else {
        await addAccount(data);
      }
      setIsAccountModalOpen(false);
      setEditingAccount(null);
    } catch (e) {
      console.error(e);
      Alert.alert("Hata", "İşlem başarısız oldu.");
    }
  };

  const handleDeleteAccount = async (id: string) => {
    Alert.alert(
      "Hesabı Sil",
      "Bu hesabı ve ilişkili verileri silmek istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount(id);
              setIsAccountActionsOpen(false);
            } catch (e) {
              console.error(e);
            }
          },
        },
      ],
    );
  };

  const handleSaveTransaction = async () => {
    if (!txAmount.trim() || !txAccountId) {
      Alert.alert("Hata", "Lütfen tutar ve hesap alanlarını doldurun.");
      return;
    }
    const amountVal = parseFloat(txAmount.replace(",", "."));
    if (isNaN(amountVal) || amountVal <= 0) {
      Alert.alert("Hata", "Geçersiz tutar miktarı.");
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
            tempBal =
              oldTx.type === "income"
                ? tempBal - oldTx.amount
                : tempBal + oldTx.amount;
          }
          if (isAppliedNow) {
            tempBal =
              txType === "income" ? tempBal + amountVal : tempBal - amountVal;
          }
          await updateAccount(oldAcc.id, { balance: tempBal });
        } else {
          if (oldTx.isApplied && oldAcc) {
            if (oldTx.isAppliedToAccount !== false) {
              const reverted = calculateNewBalance(
                oldAcc,
                oldTx.type,
                oldTx.amount,
                true,
              );
              await updateAccount(oldAcc.id, { balance: reverted });
            }
          }
          if (isAppliedNow && newAcc) {
            const applied =
              txType === "income"
                ? newAcc.balance + amountVal
                : newAcc.balance - amountVal;
            await updateAccount(newAcc.id, { balance: applied });
          }
        }
        await updateTransaction(editingTransaction.id, txData);
      } else {
        const totalInstallments = txIsInstallment
          ? parseInt(txInstallmentsCount)
          : 1;
        if (txIsInstallment && totalInstallments > 1) {
          const splitAmount =
            Math.round((amountVal / totalInstallments) * 100) / 100;
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
                const newBal =
                  txType === "income"
                    ? acc.balance + splitAmount
                    : acc.balance - splitAmount;
                await updateAccount(acc.id, { balance: newBal });
              }
            }
            await addTransaction(instData);
          }
        } else {
          const isApplied = txDate <= todayStr;
          txData.isApplied = isApplied;
          if (isApplied) {
            const acc = accounts.find((a) => a.id === txAccountId);
            if (acc) {
              const newBal =
                txType === "income"
                  ? acc.balance + amountVal
                  : acc.balance - amountVal;
              await updateAccount(acc.id, { balance: newBal });
            }
          }
          await addTransaction(txData);
        }
      }
      setIsTransactionModalOpen(false);
    } catch (e) {
      console.error(e);
      Alert.alert("Hata", "İşlem başarısız oldu.");
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    Alert.alert("İşlemi Sil", "Bu işlemi silmek istediğinize emin misiniz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil",
        style: "destructive",
        onPress: async () => {
          try {
            const tx = allTransactions.find((t) => t.id === id);
            if (tx && tx.isApplied) {
              const acc = accounts.find((a) => a.id === tx.accountId);
              if (acc && tx.isAppliedToAccount !== false) {
                const reverted = calculateNewBalance(
                  acc,
                  tx.type,
                  tx.amount,
                  true,
                );
                await updateAccount(acc.id, { balance: reverted });
              }
            }
            await deleteTransaction(id);
            setIsTransactionActionsOpen(false);
          } catch (e) {
            console.error(e);
          }
        },
      },
    ]);
  };

  const handleSaveBill = async () => {
    if (!billTitle.trim() || !billAmount.trim()) {
      Alert.alert("Hata", "Lütfen fatura başlığını ve tutarını girin.");
      return;
    }
    const amtVal = parseFloat(billAmount.replace(",", "."));
    if (isNaN(amtVal) || amtVal <= 0) {
      Alert.alert("Hata", "Geçersiz fatura tutarı.");
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
      } else {
        await addBill(data);
      }
      setIsBillModalOpen(false);
      setEditingBill(null);
    } catch (e) {
      console.error(e);
      Alert.alert("Hata", "İşlem kaydedilemedi.");
    }
  };

  const handleDeleteBill = async (id: string) => {
    Alert.alert(
      "Faturayı Sil",
      "Bu faturayı takvimden ve sistemden silmek istediğinize emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBill(id);
              setIsBillActionsOpen(false);
            } catch (e) {
              console.error(e);
            }
          },
        },
      ],
    );
  };

  const handlePayBill = async () => {
    if (!payingBill || !paymentAccountId) return;
    try {
      const acc = accounts.find((a) => a.id === paymentAccountId);
      if (!acc) return;
      if (acc.balance < payingBill.amount) {
        Alert.alert(
          "Yetersiz Bakiye",
          "Seçilen hesap bakiyesi fatura tutarından düşüktür. Yine de ödemek ister misiniz?",
          [
            { text: "İptal", style: "cancel" },
            { text: "Öde", onPress: () => proceedBillPayment(acc) },
          ],
        );
      } else {
        await proceedBillPayment(acc);
      }
    } catch (e) {
      console.error(e);
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
    } catch (e) {
      console.error(e);
      Alert.alert("Hata", "Fatura ödenirken hata oluştu.");
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
    setAccColor(
      CARD_PALETTE[hashStr(Date.now().toString()) % CARD_PALETTE.length].hex,
    );
    setIsAccountModalOpen(true);
  };
  const openEditAccount = (acc: Account) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccBalance(acc.balance.toString());
    setAccCreditLimit(acc.creditLimit?.toString() || "");
    setAccTargetLimit(acc.targetLimit?.toString() || "");
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

  const handleSaveAdjustment = async () => {
    if (!statementAccountId || !adjAmount.trim()) {
      Alert.alert("Hata", "Lütfen bir tutar girin.");
      return;
    }
    const amountVal = parseFloat(adjAmount.replace(",", "."));
    if (isNaN(amountVal) || amountVal <= 0) {
      Alert.alert("Hata", "Geçersiz tutar.");
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
        description:
          adjDescription.trim() ||
          (adjType === "income" ? "Manuel İade" : "Manuel Düzeltme"),
        isInstallment: false,
        isRecurring: false,
        isApplied: true,
      } as any);
      setAdjAmount("");
      setAdjDescription("");
      setIsAdjustmentFormOpen(false);
    } catch (e) {
      console.error(e);
      Alert.alert("Hata", "Düzeltme eklenemedi.");
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.flex1,
          {
            backgroundColor: theme.bg,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={theme.accent} />
        <Text
          style={{
            color: theme.textSecondary,
            fontWeight: "700",
            fontSize: 12,
            marginTop: 12,
          }}
        >
          Bütçen hazırlanıyor...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.flex1, { backgroundColor: theme.bg }]}>
      {/* ─── STICKY HEADER (SABİT & KÜÇÜLTÜLMÜŞ) ─── */}
      <LinearGradient
        colors={theme.grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
      >
        <View pointerEvents="none" style={styles.blobTop} />
        <View pointerEvents="none" style={styles.blobBottom} />

        <View style={styles.headerTopRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerIconBtn}
          >
            <ChevronLeft size={18} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <Sparkles size={12} color="rgba(255,255,255,0.85)" />
            <Text style={styles.headerTitleText}>Bütçe Takibi</Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsBudgetSettingsOpen(true)}
            style={styles.headerIconBtn}
          >
            <MoreHorizontal size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <Text style={styles.headerLabel}>{headerTitle}</Text>
          <Text style={styles.headerAmount}>
            ₺{headerTotal.toLocaleString("tr-TR")}
          </Text>
        </View>

        {/* ─── GELİR GİDER KUTULARI (KAYMAYAN SABİT ALAN) ─── */}
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconWrap,
                { backgroundColor: "rgba(255,255,255,0.16)" },
              ]}
            >
              <ArrowDownLeft size={13} color="#EAF4E8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statLabel}>{labelIncome}</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                ₺{headerIncome.toLocaleString("tr-TR")}
              </Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconWrap,
                { backgroundColor: "rgba(255,255,255,0.16)" },
              ]}
            >
              <ArrowUpRight size={13} color="#F7E3DA" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statLabel}>{labelExpense}</Text>
              <Text style={styles.statValue} numberOfLines={1}>
                ₺{headerExpense.toLocaleString("tr-TR")}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* ─── TABS ─── */}
      <View style={styles.tabsWrap}>
        <View style={styles.tabsBar}>
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
              <TouchableOpacity
                key={tab}
                onPress={() => {
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut,
                  );
                  setMainTab(tab);
                }}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
              >
                <TabIcon
                  size={12}
                  color={isActive ? "#fff" : theme.textMuted}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    isActive && styles.tabBtnTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ─── İÇERİK (SADECE LİSTE KAYAR) ─── */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 110,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
          />
        }
      >
        {/* ─── DAY TAB ─── */}
        {mainTab === "day" && (
          <View>
            <View style={styles.navRow}>
              <TouchableOpacity
                onPress={() => handleNavDate("prev")}
                style={styles.navBtn}
              >
                <ChevronLeft size={16} color={theme.accent} />
              </TouchableOpacity>
              <Text style={styles.navTitle}>
                {format(currentDate, "MMMM yyyy", { locale: tr })}
              </Text>
              <TouchableOpacity
                onPress={() => handleNavDate("next")}
                style={styles.navBtn}
              >
                <ChevronRight size={16} color={theme.accent} />
              </TouchableOpacity>
            </View>

            {/* Credit cards */}
            {financialCalculations.creditCardStatements.length > 0 && (
              <View style={{ marginTop: 22, marginBottom: 26 }}>
                <View style={[styles.rowBetween, { marginBottom: 12 }]}>
                  <Text style={styles.sectionLabel}>Kredi Kartları</Text>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: theme.textMuted }}>
                    {financialCalculations.creditCardStatements.length} Kart
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 20, paddingTop: 4, gap: 10 }}
                >
                  {financialCalculations.creditCardStatements.map((acc) => {
                    const palette = getCardPalette(acc);
                    const hasTarget = !!acc.targetLimit && acc.targetLimit > 0;
                    const hasLimit = !!acc.creditLimit && acc.creditLimit > 0;
                    const validSpent = Math.max(0, acc.monthSpent);

                    const limitValue = hasTarget
                      ? acc.targetLimit || 1
                      : hasLimit
                      ? acc.creditLimit || 1
                      : 0;

                    const pct = limitValue > 0
                      ? Math.min((validSpent / limitValue) * 100, 100)
                      : 0;

                    const isOverLimit = pct >= 90;
                    const remaining = hasTarget
                      ? Math.max((acc.targetLimit || 0) - validSpent, 0)
                      : hasLimit
                      ? Math.max((acc.creditLimit || 0) - acc.balance, 0)
                      : null;

                    const cardLastFour = (acc.id || "").replace(/\D/g, "").slice(-4) || "4821";

                    return (
                      <TouchableOpacity
                        key={acc.id}
                        onPress={() => handleOpenStatement(acc)}
                        activeOpacity={0.88}
                        style={{
                          width: Math.min((Dimensions.get("window").width - 46) / 2, 175),
                          height: 115,
                          borderRadius: 14,
                          overflow: "hidden",
                          elevation: 4,
                          shadowColor: palette.hex,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.25,
                          shadowRadius: 6,
                        }}
                      >
                        <LinearGradient
                          colors={palette.grad}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            flex: 1,
                            padding: 10,
                            justifyContent: "space-between",
                            position: "relative",
                          }}
                        >
                          {/* Glossy Overlay Circles */}
                          <View
                            style={{
                              position: "absolute",
                              top: -20,
                              right: -20,
                              width: 80,
                              height: 80,
                              borderRadius: 40,
                              backgroundColor: "rgba(255,255,255,0.08)",
                            }}
                          />
                          <View
                            style={{
                              position: "absolute",
                              bottom: -25,
                              left: -10,
                              width: 90,
                              height: 90,
                              borderRadius: 45,
                              backgroundColor: "rgba(255,255,255,0.05)",
                            }}
                          />

                          {/* Card Top Header: Bank Name & Contactless */}
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1, paddingRight: 4 }}>
                              <CreditCard size={12} color="rgba(255,255,255,0.9)" />
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: "900",
                                  color: "#FFFFFF",
                                  letterSpacing: 0.3,
                                  textTransform: "uppercase",
                                }}
                                numberOfLines={1}
                              >
                                {acc.name}
                              </Text>
                            </View>
                            {/* Contactless waves Icon */}
                            <View style={{ opacity: 0.85 }}>
                              <Wifi size={13} color="#FFFFFF" style={{ transform: [{ rotate: "90deg" }] }} />
                            </View>
                          </View>

                          {/* Card Middle: EMV Chip & Card Number Preview */}
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 1 }}>
                            {/* Golden Metallic Chip */}
                            <View
                              style={{
                                width: 22,
                                height: 15,
                                borderRadius: 3,
                                backgroundColor: "#F59E0B",
                                borderWidth: 1,
                                borderColor: "#FCD34D",
                                padding: 1,
                                justifyContent: "center",
                              }}
                            >
                              <View
                                style={{
                                  flex: 1,
                                  borderRadius: 1.5,
                                  borderWidth: 0.5,
                                  borderColor: "rgba(0,0,0,0.2)",
                                  backgroundColor: "#EAB308",
                                }}
                              />
                            </View>

                            {/* Masked Card Number */}
                            <Text
                              style={{
                                color: "rgba(255,255,255,0.85)",
                                fontSize: 10,
                                fontWeight: "700",
                                letterSpacing: 1.2,
                              }}
                            >
                              •• {cardLastFour}
                            </Text>
                          </View>

                          {/* Card Bottom: Spent Amount, Limit Bar & Remaining */}
                          <View>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 3 }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 7.5, fontWeight: "700", color: "rgba(255,255,255,0.75)", textTransform: "uppercase" }}>
                                  Harcama
                                </Text>
                                <Text style={{ fontSize: 13, fontWeight: "900", color: "#FFFFFF", letterSpacing: -0.3 }} numberOfLines={1}>
                                  ₺{acc.monthSpent.toLocaleString("tr-TR")}
                                </Text>
                              </View>

                              {remaining !== null && (
                                <View style={{ alignItems: "flex-end" }}>
                                  <Text style={{ fontSize: 7.5, fontWeight: "700", color: "rgba(255,255,255,0.75)", textTransform: "uppercase" }}>
                                    Kalan
                                  </Text>
                                  <Text style={{ fontSize: 9.5, fontWeight: "800", color: isOverLimit ? "#FCA5A5" : "#FFFFFF" }} numberOfLines={1}>
                                    ₺{remaining.toLocaleString("tr-TR")}
                                  </Text>
                                </View>
                              )}
                            </View>

                            {/* Progress bar if target/limit exists */}
                            {limitValue > 0 && (
                              <View
                                style={{
                                  height: 3,
                                  width: "100%",
                                  backgroundColor: "rgba(255,255,255,0.25)",
                                  borderRadius: 1.5,
                                  overflow: "hidden",
                                }}
                              >
                                <View
                                  style={{
                                    height: "100%",
                                    width: `${pct}%`,
                                    backgroundColor: isOverLimit ? "#EF4444" : "#FFFFFF",
                                    borderRadius: 1.5,
                                  }}
                                />
                              </View>
                            )}
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Daily transactions */}
            <Text style={styles.sectionLabel}>İşlemler</Text>
            {financialCalculations.dailyGroups.length === 0 ? (
              <View style={styles.emptyBox}>
                <Wallet size={30} color={theme.textMuted} />
                <Text style={styles.emptyText}>
                  Bu ay işlem kaydı bulunmuyor.
                </Text>
              </View>
            ) : (
              financialCalculations.dailyGroups.map((group) => (
                <View key={group.dateISO} style={{ marginBottom: 18 }}>
                  <View style={styles.dayHeaderRow}>
                    <Text style={styles.dayHeaderText}>{group.dateStr}</Text>
                    <View style={{ flexDirection: "row", gap: 6 }}>
                      {group.dayIncome > 0 && (
                        <Text style={styles.pillIncome}>
                          +₺{group.dayIncome.toLocaleString("tr-TR")}
                        </Text>
                      )}
                      {group.dayExpense > 0 && (
                        <Text style={styles.pillExpense}>
                          -₺{group.dayExpense.toLocaleString("tr-TR")}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.groupPanel}>
                    {group.transactions.map((tx, idx) => {
                      const acc = accounts.find((a) => a.id === tx.accountId);
                      const conf = getCategoryConfig(
                        tx.category,
                        tx.type,
                        categories,
                      );
                      return (
                        <TouchableOpacity
                          key={tx.id}
                          activeOpacity={0.7}
                          onPress={() => {
                            setSelectedMenuListTransaction(tx);
                            setIsTransactionActionsOpen(true);
                          }}
                          style={[
                            styles.txRow,
                            idx !== group.transactions.length - 1 &&
                              styles.txRowBorder,
                          ]}
                        >
                          <View style={styles.txLeft}>
                            <View
                              style={[
                                styles.txIconWrap,
                                { backgroundColor: conf.bgColor },
                              ]}
                            >
                              <CatIcon conf={conf} size={17} />
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 5,
                                }}
                              >
                                <Text
                                  style={styles.txCategory}
                                  numberOfLines={1}
                                >
                                  {tx.category}
                                </Text>
                                {tx.isRecurring && (
                                  <Repeat size={11} color={theme.accent} />
                                )}
                              </View>
                              <Text style={styles.txSub} numberOfLines={1}>
                                {acc?.name || "—"}
                                {tx.description ? ` · ${tx.description}` : ""}
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={[
                              styles.txAmount,
                              {
                                color:
                                  tx.type === "income"
                                    ? theme.income
                                    : theme.textPrimary,
                              },
                            ]}
                          >
                            {tx.type === "expense" ? "-" : "+"}₺
                            {tx.amount.toLocaleString("tr-TR")}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ─── MONTH TAB ─── */}
        {mainTab === "month" && (
          <View>
            <View style={styles.navRow}>
              <TouchableOpacity
                onPress={() => handleNavDate("prev")}
                style={styles.navBtn}
              >
                <ChevronLeft size={16} color={theme.accent} />
              </TouchableOpacity>
              <Text style={styles.navTitle}>
                {format(currentDate, "yyyy")} YILI
              </Text>
              <TouchableOpacity
                onPress={() => handleNavDate("next")}
                style={styles.navBtn}
              >
                <ChevronRight size={16} color={theme.accent} />
              </TouchableOpacity>
            </View>

            {(() => {
              const summaries = financialCalculations.monthlySummaries;
              const labels = summaries.map((s) => s.monthName.substring(0, 3));
              const expenseData = summaries.map((s) => s.expense);
              const incomeData = summaries.map((s) => s.income);
              const hasData =
                expenseData.some((v) => v > 0) || incomeData.some((v) => v > 0);
              if (!hasData) return null;
              return (
                <View
                  style={[styles.card, { marginTop: 18, marginBottom: 18 }]}
                >
                  <Text style={styles.sectionLabel}>
                    Finansal Trend (Gelir / Gider)
                  </Text>
                  {(() => {
                    const chartWidth = Dimensions.get('window').width - 64;
                    const chartHeight = 160;
                    const paddingX = 24;
                    const paddingY = 24;
                    const plotW = chartWidth - paddingX * 2;
                    const plotH = chartHeight - paddingY * 2 - 20;

                    const allVals = [...incomeData, ...expenseData].filter(v => v > 0);
                    const maxVal = allVals.length ? Math.max(...allVals) : 1;
                    const formatAmt = (v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}K` : String(Math.round(v));

                    // Points calculation
                    const getPoints = (data: number[]) => {
                      const count = data.length;
                      if (count <= 1) return [{ x: paddingX, y: chartHeight - paddingY - 20 }];
                      const stepX = plotW / (count - 1);
                      return data.map((v, i) => {
                        const x = paddingX + i * stepX;
                        const y = chartHeight - paddingY - 20 - (v / maxVal) * plotH;
                        return { x, y, val: v };
                      });
                    };

                    const incPoints = getPoints(incomeData);
                    const expPoints = getPoints(expenseData);

                    // Smooth path generator
                    const createSmoothPath = (pts: { x: number; y: number }[]) => {
                      if (pts.length === 0) return '';
                      if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
                      let d = `M ${pts[0].x} ${pts[0].y}`;
                      for (let i = 0; i < pts.length - 1; i++) {
                        const p0 = pts[i];
                        const p1 = pts[i + 1];
                        const cx = (p0.x + p1.x) / 2;
                        d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
                      }
                      return d;
                    };

                    const createAreaPath = (pts: { x: number; y: number }[]) => {
                      if (pts.length === 0) return '';
                      const lineD = createSmoothPath(pts);
                      const lastX = pts[pts.length - 1].x;
                      const firstX = pts[0].x;
                      const bottomY = chartHeight - paddingY - 20;
                      return `${lineD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
                    };

                    // Trend momentum calculation (last 2 months)
                    const getMomentum = (data: number[]) => {
                      if (data.length < 2) return null;
                      const prev = data[data.length - 2] || 0;
                      const curr = data[data.length - 1] || 0;
                      if (prev === 0) return null;
                      const diff = curr - prev;
                      const pct = Math.round((diff / prev) * 100);
                      return { diff, pct };
                    };

                    const incMom = getMomentum(incomeData);
                    const expMom = getMomentum(expenseData);

                    return (
                      <View>
                        {/* Trend Mod Seçici Tablar */}
                        <View style={{ flexDirection: 'row', backgroundColor: theme.surface, borderRadius: 10, padding: 3, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(150,150,150,0.15)' }}>
                          <TouchableOpacity
                            onPress={() => setTrendTab('all')}
                            style={{ flex: 1, paddingVertical: 6, borderRadius: 8, backgroundColor: trendTab === 'all' ? theme.cardBg || '#3f7d53' : 'transparent', alignItems: 'center' }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '800', color: trendTab === 'all' ? '#fff' : theme.textSecondary }}>Gelir + Gider</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setTrendTab('income')}
                            style={{ flex: 1, paddingVertical: 6, borderRadius: 8, backgroundColor: trendTab === 'income' ? '#22c55e' : 'transparent', alignItems: 'center' }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '800', color: trendTab === 'income' ? '#fff' : theme.textSecondary }}>📈 Gelir Trendi</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setTrendTab('expense')}
                            style={{ flex: 1, paddingVertical: 6, borderRadius: 8, backgroundColor: trendTab === 'expense' ? '#dc2626' : 'transparent', alignItems: 'center' }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '800', color: trendTab === 'expense' ? '#fff' : theme.textSecondary }}>📉 Gider Trendi</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Trend Momentum Rozetleri */}
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                          {(trendTab === 'all' || trendTab === 'income') && incMom && (
                            <View style={{ flex: 1, backgroundColor: 'rgba(34,197,94,0.1)', padding: 8, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#22c55e' }}>
                              <Text style={{ fontSize: 9, color: theme.textSecondary, fontWeight: '700' }}>Gelir Trendi</Text>
                              <Text style={{ fontSize: 11, fontWeight: '900', color: incMom.pct >= 0 ? '#16a34a' : '#dc2626', marginTop: 1 }}>
                                {incMom.pct >= 0 ? `↗ %${incMom.pct} Yükselişte` : `↘ %${Math.abs(incMom.pct)} Düşüşte`}
                              </Text>
                            </View>
                          )}
                          {(trendTab === 'all' || trendTab === 'expense') && expMom && (
                            <View style={{ flex: 1, backgroundColor: 'rgba(220,38,38,0.1)', padding: 8, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#dc2626' }}>
                              <Text style={{ fontSize: 9, color: theme.textSecondary, fontWeight: '700' }}>Gider Trendi</Text>
                              <Text style={{ fontSize: 11, fontWeight: '900', color: expMom.pct <= 0 ? '#16a34a' : '#dc2626', marginTop: 1 }}>
                                {expMom.pct <= 0 ? `↘ %${Math.abs(expMom.pct)} Azaldı (İyi)` : `↗ %${expMom.pct} Artışta (Dikkat)`}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Pürüzsüz Dalga SVG Grafiği */}
                        <Svg width={chartWidth} height={chartHeight}>
                          <Defs>
                            <SvgGradient id="incAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <Stop offset="0" stopColor="#22c55e" stopOpacity="0.25" />
                              <Stop offset="1" stopColor="#22c55e" stopOpacity="0.0" />
                            </SvgGradient>
                            <SvgGradient id="expAreaGrad" x1="0" y1="0" x2="0" y2="1">
                              <Stop offset="0" stopColor="#dc2626" stopOpacity="0.2" />
                              <Stop offset="1" stopColor="#dc2626" stopOpacity="0.0" />
                            </SvgGradient>
                          </Defs>

                          {/* Gelir Alan & Çizgi */}
                          {(trendTab === 'all' || trendTab === 'income') && (
                            <>
                              <Path d={createAreaPath(incPoints)} fill="url(#incAreaGrad)" />
                              <Path d={createSmoothPath(incPoints)} stroke="#22c55e" strokeWidth={3} fill="none" />
                              {incPoints.map((pt, idx) => (
                                <React.Fragment key={`inc-${idx}`}>
                                  <Circle cx={pt.x} cy={pt.y} r={4} fill="#22c55e" stroke="#fff" strokeWidth={1.5} />
                                  <SvgText x={pt.x} y={Math.max(pt.y - 7, 10)} textAnchor="middle" fontSize={8} fontWeight="800" fill="#16a34a">
                                    {formatAmt(pt.val)}
                                  </SvgText>
                                </React.Fragment>
                              ))}
                            </>
                          )}

                          {/* Gider Alan & Çizgi */}
                          {(trendTab === 'all' || trendTab === 'expense') && (
                            <>
                              <Path d={createAreaPath(expPoints)} fill="url(#expAreaGrad)" />
                              <Path d={createSmoothPath(expPoints)} stroke="#dc2626" strokeWidth={3} fill="none" />
                              {expPoints.map((pt, idx) => (
                                <React.Fragment key={`exp-${idx}`}>
                                  <Circle cx={pt.x} cy={pt.y} r={4} fill="#dc2626" stroke="#fff" strokeWidth={1.5} />
                                  <SvgText x={pt.x} y={Math.min(pt.y + 12, chartHeight - 25)} textAnchor="middle" fontSize={8} fontWeight="800" fill="#dc2626">
                                    {formatAmt(pt.val)}
                                  </SvgText>
                                </React.Fragment>
                              ))}
                            </>
                          )}

                          {/* Eksen Ay Etiketleri */}
                          {summaries.map((s, i) => {
                            const stepX = plotW / Math.max(summaries.length - 1, 1);
                            const x = paddingX + i * stepX;
                            return (
                              <SvgText key={i} x={x} y={chartHeight - 4} textAnchor="middle" fontSize={9} fontWeight="800" fill={theme.textSecondary}>
                                {s.monthName.substring(0, 3).toUpperCase()}
                              </SvgText>
                            );
                          })}
                        </Svg>
                      </View>
                    );
                  })()}
                </View>
              );
            })()}

            <Text style={styles.sectionLabel}>Aylık Özet</Text>
            <View style={[styles.card, { padding: 6 }]}>
              {financialCalculations.monthlySummaries.map((summary, idx) => {
                const isExpanded = expandedMonth === summary.monthKey;
                const monthExpenses = allTransactions
                  .filter(
                    (t) =>
                      getEffectiveMonth(t.date, t.accountId, accounts) ===
                        summary.monthKey && t.type === "expense",
                  )
                  .sort((a, b) => b.date.localeCompare(a.date));
                return (
                  <View
                    key={summary.monthKey}
                    style={
                      idx !== financialCalculations.monthlySummaries.length - 1
                        ? styles.rowBorder
                        : undefined
                    }
                  >
                    <TouchableOpacity
                      onPress={() =>
                        setExpandedMonth(isExpanded ? null : summary.monthKey)
                      }
                      style={styles.monthRow}
                    >
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <ChevronRight
                          size={16}
                          color={theme.textMuted}
                          style={{
                            transform: [
                              { rotate: isExpanded ? "90deg" : "0deg" },
                            ],
                            marginRight: 8,
                          }}
                        />
                        <View>
                          <Text style={styles.monthName}>
                            {summary.monthName}
                          </Text>
                          <Text style={styles.monthSub}>
                            +{summary.income.toLocaleString("tr-TR")} / -
                            {summary.expense.toLocaleString("tr-TR")}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={{
                          color:
                            summary.net >= 0 ? theme.income : theme.expense,
                          fontWeight: "900",
                          fontSize: 14,
                        }}
                      >
                        {summary.net >= 0 ? "+" : ""}₺
                        {summary.net.toLocaleString("tr-TR")}
                      </Text>
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={styles.expandedPanel}>
                        {monthExpenses.length === 0 ? (
                          <Text style={styles.emptyTextSmall}>
                            Harcama bulunamadı.
                          </Text>
                        ) : (
                          monthExpenses.map((tx, tIdx) => {
                            const conf = getCategoryConfig(
                              tx.category,
                              tx.type,
                              categories,
                            );
                            return (
                              <View
                                key={tx.id}
                                style={[
                                  styles.expandedRow,
                                  tIdx !== monthExpenses.length - 1 &&
                                    styles.rowBorderLight,
                                ]}
                              >
                                <View style={styles.txLeft}>
                                  <View
                                    style={[
                                      styles.txIconWrapSm,
                                      { backgroundColor: conf.bgColor },
                                    ]}
                                  >
                                    <CatIcon conf={conf} size={13} />
                                  </View>
                                  <View>
                                    <Text
                                      style={styles.expandedTitle}
                                      numberOfLines={1}
                                    >
                                      {tx.description || tx.category}
                                    </Text>
                                    <Text style={styles.expandedDate}>
                                      {tx.date.substring(8, 10)}{" "}
                                      {summary.monthName.substring(0, 3)}
                                    </Text>
                                  </View>
                                </View>
                                <Text
                                  style={{
                                    color: theme.textSecondary,
                                    fontWeight: "800",
                                    fontSize: 13,
                                  }}
                                >
                                  -₺{tx.amount.toLocaleString("tr-TR")}
                                </Text>
                              </View>
                            );
                          })
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {financialCalculations.recurringExpenses.length > 0 && (
              <View style={{ marginTop: 18 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.sectionLabel}>Sabit Giderler</Text>
                  <View style={styles.recurringTotalPill}>
                    <Repeat size={11} color={theme.accent} />
                    <Text style={styles.recurringTotalText}>
                      Toplam ₺
                      {financialCalculations.recurringExpensesTotal.toLocaleString(
                        "tr-TR",
                      )}
                    </Text>
                  </View>
                </View>
                <View style={[styles.card, { padding: 6 }]}>
                  {financialCalculations.recurringExpenses.map((tx, idx) => {
                    const conf = getCategoryConfig(
                      tx.category,
                      tx.type,
                      categories,
                    );
                    return (
                      <View
                        key={tx.id}
                        style={[
                          styles.recurringRow,
                          idx !==
                            financialCalculations.recurringExpenses.length -
                              1 && styles.rowBorder,
                        ]}
                      >
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <View
                            style={[
                              styles.txIconWrap,
                              { backgroundColor: conf.bgColor },
                            ]}
                          >
                            <CatIcon conf={conf} size={16} />
                          </View>
                          <View>
                            <Text style={styles.recurringTitle}>
                              {tx.category}
                            </Text>
                            <Text style={styles.recurringSub}>
                              Abonelik / Her Ay
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={{
                            color: theme.expense,
                            fontWeight: "900",
                            fontSize: 15,
                          }}
                        >
                          -₺{tx.amount.toLocaleString("tr-TR")}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ─── BILLS TAB ─── */}
        {mainTab === "bills" && (
          <View>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionLabel}>Bekleyen Faturalar</Text>
              <TouchableOpacity onPress={openNewBill} style={styles.addPill}>
                <Plus size={12} color={theme.accent} />
                <Text style={styles.addPillText}>Ekle</Text>
              </TouchableOpacity>
            </View>
            {bills.filter((b) => !b.isPaid).length === 0 ? (
              <View style={styles.emptyBox}>
                <CheckCircle2 size={30} color={theme.income} />
                <Text style={styles.emptyText}>
                  Ödenmemiş fatura bulunmuyor.
                </Text>
              </View>
            ) : (
              bills
                .filter((b) => !b.isPaid)
                .map((bill) => {
                  const config = getCategoryConfig(
                    bill.category,
                    "expense",
                    categories,
                  );
                  const today = new Date();
                  const dueDateObj = new Date(bill.dueDate);
                  const diffDays = Math.ceil(
                    (dueDateObj.getTime() - today.getTime()) / 86400000,
                  );
                  const isLate = diffDays < 0;
                  const isNear = diffDays >= 0 && diffDays <= 3;
                  const stripColor = isLate
                    ? theme.expense
                    : isNear
                      ? "#A9762E"
                      : theme.income;
                  return (
                    <TouchableOpacity
                      key={bill.id}
                      onPress={() => {
                        setSelectedMenuListBill(bill);
                        setIsBillActionsOpen(true);
                      }}
                      activeOpacity={0.85}
                      style={styles.billRow}
                    >
                      <View
                        style={[
                          styles.billStrip,
                          { backgroundColor: stripColor },
                        ]}
                      />
                      <View style={styles.txLeft}>
                        <View
                          style={[
                            styles.txIconWrap,
                            { backgroundColor: config.bgColor },
                          ]}
                        >
                          <CatIcon conf={config} size={17} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.txCategory} numberOfLines={1}>
                            {bill.title}
                          </Text>
                          <Text style={[styles.txSub, { color: stripColor }]}>
                            {isLate
                              ? "Gecikti"
                              : isNear
                                ? `${diffDays} gün kaldı`
                                : "Bekliyor"}{" "}
                            ·{" "}
                            {format(parseISO(bill.dueDate), "d MMM yyyy", {
                              locale: tr,
                            })}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.txAmount}>
                        ₺{bill.amount.toLocaleString("tr-TR")}
                      </Text>
                    </TouchableOpacity>
                  );
                })
            )}

            <TouchableOpacity
              onPress={() => setIsPaidBillsArchiveOpen(!isPaidBillsArchiveOpen)}
              activeOpacity={0.8}
              style={styles.archiveHeader}
            >
              <Text style={styles.archiveHeaderText}>
                Ödenmiş Arşiv ({bills.filter((b) => b.isPaid).length})
              </Text>
              <ChevronRight
                size={14}
                color={theme.textMuted}
                style={{
                  transform: [
                    { rotate: isPaidBillsArchiveOpen ? "90deg" : "0deg" },
                  ],
                }}
              />
            </TouchableOpacity>
            {isPaidBillsArchiveOpen && (
              <View style={[styles.card, { padding: 6, marginTop: 8 }]}>
                {bills.filter((b) => b.isPaid).length === 0 ? (
                  <Text style={styles.emptyTextSmall}>Arşiv temiz.</Text>
                ) : (
                  bills
                    .filter((b) => b.isPaid)
                    .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
                    .map((bill) => {
                      const acc = accounts.find(
                        (a) => a.id === bill.paidAccountId,
                      );
                      return (
                        <View key={bill.id} style={styles.archiveRow}>
                          <View style={styles.txLeft}>
                            <View
                              style={[
                                styles.txIconWrapSm,
                                { backgroundColor: theme.incomeBg },
                              ]}
                            >
                              <Check size={14} color={theme.income} />
                            </View>
                            <View>
                              <Text
                                style={styles.archiveTitle}
                                numberOfLines={1}
                              >
                                {bill.title}
                              </Text>
                              <Text style={styles.archiveSub}>
                                {acc?.name || "Hesap"} üzerinden
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={{
                              color: theme.textSecondary,
                              fontWeight: "800",
                              fontSize: 12,
                            }}
                          >
                            ₺{bill.amount.toLocaleString("tr-TR")}
                          </Text>
                        </View>
                      );
                    })
                )}
              </View>
            )}
          </View>
        )}

        {/* ─── ACCOUNTS TAB ─── */}
        {mainTab === "accounts" && (
          <View>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionLabel}>Nakit & Banka Hesapları</Text>
              <TouchableOpacity onPress={openNewAccount} style={styles.addPill}>
                <Plus size={12} color={theme.accent} />
                <Text style={styles.addPillText}>Ekle</Text>
              </TouchableOpacity>
            </View>
            {accountStats.assets.length === 0 ? (
              <View style={styles.emptyBox}>
                <Wallet size={30} color={theme.textMuted} />
                <Text style={styles.emptyText}>Kayıtlı hesap bulunamadı.</Text>
              </View>
            ) : (
              <View style={styles.grid2}>
                {accountStats.assets.map((acc) => {
                  const AccIcon = accountIcons[acc.type] || Wallet;
                  const palette = getCardPalette(acc);
                  const gradColors = (acc as any).color
                    ? palette.grad
                    : theme.assetGrad;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      onPress={() => handleOpenAccountDetails(acc)}
                      activeOpacity={0.88}
                      style={styles.gridItem}
                    >
                      <LinearGradient
                        colors={gradColors as any}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gridCard}
                      >
                        <View style={styles.gridCardTop}>
                          <View style={styles.gridIconWrap}>
                            <AccIcon size={15} color="#fff" />
                          </View>
                          <Text style={styles.gridCardType}>
                            {accountLabels[acc.type]}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.gridCardName} numberOfLines={1}>
                            {acc.name}
                          </Text>
                          <Text style={styles.gridCardAmount} numberOfLines={1}>
                            ₺{acc.balance.toLocaleString("tr-TR")}
                          </Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={[styles.rowBetween, { marginTop: 20 }]}>
              <Text style={styles.sectionLabel}>Kredi Kartı & Borçlar</Text>
              <TouchableOpacity
                onPress={openNewAccount}
                style={[styles.addPill, { backgroundColor: theme.expenseBg }]}
              >
                <Plus size={12} color={theme.expense} />
                <Text style={[styles.addPillText, { color: theme.expense }]}>
                  Ekle
                </Text>
              </TouchableOpacity>
            </View>
            {accountStats.debts.length === 0 ? (
              <View style={styles.emptyBox}>
                <CreditCard size={30} color={theme.textMuted} />
                <Text style={styles.emptyText}>
                  Kayıtlı borç hesabı bulunamadı.
                </Text>
              </View>
            ) : (
              <View style={styles.grid2}>
                {accountStats.debts.map((acc) => {
                  const AccIcon = accountIcons[acc.type] || CreditCard;
                  const palette = getCardPalette(acc);
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      onPress={() => handleOpenAccountDetails(acc)}
                      activeOpacity={0.88}
                      style={styles.gridItem}
                    >
                      <LinearGradient
                        colors={palette.grad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gridCard}
                      >
                        <View style={styles.gridCardTop}>
                          <View style={styles.gridIconWrap}>
                            <AccIcon size={15} color="#fff" />
                          </View>
                          <Text style={styles.gridCardType}>
                            {accountLabels[acc.type] || "Borç"}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.gridCardName} numberOfLines={1}>
                            {acc.name}
                          </Text>
                          <Text style={styles.gridCardAmount} numberOfLines={1}>
                            ₺{acc.balance.toLocaleString("tr-TR")}
                          </Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ─── FAB ─── */}
      <TouchableOpacity
        onPress={handleFabPress}
        activeOpacity={0.85}
        style={styles.fab}
      >
        <LinearGradient colors={theme.grad} style={styles.fabGradient}>
          <Plus size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ─── MODAL: STATEMENT (opens from credit-card circle) ─── */}
      <Modal
        animationType="slide"
        transparent
        visible={!!statementAccountId}
        onRequestClose={handleCloseStatement}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => {
            if (isEditingStatementTotal) {
              setIsEditingStatementTotal(false);
              Keyboard.dismiss();
            } else {
              handleCloseStatement();
            }
          }}
        >
          <Pressable style={[styles.sheet, { maxHeight: "92%" }]} onPress={(e) => {
             // Stop propagation so clicking inside the sheet doesn't close the modal
             if (isEditingStatementTotal && e.target === e.currentTarget) {
                setIsEditingStatementTotal(false);
                Keyboard.dismiss();
             }
          }}>
            {statementAccount &&
              (() => {
                const palette = getCardPalette(statementAccount);
                return (
                  <>
                    <LinearGradient
                      colors={palette.grad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.statementBanner}
                    >
                      <View style={styles.rowBetween}>
                        <TouchableOpacity
                          onPress={handleCloseStatement}
                          style={styles.headerIconBtnSm}
                        >
                          <ChevronLeft size={18} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            handleCloseStatement();
                            openEditAccount(statementAccount);
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 5,
                            backgroundColor: "rgba(255,255,255,0.2)",
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.3)",
                          }}
                          activeOpacity={0.8}
                        >
                          <Pencil size={13} color="#fff" />
                          <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>
                            Düzenle
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.statementCardName}>
                        {statementAccount.name}
                      </Text>
                      <Text style={styles.statementPeriod}>
                        {format(
                          parseISO(statementAccount.statementStart),
                          "d MMM",
                          { locale: tr },
                        )}{" "}
                        –{" "}
                        {format(
                          parseISO(statementAccount.statementEnd),
                          "d MMM yyyy",
                          { locale: tr },
                        )}
                      </Text>
                      {isEditingStatementTotal ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginTop: 4,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 34,
                              fontWeight: "900",
                              color: "#fff",
                              marginRight: 4,
                            }}
                          >
                            ₺
                          </Text>
                          <TextInput
                            style={{
                              fontSize: 34,
                              fontWeight: "900",
                              color: "#fff",
                              borderBottomWidth: 2,
                              borderBottomColor: "rgba(255,255,255,0.4)",
                              minWidth: 120,
                            }}
                            value={statementTotalEdit}
                            onChangeText={setStatementTotalEdit}
                            keyboardType="numeric"
                            autoFocus
                            onBlur={() => setIsEditingStatementTotal(false)}
                          />
                          <TouchableOpacity
                            onPress={handleSaveStatementTotal}
                            style={{
                              marginLeft: 12,
                              paddingHorizontal: 14,
                              paddingVertical: 7,
                              backgroundColor: "rgba(255,255,255,0.2)",
                              borderRadius: 999,
                            }}
                          >
                            <Text
                              style={{
                                color: "#fff",
                                fontWeight: "900",
                                fontSize: 12,
                              }}
                            >
                              Kaydet
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "flex-end",
                            marginTop: 4,
                          }}
                        >
                          <Text style={styles.statementTotal}>
                            ₺
                            {statementAccount.monthSpent.toLocaleString(
                              "tr-TR",
                            )}
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              setStatementTotalEdit(
                                statementAccount.monthSpent.toString(),
                              );
                              setIsEditingStatementTotal(true);
                            }}
                            style={styles.pencilBtn}
                          >
                            <Pencil size={12} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      )}
                      <Text style={styles.statementTotalLabel}>
                        Bu dönem harcama (Net)
                      </Text>
                    </LinearGradient>

                    <ScrollView
                      style={{ padding: 20 }}
                      showsVerticalScrollIndicator={false}
                      keyboardDismissMode="on-drag"
                      onScrollBeginDrag={() => {
                        if (isEditingStatementTotal) {
                          setIsEditingStatementTotal(false);
                          Keyboard.dismiss();
                        }
                      }}
                    >
                      <TouchableOpacity
                        onPress={() =>
                          setIsAdjustmentFormOpen(!isAdjustmentFormOpen)
                        }
                        style={styles.adjustmentToggle}
                        activeOpacity={0.85}
                      >
                        <RefreshCw size={14} color={theme.accent} />
                        <Text style={styles.adjustmentToggleText}>
                          {isAdjustmentFormOpen
                            ? "Düzeltme formunu kapat"
                            : "Unutulan harcama / iade ekle"}
                        </Text>
                      </TouchableOpacity>

                      {isAdjustmentFormOpen && (
                        <View style={styles.adjustmentPanel}>
                          <View style={styles.typeSwitcher}>
                            <TouchableOpacity
                              onPress={() => setAdjType("expense")}
                              style={[
                                styles.typeBtn,
                                adjType === "expense" && {
                                  backgroundColor: theme.expenseBg,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.typeBtnText,
                                  {
                                    color:
                                      adjType === "expense"
                                        ? theme.expense
                                        : theme.textMuted,
                                  },
                                ]}
                              >
                                Harcama
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => setAdjType("income")}
                              style={[
                                styles.typeBtn,
                                adjType === "income" && {
                                  backgroundColor: theme.incomeBg,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.typeBtnText,
                                  {
                                    color:
                                      adjType === "income"
                                        ? theme.income
                                        : theme.textMuted,
                                  },
                                ]}
                              >
                                İade (Gelir)
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.fieldLabel}>Tutar (₺)</Text>
                          <TextInput
                            style={styles.input}
                            placeholder="0.00"
                            placeholderTextColor={theme.textMuted}
                            keyboardType="numeric"
                            value={adjAmount}
                            onChangeText={setAdjAmount}
                          />
                          <Text style={styles.fieldLabel}>Açıklama</Text>
                          <TextInput
                            style={styles.inputSm}
                            placeholder="Örn: Unutulan market fişi..."
                            placeholderTextColor={theme.textMuted}
                            value={adjDescription}
                            onChangeText={setAdjDescription}
                          />
                          <TouchableOpacity
                            onPress={handleSaveAdjustment}
                            activeOpacity={0.85}
                          >
                            <LinearGradient
                              colors={theme.grad}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.saveBtn}
                            >
                              <Text style={styles.saveBtnText}>
                                Ekstreye Yansıt
                              </Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      )}

                      <Text style={styles.sectionLabel}>Ekstre İşlemleri</Text>
                      {statementAccount.transactions.length === 0 ? (
                        <View style={styles.emptyBox}>
                          <Clock size={28} color={theme.textMuted} />
                          <Text style={styles.emptyText}>
                            Bu dönemde işlem yok.
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.groupPanel}>
                          {statementAccount.transactions.map(
                            (tx: Transaction, idx: number) => {
                              const conf = getCategoryConfig(
                                tx.category,
                                tx.type,
                                categories,
                              );
                              return (
                                <TouchableOpacity
                                  activeOpacity={0.7}
                                  onPress={() => {
                                    setIsAccountDetailsOpen(false);
                                    setSelectedMenuListTransaction(tx);
                                    setIsTransactionActionsOpen(true);
                                  }}
                                  key={tx.id}
                                  style={[
                                    styles.txRow,
                                    idx !==
                                      statementAccount.transactions.length -
                                        1 && styles.txRowBorder,
                                  ]}
                                >
                                  <View style={styles.txLeft}>
                                    <View
                                      style={[
                                        styles.txIconWrap,
                                        { backgroundColor: conf.bgColor },
                                      ]}
                                    >
                                      <CatIcon conf={conf} size={17} />
                                    </View>
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                      <Text
                                        style={styles.txCategory}
                                        numberOfLines={1}
                                      >
                                        {tx.description || tx.category}
                                      </Text>
                                      <Text style={styles.txSub}>
                                        {format(
                                          parseISO(tx.date),
                                          "d MMMM yyyy",
                                          { locale: tr },
                                        )}
                                      </Text>
                                    </View>
                                  </View>
                                  <Text
                                    style={[
                                      styles.txAmount,
                                      {
                                        color:
                                          tx.type === "income"
                                            ? theme.income
                                            : theme.textPrimary,
                                      },
                                    ]}
                                  >
                                    {tx.type === "income" ? "+" : "-"}₺
                                    {tx.amount.toLocaleString("tr-TR")}
                                  </Text>
                                </TouchableOpacity>
                              );
                            },
                          )}
                        </View>
                      )}
                      <View style={{ height: 24 }} />
                    </ScrollView>
                  </>
                );
              })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── MODAL: TRANSACTION FORM ─── */}
      <Modal
        animationType="fade"
        transparent
        visible={isTransactionModalOpen}
        onRequestClose={() => setIsTransactionModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.flex1, styles.modalOverlay]}
        >
          <View style={[styles.sheet, { maxHeight: "90%" }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 22 }}
            >
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {editingTransaction ? "İşlemi Düzenle" : "Yeni İşlem"}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsTransactionModalOpen(false)}
                  style={styles.closeBtn}
                >
                  <X size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {!editingTransaction &&
                transactionTemplates.filter((t) => t.type === txType).length >
                  0 && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.fieldLabel}>Hızlı Şablonlar</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      {transactionTemplates
                        .filter((t) => t.type === txType)
                        .map((t) => (
                          <TouchableOpacity
                            key={t.id}
                            onPress={() => {
                              setTxType(t.type);
                              setTxCategory(t.category);
                              if (t.accountId) setTxAccountId(t.accountId);
                              setTxDescription(t.name || "");
                              if (t.amount && t.amount > 0)
                                setTxAmount(t.amount.toString());
                            }}
                            style={styles.templateChip}
                          >
                            <Text style={styles.templateChipText}>
                              {t.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>
                  </View>
                )}

              <View style={styles.typeSwitcher}>
                <TouchableOpacity
                  onPress={() => {
                    setTxType("expense");
                    const validCats = categories.filter(
                      (c) => c.type === "expense",
                    );
                    if (
                      validCats.length > 0 &&
                      !validCats.find((c) => c.name === txCategory)
                    )
                      setTxCategory(validCats[0].name);
                  }}
                  style={[
                    styles.typeBtn,
                    txType === "expense" && {
                      backgroundColor: theme.expenseBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      {
                        color:
                          txType === "expense"
                            ? theme.expense
                            : theme.textMuted,
                      },
                    ]}
                  >
                    Gider
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setTxType("income");
                    const validAccounts = accounts.filter(
                      (a) => a.type !== "credit-card" && a.type !== "debt",
                    );
                    if (
                      validAccounts.length > 0 &&
                      !validAccounts.find((a) => a.id === txAccountId)
                    )
                      setTxAccountId(validAccounts[0].id);
                    const validCats = categories.filter(
                      (c) => c.type === "income",
                    );
                    if (
                      validCats.length > 0 &&
                      !validCats.find((c) => c.name === txCategory)
                    )
                      setTxCategory(validCats[0].name);
                  }}
                  style={[
                    styles.typeBtn,
                    txType === "income" && { backgroundColor: theme.incomeBg },
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      {
                        color:
                          txType === "income" ? theme.income : theme.textMuted,
                      },
                    ]}
                  >
                    Gelir
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Tutar (₺)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
                value={txAmount}
                onChangeText={setTxAmount}
              />

              <Text style={styles.fieldLabel}>Açıklama (Opsiyonel)</Text>
              <TextInput
                style={styles.inputSm}
                placeholder="Örn: Haftalık market alışverişi..."
                placeholderTextColor={theme.textMuted}
                value={txDescription}
                onChangeText={setTxDescription}
              />

              {/* Category selector with Reorder mode */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 6 }}>
                <Text style={styles.fieldLabel}>Kategori</Text>
                <TouchableOpacity
                  onPress={() => setIsReorderingCats(!isReorderingCats)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 10,
                    backgroundColor: isReorderingCats ? theme.accent + "20" : theme.border,
                  }}
                  activeOpacity={0.7}
                >
                  <ListTree size={12} color={isReorderingCats ? theme.accent : theme.textSecondary} />
                  <Text style={{ fontSize: 11, fontWeight: "700", color: isReorderingCats ? theme.accent : theme.textSecondary }}>
                    {isReorderingCats ? "Bitti" : "Sırala"}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 16 }}
                contentContainerStyle={{ gap: 6 }}
              >
                {(() => {
                  const filteredCats = categories
                    .filter((c) => c.type === txType)
                    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

                  return filteredCats.map((cat, idx) => {
                    const isSelected = txCategory === cat.name;
                    const conf = getCategoryConfig(
                      cat.name,
                      txType,
                      categories,
                    );

                    return (
                      <View
                        key={cat.id || cat.name}
                        style={[
                          styles.chip,
                          isSelected && {
                            backgroundColor: conf.color,
                            borderColor: conf.color,
                          },
                          isReorderingCats && { paddingHorizontal: 6, gap: 4 },
                        ]}
                      >
                        {isReorderingCats && idx > 0 && (
                          <TouchableOpacity
                            onPress={() => handleMoveCategory(cat.id || cat.name, -1, filteredCats)}
                            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                            style={{ padding: 2 }}
                          >
                            <ChevronLeft size={14} color={isSelected ? "#fff" : theme.textSecondary} />
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          onPress={() => setTxCategory(cat.name)}
                          onLongPress={() => setIsReorderingCats(true)}
                          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                          activeOpacity={0.8}
                        >
                          <CatIcon conf={conf} size={13} />
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && { color: "#fff" },
                            ]}
                          >
                            {cat.name}
                          </Text>
                        </TouchableOpacity>

                        {isReorderingCats && idx < filteredCats.length - 1 && (
                          <TouchableOpacity
                            onPress={() => handleMoveCategory(cat.id || cat.name, 1, filteredCats)}
                            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                            style={{ padding: 2 }}
                          >
                            <ChevronRight size={14} color={isSelected ? "#fff" : theme.textSecondary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  });
                })()}
              </ScrollView>

              {/* Account selector with Reorder mode */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4, marginBottom: 6 }}>
                <Text style={styles.fieldLabel}>Hesap</Text>
                <TouchableOpacity
                  onPress={() => setIsReorderingAccounts(!isReorderingAccounts)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 10,
                    backgroundColor: isReorderingAccounts ? theme.accent + "20" : theme.border,
                  }}
                  activeOpacity={0.7}
                >
                  <ListTree size={12} color={isReorderingAccounts ? theme.accent : theme.textSecondary} />
                  <Text style={{ fontSize: 11, fontWeight: "700", color: isReorderingAccounts ? theme.accent : theme.textSecondary }}>
                    {isReorderingAccounts ? "Bitti" : "Sırala"}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 16 }}
                contentContainerStyle={{ gap: 6 }}
              >
                {(() => {
                  const filteredAccs = accounts
                    .filter((acc) =>
                      txType === "income"
                        ? acc.type !== "credit-card" && acc.type !== "debt"
                        : true,
                    )
                    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

                  return filteredAccs.map((acc, idx) => {
                    const isSelected = txAccountId === acc.id;

                    return (
                      <View
                        key={acc.id}
                        style={[
                          styles.chip,
                          isSelected && {
                            backgroundColor: theme.accent,
                            borderColor: theme.accent,
                          },
                          isReorderingAccounts && { paddingHorizontal: 6, gap: 4 },
                        ]}
                      >
                        {isReorderingAccounts && idx > 0 && (
                          <TouchableOpacity
                            onPress={() => handleMoveAccount(acc.id, -1, filteredAccs)}
                            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                            style={{ padding: 2 }}
                          >
                            <ChevronLeft size={14} color={isSelected ? "#fff" : theme.textSecondary} />
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          onPress={() => setTxAccountId(acc.id)}
                          onLongPress={() => setIsReorderingAccounts(true)}
                          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              isSelected && { color: "#fff" },
                            ]}
                          >
                            {acc.name}
                          </Text>
                        </TouchableOpacity>

                        {isReorderingAccounts && idx < filteredAccs.length - 1 && (
                          <TouchableOpacity
                            onPress={() => handleMoveAccount(acc.id, 1, filteredAccs)}
                            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                            style={{ padding: 2 }}
                          >
                            <ChevronRight size={14} color={isSelected ? "#fff" : theme.textSecondary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  });
                })()}
              </ScrollView>

              {txAccountId &&
                (() => {
                  const acc = accounts.find((a) => a.id === txAccountId);
                  const isCreditCard = acc?.type === "credit-card";
                  return (
                    <View style={styles.toggleRow}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.toggleTitle}>
                          {isCreditCard
                            ? "Kredi Kartı Borcuna Ekle"
                            : "Hesap Bakiyesine Yansıt"}
                        </Text>
                        <Text style={styles.toggleSub}>
                          {isCreditCard
                            ? "Bu işlem kartın toplam borcuna eklensin mi?"
                            : "Bu işlem hesap bakiyesinden düşülsün mü?"}
                        </Text>
                      </View>
                      <Switch
                        value={txIsAppliedToAccount}
                        onValueChange={setTxIsAppliedToAccount}
                        trackColor={{
                          false: theme.borderStrong,
                          true: theme.accent,
                        }}
                      />
                    </View>
                  );
                })()}

              <Text style={styles.fieldLabel}>Tarih</Text>
              <TouchableOpacity
                onPress={() => setShowTxDatePicker(true)}
                style={styles.inputSm}
              >
                <Text
                  style={{
                    color: theme.textPrimary,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {format(parseISO(txDate), "d MMMM yyyy", { locale: tr })}
                </Text>
              </TouchableOpacity>
              {showTxDatePicker && (
                <DateTimePicker
                  value={parseISO(txDate)}
                  mode="date"
                  display="default"
                  onChange={(e, selectedDate) => {
                    setShowTxDatePicker(false);
                    if (selectedDate)
                      setTxDate(format(selectedDate, "yyyy-MM-dd"));
                  }}
                />
              )}

              {txType === "expense" && !editingTransaction && (
                <View style={{ marginTop: 16 }}>
                  <View style={styles.toggleRow}>
                    <View>
                      <Text style={styles.toggleTitle}>Taksitlendir</Text>
                      <Text style={styles.toggleSub}>Tutarı aylara böl</Text>
                    </View>
                    <Switch
                      value={txIsInstallment}
                      onValueChange={setTxIsInstallment}
                      trackColor={{
                        false: theme.borderStrong,
                        true: theme.accent,
                      }}
                    />
                  </View>
                  {txIsInstallment && (
                    <View style={[styles.toggleRow, { marginTop: 10 }]}>
                      <CalendarIcon size={18} color={theme.textMuted} />
                      <TextInput
                        value={txInstallmentsCount}
                        onChangeText={setTxInstallmentsCount}
                        keyboardType="number-pad"
                        placeholder="3"
                        placeholderTextColor={theme.textMuted}
                        style={{
                          flex: 1,
                          marginLeft: 12,
                          color: theme.textPrimary,
                          fontWeight: "700",
                          fontSize: 15,
                        }}
                      />
                      <Text
                        style={{
                          color: theme.textSecondary,
                          fontWeight: "700",
                          fontSize: 12,
                        }}
                      >
                        Ay
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <View
                style={[styles.toggleRow, { marginTop: 16, marginBottom: 22 }]}
              >
                <View>
                  <Text style={styles.toggleTitle}>Düzenli İşlem</Text>
                  <Text style={styles.toggleSub}>
                    Her ay aynı gün otomatik uygulansın.
                  </Text>
                </View>
                <Switch
                  value={txIsRecurring}
                  onValueChange={setTxIsRecurring}
                  trackColor={{ false: theme.borderStrong, true: theme.accent }}
                />
              </View>

              <TouchableOpacity
                onPress={handleSaveTransaction}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={theme.grad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveBtn}
                >
                  <Text style={styles.saveBtnText}>Kaydet</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── MODAL: ACCOUNT FORM ─── */}
      <Modal
        animationType="slide"
        transparent
        visible={isAccountModalOpen}
        onRequestClose={() => setIsAccountModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { maxHeight: "90%" }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 22 }}
            >
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {editingAccount ? "Hesabı Düzenle" : "Yeni Hesap"}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsAccountModalOpen(false)}
                  style={styles.closeBtn}
                >
                  <X size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Hesap Adı</Text>
              <TextInput
                style={styles.inputSm}
                placeholder="Örn: Garanti Maaş..."
                placeholderTextColor={theme.textMuted}
                value={accName}
                onChangeText={setAccName}
              />

              <Text style={styles.fieldLabel}>Hesap Türü</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 16 }}
              >
                {Object.keys(accountLabels).map((typeKey) => {
                  const isSelected = accType === typeKey;
                  return (
                    <TouchableOpacity
                      key={typeKey}
                      onPress={() => setAccType(typeKey as any)}
                      style={[
                        styles.chip,
                        isSelected && {
                          backgroundColor: theme.accent,
                          borderColor: theme.accent,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && { color: "#fff" },
                        ]}
                      >
                        {accountLabels[typeKey]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={styles.fieldLabel}>Kart Rengi</Text>
              <View style={styles.swatchRow}>
                {CARD_PALETTE.map((p) => {
                  const isSelected = accColor === p.hex;
                  return (
                    <TouchableOpacity
                      key={p.hex}
                      onPress={() => setAccColor(p.hex)}
                      style={[
                        styles.swatch,
                        { backgroundColor: p.hex },
                        isSelected && styles.swatchSelected,
                      ]}
                    >
                      {isSelected && <Check size={14} color="#fff" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>
                {accType === "credit-card"
                  ? "GÜNCEL KREDİ KARTI BORCU (₺)"
                  : "MEVCUT BAKİYE (₺)"}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
                value={accBalance}
                onChangeText={setAccBalance}
              />

              {accType === "credit-card" && (
                <>
                  <Text style={styles.fieldLabel}>
                    Aylık Harcama Hedefi (₺)
                  </Text>
                  <TextInput
                    style={styles.inputSm}
                    placeholder="Örn: 10000"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={accTargetLimit}
                    onChangeText={setAccTargetLimit}
                  />
                  <Text style={styles.fieldLabel}>Kredi Limiti (₺)</Text>
                  <TextInput
                    style={styles.inputSm}
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={accCreditLimit}
                    onChangeText={setAccCreditLimit}
                  />
                  <Text style={styles.fieldLabel}>
                    Ekstre Kesim Tarihi (Gün)
                  </Text>
                  <TextInput
                    style={styles.inputSm}
                    placeholder="Ayın 27'si ise 27 girin"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={accStatementDate}
                    onChangeText={setAccStatementDate}
                  />
                </>
              )}

              <TouchableOpacity
                onPress={handleSaveAccount}
                activeOpacity={0.85}
                style={{ marginTop: 8 }}
              >
                <LinearGradient
                  colors={theme.grad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveBtn}
                >
                  <Text style={styles.saveBtnText}>Kaydet</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: BILL FORM ─── */}
      <Modal
        animationType="slide"
        transparent
        visible={isBillModalOpen}
        onRequestClose={() => setIsBillModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.flex1, styles.modalOverlay]}
        >
          <View style={[styles.sheet, { maxHeight: "90%" }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 22 }}
            >
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {editingBill ? "Faturayı Düzenle" : "Yeni Fatura"}
                </Text>
                <TouchableOpacity
                  onPress={() => setIsBillModalOpen(false)}
                  style={styles.closeBtn}
                >
                  <X size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {!editingBill && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.fieldLabel}>Hızlı Şablonlar</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {[
                      "Elektrik",
                      "Su",
                      "Doğalgaz",
                      "Telefon",
                      "İnternet",
                      "Kira",
                      "Aidat",
                    ].map((bt) => (
                      <TouchableOpacity
                        key={bt}
                        onPress={() => {
                          setBillTitle(`${bt} Faturası`);
                          setBillCategory("Fatura");
                        }}
                        style={styles.templateChip}
                      >
                        <Text style={styles.templateChipText}>{bt}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.fieldLabel}>Fatura Başlığı</Text>
              <TextInput
                style={styles.inputSm}
                placeholder="Örn: Elektrik Faturası..."
                placeholderTextColor={theme.textMuted}
                value={billTitle}
                onChangeText={setBillTitle}
              />

              <Text style={styles.fieldLabel}>Fatura Tutarı (₺)</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={theme.textMuted}
                keyboardType="numeric"
                value={billAmount}
                onChangeText={setBillAmount}
              />

              <Text style={styles.fieldLabel}>Son Ödeme Tarihi</Text>
              <TouchableOpacity
                onPress={() => setShowBillDatePicker(true)}
                style={styles.inputSm}
              >
                <Text
                  style={{
                    color: theme.textPrimary,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {format(parseISO(billDueDate), "d MMMM yyyy", { locale: tr })}
                </Text>
              </TouchableOpacity>
              {showBillDatePicker && (
                <DateTimePicker
                  value={parseISO(billDueDate)}
                  mode="date"
                  display="default"
                  onChange={(e, selectedDate) => {
                    setShowBillDatePicker(false);
                    if (selectedDate)
                      setBillDueDate(format(selectedDate, "yyyy-MM-dd"));
                  }}
                />
              )}

              <View
                style={[styles.toggleRow, { marginTop: 16, marginBottom: 22 }]}
              >
                <View>
                  <Text style={styles.toggleTitle}>Aylık Tekrarla</Text>
                  <Text style={styles.toggleSub}>
                    Her ay aynı gün otomatik olarak oluşturulsun.
                  </Text>
                </View>
                <Switch
                  value={billIsRecurring}
                  onValueChange={setBillIsRecurring}
                  trackColor={{ false: theme.borderStrong, true: theme.accent }}
                />
              </View>

              <TouchableOpacity onPress={handleSaveBill} activeOpacity={0.85}>
                <LinearGradient
                  colors={theme.grad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveBtn}
                >
                  <Text style={styles.saveBtnText}>Kaydet</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── MODAL: ACCOUNT DETAILS ─── */}
      <Modal
        animationType="slide"
        transparent
        visible={isAccountDetailsOpen}
        onRequestClose={() => setIsAccountDetailsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { height: "88%" }]}>
            {selectedAccountDetails &&
              (() => {
                const isCreditCard =
                  selectedAccountDetails.type === "credit-card" ||
                  selectedAccountDetails.type === "debt";
                const AccIcon =
                  accountIcons[selectedAccountDetails.type] || Wallet;
                const palette = getCardPalette(selectedAccountDetails);
                const bannerGrad = isCreditCard
                  ? palette.grad
                  : (selectedAccountDetails as any).color
                    ? palette.grad
                    : theme.assetGrad;
                return (
                  <View style={styles.flex1}>
                    <LinearGradient
                      colors={bannerGrad as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.statementBanner}
                    >
                      <View style={styles.rowBetween}>
                        <TouchableOpacity
                          onPress={() => setIsAccountDetailsOpen(false)}
                          style={styles.headerIconBtnSm}
                        >
                          <ChevronLeft size={18} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setIsAccountDetailsOpen(false);
                            setSelectedMenuListAccount(selectedAccountDetails);
                            setTimeout(
                              () => setIsAccountActionsOpen(true),
                              300,
                            );
                          }}
                          style={styles.editPill}
                        >
                          <MoreHorizontal size={14} color="#fff" />
                          <Text style={styles.editPillText}>Düzenle</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.statementCardName}>
                        {selectedAccountDetails.name}
                      </Text>
                      {isEditingAccountDetailsBalance ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginTop: 4,
                          }}
                        >
                          <TextInput
                            style={{
                              fontSize: 34,
                              fontWeight: "900",
                              color: "#fff",
                              borderBottomWidth: 2,
                              borderBottomColor: "rgba(255,255,255,0.4)",
                              minWidth: 120,
                            }}
                            value={accountDetailsBalanceEdit}
                            onChangeText={setAccountDetailsBalanceEdit}
                            keyboardType="numeric"
                            autoFocus
                          />
                          <TouchableOpacity
                            onPress={handleSaveAccountDetailsBalance}
                            style={{
                              marginLeft: 12,
                              paddingHorizontal: 14,
                              paddingVertical: 7,
                              backgroundColor: "rgba(255,255,255,0.2)",
                              borderRadius: 999,
                            }}
                          >
                            <Text
                              style={{
                                color: "#fff",
                                fontWeight: "900",
                                fontSize: 12,
                              }}
                            >
                              Kaydet
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "flex-end",
                            marginTop: 4,
                          }}
                        >
                          <Text style={styles.statementTotal}>
                            {selectedAccountDetails.balance.toLocaleString(
                              "tr-TR",
                            )}{" "}
                            ₺
                          </Text>
                          <TouchableOpacity
                            onPress={() =>
                              setIsEditingAccountDetailsBalance(true)
                            }
                            style={styles.pencilBtn}
                          >
                            <Pencil size={12} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      )}
                      <Text style={styles.statementTotalLabel}>
                        {isCreditCard ? "Güncel Borç" : "Güncel Bakiye"}
                      </Text>
                    </LinearGradient>

                    <View
                      style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}
                    >
                      <Text style={styles.sectionLabel}>Hesap Hareketleri</Text>
                      <ScrollView showsVerticalScrollIndicator={false}>
                        {(() => {
                          const accountTxs = allTransactions
                            .filter(
                              (t) => t.accountId === selectedAccountDetails.id,
                            )
                            .sort((a, b) => b.date.localeCompare(a.date));
                          if (accountTxs.length === 0) {
                            return (
                              <View style={styles.emptyBox}>
                                <Wallet size={32} color={theme.textMuted} />
                                <Text style={styles.emptyText}>
                                  Henüz işlem yok
                                </Text>
                              </View>
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
                              (s, tx) =>
                                s +
                                (tx.type === "income" ? tx.amount : -tx.amount),
                              0,
                            );
                            const isExpanded = expandedAccDetailsMonth === month;
                            return (
                              <View key={month} style={{ marginBottom: 12, backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: "rgba(150,150,150,0.15)", overflow: "hidden" }}>
                                <TouchableOpacity
                                  activeOpacity={0.8}
                                  onPress={() =>
                                    setExpandedAccDetailsMonth(
                                      isExpanded ? null : month,
                                    )
                                  }
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: 14,
                                    backgroundColor: isExpanded ? "rgba(63,125,83,0.06)" : "transparent",
                                  }}
                                >
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                    <CalendarIcon size={18} color={theme.accent} />
                                    <Text style={{ fontSize: 14, fontWeight: "800", color: theme.textPrimary }}>
                                      {format(
                                        parseISO(month + "-01"),
                                        "MMMM yyyy",
                                        { locale: tr },
                                      )}
                                    </Text>
                                  </View>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                    <Text
                                      style={{
                                        fontSize: 14,
                                        fontWeight: "900",
                                        color:
                                          monthTotal >= 0
                                            ? theme.income
                                            : theme.expense,
                                      }}
                                    >
                                      {monthTotal >= 0 ? "+" : ""}
                                      {monthTotal.toLocaleString("tr-TR")} ₺
                                    </Text>
                                    {isExpanded ? (
                                      <ChevronUp size={16} color={theme.textMuted} />
                                    ) : (
                                      <ChevronDown size={16} color={theme.textMuted} />
                                    )}
                                  </View>
                                </TouchableOpacity>

                                {isExpanded && (
                                  <View style={[styles.groupPanel, { borderTopWidth: 1, borderTopColor: "rgba(150,150,150,0.1)" }]}>
                                  {txs.map((tx, tIdx) => {
                                    const conf = getCategoryConfig(
                                      tx.category,
                                      tx.type,
                                      categories,
                                    );
                                    return (
                                      <TouchableOpacity
                                        key={tx.id}
                                        style={[
                                          styles.txRow,
                                          tIdx !== txs.length - 1 &&
                                            styles.txRowBorder,
                                        ]}
                                        onPress={() => {
                                          setIsAccountDetailsOpen(false);
                                          setSelectedMenuListTransaction(tx);
                                          setIsTransactionActionsOpen(true);
                                        }}
                                      >
                                        <View style={styles.txLeft}>
                                          <View
                                            style={[
                                              styles.txIconWrap,
                                              { backgroundColor: conf.bgColor },
                                            ]}
                                          >
                                            <CatIcon conf={conf} size={16} />
                                          </View>
                                          <View
                                            style={{ flex: 1, minWidth: 0 }}
                                          >
                                            <View
                                              style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                gap: 5,
                                              }}
                                            >
                                              <Text
                                                style={styles.txCategory}
                                                numberOfLines={1}
                                              >
                                                {tx.description || tx.category}
                                              </Text>
                                              {tx.isRecurring && (
                                                <Repeat
                                                  size={11}
                                                  color={theme.accent}
                                                />
                                              )}
                                            </View>
                                            <Text style={styles.txSub}>
                                              {format(
                                                parseISO(tx.date),
                                                "dd MMM yyyy",
                                                { locale: tr },
                                              )}
                                            </Text>
                                          </View>
                                        </View>
                                        <Text
                                          style={{
                                            fontWeight: "900",
                                            fontSize: 13,
                                            color:
                                              tx.type === "income"
                                                ? theme.income
                                                : theme.textPrimary,
                                          }}
                                        >
                                          {tx.type === "income" ? "+" : "-"}
                                          {tx.amount.toLocaleString("tr-TR")} ₺
                                        </Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              )}
                              </View>
                            );
                          });
                        })()}
                        <View style={{ height: 20 }} />
                      </ScrollView>
                    </View>
                  </View>
                );
              })()}
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: PAY BILL ─── */}
      <Modal
        animationType="fade"
        transparent
        visible={isPayBillModalOpen}
        onRequestClose={() => setIsPayBillModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={{ padding: 22 }}>
              <Text style={styles.sheetTitle}>Fatura Ödeme Hesabı</Text>
              <Text style={styles.fieldLabel}>
                "{payingBill?.title}" faturasını ödemek için hesap seçin:
              </Text>
              <ScrollView
                style={{ maxHeight: 220, marginTop: 8, marginBottom: 18 }}
                showsVerticalScrollIndicator={false}
              >
                {accounts.map((acc) => {
                  const isSelected = paymentAccountId === acc.id;
                  const AccIcon = accountIcons[acc.type] || Wallet;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      onPress={() => setPaymentAccountId(acc.id)}
                      style={[
                        styles.payAccRow,
                        isSelected && {
                          borderColor: theme.accent,
                          backgroundColor: theme.accent + "1A",
                        },
                      ]}
                    >
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <AccIcon
                          size={16}
                          color={isSelected ? theme.accent : theme.textMuted}
                          style={{ marginRight: 10 }}
                        />
                        <Text style={styles.payAccName}>{acc.name}</Text>
                      </View>
                      <Text style={styles.payAccBalance}>
                        ₺{acc.balance.toLocaleString("tr-TR")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setIsPayBillModalOpen(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handlePayBill}
                  disabled={!paymentAccountId}
                  style={{ flex: 1, opacity: paymentAccountId ? 1 : 0.5 }}
                >
                  <LinearGradient
                    colors={theme.grad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.saveBtn}
                  >
                    <Text style={styles.saveBtnText}>Ödemeyi Onayla</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── ACTION SHEET: ACCOUNT ─── */}
      <Modal
        animationType="fade"
        transparent
        visible={isAccountActionsOpen}
        onRequestClose={() => setIsAccountActionsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { padding: 18 }]}>
            <Text style={styles.actionSheetTitle}>
              {selectedMenuListAccount?.name || "Hesap İşlemleri"}
            </Text>
            {selectedMenuListAccount && (
              <>
                <TouchableOpacity
                  onPress={() => {
                    setIsAccountActionsOpen(false);
                    openEditAccount(selectedMenuListAccount);
                  }}
                  style={styles.actionRow}
                >
                  <Edit2 size={16} color={theme.textSecondary} />
                  <Text style={styles.actionRowText}>Düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    handleDeleteAccount(selectedMenuListAccount.id)
                  }
                  style={[styles.actionRow, styles.actionRowDanger]}
                >
                  <Trash2 size={16} color={theme.expense} />
                  <Text
                    style={[styles.actionRowText, { color: theme.expense }]}
                  >
                    Sil
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsAccountActionsOpen(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>İptal</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── ACTION SHEET: TRANSACTION ─── */}
      <Modal
        animationType="fade"
        transparent
        visible={isTransactionActionsOpen}
        onRequestClose={() => setIsTransactionActionsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { padding: 18 }]}>
            <Text style={styles.actionSheetTitle}>
              {selectedMenuListTransaction?.category || "İşlem Eylemleri"}
            </Text>
            {selectedMenuListTransaction && (
              <>
                <TouchableOpacity
                  onPress={() => {
                    setIsTransactionActionsOpen(false);
                    openEditTransaction(selectedMenuListTransaction);
                  }}
                  style={styles.actionRow}
                >
                  <Edit2 size={16} color={theme.textSecondary} />
                  <Text style={styles.actionRowText}>Düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    handleDeleteTransaction(selectedMenuListTransaction.id)
                  }
                  style={[styles.actionRow, styles.actionRowDanger]}
                >
                  <Trash2 size={16} color={theme.expense} />
                  <Text
                    style={[styles.actionRowText, { color: theme.expense }]}
                  >
                    Sil
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsTransactionActionsOpen(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>İptal</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── ACTION SHEET: BILL ─── */}
      <Modal
        animationType="fade"
        transparent
        visible={isBillActionsOpen}
        onRequestClose={() => setIsBillActionsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { padding: 18 }]}>
            <Text style={styles.actionSheetTitle}>
              {selectedMenuListBill?.title || "Fatura Eylemleri"}
            </Text>
            {selectedMenuListBill && (
              <>
                <TouchableOpacity
                  onPress={() => {
                    setPayingBill(selectedMenuListBill);
                    setPaymentAccountId(accounts[0]?.id || "");
                    setIsBillActionsOpen(false);
                    setIsPayBillModalOpen(true);
                  }}
                  style={[
                    styles.actionRow,
                    { backgroundColor: theme.incomeBg },
                  ]}
                >
                  <Check size={16} color={theme.income} />
                  <Text style={[styles.actionRowText, { color: theme.income }]}>
                    Faturayı Öde (Kapat)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setIsBillActionsOpen(false);
                    openEditBill(selectedMenuListBill);
                  }}
                  style={styles.actionRow}
                >
                  <Edit2 size={16} color={theme.textSecondary} />
                  <Text style={styles.actionRowText}>Düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteBill(selectedMenuListBill.id)}
                  style={[styles.actionRow, styles.actionRowDanger]}
                >
                  <Trash2 size={16} color={theme.expense} />
                  <Text
                    style={[styles.actionRowText, { color: theme.expense }]}
                  >
                    Sil
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsBillActionsOpen(false)}
                  style={styles.cancelBtn}
                >
                  <Text style={styles.cancelBtnText}>İptal</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ─── SETTINGS SHEET ─── */}
      <Modal
        animationType="fade"
        transparent
        visible={isBudgetSettingsOpen}
        onRequestClose={() => setIsBudgetSettingsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { padding: 18 }]}>
            <Text style={styles.actionSheetTitle}>Bütçe Seçenekleri</Text>
            <TouchableOpacity
              onPress={() => {
                setIsBudgetSettingsOpen(false);
                router.push("/budget-reports");
              }}
              style={styles.settingsRow}
            >
              <View
                style={[
                  styles.settingsIconWrap,
                  { backgroundColor: theme.accent + "1E" },
                ]}
              >
                <BarChart2 size={16} color={theme.accent} />
              </View>
              <Text style={styles.actionRowText}>Bütçe Raporları</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setIsBudgetSettingsOpen(false);
                router.push("/transaction-templates");
              }}
              style={styles.settingsRow}
            >
              <View
                style={[
                  styles.settingsIconWrap,
                  { backgroundColor: "#3E586622" },
                ]}
              >
                <FileText size={16} color="#3E5866" />
              </View>
              <Text style={styles.actionRowText}>İşlem Şablonları</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setIsBudgetSettingsOpen(false);
                router.push("/budget-categories");
              }}
              style={styles.settingsRow}
            >
              <View
                style={[
                  styles.settingsIconWrap,
                  { backgroundColor: "#A9762E22" },
                ]}
              >
                <Settings size={16} color="#A9762E" />
              </View>
              <Text style={styles.actionRowText}>Kategori Yönetimi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsBudgetSettingsOpen(false)}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex1: { flex: 1 },
  headerGradient: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 16,
    paddingBottom: 24, // Sabit ve daha küçük boşluk
    overflow: "hidden",
    shadowColor: "#3B2145",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 10,
  },
  blobTop: {
    position: "absolute",
    top: -50,
    right: -30,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  blobBottom: {
    position: "absolute",
    bottom: -60,
    left: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconBtnSm: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitleText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  headerLabel: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  headerAmount: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  statRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statValue: { color: "#fff", fontWeight: "800", fontSize: 13, marginTop: 2 },

  tabsWrap: { paddingHorizontal: 16, marginTop: 12, zIndex: 20 },
  tabsBar: {
    backgroundColor: theme.surfaceRaised,
    borderRadius: 22,
    padding: 5,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: theme.borderStrong,
    shadowColor: "#2B2420",
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  tabBtnActive: { backgroundColor: theme.accent },
  tabBtnText: { fontWeight: "800", fontSize: 10, color: theme.textMuted },
  tabBtnTextActive: { color: "#fff" },

  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.surface,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    color: theme.textPrimary,
    fontWeight: "800",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  sectionLabel: {
    color: theme.textMuted,
    fontWeight: "900",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginLeft: 2,
    marginBottom: 10,
  },

  circleWrap: {
    width: 104,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
  },
  circleInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  circleInnerBig: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  circleRemainingBadge: {
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  circleAmountMain: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 13,
    marginTop: 2,
  },
  circleAmountRemain: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "800",
    fontSize: 11,
  },
  circleAmountSub: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "700",
    fontSize: 8.5,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  circleDivider: {
    width: 22,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginVertical: 3,
  },
  circleLabelStrong: {
    color: theme.textPrimary,
    fontWeight: "800",
    fontSize: 12.5,
    marginTop: 10,
    width: 104,
    textAlign: "center",
  },
  circleLabelSub: {
    color: theme.textMuted,
    fontWeight: "700",
    fontSize: 10,
    marginTop: 2,
    width: 104,
    textAlign: "center",
  },

  card: {
    backgroundColor: theme.surface,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },

  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    backgroundColor: theme.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: "dashed",
  },
  emptyText: {
    color: theme.textMuted,
    fontWeight: "700",
    fontSize: 12,
    marginTop: 10,
  },
  emptyTextSmall: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 12,
  },

  dayHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  dayHeaderText: {
    color: theme.textMuted,
    fontWeight: "900",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  pillIncome: {
    fontSize: 10,
    backgroundColor: theme.incomeBg,
    color: theme.income,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: "900",
  },
  pillExpense: {
    fontSize: 10,
    backgroundColor: theme.expenseBg,
    color: theme.expense,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: "900",
  },

  groupPanel: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.border,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  txLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  txIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  txIconWrapSm: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  txCategory: { color: theme.textPrimary, fontWeight: "800", fontSize: 14 },
  txSub: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  txAmount: { color: theme.textPrimary, fontWeight: "900", fontSize: 14 },

  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
  rowBorderLight: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(43,36,28,0.05)",
  },
  monthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  monthName: {
    color: theme.textPrimary,
    fontWeight: "800",
    fontSize: 13,
    textTransform: "capitalize",
  },
  monthSub: {
    color: theme.textMuted,
    fontSize: 9,
    fontWeight: "700",
    marginTop: 2,
  },
  expandedPanel: {
    backgroundColor: theme.surfaceAlt,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },
  expandedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  expandedTitle: { color: theme.textPrimary, fontWeight: "700", fontSize: 12 },
  expandedDate: { color: theme.textMuted, fontSize: 10, fontWeight: "600" },

  recurringRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  recurringTitle: { color: theme.textPrimary, fontWeight: "800", fontSize: 13 },
  recurringSub: {
    color: theme.textMuted,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 2,
  },
  recurringTotalPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: theme.accent + "1A",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recurringTotalText: { color: theme.accent, fontWeight: "900", fontSize: 10 },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  addPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.accent + "1A",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  addPillText: { color: theme.accent, fontWeight: "900", fontSize: 10 },

  billRow: {
    backgroundColor: theme.surface,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
    marginBottom: 10,
  },
  billStrip: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },

  archiveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 16,
  },
  archiveHeaderText: {
    color: theme.textMuted,
    fontWeight: "900",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  archiveRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  archiveTitle: { color: theme.textPrimary, fontWeight: "700", fontSize: 12 },
  archiveSub: { color: theme.textMuted, fontSize: 9, fontWeight: "600" },

  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: {
    width: "48.5%",
    marginBottom: 12,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#2B2420",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  gridCard: { padding: 16, height: 118, justifyContent: "space-between" },
  gridCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  gridIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  gridCardType: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  gridCardName: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 3,
  },
  gridCardAmount: { color: "#fff", fontWeight: "900", fontSize: 16 },

  fab: {
    position: "absolute",
    bottom: 26,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3B2145",
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    zIndex: 999,
  },
  fabGradient: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(24,18,14,0.55)",
  },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderBottomWidth: 0,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  sheetTitle: { fontSize: 17, fontWeight: "900", color: theme.textPrimary },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },

  fieldLabel: {
    color: theme.textMuted,
    fontWeight: "800",
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 7,
    marginLeft: 2,
    marginTop: 4,
  },
  input: {
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 18,
    color: theme.textPrimary,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 16,
    height: 52,
  },
  inputSm: {
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 18,
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 16,
    height: 50,
    justifyContent: "center",
  },

  typeSwitcher: {
    flexDirection: "row",
    backgroundColor: theme.surfaceAlt,
    padding: 6,
    borderRadius: 18,
    marginBottom: 22,
    gap: 6,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 13,
    alignItems: "center",
  },
  typeBtnText: { fontWeight: "900", fontSize: 12 },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.surfaceAlt,
    marginRight: 8,
  },
  chipText: { fontWeight: "800", fontSize: 11, color: theme.textSecondary },

  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchSelected: { borderColor: theme.textPrimary },

  toggleRow: {
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleTitle: {
    color: theme.textPrimary,
    fontWeight: "800",
    fontSize: 12,
    marginBottom: 3,
  },
  toggleSub: { color: theme.textMuted, fontSize: 10, fontWeight: "600" },

  templateChip: {
    backgroundColor: theme.accent + "18",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.accent + "33",
  },
  templateChipText: { color: theme.accent, fontWeight: "800", fontSize: 12 },

  saveBtn: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#3B2145",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  saveBtnText: { color: "#fff", fontWeight: "900", fontSize: 14 },

  statementBanner: {
    padding: 22,
    paddingTop: 24,
    paddingBottom: 26,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  statementIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  statementCardName: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginTop: 16,
  },
  statementPeriod: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  statementTotal: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 10,
  },
  statementTotalLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  editPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  editPillText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  pencilBtn: {
    marginLeft: 10,
    marginBottom: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  adjustmentToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.accent + "16",
    borderWidth: 1,
    borderColor: theme.accent + "30",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  adjustmentToggleText: {
    color: theme.accent,
    fontWeight: "800",
    fontSize: 12,
  },
  adjustmentPanel: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: theme.border,
  },

  payAccRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 13,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.surfaceAlt,
    marginBottom: 8,
  },
  payAccName: { color: theme.textPrimary, fontWeight: "800", fontSize: 12 },
  payAccBalance: {
    color: theme.textSecondary,
    fontWeight: "800",
    fontSize: 12,
  },

  actionSheetTitle: {
    color: theme.textPrimary,
    fontWeight: "900",
    textAlign: "center",
    fontSize: 14,
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 4,
  },
  actionRowDanger: { backgroundColor: theme.expenseBg },
  actionRowText: { color: theme.textPrimary, fontWeight: "800", fontSize: 13 },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    marginBottom: 6,
  },
  settingsIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelBtn: {
    marginTop: 6,
    paddingVertical: 14,
    backgroundColor: theme.surfaceAlt,
    borderRadius: 16,
    alignItems: "center",
    flex: 1,
  },
  cancelBtnText: {
    color: theme.textSecondary,
    fontWeight: "800",
    fontSize: 12,
  },
});
