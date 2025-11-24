
"use client";

import * as React from "react";
import { addDays, format, startOfWeek, isSameMonth, isToday, isWithinInterval, isAfter, isPast, parseISO, compareAsc, compareDesc, isFuture, startOfMonth, endOfMonth, addMonths, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, PlusCircle, AlertCircle, Calendar as CalendarIcon, Repeat, Repeat1, ListChecks, History, Trash2, Edit } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarEvent } from "@/lib/data";
import { onCalendarEventsUpdate, deletePastCalendarEvents, deleteCalendarEvent } from "@/lib/dataService";
import { NewEventForm } from "@/components/new-event-form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const eventColors = [
    { bg: "bg-blue-100 dark:bg-blue-900/50", text: "text-blue-800 dark:text-blue-200", border: "border-blue-300 dark:border-blue-700" },
    { bg: "bg-green-100 dark:bg-green-900/50", text: "text-green-800 dark:text-green-200", border: "border-green-300 dark:border-green-700" },
    { bg: "bg-purple-100 dark:bg-purple-900/50", text: "text-purple-800 dark:text-purple-200", border: "border-purple-300 dark:border-purple-700" },
    { bg: "bg-red-100 dark:bg-red-900/50", text: "text-red-800 dark:text-red-200", border: "border-red-300 dark:border-red-700" },
    { bg: "bg-yellow-100 dark:bg-yellow-900/50", text: "text-yellow-800 dark:text-yellow-200", border: "border-yellow-300 dark:border-yellow-700" },
    { bg: "bg-indigo-100 dark:bg-indigo-900/50", text: "text-indigo-800 dark:text-indigo-200", border: "border-indigo-300 dark:border-indigo-700" },
    { bg: "bg-pink-100 dark:bg-pink-900/50", text: "text-pink-800 dark:text-pink-200", border: "border-pink-300 dark:border-pink-700" },
];


