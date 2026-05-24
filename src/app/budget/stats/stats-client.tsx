"use client";

import * as React from "react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie, ReferenceLine, LabelList } from "recharts";
import { onTransactionStatsUpdate, onAccountsUpdate } from "@/lib/dataService";
import type { Account, Transaction } from "@/lib/data";
import { Banknote, TrendingDown, TrendingUp, Wallet, ArrowLeft, BarChart2, PieChart as PieChartIcon, ArrowRight, ChevronLeft } from "lucide-react";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { tr } from "date-fns/locale";
import { format } from "date-fns";

// --- TASARIM SİSTEMİ: Mobil Odaklı (iOS Style) ---
const themeClasses = {
    PAGE_BG: "bg-[#F2F2F7] dark:bg-black transition-colors duration-300",
    HEADER_BG: "bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.05]",
    CARD_BG: "bg-white dark:bg-[#1C1C1E] shadow-sm",
    TEXT_MAIN: "text-[#1C1C1E] dark:text-white",
    TEXT_MUTED: "text-[#8E8E93] dark:text-[#EBEBF5]/60",
};

// iOS Sistem Renkleri
const chartConfig = {
  gelir: { label: "Gelir", color: "#34C759" },   // iOS Green
  gider: { label: "Gider", color: "#FF3B30" },   // iOS Red
  bakiye: { label: "Bakiye", color: "#007AFF" }, // iOS Blue
} satisfies ChartConfig;

// --- Mobil Widget Kartı ---
const IosStatCard = ({ icon: Icon, title, value, subtext, colorClass, bgClass }: { icon: any, title: string, value: string, subtext: string, colorClass: string, bgClass: string }) => (
    <div className={cn("p-4 rounded-[22px] flex flex-col justify-between min-h-[120px] active:scale-[0.98] transition-transform", themeClasses.CARD_BG)}>
        <div className="flex items-center gap-2 mb-2">
            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", bgClass)}>
                <Icon className={cn("h-4 w-4", colorClass)} />
            </div>
            <h3 className={cn("font-medium text-[13px] uppercase tracking-wide", themeClasses.TEXT_MUTED)}>{title}</h3>
        </div>
        <div>
            <p className={cn("text-[20px] font-bold tracking-tight leading-none mb-1", themeClasses.TEXT_MAIN)}>{value}</p>
            <p className={cn("text-[11px] font-medium", colorClass)}>{subtext}</p>
        </div>
    </div>
);

