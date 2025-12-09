
"use client";

import * as React from "react";
import { addDays, format, startOfWeek, isSameMonth, isToday, isWithinInterval, isAfter, isPast, parseISO, compareAsc, compareDesc, isFuture, startOfMonth, addMonths, differenceInDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, PlusCircle, Calendar as CalendarIcon, Edit, Trash2, Clock, Bell, History, ListChecks } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarEvent } from "@/lib/data";
import { onCalendarEventsUpdate, deletePastCalendarEvents, deleteCalendarEvent } from "@/lib/dataService";
import { NewEventForm } from "@/components/new-event-form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/components/auth-provider";

const eventColors = [
    { bg: "bg-blue-100/50", text: "text-blue-700", border: "border-blue-200", icon: "text-blue-500", dot: "bg-blue-500" },
    { bg: "bg-emerald-100/50", text: "text-emerald-700", border: "border-emerald-200", icon: "text-emerald-500", dot: "bg-emerald-500" },
    { bg: "bg-purple-100/50", text: "text-purple-700", border: "border-purple-200", icon: "text-purple-500", dot: "bg-purple-500" },
    { bg: "bg-rose-100/50", text: "text-rose-700", border: "border-rose-200", icon: "text-rose-500", dot: "bg-rose-500" },
    { bg: "bg-amber-100/50", text: "text-amber-700", border: "border-amber-200", icon: "text-amber-500", dot: "bg-amber-500" },
    { bg: "bg-indigo-100/50", text: "text-indigo-700", border: "border-indigo-200", icon: "text-indigo-500", dot: "bg-indigo-500" },
    { bg: "bg-cyan-100/50", text: "text-cyan-700", border: "border-cyan-200", icon: "text-cyan-500", dot: "bg-cyan-500" },
];