export default function CalendarPage() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>([]);
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<CalendarEvent | null>(null);
  const { toast } = useToast();
  const [viewMode, setViewMode] = React.useState<'month' | 'week'>('week');

  React.useEffect(() => {
    const unsubscribeEvents = onCalendarEventsUpdate(setCalendarEvents);
    return () => {
        unsubscribeEvents();
    };
  }, []);
  
  const { upcomingEvents, pastEvents } = React.useMemo(() => {
    const today = new Date();
    const eventsWithParsedDates = calendarEvents.map(e => ({
      ...e,
      parsedDate: parseISO(e.startDate),
      daysLeft: differenceInDays(parseISO(e.startDate), today),
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
        setCurrentDate(d => addDays(d, 7));
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

  const handleDeleteEvent = async (eventId: string) => {
      try {
          await deleteCalendarEvent(eventId);
          toast({
              title: "🗑️ Hatırlatıcı Silindi",
              description: "Etkinlik takvimden kaldırıldı.",
              variant: "destructive"
          });
      } catch (error) {
          toast({
              title: "❌ Hata",
              description: "Etkinlik silinirken bir sorun oluştu.",
              variant: "destructive",
          });
      }
  };
  
  const handleOpenEditDialog = (event: CalendarEvent) => {
      setEditingEvent(event);
      setIsFormDialogOpen(true);
  }
  
  const handleOpenNewDialog = () => {
      setEditingEvent(null);
      setIsFormDialogOpen(true);
  }


  const weekHeaderDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek(new Date(), {weekStartsOn: 1}), i));

  return (
    <div className="space-y-6">
       <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
          <PageHeader title="Hatırlatıcılar 🗓️">
            <Button onClick={handleOpenNewDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Yeni Hatırlatıcı Ekle
            </Button>
          </PageHeader>
           <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingEvent ? 'Hatırlatıcıyı Düzenle' : 'Yeni Hatırlatıcı Oluştur'}</DialogTitle>
                <DialogDescription>
                  {editingEvent ? 'Mevcut etkinliğin ayrıntılarını güncelleyin.' : 'Unutmak istemediğiniz önemli tarihleri ve olayları ekleyin.'}
                </DialogDescription>
              </DialogHeader>
              <NewEventForm
                  onSave={() => {
                      setIsFormDialogOpen(false);
                      setEditingEvent(null);
                      toast({
                          title: `✅ ${editingEvent ? 'Güncellendi' : 'Oluşturuldu'}`,
                          description: `Hatırlatıcı başarıyla ${editingEvent ? 'güncellendi' : 'eklendi'}.`,
                      });
                  }}
                  initialData={editingEvent}
              />
          </DialogContent>
        </Dialog>
      
       <Card className="shadow-sm bg-card">
        <CardHeader>
          <CardTitle>Tüm Hatırlatıcılar</CardTitle>
          <CardDescription>Yaklaşan ve geçmiş tüm etkinlikleriniz.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={['upcoming']} className="w-full">
            <AccordionItem value="upcoming">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-primary"/>
                    <h3 className="text-lg font-medium">Yaklaşan Etkinlikler ({upcomingEvents.length})</h3>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2">
                {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((event, index) => {
                      const color = eventColors[index % eventColors.length];
                      return (
                        <div key={event.id} className={cn("p-3 border rounded-lg flex justify-between items-center", color.bg, color.text, color.border)}>
                            <div>
                                <p className="font-semibold">{event.title}</p>
                                <p className={cn("text-sm", color.text, "opacity-80")}>
                                    {format(event.parsedDate, 'd MMMM yyyy, EEEE', { locale: tr })}
                                    {event.endDate && ` - ${format(parseISO(event.endDate), 'd MMMM yyyy, EEEE', { locale: tr })}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn(color.border, color.text, color.bg, "opacity-90")}>{getRecurrenceText(event.recurrence)}</Badge>
                                {event.daysLeft > 0 ? (
                                    <Badge variant="secondary">{event.daysLeft} gün kaldı</Badge>
                                ) : event.daysLeft === 0 ? (
                                    <Badge variant="default">Bugün</Badge>
                                ) : (
                                     <Badge variant="destructive">Süresi Geçti</Badge>
                                )}
                                <Button variant="ghost" size="icon" className={cn("h-8 w-8", color.text, `hover:${color.text}`)} onClick={() => handleOpenEditDialog(event)}><Edit className="h-4 w-4" /></Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                            <AlertDialogDescription>"{event.title}" etkinliği kalıcı olarak silinecektir.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>İptal</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteEvent(event.id)}>Evet, Sil</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    )})
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

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="calendar-view" className="border-b-0">
          <Card className="shadow-sm">
            <AccordionTrigger className="p-0 hover:no-underline w-full">
              <CardHeader className="w-full">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-grow">
                          <h2 className="text-xl font-semibold capitalize">
                              {format(currentDate, 'MMMM yyyy', { locale: tr })}
                          </h2>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'month' | 'week')}>
                              <TabsList>
                                  <TabsTrigger value="month">Aylık</TabsTrigger>
                                  <TabsTrigger value="week">Haftalık</TabsTrigger>
                              </TabsList>
                          </Tabs>
                           <div className="flex items-center gap-2">
                              <Button variant="outline" size="icon" onClick={handlePrev}>
                                  <ChevronLeft className="h-4 w-4" />
                              </Button>
                              <Button variant="default" className="bg-primary text-primary-foreground" onClick={() => setCurrentDate(new Date())}>Bugün</Button>
                              <Button variant="outline" size="icon" onClick={handleNext}>
                                  <ChevronRight className="h-4 w-4" />
                              </Button>
                           </div>
                      </div>
                  </div>
              </CardHeader>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="p-0 bg-background">
                <div className={cn("grid border-t border-l", viewMode === 'month' ? 'grid-cols-7' : 'grid-cols-1')}>
                   {viewMode === 'month' && weekHeaderDays.map(day => (
                      <div key={day.toISOString()} className="p-2 border-r border-b text-center font-semibold text-sm capitalize bg-muted/50">
                          {format(day, 'EEE', { locale: tr })}
                      </div>
                  ))}
                  {displayedDays.map(day => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isDayToday = isToday(day);

                    return (
                      <Dialog key={day.toString()}>
                        <DialogTrigger asChild disabled={dayEvents.length === 0}>
                           <div className={cn(
                             "border-b border-r p-2 flex relative", 
                             dayEvents.length > 0 && 'cursor-pointer hover:bg-muted/50', 
                             viewMode === 'month' ? 'h-32 sm:h-40 flex-col' : 'min-h-24 flex-row gap-4',
                             !isCurrentMonth && 'bg-muted/30',
                             isDayToday && "bg-primary/10",
                             isPast(day) && !isDayToday && 'opacity-70'
                           )}>
                              <div className={cn("flex-shrink-0", viewMode === 'week' && 'w-24 text-center border-r pr-4 flex flex-col justify-center items-center')}>
                                  <span className={cn(
                                    `font-semibold`, 
                                    isDayToday ? 'text-primary' : 'text-foreground', 
                                    !isCurrentMonth && 'text-muted-foreground/50'
                                  )}>
                                    {viewMode === 'month' ? format(day, 'd') : format(day, 'd MMM', { locale: tr })}
                                  </span>
                                   {viewMode === 'week' && <span className="block text-xs capitalize text-muted-foreground">{format(day, 'EEE', {locale: tr})}</span>}
                              </div>
                              <div className={cn("flex-grow overflow-y-auto", viewMode === 'month' ? 'mt-1 space-y-1' : 'flex flex-wrap gap-2 items-start py-2')}>
                                 {dayEvents.map((event, index) => {
                                     const color = eventColors[index % eventColors.length];
                                     return (
                                     <div key={event.id} className={cn('p-1.5 rounded-md border text-xs font-semibold truncate', color.bg, color.text, color.border, viewMode === 'week' && 'h-fit')}>
                                      {event.title}
                                    </div>
                                  )})}
                              </div>
                            </div>
                        </DialogTrigger>
                         <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>{format(day, 'd MMMM yyyy, EEEE', { locale: tr })}</DialogTitle>
                              <DialogDescription>Bu gündeki hatırlatıcılar.</DialogDescription>
                            </DialogHeader>
                             <div className="space-y-2 py-4">
                              {dayEvents.map(event => (
                                  <div key={event.id} className="p-3 border rounded-lg flex justify-between items-center">
                                      <div>
                                          <p className="font-semibold">{event.title}</p>
                                          <p className="text-sm text-muted-foreground">
                                             Tekrarlanma: {getRecurrenceText(event.recurrence)}
                                          </p>
                                      </div>
                                      <div className="flex items-center gap-1">
                                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditDialog(event)}><Edit className="h-4 w-4" /></Button>
                                          <AlertDialog>
                                              <AlertDialogTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                                              </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                      <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                      <AlertDialogDescription>"{event.title}" etkinliği kalıcı olarak silinecektir.</AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                      <AlertDialogCancel>İptal</AlertDialogCancel>
                                                      <AlertDialogAction onClick={() => handleDeleteEvent(event.id)}>Evet, Sil</AlertDialogAction>
                                                  </AlertDialogFooter>
                                              </AlertDialogContent>
                                          </AlertDialog>
                                      </div>
                                  </div>
                              ))}
                            </div>
                        </DialogContent>
                      </Dialog>
                  )})}
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
