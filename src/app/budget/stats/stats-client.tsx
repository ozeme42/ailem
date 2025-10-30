
"use client";

import * as React from "react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { onTransactionStatsUpdate, onAccountsUpdate } from "@/lib/dataService";
import type { Account, Transaction } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Banknote, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { ChartConfig, ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

const chartConfig = {
  gelir: { label: "Gelir", color: "hsl(var(--chart-2))" },
  gider: { label: "Gider", color: "hsl(var(--chart-5))" },
  bakiye: { label: "Bakiye", color: "hsl(var(--chart-1))" },
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
            <div className="space-y-6">
                <PageHeader title="Bütçe Analizi 📈" />
                <Card className="text-center p-8 text-muted-foreground">
                    Grafikleri oluşturacak yeterli veri bulunmuyor.
                </Card>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <PageHeader title="Bütçe Analizi 📈" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-primary flex items-center justify-between">Toplam Bakiye <Wallet /></CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{totalBalance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                        <p className="text-xs text-muted-foreground">Tüm hesaplarınızdaki toplam miktar</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-green-600 flex items-center justify-between">Toplam Gelir <TrendingUp /></CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{overallStats.totalIncome.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                        <p className="text-xs text-muted-foreground">Son 6 aydaki toplam gelir</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-red-600 flex items-center justify-between">Toplam Gider <TrendingDown /></CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{overallStats.totalExpense.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                         <p className="text-xs text-muted-foreground">Son 6 aydaki toplam gider</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">Net Bakiye <Banknote /></CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{overallStats.netBalance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                         <p className="text-xs text-muted-foreground">Son 6 aydaki net kazanç</p>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Aylık Gelir & Gider Karşılaştırması</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-80 w-full">
                        <BarChart data={monthlyStats}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis tickFormatter={(value) => `${(value / 1000)}k`} />
                            <Tooltip content={<ChartTooltipContent currency="TRY" />} />
                            <Legend />
                            <Bar dataKey="income" fill="var(--color-gelir)" name="Gelir" radius={4} />
                            <Bar dataKey="expense" fill="var(--color-gider)" name="Gider" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Aylık Birikim Trendi</CardTitle>
                    <CardDescription>Her ay sonunda gelir ve giderler arasındaki net fark.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-80 w-full">
                        <AreaChart data={monthlyStats.map(s => ({...s, net: s.income - s.expense}))}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis tickFormatter={(value) => `${(value / 1000)}k`} />
                            <Tooltip content={<ChartTooltipContent currency="TRY" />} />
                            <defs>
                                <linearGradient id="fillBakiye" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-bakiye)" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="var(--color-bakiye)" stopOpacity={0.1}/>
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="net" stroke="var(--color-bakiye)" fill="url(#fillBakiye)" name