export default function CalendarPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>([]);
  const [isFormDialogOpen, setIsFormDialogOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = React.useState<'month' | 'week'>('month');
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
      const handleScroll = () => {
          setIsScrolled(window.scrollY > 10);
      };
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      // 6 hafta (42 gün) göstererek düzeni koruyoruz
      while (days.length < 42) {
          days.push(day);
          day = addDays(day, 1);
      }
      return days;
    } else {
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
      const eventStartDay = new Date(eventStartDate.getUTCFullYear(), eventStartDate.getUTCMonth(), eventStartDate.getUTCDate());

      if (isAfter(eventStartDay, day)) {
          return false;
      }

      if (event.recurrence === 'one-time') {
          const eventEndDate = event.endDate ? new Date(new Date(event.endDate).setUTCHours(23, 59, 59, 999)) : eventStartDay;
          return isWithinInterval(day, { start: eventStartDay, end: eventEndDate });
      } else if (event.recurrence === 'monthly') {
          return eventStartDay.getDate() === day.getDate() && day >= eventStartDay;
      } else if (event.recurrence === 'yearly') {
          return eventStartDay.getDate() === day.getDate() && eventStartDay.getMonth() === day.getMonth() && day >= eventStartDay;
      }
      return false;
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
  };
  
  const handleOpenNewDialog = () => {
      setEditingEvent(null);
      setIsFormDialogOpen(true);
  };

  const weekHeaderDays = React.useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek(new Date(), {weekStartsOn: 1}), i));
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#F3F6F8] font-sans pb-24">
        {/* Dekoratif Arkaplan */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-pink-100/60 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-purple-100/50 rounded-full blur-[120px]" />
        </div>

        {/* --- HEADER --- */}
        <div className="sticky top-2 z-50 px-4 md:px-6 w-full flex justify-center">
            <header className={cn(
                "w-full max-w-7xl flex items-center justify-between py-2 px-3 transition-all duration-300 rounded-[2rem]",
                isScrolled 
                    ? "bg-white/80 backdrop-blur-xl border border-white/40 shadow-lg shadow-black/5" 
                    : "bg-white/50 backdrop-blur-md border border-white/20"
            )}>
                <div className="flex items-center gap-3">
                    <SidebarTrigger className="h-10 w-10 rounded-full hover:bg-black/5 transition-colors text-slate-700" />
                    <div className="flex flex-col">
                        <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent leading-none">
                            Özgürdere
                        </h1>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ailesi</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-black/5 text-slate-600 relative">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
                    </Button>
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 p-[2px] shadow-md cursor-pointer hover:scale-105 transition-transform">
                            <div className="h-full w-full rounded-full bg-white flex items-center justify-center">
                            <span className="text-transparent bg-clip-text bg-gradient-to-br from-pink-600 to-purple-600 font-bold text-sm">
                                {user?.displayName?.charAt(0) || "A"}
                            </span>
                            </div>
                    </div>
                </div>
            </header>
        </div>

        <div className="max-w-7xl mx-auto md:p-6 p-4 relative z-10 space-y-6">
            
            <div className="flex flex-col gap-6 pt-2">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-1 text-slate-800 flex items-center gap-3">
                            Etkinlik <span className="text-pink-600 text-lg md:text-xl font-bold bg-pink-50 px-3 py-1 rounded-full border border-pink-100">Takvimi</span>
                        </h1>
                        <p className="text-slate-500 font-medium ml-1">Önemli günleri ve hatırlatıcıları planla.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between bg-white/60 backdrop-blur-md p-2 rounded-[2rem] shadow-sm border border-white gap-4 md:gap-0">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-white" onClick={handlePrev}><ChevronLeft className="h-5 w-5 text-slate-600" /></Button>
                        <div className="px-6 py-2 bg-white rounded-xl shadow-sm min-w-[180px] text-center font-bold text-slate-700 border border-slate-100 flex items-center justify-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-pink-500" />
                            {format(currentDate, 'MMMM yyyy', { locale: tr })}
                        </div>
                        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 hover:bg-white" onClick={handleNext}><ChevronRight className="h-5 w-5 text-slate-600" /></Button>
                    </div>
                    
                    <div className="flex items-center gap-2 pr-2">
                        <Button variant="ghost" className="rounded-full px-4 font-bold text-slate-600 hover:bg-white text-xs" onClick={() => setCurrentDate(new Date())}>Bugün</Button>
                        <div className="h-6 w-px bg-slate-300 mx-1"></div>
                        <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'month' | 'week')}>
                            <TabsList className="bg-slate-100/50 p-1 rounded-full h-10">
                                <TabsTrigger value="month" className="rounded-full px-4 h-full data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm font-bold text-slate-500 text-xs transition-all">Aylık</TabsTrigger>
                                <TabsTrigger value="week" className="rounded-full px-4 h-full data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm font-bold text-slate-500 text-xs transition-all">Haftalık</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                
                <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white shadow-sm overflow-hidden p-4">
                    {viewMode === 'month' && (
                        <div className="grid grid-cols-7 mb-2">
                            {weekHeaderDays.map(day => (
                                <div key={day.toISOString()} className="text-center py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    {format(day, 'EEE', { locale: tr })}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className={cn("grid gap-2", viewMode === 'month' ? 'grid-cols-7' : 'grid-cols-1')}>
                        {displayedDays.map(day => {
                            const dayEvents = getEventsForDay(day);
                            const isCurrentMonth = isSameMonth(day, currentDate);
                            const isDayToday = isToday(day);

                            return (
                                <div 
                                    key={day.toString()} 
                                    className={cn(
                                        "relative rounded-2xl border transition-all duration-200 overflow-hidden group",
                                        viewMode === 'month' ? 'min-h-[100px] p-2 flex flex-col' : 'min-h-[80px] p-4 flex flex-row items-center gap-6',
                                        isDayToday ? "bg-pink-50 border-pink-200 ring-2 ring-pink-100 z-10" : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-md",
                                        !isCurrentMonth && viewMode === 'month' && "opacity-40 bg-slate-50 grayscale"
                                    )}
                                >
                                    <div className={cn(
                                        "flex-shrink-0 font-bold transition-colors", 
                                        viewMode === 'month' ? "text-right mb-1" : "text-center w-16",
                                        isDayToday ? "text-pink-600" : "text-slate-600"
                                    )}>
                                        <span className={cn("text-sm", viewMode === 'week' && "text-2xl block")}>
                                            {format(day, 'd')}
                                        </span>
                                        {viewMode === 'week' && <span className="text-[10px] uppercase text-slate-400 block">{format(day, 'EEE', {locale: tr})}</span>}
                                    </div>

                                    <div className={cn("flex-grow space-y-1.5", viewMode === 'week' && "flex flex-wrap gap-2 items-center")}>
                                        {dayEvents.map((event, index) => {
                                            const color = eventColors[index % eventColors.length];
                                            return (
                                                <Dialog key={event.id}>
                                                    <DialogTrigger asChild>
                                                        <div className={cn(
                                                            "rounded-lg px-2 py-1 text-[10px] font-bold truncate cursor-pointer transition-transform hover:scale-[1.02] flex items-center gap-1.5 border",
                                                            color.bg, color.text, color.border,
                                                            viewMode === 'week' && "px-3 py-1.5 text-xs"
                                                        )}>
                                                            <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", color.dot)}></div>
                                                            {event.title}
                                                        </div>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-md rounded-[2rem]">
                                                        <DialogHeader>
                                                            <DialogTitle className="flex items-center gap-2">
                                                                <CalendarIcon className={cn("h-5 w-5", color.text)}/> 
                                                                {event.title}
                                                            </DialogTitle>
                                                            <DialogDescription>
                                                                {format(day, 'd MMMM yyyy, EEEE', { locale: tr })}
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="py-4 space-y-4">
                                                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-400 uppercase">Tekrarlanma</p>
                                                                    <p className="text-slate-700 font-medium">{getRecurrenceText(event.recurrence)}</p>
                                                                </div>
                                                                <Badge variant="outline" className={cn("border-0", color.bg, color.text)}>{event.recurrence === 'one-time' ? 'Tek Seferlik' : 'Tekrarlı'}</Badge>
                                                            </div>
                                                            
                                                            <div className="flex justify-end gap-2">
                                                                <Button variant="outline" onClick={() => handleOpenEditDialog(event)} className="rounded-xl border-slate-200">
                                                                    <Edit className="mr-2 h-4 w-4"/> Düzenle
                                                                </Button>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="destructive" className="rounded-xl bg-rose-500 hover:bg-rose-600">
                                                                            <Trash2 className="mr-2 h-4 w-4"/> Sil
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent className="rounded-3xl">
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                                                            <AlertDialogDescription>Bu etkinlik kalıcı olarak silinecek.</AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel className="rounded-xl">İptal</AlertDialogCancel>
                                                                            <AlertDialogAction onClick={() => handleDeleteEvent(event.id)} className="rounded-xl bg-rose-500 hover:bg-rose-600">Evet, Sil</AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </div>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            )
                                        })}
                                        {dayEvents.length === 0 && viewMode === 'week' && (
                                            <p className="text-xs text-slate-400 italic">Etkinlik yok</p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-6 border border-white shadow-sm">
                         <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                             <Clock className="h-4 w-4 text-emerald-500"/> Yaklaşan Etkinlikler
                         </h3>
                         <div className="space-y-3">
                             {upcomingEvents.length > 0 ? upcomingEvents.slice(0, 5).map((event, index) => {
                                 const color = eventColors[index % eventColors.length];
                                 return (
                                     <div key={event.id} className="flex items-center gap-4 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                         <div className={cn("h-12 w-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0", color.bg, color.text)}>
                                             <span className="text-xs font-bold uppercase">{format(event.parsedDate, 'MMM', {locale: tr})}</span>
                                             <span className="text-lg font-black leading-none">{format(event.parsedDate, 'd')}</span>
                                         </div>
                                         <div className="flex-grow min-w-0">
                                             <p className="font-bold text-slate-800 truncate">{event.title}</p>
                                             <p className="text-xs text-slate-400 font-medium">
                                                 {event.daysLeft === 0 ? <span className="text-emerald-500 font-bold">Bugün</span> : 
                                                  event.daysLeft === 1 ? <span className="text-emerald-500 font-bold">Yarın</span> : 
                                                  `${event.daysLeft} gün kaldı`}
                                             </p>
                                         </div>
                                         <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-300 hover:text-slate-600 hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleOpenEditDialog(event)}>
                                             <Edit className="h-4 w-4"/>
                                         </Button>
                                     </div>
                                 )
                             }) : (
                                 <div className="text-center py-8 text-slate-400 text-sm">Hiç yaklaşan etkinlik yok.</div>
                             )}
                         </div>
                    </div>

                    <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-6 border border-white shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                         <div className="flex justify-between items-center mb-4">
                             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                 <History className="h-4 w-4 text-slate-400"/> Geçmiş
                             </h3>
                             {pastEvents.length > 0 && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-rose-400 hover:text-rose-600 hover:bg-rose-50 px-2 rounded-full">
                                            Temizle
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-3xl">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Geçmişi Temizle</AlertDialogTitle>
                                            <AlertDialogDescription>Tüm geçmiş etkinlikler silinecek.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel className="rounded-xl">İptal</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleClearPastEvents} className="bg-rose-500 hover:bg-rose-600 rounded-xl">Evet, Sil</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                             )}
                         </div>
                         <div className="space-y-3">
                             {pastEvents.length > 0 ? pastEvents.slice(0, 3).map((event) => (
                                 <div key={event.id} className="flex items-center gap-4 p-3 bg-slate-50/50 rounded-2xl border border-transparent hover:border-slate-200 transition-all">
                                     <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 text-slate-400 grayscale">
                                         <CalendarIcon className="h-5 w-5"/>
                                     </div>
                                     <div className="flex-grow min-w-0 grayscale opacity-70">
                                         <p className="font-bold text-slate-600 truncate text-sm line-through">{event.title}</p>
                                         <p className="text-[10px] text-slate-400 font-medium">
                                             {format(event.parsedDate, 'd MMMM yyyy', {locale: tr})}
                                         </p>
                                     </div>
                                 </div>
                             )) : (
                                 <div className="text-center py-8 text-slate-400 text-sm">Geçmiş etkinlik yok.</div>
                             )}
                         </div>
                    </div>
                </div>

            </div>

            <div className="fixed bottom-24 md:bottom-8 right-6 z-50">
                <Button 
                    className="rounded-full w-16 h-16 bg-slate-900 hover:bg-slate-800 shadow-[0_10px_40px_rgba(0,0,0,0.3)] transition-transform hover:scale-105 active:scale-95 border-4 border-white"
                    onClick={handleOpenNewDialog}
                >
                    <PlusCircle className="h-8 w-8 text-white" />
                </Button>
            </div>
            
            <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-800">{editingEvent ? 'Hatırlatıcıyı Düzenle' : 'Yeni Hatırlatıcı'}</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">
                            {editingEvent ? 'Etkinlik detaylarını güncelle.' : 'Önemli bir tarihi kaydet.'}
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
    </div>
  );
}

    
