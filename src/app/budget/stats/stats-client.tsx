"use client";

import * as React from "react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie, ReferenceLine } from "recharts";
import { onTransactionStatsUpdate, onAccountsUpdate } from "@/lib/dataService";
import type { Account, Transaction } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Banknote, TrendingDown, TrendingUp, Wallet, ArrowLeft, BarChart2, PieChart as PieChartIcon, ArrowRight } from "lucide-react";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { tr } from "date-fns/locale";
import { format } from "date-fns";

// --- DESIGN SYSTEM: Glassmorphism Colors ---
const glassColors = {
    CARD_BG: "bg-white/5 backdrop-blur-md border border-white/10 shadow-lg",
    CARD_HOVER: "hover:bg-white/10 hover:border-white/20 hover:shadow-xl transition-all duration-300",
    TEXT_MAIN: "text-slate-100",
    TEXT_MUTED: "text-slate-400",
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    ICON_BOX: "bg-gradient-to-br from-indigo-500 to-purple-500 p-2 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
};

const chartConfig = {
  gelir: { label: "Gelir", color: "#10b981" }, // Emerald 500
  gider: { label: "Gider", color: "#f43f5e" }, // Rose 500
  bakiye: { label: "Bakiye", color: "#6366f1" }, // Indigo 500
} satisfies ChartConfig;

// --- Helper Components ---
const GlassStatCard = ({ icon: Icon, title, value, subtext, colorClass }: { icon: any, title: string, value: string, subtext: string, colorClass: string }) => (
    <div className={cn("flex flex-col p-6 rounded-[2rem] relative overflow-hidden group", glassColors.CARD_BG, glassColors.CARD_HOVER)}>
        <div className={cn("absolute top-0 right-0 p-4 opacity-10 transition-transform group-hover:scale-110 duration-500", colorClass)}>
            <Icon className="w-24 h-24" />
        </div>
        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
                <div className={cn("p-3 rounded-2xl shadow-lg text-white bg-gradient-to-br", colorClass === 'text-emerald-400' ? "from-emerald-500 to-teal-500" : colorClass === 'text-rose-400' ? "from-rose-500 to-pink-500" : "from-indigo-500 to-blue-500")}>
                    <Icon className="h-6 w-6" />
                </div>
                <h3 className={cn("font-bold text-lg", glassColors.TEXT_MAIN)}>{title}</h3>
            </div>
            <div>
                <p className={cn("text-3xl font-black tracking-tight", colorClass)}>{value}</p>
                <p className={cn("text-xs font-medium mt-1", glassColors.TEXT_MUTED)}>{subtext}</p>
            </div>
        </div>
    </div>
);

