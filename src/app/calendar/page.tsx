
"use client";

import * as React from "react";
import { addDays, format, startOfWeek, isSameMonth, isToday, isWithinInterval } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, PlusCircle, AlertCircle, Calendar as CalendarIcon, Repeat, Repeat1 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CalendarEvent } from "@/lib/data";
import { onCalendarEventsUpdate } from "@/lib/dataService";
import { NewEventForm } from "@/components/new-event-form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";


export default function CalendarPage() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [calendarEvents, setCalendarEvents] = React.useState<CalendarEvent[]>([]);
  const [isNewEventDialogOpen, setIsNewEventDialogOpen] = React.useState(false);
  const { toast } = useToast();
  const weekStartDate = startOfWeek(currentDate, { weekStartsOn: 1 });

  React.useEffect(() => {
    const unsubscribeEvents = onCalendarEventsUpdate(setCalendarEvents);
    return () => {
        unsubscribeEvents();
    };
  }, []);

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStartDate, i));

  const getEventsForDay = (day: Date) => {
    return calendarEvents.filter(event => {
      const eventStartDate = new Date(event.startDate);
      const eventEndDate = event.endDate ? new Date(event.endDate) : eventStartDate;
      
      switch (event.recurrence) {
        case 'one-time':
          return isWithinInterval(day, { start: eventStartDate, end: eventEndDate });
        case 'monthly':
          return eventStartDate.getDate() === day.getDate() && day >= eventStartDate;
        case 'yearly':
          return eventStartDate.getDate() === day.getDate() && eventStartDate.getMonth() === day.getMonth() && day >= eventStartDate;
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

  return (
    <>
      <PageHeader title="Hatırlatıcılar 🗓️">
        <Dialog open={isNewEventDialogOpen} onOpenChange={setIsNewEventDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:shadow-xl transition-shadow">
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
      </PageHeader>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: tr })}
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addDays(d, -35))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Bugün</Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addDays(d, 35))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 border-t border-l">
            {weekDays.map(day => {
              const dayEvents = getEventsForDay(day);

              return (
              <div key={day.toString()} className="h-48 border-b border-r p-2 flex flex-col">
                <span className={cn(`font-semibold`, isToday(day) ? 'text-primary' : 'text-foreground', !isSameMonth(day, currentDate) && 'text-muted-foreground/50')}>
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
                                <p className="capitalize">Tekrarlanma: {event.recurrence}</p>
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
    </>
  );
}
