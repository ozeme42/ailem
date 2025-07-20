"use client";

import * as React from "react";
import { addDays, format, startOfWeek } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, MapPin, PlusCircle, Users, AlertCircle, Utensils, Soup } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarEvent, MealPlan } from "@/lib/data";
import { onCalendarEventsUpdate, onMealPlanUpdate } from "@/lib/dataService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const categoryColors: { [key: string]: { bg: string, border: string, text: string, darkBg: string } } = {
  Okul:       { bg: 'bg-blue-100',   border: 'border-blue-500',   text: 'text-blue-800',   darkBg: 'dark:bg-blue-900/50' },
  Spor:       { bg: 'bg-green-100',  border: 'border-green-500',  text: 'text-green-800',  darkBg: 'dark:bg-green-900/50' },
  Aile:       { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-800', darkBg: 'dark:bg-purple-900/50' },
  "Doğum Günü": { bg: 'bg-pink-100',   border: 'border-pink-500',   text: 'text-pink-800',   darkBg: 'dark:bg-pink-900/50' },
  Diğer:      { bg: 'bg-gray-100',   border: 'border-gray-500',   text: 'text-gray-800',   darkBg: 'dark:bg-gray-900/50' },
};

const categoryBadgeColors: { [key: string]: string } = {
  Okul: "bg-blue-500",
  Spor: "bg-green-500",
  Aile: "bg-purple-500",
  "Doğum Günü": "bg-pink-500",
  Diğer: "bg-gray-500",
};

const priorityBadgeColors: { [key: string]: string } = {
  Yüksek: "border-red-500 text-red-500",
  Orta: "border-yellow-500 text-yellow-500",
  Düşük: "border-green-500 text-green-500",
}


export default function CalendarPage() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>([]);
  const [mealPlan, setMealPlan] = React.useState<MealPlan>({});
  const weekStartDate = startOfWeek(currentDate, { weekStartsOn: 1 });

  React.useEffect(() => {
    const unsubscribeEvents = onCalendarEventsUpdate(setCalendarEvents);
    const unsubscribeMeals = onMealPlanUpdate(setMealPlan);
    return () => {
        unsubscribeEvents();
        unsubscribeMeals();
    };
  }, []);

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStartDate, i));

  const upcomingEvents = calendarEvents
    .filter(event => new Date(event.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <>
      <PageHeader title="Aile Takvimi 🗓️">
        <Button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:shadow-xl transition-shadow">
          <PlusCircle className="mr-2 h-4 w-4" />
          Yeni Etkinlik Ekle
        </Button>
      </PageHeader>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: tr })}
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addDays(d, -7))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Bugün</Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addDays(d, 7))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 border-t border-l">
            {weekDays.map(day => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const dayEvents = calendarEvents.filter(event => format(new Date(event.date), 'yyyy-MM-dd') === dayKey);
              const dayMeals = mealPlan[dayKey] || {};

              return (
              <div key={day.toString()} className="h-64 border-b border-r p-2 flex flex-col">
                <span className={`font-semibold ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'text-primary' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </span>
                <span className="text-xs text-muted-foreground capitalize">{format(day, 'EEE', { locale: tr })}</span>
                <div className="mt-1 space-y-1 overflow-y-auto">
                   {dayEvents.map(event => {
                       return (
                       <Dialog key={event.id}>
                        <DialogTrigger asChild>
                           <div className={`p-1.5 rounded-md cursor-pointer hover:opacity-80 transition-opacity bg-primary/10 text-primary-foreground`}>
                            <p className="text-xs font-semibold truncate">{event.title}</p>
                          </div>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <div className="flex justify-between items-start">
                                    <Badge className={`w-fit ${categoryBadgeColors[event.category]}`}>{event.category}</Badge>
                                    <Badge variant="outline" className={priorityBadgeColors[event.priority]}>
                                      <AlertCircle className="w-3 h-3 mr-1" />
                                      {event.priority}
                                    </Badge>
                                </div>
                                <DialogTitle className="text-2xl pt-2">{event.title}</DialogTitle>
                                <DialogDescription>
                                    {format(new Date(event.date), 'd MMMM yyyy, EEEE', { locale: tr })}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground"/> {event.startTime} {event.endTime && `- ${event.endTime}`}</p>
                                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground"/> {event.location}</p>
                                <p>{event.description}</p>
                                <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2"><Users className="w-4 h-4 text-muted-foreground" /> Katılımcılar</h4>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src="https://placehold.co/40x40.png" />
                                            <AvatarFallback>AH</AvatarFallback>
                                        </Avatar>
                                         <Avatar className="h-8 w-8">
                                            <AvatarImage src="https://placehold.co/40x40.png" />
                                            <AvatarFallback>ZE</AvatarFallback>
                                        </Avatar>
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src="https://placehold.co/40x40.png" />
                                            <AvatarFallback>EL</AvatarFallback>
                                        </Avatar>
                                    </div>
                                </div>
                                <Separator />
                                <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2"><Utensils className="w-4 h-4 text-muted-foreground" /> Günün Menüsü</h4>
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        <p><span className="font-medium text-foreground">Kahvaltı:</span> {dayMeals['Kahvaltı']?.title || 'Belirtilmemiş'}</p>
                                        <p><span className="font-medium text-foreground">Akşam Yemeği:</span> {dayMeals['Akşam Yemeği']?.title || 'Belirtilmemiş'}</p>
                                    </div>
                                </div>
                            </div>
                             <DialogFooter>
                                <Button variant="outline">Düzenle</Button>
                                <Button>Katıl</Button>
                            </DialogFooter>
                        </DialogContent>
                       </Dialog>
                    )})}

                    {Object.entries(dayMeals).map(([mealType, recipe]) => recipe && (
                        <div key={mealType} className="p-1.5 rounded-md bg-amber-500/10">
                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 truncate flex items-center gap-1">
                                <Soup className="w-3 h-3"/> {recipe.title}
                            </p>
                        </div>
                    ))}
                </div>
              </div>
            )})}
          </div>
        </CardContent>
      </Card>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Yaklaşan Etkinlikler</h2>
        <Carousel opts={{ align: "start" }} className="w-full">
          <CarouselContent>
            {upcomingEvents.length > 0 ? upcomingEvents.map((event) => {
              const colors = categoryColors[event.category] || categoryColors.Diğer;
              return (
              <CarouselItem key={event.id} className="md:basis-1/2 lg:basis-1/3">
                <div className="p-1">
                  <Card className={`border-l-4 shadow-sm hover:shadow-lg transition-shadow ${colors.border}`}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>{event.title}</CardTitle>
                            <CardDescription>{format(new Date(event.date), 'd MMMM, EEEE', { locale: tr })} - {event.startTime}</CardDescription>
                        </div>
                        <Badge variant="outline" className={priorityBadgeColors[event.priority]}>{event.priority}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                       <Badge variant="secondary">{event.category}</Badge>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            )}) : <p className="text-muted-foreground pl-4">Yaklaşan etkinlik bulunmuyor.</p>}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </section>
    </>
  );
}