export function BudgetStatsClient() {
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

    if (monthlyStats.length === 0) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
                 {/* Ambient Background */}
                <div className="fixed inset-0 z-0 pointer-events-none">
                    <div className="absolute top-[20%] left-[30%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[120px]" />
                </div>

                <div className={cn("p-10 rounded-[2.5rem] max-w-md w-full relative z-10 flex flex-col items-center", glassColors.CARD_BG)}>
                    <div className="h-24 w-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-inner">
                        <BarChart2 className="h-10 w-10 text-slate-400" />
                    </div>
                    <h2 className={cn("text-3xl font-black mb-3", glassColors.TEXT_MAIN)}>Henüz Veri Yok</h2>
                    <p className={cn("mb-8 leading-relaxed", glassColors.TEXT_MUTED)}>Grafikleri oluşturabilmek için önce birkaç gelir veya gider eklemelisiniz.</p>
                    <Link href="/budget" className="w-full">
                        <Button className="w-full rounded-2xl h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg shadow-lg shadow-indigo-900/50 hover:-translate-y-1 transition-all">
                            Bütçeye Dön <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-slate-950 font-sans text-slate-100 pb-24 relative overflow-hidden">
             {/* Ambient Background */}
             <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/30 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-900/20 rounded-full blur-[100px]" />
            </div>

            {/* HEADER (Dynamic Glass) */}
            <div className={cn("sticky top-0 z-40 py-4 sm:px-6 transition-all duration-300", glassColors.HEADER_BG)}>
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Link href="/budget">
                            <Button variant="ghost" size="icon" className={cn("rounded-full mr-1 text-slate-400 hover:text-white hover:bg-white/10")}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div className={glassColors.ICON_BOX}>
                            <PieChartIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className={cn("text-xs font-semibold uppercase tracking-wider", glassColors.TEXT_MUTED)}>Raporlar</p>
                            <h1 className={cn("text-lg font-bold leading-none", glassColors.TEXT_MAIN)}>Finansal Analiz</h1>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto md:p-6 p-4 relative z-10 space-y-8">
                
                {/* Özet Kartları */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <GlassStatCard 
                        icon={Wallet} 
                        title="Toplam Bakiye" 
                        value={totalBalance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })} 
                        subtext="Tüm hesaplardaki varlık"
                        colorClass="text-indigo-400"
                    />
                    <GlassStatCard 
                        icon={TrendingUp} 
                        title="Toplam Gelir" 
                        value={overallStats.totalIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })} 
                        subtext="Son 6 aydaki kazanç"
                        colorClass="text-emerald-400"
                    />
                    <GlassStatCard 
                        icon={TrendingDown} 
                        title="Toplam Gider" 
                        value={overallStats.totalExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })} 
                        subtext="Son 6 aydaki harcama"
                        colorClass="text-rose-400"
                    />
                    <GlassStatCard 
                        icon={Banknote} 
                        title="Net Durum" 
                        value={overallStats.netBalance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })} 
                        subtext="Gelir - Gider Farkı"
                        colorClass={overallStats.netBalance >= 0 ? "text-blue-400" : "text-rose-400"}
                    />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bar Chart */}
                    <div className={cn("rounded-[2rem] p-6 flex flex-col h-[450px]", glassColors.CARD_BG)}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 border border-indigo-500/30">
                                <BarChart2 className="h-5 w-5"/>
                            </div>
                            <div>
                                <h3 className={cn("font-bold text-lg", glassColors.TEXT_MAIN)}>Aylık Karşılaştırma</h3>
                                <p className={cn("text-xs", glassColors.TEXT_MUTED)}>Gelir ve gider dağılımı</p>
                            </div>
                        </div>
                        <div className="flex-grow w-full min-h-0">
                            <ChartContainer config={chartConfig} className="h-full w-full">
                                <BarChart data={monthlyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis 
                                        dataKey="month" 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickMargin={10} 
                                        tick={{fill: '#94a3b8', fontSize: 12}}
                                        tickFormatter={(value) => format(new Date(value + '-01'), 'MMM', {locale: tr})}
                                    />
                                    <YAxis 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickFormatter={(value) => `${(value / 1000)}k`} 
                                        tick={{fill: '#94a3b8', fontSize: 12}}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent currency="TRY" className="bg-slate-900 border-white/10 text-slate-100" />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                                    <Legend wrapperStyle={{paddingTop: '20px'}} />
                                    <Bar dataKey="income" fill="var(--color-gelir)" name="Gelir" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    <Bar dataKey="expense" fill="var(--color-gider)" name="Gider" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                </BarChart>
                            </ChartContainer>
                        </div>
                    </div>

                    {/* Area Chart */}
                    <div className={cn("rounded-[2rem] p-6 flex flex-col h-[450px]", glassColors.CARD_BG)}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 border border-purple-500/30">
                                <PieChartIcon className="h-5 w-5"/>
                            </div>
                            <div>
                                <h3 className={cn("font-bold text-lg", glassColors.TEXT_MAIN)}>Birikim Trendi</h3>
                                <p className={cn("text-xs", glassColors.TEXT_MUTED)}>Aylık net bakiye değişimi</p>
                            </div>
                        </div>
                        <div className="flex-grow w-full min-h-0">
                            <ChartContainer config={chartConfig} className="h-full w-full">
                                <AreaChart data={monthlyStats.map(s => ({...s, net: s.income - s.expense}))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="fillBakiye" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-bakiye)" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="var(--color-bakiye)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis 
                                        dataKey="month" 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickMargin={10} 
                                        tick={{fill: '#94a3b8', fontSize: 12}}
                                        tickFormatter={(value) => format(new Date(value + '-01'), 'MMM', {locale: tr})}
                                    />
                                    <YAxis 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickFormatter={(value) => `${(value / 1000)}k`} 
                                        tick={{fill: '#94a3b8', fontSize: 12}}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent currency="TRY" className="bg-slate-900 border-white/10 text-slate-100" />} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="net" 
                                        stroke="var(--color-bakiye)" 
                                        strokeWidth={3}
                                        fill="url(#fillBakiye)" 
                                        name="Net Bakiye" 
                                        activeDot={{ r: 6, strokeWidth: 0, fill: "var(--color-bakiye)" }}
                                    />
                                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                                </AreaChart>
                            </ChartContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}