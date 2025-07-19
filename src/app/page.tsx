"use client";

import * as React from "react";
import Image from "next/image";
import { CheckSquare, Calendar, BookOpen, ShoppingCart, TrendingUp, Star, Bell, Settings, Sun } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FamilyMemberCard } from "@/components/family-member-card";
import { familyMembers, recentActivities } from "@/lib/data";
import { Badge } from "@/components/ui/badge";

const quickStats = [
  { title: 'Tamamlanan Görevler', value: '24', change: '+8', icon: CheckSquare, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  { title: 'Yaklaşan Etkinlikler', value: '7', change: '+2', icon: Calendar, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  { title: 'Okunan Kitaplar', value: '12', change: '+3', icon: BookOpen, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
  { title: 'Alışveriş Tasarrufu', value: '₺245', change: '+₺67', icon: ShoppingCart, color: 'text-red-500', bgColor: 'bg-red-500/10' },
];


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

  return (
    <div className="space-y-8">
      <header className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
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
            <div className="flex items-center gap-2">
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

      <section>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>⚡ Son Aktiviteler</CardTitle>
            <CardDescription>Ailede olup bitenler.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
                   <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${activity.color}`}>
                      <activity.icon className="h-5 w-5 text-white" />
                   </div>
                   <div className="flex-grow">
                     <p className="font-semibold text-foreground">{activity.title}</p>
                     <p className="text-sm text-muted-foreground">{activity.user} • {activity.time}</p>
                   </div>
                   <div className="flex items-center gap-1 rounded-full bg-yellow-400/20 px-2 py-1 text-xs font-bold text-yellow-600">
                     <Star className="h-3 w-3 fill-current" />
                     <span>+{activity.points}</span>
                   </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
