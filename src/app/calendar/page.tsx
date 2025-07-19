"use client";

import * as React from "react";
import { addDays, format, startOfWeek } from 'date-fns';
import { tr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, MapPin, PlusCircle } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { calendarEvents } from "@/lib/data";
import type { CalendarEvent } from "@/lib/data";

const categoryColors: { [key: string]: string } = {
  Okul: "bg-blue-500",
  Spor: "bg-green-500",
  Aile: "bg-purple-500",
  "Doğum Günü": "bg-pink-500",
  Diğer: "bg-gray-500",
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const weekStarDate = startOfWeek(currentDate, { weekStartsOn: 1 });

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStarDate, i));

  const upcomingEvents = calendarEvents
    .filter(event => new Date(event.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <>
      <PageHeader title="Aile Takvimi 🗓️">
        <Button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
          <PlusCircle className="mr-2 h-4 w-4" />
          Yeni Etkinlik Ekle
        </Button>
      </PageHeader>

      <Card>
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
            {weekDays.map(day => (
              <div key={day.toString()} className="h-40 border-b border-r p-2 flex flex-col">
                <span className={`font-semibold ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'text-blue-600' : 'text-foreground'}`}>
                  {format(day, 'd')}
                </span>
                <span className="text-xs text-muted-foreground capitalize">{format(day, 'EEE', { locale: tr })}</span>
                <div className="mt-1 space-y-1 overflow-y-auto">
                   {calendarEvents
                    .filter(event => format(new Date(event.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
                    .map(event => (
                       <Dialog key={event.id}>
                        <DialogTrigger asChild>
                           <div className={`p-1 text-white text-xs rounded-md cursor-pointer hover:opacity-80 ${categoryColors[event.category]}`}>
                            {event.title}
                          </div>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <Badge className={`w-fit ${categoryColors[event.category]}`}>{event.category}</Badge>
                                <DialogTitle className="text-2xl pt-2">{event.title}</DialogTitle>
                                <DialogDescription>
                                    {format(new Date(event.date), 'd MMMM yyyy, EEEE', { locale: tr })}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2">
                                <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground"/> {event.startTime} {event.endTime && `- ${event.endTime}`}</p>
                                <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground"/> Yer bilgisi eklenecek</p>
                                <p>{event.description}</p>
                            </div>
                        </DialogContent>
                       </Dialog>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold mb-4 text-foreground">Yaklaşan Etkinlikler</h2>
        <Carousel opts={{ align: "start", loop: true }} className="w-full">
          <CarouselContent>
            {upcomingEvents.map((event) => (
              <CarouselItem key={event.id} className="md:basis-1/2 lg:basis-1/3">
                <div className="p-1">
                  <Card className={`border-l-4 ${'border-'+categoryColors[event.category]?.replace('bg-','')}`}>
                    <CardHeader>
                      <CardTitle>{event.title}</CardTitle>
                      <CardDescription>{format(new Date(event.date), 'd MMMM, EEEE', { locale: tr })} - {event.startTime}</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Badge variant="outline" className={`${categoryColors[event.category].replace('bg-', 'border-')} ${categoryColors[event.category].replace('bg-','text-')}/80 ${categoryColors[event.category]}/10`}>{event.category}</Badge>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </section>
    </>
  );
}
