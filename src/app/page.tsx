
"use client";

import * as React from "react";
import { CheckSquare, Calendar, BookOpen, ShoppingCart, TrendingUp, Star, Bell, Settings, Sun } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FamilyMemberCard } from "@/components/family-member-card";
import { familyMembers, weeklyPoints, recentActivities } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';

const quickStats = [
  { title: 'Tamamlanan Görevler', value: '24', change: '+8', icon: CheckSquare, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { title: 'Yaklaşan Etkinlikler', value: '7', change: '+2', icon: Calendar, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { title: 'Okunan Kitaplar', value: '12', change: '+3', icon: BookOpen, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { title: 'Alışveriş Tasarrufu', value: '₺245', change: '+₺67', icon: ShoppingCart, color: 'text-red-500', bgColor: 'bg-red-500/10' },
];

const familyXpChartConfig = {
  xp: { label: "XP", },
  Ahmet: { label: "Ahmet", color: "hsl(var(--chart-1))" },
  Zeynep: { label: "Zeynep", color: "hsl(var(--chart-2))" },
  Elif: { label: "Elif", color: "hsl(var(--chart-3))" },
  Murat: { label: "Murat", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig

const weeklyProgressChartConfig = {
  points: {
    label: "Puan",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export default function Home() {
  const [currentTime, setCurrentTime] = React.useState(new Date());

   React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'Tünaydın';
    return 'İyi Akşamlar';
  };
  
  const familyXpData = familyMembers.map(member => ({ name: member.name, xp: member.xp }));

  return (
    <div className="space-y-8">
      <header className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-start justify-between">
            <div>
                <h1 className="text-3xl font-bold">{getGreeting()}, Aile! 👋</h1>
                <p className="mt-1 opacity-90">
                    {currentTime.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                 <div className="mt-2 flex items-center gap-2 text-sm bg-white/20 px-3 py-1 rounded-full w-fit">
                    <Sun className="h-4 w-4 text-yellow-300" />
                    <span>24°C, Güneşli</span>
                    <span className="opacity-70">İstanbul</span>
                </div>
            </div>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
                 <button className="relative rounded-full bg-white/20 p-2 transition-colors hover:bg-white/30">
                    <Bell className="h-6 w-6" />
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 bg-red-500 text-white border-2 border-purple-500">3</Badge>
                </button>
                 <button className="rounded-full bg-white/20 p-2 transition-colors hover:bg-white/30">
                    <Settings className="h-6 w-6" />
                </button>
            </div>
        </div>
      </header>
      
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">📊 Günlük Özet</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {quickStats.map((stat, index) => (
              <Card key={index} className={`overflow-hidden border-0 shadow-lg transition-transform hover:scale-105 ${stat.bgColor}`}>
                <CardContent className="p-4">
                   <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-white to-gray-100 shadow-inner`}>
                      <stat.icon size={24} className={stat.color} />
                   </div>
                   <div className="text-center">
                     <p className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</p>
                     <p className="text-sm font-semibold text-foreground">{stat.title}</p>
                     <div className={`mt-2 flex items-center justify-center text-xs font-medium ${stat.color}`}>
                        <TrendingUp size={14} className="mr-1"/>
                        <span>{stat.change}</span>
                     </div>
                   </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">👨‍👩‍👧‍👦 Aile Üyeleri</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {familyMembers.map((member) => (
            <FamilyMemberCard key={member.id} member={member} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg">
           <CardHeader>
             <CardTitle>Haftalık İlerleme</CardTitle>
             <CardDescription>Ailenin bu hafta kazandığı toplam XP puanları.</CardDescription>
           </CardHeader>
           <CardContent>
             <ChartContainer config={weeklyProgressChartConfig} className="h-[250px] w-full">
                <AreaChart
                  accessibilityLayer
                  data={weeklyPoints}
                  margin={{
                    left: -20,
                    right: 10,
                    top: 10,
                    bottom: 0
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                   <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                  <Tooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <defs>
                    <linearGradient id="fillPoints" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-points)"
                        stopOpacity={0.8}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-points)"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="points"
                    type="natural"
                    fill="url(#fillPoints)"
                    stroke="var(--color-points)"
                    stackId="a"
                  />
                </AreaChart>
             </ChartContainer>
           </CardContent>
        </Card>
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Aile XP Karşılaştırması</CardTitle>
                <CardDescription>Aile üyelerinin toplam tecrübe puanları.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ChartContainer config={familyXpChartConfig} className="h-[250px] w-full">
                    <BarChart data={familyXpData} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <CartesianGrid horizontal={false} />
                        <YAxis
                            dataKey="name"
                            type="category"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            width={60}
                        />
                        <XAxis dataKey="xp" type="number" hide />
                        <Tooltip cursor={false} content={<ChartTooltipContent />} />
                        <Bar dataKey="xp" radius={8}>
                           {familyXpData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={familyXpChartConfig[entry.name as keyof typeof familyXpChartConfig]?.color} />
                           ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
      </section>
    </div>
  );
}

    
