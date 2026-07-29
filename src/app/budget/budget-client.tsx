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
    X,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
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
import { LineChart } from "react-native-chart-kit";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
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
  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const [currentDate, setCurrentDate] = useState(new Date());
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
    return {
      assets,
      debts,
      totalAssets,
      totalDebts,
      netWorth: totalAssets - totalDebts,
    };
  }, [accounts]);

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
    <View style={[styles.flex1, { backgroundColor: theme.bg }]}>... (file truncated for brevity)