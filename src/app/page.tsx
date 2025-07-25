
"use client";

import * as React from "react";
import { CheckSquare, Calendar, BookOpen, ShoppingCart, TrendingUp, Star, Bell, Settings, UserPlus, Edit, UtensilsCrossed } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FamilyMemberCard } from "@/components/family-member-card";
import { weeklyPoints, recentActivities, FamilyMember, ShoppingList, MealPlan, CalendarEvent, Recipe } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NewFamilyMemberForm } from "@/components/new-family-member-form";
import { EditFamilyMemberForm } from "@/components/edit-family-member-form";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { onShoppingListsUpdate, onMealPlanUpdate, onCalendarEventsUpdate } from "@/lib/dataService";
import { format, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { PageHeader } from "@/components/page-header";

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
  const { user, familyMembers, loading } = useAuth();
  const [isMemberFormOpen, setIsMemberFormOpen] = React.useState(false);
  const [editingMember, setEditingMember] = React.useState<FamilyMember | null>(null);
  
  const [shoppingLists, setShoppingLists] = React.useState<ShoppingList[]>([]);
  const [mealPlan, setMealPlan] = React.useState<MealPlan>({});
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>([]);

  React.useEffect(() => {
    const unsubShopping = onShoppingListsUpdate(setShoppingLists);
    const unsubMeal = onMealPlanUpdate(setMealPlan);
    const unsubCalendar = onCalendarEventsUpdate(setCalendarEvents);

    return () => {
      unsubShopping();
      unsubMeal();
      unsubCalendar();
    };
  }, []);

  const familyXpData = familyMembers.map(member => ({ name: member.name, xp: member.xp }));
  const totalShoppingItems = shoppingLists.reduce((acc, list) => acc + (list.items?.filter(item => !item.isBought).length || 0), 0);
  const todaysMeal = mealPlan[format(new Date(), 'yyyy-MM-dd')]?.['Akşam Yemeği'] as Recipe | undefined;

  const upcomingEvents = React.useMemo(() => {
    const today = new Date();
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    return calendarEvents.filter(event => {
       const eventDate = new Date(event.startDate);
       return isWithinInterval(eventDate, { start, end });
    }).length;
  }, [calendarEvents]);


  if (loading) {
    return (
        <div className="space-y-8">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-24 w-full" />
             <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );
  }
  
  const handleEditMember = (member: FamilyMember) => {
      setEditingMember(member);
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Özgürdere Ailesi">
         <div className="flex items-center gap-2">
                 <button className="relative rounded-full bg-muted p-2 transition-colors hover:bg-muted/80">
                    <Bell className="h-5 w-5" />
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0 bg-red-500 text-white border-2 border-background">3</Badge>
                </button>
                 <button className="rounded-full bg-muted p-2 transition-colors hover:bg-muted/80">
                    <Settings className="h-5 w-5" />
                </button>
            </div>
      </PageHeader>
      
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/shopping" className="block">
                <Card className="hover:bg-accent/50 hover:border-primary/50 transition-colors">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3"><ShoppingCart className="text-primary"/> Alışveriş Listesi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{totalShoppingItems} ürün</p>
                        <p className="text-sm text-muted-foreground">alınması gerekiyor.</p>
                    </CardContent>
                </Card>
            </Link>
            <Link href="/yemek" className="block">
                <Card className="hover:bg-accent/50 hover:border-primary/50 transition-colors">
                     <CardHeader>
                        <CardTitle className="flex items-center gap-3"><UtensilsCrossed className="text-primary"/> Günün Menüsü</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold truncate">{todaysMeal?.title || 'Belirlenmedi'}</p>
                        <p className="text-sm text-muted-foreground">akşam yemeği için planlandı.</p>
                    </CardContent>
                </Card>
            </Link>
            <Link href="/calendar" className="block">
                <Card className="hover:bg-accent/50 hover:border-primary/50 transition-colors">
                     <CardHeader>
                        <CardTitle className="flex items-center gap-3"><Calendar className="text-primary"/> Yaklaşan Etkinlikler</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <p className="text-2xl font-bold">{upcomingEvents} etkinlik</p>
                       <p className="text-sm text-muted-foreground">bu ay içerisinde mevcut.</p>
                    </CardContent>
                </Card>
            </Link>
        </div>


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
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">👨‍👩‍👧‍👦 Aile Üyeleri</h2>
            <Dialog open={isMemberFormOpen} onOpenChange={setIsMemberFormOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Üye Ekle
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                    <DialogTitle>Yeni Aile Üyesi Ekle</DialogTitle>
                    <DialogDescription>
                        Ailenize yeni bir üye (çocuk veya başka bir veli) ekleyin.
                    </DialogDescription>
                </DialogHeader>
                <NewFamilyMemberForm onMemberAdded={() => setIsMemberFormOpen(false)} />
              </DialogContent>
            </Dialog>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {familyMembers.map((member) => (
            <FamilyMemberCard key={member.id} member={member} onEdit={() => handleEditMember(member)} />
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

       <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Profili Düzenle</DialogTitle>
                    <DialogDescription>
                        {editingMember?.name} adlı üyenin bilgilerini güncelleyin.
                    </DialogDescription>
                </DialogHeader>
                {editingMember && (
                    <EditFamilyMemberForm 
                        member={editingMember}
                        onMemberUpdated={() => setEditingMember(null)}
                    />
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}

    