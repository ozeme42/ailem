"use client";

import * as React from "react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie, ReferenceLine } from "recharts";
import { onTransactionStatsUpdate, onAccountsUpdate } from "@/lib/dataService";
import type { Account, Transaction } from "@/lib/data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Banknote, TrendingDown, TrendingUp, Wallet, ArrowLeft, BarChart2, PieChart as PieChartIcon } from "lucide-react";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { tr } from "date-fns/locale";
import { format } from "date-fns";

const chartConfig = {
  gelir: { label: "Gelir", color: "#10b981" }, // Emerald 500
  gider: { label: "Gider", color: "#f43f5e" }, // Rose 500
  bakiye: { label: "Bakiye", color: "#6366f1" }, // Indigo 500
} satisfies ChartConfig;

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
            <div className="min-h-screen bg-[#F3F6F8] flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-white p-8 rounded-[2rem] shadow-xl max-w-md w-full border border-slate-100">
                    <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BarChart2 className="h-10 w-10 text-slate-400" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Henüz Veri Yok</h2>
                    <p className="text-slate-500 mb-6">Grafikleri oluşturabilmek için önce birkaç gelir veya gider eklemelisiniz.</p>
                    <Link href="/budget">
                        <Button className="rounded-xl px-8 h-12 bg-slate-900 text-white font-bold hover:bg-slate-800 shadow-lg">Geri Dön</Button>
                    </Link>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-[#F3F6F8] font-sans pb-24">
             {/* Dekoratif Arkaplan */}
             <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-100/60 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-purple-100/50 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-7xl mx-auto md:p-6 p-4 relative z-10 space-y-8">
                
                {/* Header */}
                <div className="pt-8 flex items-center justify-between">
                    <div>
                        <Link href="/budget">
                            <Button variant="ghost" size="sm" className="pl-0 hover:bg-transparent text-slate-500 hover:text-slate-800 mb-2">
                                <ArrowLeft className="h-4 w-4 mr-1" /> Bütçeye Dön
                            </Button>
                        </Link>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 flex items-center gap-3">
                            Finansal <span className="text-purple-600 text-lg md:text-xl font-bold bg-purple-50 px-3 py-1 rounded-full border border-purple-100">Analiz</span>
                        </h1>
                        <p className="text-slate-500 font-medium ml-1">Gelir ve giderlerinin detaylı raporu.</p>
                    </div>
                </div>

                {/* Özet Kartları */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-md hover:shadow-md transition-all group rounded-[1.5rem]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600 group-hover:scale-110 transition-transform"><Wallet className="h-4 w-4" /></div>
                                Toplam Bakiye
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-black text-slate-800">{totalBalance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                            <p className="text-xs text-slate-400 font-medium mt-1">Tüm hesaplardaki varlık</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-md hover:shadow-md transition-all group rounded-[1.5rem]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                 <div className="p-1.5 bg-emerald-100 rounded-lg text-emerald-600 group-hover:scale-110 transition-transform"><TrendingUp className="h-4 w-4" /></div>
                                Toplam Gelir
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-black text-emerald-600">{overallStats.totalIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                            <p className="text-xs text-emerald-600/60 font-medium mt-1">Son 6 aydaki kazanç</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-md hover:shadow-md transition-all group rounded-[1.5rem]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                <div className="p-1.5 bg-rose-100 rounded-lg text-rose-600 group-hover:scale-110 transition-transform"><TrendingDown className="h-4 w-4" /></div>
                                Toplam Gider
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-2xl font-black text-rose-600">{overallStats.totalExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                            <p className="text-xs text-rose-600/60 font-medium mt-1">Son 6 aydaki harcama</p>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-md hover:shadow-md transition-all group rounded-[1.5rem]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600 group-hover:scale-110 transition-transform"><Banknote className="h-4 w-4" /></div>
                                Net Durum
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className={cn("text-2xl font-black", overallStats.netBalance >= 0 ? "text-blue-600" : "text-rose-600")}>
                                {overallStats.netBalance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs text-slate-400 font-medium mt-1">Gelir - Gider Farkı</p>
                        </CardContent>
                    </Card>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bar Chart */}
                    <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-xl rounded-[2rem]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-700">
                                <BarChart2 className="h-5 w-5 text-indigo-500"/> Aylık Karşılaştırma
                            </CardTitle>
                            <CardDescription>Aylara göre gelir ve gider dağılımı</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-80 w-full">
                                <BarChart data={monthlyStats} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis 
                                        dataKey="month" 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickMargin={10} 
                                        tick={{fill: '#64748b', fontSize: 12}}
                                        tickFormatter={(value) => format(new Date(value + '-01'), 'MMM', {locale: tr})}
                                    />
                                    <YAxis 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickFormatter={(value) => `${(value / 1000)}k`} 
                                        tick={{fill: '#64748b', fontSize: 12}}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent currency="TRY" />} cursor={{fill: '#f1f5f9'}} />
                                    <Legend wrapperStyle={{paddingTop: '20px'}} />
                                    <Bar dataKey="income" fill="var(--color-gelir)" name="Gelir" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                    <Bar dataKey="expense" fill="var(--color-gider)" name="Gider" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>

                    {/* Area Chart */}
                    <Card className="border-0 shadow-sm bg-white/80 backdrop-blur-xl rounded-[2rem]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-700">
                                <PieChartIcon className="h-5 w-5 text-purple-500"/> Birikim Trendi
                            </CardTitle>
                            <CardDescription>Aylık net bakiye değişimi</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={chartConfig} className="h-80 w-full">
                                <AreaChart data={monthlyStats.map(s => ({...s, net: s.income - s.expense}))} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="fillBakiye" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-bakiye)" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="var(--color-bakiye)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis 
                                        dataKey="month" 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickMargin={10} 
                                        tick={{fill: '#64748b', fontSize: 12}}
                                        tickFormatter={(value) => format(new Date(value + '-01'), 'MMM', {locale: tr})}
                                    />
                                    <YAxis 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tickFormatter={(value) => `${(value / 1000)}k`} 
                                        tick={{fill: '#64748b', fontSize: 12}}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent currency="TRY" />} />
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
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}