export function BudgetStatsClient() {
    const router = useRouter();
    const [monthlyStats, setMonthlyStats] = React.useState<any[]>([]);
    const [accounts, setAccounts] = React.useState<Account[]>([]);

    React.useEffect(() => {
        const unsubStats = onTransactionStatsUpdate((stats) => {
            const sortedStats = Object.entries(stats).map(([month, data]) => ({
                month,
                ...data
            })).sort((a,b) => a.month.localeCompare(b.month));
            setMonthlyStats(sortedStats);
        });

        const unsubAccounts = onAccountsUpdate(setAccounts);

        return () => {
            unsubStats();
            unsubAccounts();
        }
    }, []);

    const totalBalance = React.useMemo(() => 
        accounts.reduce((sum, acc) => sum + acc.balance, 0),
    [accounts]);

    const overallStats = React.useMemo(() => {
        const totalIncome = monthlyStats.reduce((sum, s) => sum + s.income, 0);
        const totalExpense = monthlyStats.reduce((sum, s) => sum + s.expense, 0);
        return {
            totalIncome,
            totalExpense,
            netBalance: totalIncome - totalExpense,
        };
    }, [monthlyStats]);

    // BOŞ DURUM (Empty State) - Mobil Onboarding Tarzı
    if (monthlyStats.length === 0) {
        return (
            <div className={cn("min-h-[100dvh] flex flex-col relative", themeClasses.PAGE_BG)}>
                <header className={cn("sticky top-0 z-40 w-full pt-[env(safe-area-inset-top)]", themeClasses.HEADER_BG)}>
                    <div className="flex items-center px-2 h-12 max-w-2xl mx-auto relative">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-[#007AFF] hover:bg-transparent">
                            <ChevronLeft className="w-7 h-7" />
                        </Button>
                    </div>
                </header>
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full pb-20">
                    <div className="w-24 h-24 bg-[#007AFF]/10 rounded-full flex items-center justify-center mb-6">
                        <BarChart2 className="h-10 w-10 text-[#007AFF]" />
                    </div>
                    <h2 className={cn("text-[22px] font-bold tracking-tight mb-2", themeClasses.TEXT_MAIN)}>Rapor Bulunamadı</h2>
                    <p className={cn("text-[15px] mb-8 px-4", themeClasses.TEXT_MUTED)}>Grafikleri görüntüleyebilmek için bütçenize gelir veya gider eklemelisiniz.</p>
                    <Link href="/budget" className="w-full">
                        <Button className="w-full rounded-[14px] h-[50px] bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-semibold text-[17px] active:scale-95 transition-transform">
                            Bütçeye Dön
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }
    
    return (
        <div className={cn("min-h-[100dvh] font-sans pb-[calc(24px+env(safe-area-inset-bottom))] relative", themeClasses.PAGE_BG, themeClasses.TEXT_MAIN)}>
            
            {/* MOBİL HEADER (APP BAR) */}
            <header className={cn("sticky top-0 z-40 w-full pt-[env(safe-area-inset-top)]", themeClasses.HEADER_BG)}>
                <div className="flex items-center justify-between px-2 h-12 md:h-14 max-w-2xl mx-auto relative">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-[#007AFF] dark:text-[#0A84FF] hover:bg-transparent active:opacity-50">
                        <ChevronLeft className="w-7 h-7" />
                    </Button>
                    
                    <h1 className="text-[17px] font-semibold tracking-tight absolute left-1/2 -translate-x-1/2">
                        Finansal Analiz
                    </h1>

                    {/* Dengeleyici boşluk */}
                    <div className="w-10" />
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-4 pt-4 relative z-10 space-y-5">
                
                {/* WIDGET GRID (2x2 Mobil Uyumlu) */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <IosStatCard 
                        icon={Wallet} 
                        title="Varlık" 
                        value={totalBalance.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} 
                        subtext="Toplam Bakiye"
                        colorClass="text-[#007AFF]"
                        bgClass="bg-[#007AFF]/10"
                    />
                    <IosStatCard 
                        icon={Banknote} 
                        title="Net" 
                        value={overallStats.netBalance.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} 
                        subtext="Fark"
                        colorClass={overallStats.netBalance >= 0 ? "text-[#34C759]" : "text-[#FF3B30]"}
                        bgClass={overallStats.netBalance >= 0 ? "bg-[#34C759]/10" : "bg-[#FF3B30]/10"}
                    />
                    <IosStatCard 
                        icon={TrendingUp} 
                        title="Gelir" 
                        value={overallStats.totalIncome.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} 
                        subtext="Son 6 Ay"
                        colorClass="text-[#34C759]"
                        bgClass="bg-[#34C759]/10"
                    />
                    <IosStatCard 
                        icon={TrendingDown} 
                        title="Gider" 
                        value={overallStats.totalExpense.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} 
                        subtext="Son 6 Ay"
                        colorClass="text-[#FF3B30]"
                        bgClass="bg-[#FF3B30]/10"
                    />
                </div>
                
                <div className="space-y-5">
                    {/* Bar Chart - Gelir Gider */}
                    <div className={cn("rounded-[24px] p-4 pt-5 flex flex-col h-[340px]", themeClasses.CARD_BG)}>
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <BarChart2 className="h-5 w-5 text-[#8E8E93]" />
                            <h3 className="font-semibold text-[15px] tracking-tight">Aylık Karşılaştırma</h3>
                        </div>
                        <div className="flex-grow w-full min-h-0">
                            <ChartContainer config={chartConfig} className="h-full w-full">
                                <BarChart data={monthlyStats} margin={{ top: 20, right: 0, left: -25, bottom: 0 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(142,142,147,0.15)" />
                                    <XAxis 
                                        dataKey="month" 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickMargin={10} 
                                        tick={{fill: '#8E8E93', fontSize: 11, fontWeight: 500}}
                                        tickFormatter={(value) => format(new Date(value + '-01'), 'MMM', {locale: tr})}
                                    />
                                    <YAxis 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickFormatter={(value) => `${(value / 1000)}k`} 
                                        tick={{fill: '#8E8E93', fontSize: 11, fontWeight: 500}}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent currency="TRY" className="bg-white dark:bg-[#2C2C2E] border-0 rounded-xl shadow-xl text-[#1C1C1E] dark:text-white" />} cursor={{fill: 'rgba(142,142,147,0.1)'}} />
                                    <Legend wrapperStyle={{paddingTop: '10px', fontSize: '12px', fontWeight: 500}} />
                                    
                                    <Bar dataKey="income" fill="var(--color-gelir)" name="Gelir" radius={[4, 4, 0, 0]} maxBarSize={35}>
                                        <LabelList 
                                            dataKey="income" 
                                            position="top" 
                                            formatter={(val: number) => val > 0 ? `${(val/1000).toFixed(1)}k` : ''} 
                                            className="fill-[#1C1C1E] dark:fill-white text-[9px] font-bold" 
                                        />
                                    </Bar>
                                    
                                    <Bar dataKey="expense" fill="var(--color-gider)" name="Gider" radius={[4, 4, 0, 0]} maxBarSize={35}>
                                        <LabelList 
                                            dataKey="expense" 
                                            position="top" 
                                            formatter={(val: number) => val > 0 ? `${(val/1000).toFixed(1)}k` : ''} 
                                            className="fill-[#1C1C1E] dark:fill-white text-[9px] font-bold" 
                                        />
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
                        </div>
                    </div>

                    {/* Area Chart - Trend */}
                    <div className={cn("rounded-[24px] p-4 pt-5 flex flex-col h-[340px]", themeClasses.CARD_BG)}>
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <PieChartIcon className="h-5 w-5 text-[#8E8E93]" />
                            <h3 className="font-semibold text-[15px] tracking-tight">Birikim Trendi</h3>
                        </div>
                        <div className="flex-grow w-full min-h-0">
                            <ChartContainer config={chartConfig} className="h-full w-full">
                                <AreaChart data={monthlyStats.map(s => ({...s, net: s.income - s.expense}))} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="fillBakiye" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-bakiye)" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="var(--color-bakiye)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(142,142,147,0.15)" />
                                    <XAxis 
                                        dataKey="month" 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickMargin={10} 
                                        tick={{fill: '#8E8E93', fontSize: 11, fontWeight: 500}}
                                        tickFormatter={(value) => format(new Date(value + '-01'), 'MMM', {locale: tr})}
                                    />
                                    <YAxis 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickFormatter={(value) => `${(value / 1000)}k`} 
                                        tick={{fill: '#8E8E93', fontSize: 11, fontWeight: 500}}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent currency="TRY" className="bg-white dark:bg-[#2C2C2E] border-0 rounded-xl shadow-xl text-[#1C1C1E] dark:text-white" />} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="net" 
                                        stroke="var(--color-bakiye)" 
                                        strokeWidth={3}
                                        fill="url(#fillBakiye)" 
                                        name="Net Bakiye" 
                                        activeDot={{ r: 6, strokeWidth: 0, fill: "var(--color-bakiye)" }}
                                    />
                                    <ReferenceLine y={0} stroke="#8E8E93" strokeDasharray="3 3" opacity={0.5} />
                                </AreaChart>
                            </ChartContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}