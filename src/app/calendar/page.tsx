
"use client";

import * as React from "react";
import { addDays, format, startOfWeek, isSameMonth, isToday, isWithinInterval, isAfter, isPast, parseISO, compareAsc, compareDesc, isFuture, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, PlusCircle, AlertCircle, Calendar as CalendarIcon, Repeat, Repeat1, ListChecks, History, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarEvent } from "@/lib/data";
import { onCalendarEventsUpdate, deletePastCalendarEvents } from "@/lib/dataService";
import { NewEventForm } from "@/components/new-event-form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const eventColors = [
    { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
    { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
    { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300" },
    { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
    { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
    { bg: "bg-indigo-100", text: "text-indigo-800", border: "border-indigo-300" },
    { bg: "bg-pink-100", text: "text-pink-800", border: "border-pink-300" },
];


export default function CalendarPage() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>([]);
  const [isNewEventDialogOpen, setIsNewEventDialogOpen] = React.useState(false);
  const { toast } = useToast();
  const [viewMode, setViewMode] = React.useState<'month' | 'week'>('month');

  React.useEffect(() => {
    const unsubscribeEvents = onCalendarEventsUpdate(setCalendarEvents);
    return () => {
        unsubscribeEvents();
    };
  }, []);
  
  const { upcomingEvents, pastEvents } = React.useMemo(() => {
    const eventsWithParsedDates = calendarEvents.map(e => ({
      ...e,
      parsedDate: parseISO(e.startDate)
    }));

    const upcoming = eventsWithParsedDates
      .filter(e => isFuture(e.parsedDate) || isToday(e.parsedDate))
      .sort((a, b) => compareAsc(a.parsedDate, b.parsedDate));

    const past = eventsWithParsedDates
      .filter(e => isPast(e.parsedDate) && !isToday(e.parsedDate))
      .sort((a, b) => compareDesc(a.parsedDate, b.parsedDate));
      
    return { upcomingEvents: upcoming, pastEvents: past };
  }, [calendarEvents]);


 const displayedDays = React.useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
      const days = [];
      let day = startDate;
      // Ensure we render 6 weeks to keep the layout consistent
      while (days.length < 42) {
          days.push(day);
          day = addDays(day, 1);
      }
      return days;
    } else { // week view
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const days = [];
      for (let i = 0; i < 7; i++) {
        days.push(addDays(weekStart, i));
      }
      return days;
    }
  }, [currentDate, viewMode]);

  const handlePrev = () => {
    if (viewMode === 'month') {
        setCurrentDate(d => addMonths(d, -1));
    } else {
        setCurrentDate(d => addDays(d, -7));
    }
  };

  const handleNext = () => {
     if (viewMode === 'month') {
        setCurrentDate(d => addMonths(d, 1));
    } else {
        setCurrentDate(d => addDays(d, -7));
    }
  };

  const getEventsForDay = (day: Date) => {
    return calendarEvents.filter(event => {
      const eventStartDate = new Date(event.startDate);
      // Adjust for timezone differences by creating dates in UTC context for comparisons
      const eventStartDay = new Date(eventStartDate.getUTCFullYear(), eventStartDate.getUTCMonth(), eventStartDate.getUTCDate());

      if (isAfter(eventStartDay, day)) {
          return false; // Event hasn't started yet
      }

      switch (event.recurrence) {
        case 'one-time':
          const eventEndDate = event.endDate ? new Date(new Date(event.endDate).setUTCHours(23, 59, 59, 999)) : eventStartDay;
          return isWithinInterval(day, { start: eventStartDay, end: eventEndDate });
        case 'monthly':
          return eventStartDay.getDate() === day.getDate() && day >= eventStartDay;
        case 'yearly':
          return eventStartDay.getDate() === day.getDate() && eventStartDay.getMonth() === day.getMonth() && day >= eventStartDay;
        default:
          return false;
      }
    });
  };
  
  const getRecurrenceIcon = (recurrence: 'one-time' | 'monthly' | 'yearly') => {
    switch (recurrence) {
        case 'monthly':
        case 'yearly':
            return <Repeat className="w-3 h-3 text-muted-foreground" />;
        case 'one-time':
        default:
            return <Repeat1 className="w-3 h-3 text-muted-foreground" />;
    }
  }
  
  const getRecurrenceText = (recurrence: 'one-time' | 'monthly' | 'yearly') => {
    switch (recurrence) {
        case 'monthly': return 'Aylık';
        case 'yearly': return 'Yıllık';
        case 'one-time': return 'Tek Seferlik';
        default: return '';
    }
  };

  const handleClearPastEvents = async () => {
    try {
        const count = await deletePastCalendarEvents();
        toast({
            title: "✅ Geçmiş Temizlendi",
            description: `${count} geçmiş etkinlik takvimden silindi.`,
        });
    } catch (error) {
        console.error("Failed to clear past events:", error);
        toast({
            title: "❌ Hata",
            description: "Geçmiş etkinlikler silinirken bir sorun oluştu.",
            variant: "destructive",
        });
    }
  };

  const weekHeaderDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek(new Date(), {weekStartsOn: 1}), i));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold">Hatırlatıcılar 🗓️</h1>
        <Dialog open={isNewEventDialogOpen} onOpenChange={setIsNewEventDialogOpen}>
          <DialogTrigger asChild>
             <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
              <PlusCircle className="mr-2 h-4 w-4" />
              Yeni Hatırlatıcı Ekle
            </Button>
          </DialogTrigger>
           <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Yeni Hatırlatıcı Oluştur</DialogTitle>
                <DialogDescription>
                  Unutmak istemediğiniz önemli tarihleri ve olayları ekleyin.
                </DialogDescription>
              </DialogHeader>
              <NewEventForm
                  onEventCreated={() => {
                      setIsNewEventDialogOpen(false);
                      toast({
                          title: "✅ Hatırlatıcı Oluşturuldu",
                          description: "Yeni hatırlatıcı takvime başarıyla eklendi.",
                      });
                  }}
              />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: tr })}
            </h2>
             <div className="flex items-center gap-2">
                <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'month' | 'week')}>
                    <TabsList>
                        <TabsTrigger value="month">Aylık</TabsTrigger>
                        <TabsTrigger value="week">Haftalık</TabsTrigger>
                    </TabsList>
                </Tabs>
                <Button variant="outline" size="icon" onClick={handlePrev}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Bugün</Button>
                <Button variant="outline" size="icon" onClick={handleNext}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
             </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={cn("grid border-t border-l", viewMode === 'month' ? 'grid-cols-7' : 'grid-cols-1')}>
             {weekHeaderDays.map(day => (
                <div key={day.toISOString()} className={cn("p-2 border-r border-b text-center font-semibold text-sm capitalize", viewMode === 'week' && 'hidden')}>
                    {format(day, 'EEE', { locale: tr })}
                </div>
            ))}
            {displayedDays.map(day => {
              const dayEvents = getEventsForDay(day);

              return (
              <div key={day.toString()} className={cn("border-b border-r p-2 flex", viewMode === 'month' ? 'h-32 sm:h-40 flex-col' : 'h-24 flex-row gap-4')}>
                <div className={cn(viewMode === 'week' && 'w-24 text-center border-r pr-4')}>
                    <span className={cn(`font-semibold`, isToday(day) ? 'text-primary' : 'text-foreground', !isSameMonth(day, currentDate) && 'text-muted-foreground/50')}>
                      {viewMode === 'month' ? format(day, 'd') : format(day, 'd MMM')}
                    </span>
                     {viewMode === 'week' && <span className="block text-xs capitalize">{format(day, 'EEE', {locale: tr})}</span>}
                </div>
                <div className={cn("flex-grow overflow-y-auto", viewMode === 'month' ? 'mt-1 space-y-1' : 'flex flex-wrap gap-2 items-start')}>
                   {dayEvents.map((event, index) => {
                       const color = eventColors[index % eventColors.length];
                       return (
                       <Dialog key={event.id}>
                        <DialogTrigger asChild>
                           <div className={cn('p-1.5 rounded-md cursor-pointer hover:opacity-80 transition-opacity', color.bg, color.text, color.border, viewMode === 'week' && 'h-fit')}>
                            <p className="text-xs font-semibold truncate">{event.title}</p>
                          </div>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="text-2xl pt-2 flex items-center gap-2">
                                  {getRecurrenceIcon(event.recurrence)}
                                  {event.title}
                                </DialogTitle>
                                <DialogDescription>
                                    {format(new Date(event.startDate), 'd MMMM yyyy, EEEE', { locale: tr })}
                                    {event.endDate && ` - ${format(new Date(event.endDate), 'd MMMM yyyy, EEEE', { locale: tr })}`}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <p className="capitalize">Tekrarlanma: {getRecurrenceText(event.recurrence)}</p>
                            </div>
                             <DialogFooter>
                                <Button variant="outline">Düzenle</Button>
                            </DialogFooter>
                        </DialogContent>
                       </Dialog>
                    )})}
                </div>
              </div>
            )})}
          </div>
        </CardContent>
      </Card>
      
       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Tüm Hatırlatıcılar</CardTitle>
          <CardDescription>Yaklaşan ve geçmiş tüm etkinlikleriniz.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={['upcoming', 'past']} className="w-full">
            <AccordionItem value="upcoming">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-medium">Yaklaşan Etkinlikler ({upcomingEvents.length})</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2">
                {upcomingEvents.length > 0 ? (
                    upcomingEvents.map(event => (
                        <div key={event.id} className="p-3 border rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{event.title}</p>
                                <p className="text-sm text-muted-foreground">
                                    {format(event.parsedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
                                    {event.endDate && ` - ${format(parseISO(event.endDate), 'd MMMM yyyy, EEEE', { locale: tr })}`}
                                </p>
                            </div>
                            <Badge variant="outline">{getRecurrenceText(event.recurrence)}</Badge>
                        </div>
                    ))
                ) : (
                    <p className="text-muted-foreground text-sm p-3">Yaklaşan bir etkinlik yok.</p>
                )}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="past">
              <AccordionTrigger>
                 <div className="flex items-center gap-2 justify-between w-full">
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-muted-foreground"/>
                        <h3 className="text-lg font-medium">Geçmiş Etkinlikler ({pastEvents.length})</h3>
                    </div>
                 </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2">
                 {pastEvents.length > 0 && (
                    <div className="flex justify-end mb-4">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Geçmişi Temizle
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Tüm geçmiş etkinlikler kalıcı olarak silinecektir. Bu işlem geri alınamaz.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleClearPastEvents}>Evet, Sil</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
                {pastEvents.length > 0 ? (
                    pastEvents.map(event => (
                        <div key={event.id} className="p-3 border rounded-lg flex justify-between items-center bg-muted/30">
                            <div>
                                <p className="font-semibold text-muted-foreground">{event.title}</p>
                                <p className="text-sm text-muted-foreground/80">
                                    {format(event.parsedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
                                    {event.endDate && ` - ${format(parseISO(event.endDate), 'd MMMM yyyy, EEEE', { locale: tr })}`}
                                </p>
                            </div>
                            <Badge variant="secondary">{getRecurrenceText(event.recurrence)}</Badge>
                        </div>
                    ))
                 ) : (
                    <p className="text-muted-foreground text-sm p-3">Geçmiş bir etkinlik yok.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
