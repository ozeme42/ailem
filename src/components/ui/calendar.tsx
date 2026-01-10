"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { tr } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={tr}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        // ANA KAPLAYICI
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-bold",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        
        // --- KESİN ÇÖZÜM: TABLO HİZALAMASI (TABLE-LAYOUT) ---
        // Flexbox kullanılmıyor. Tarayıcının doğal tablo motorunu zorluyoruz.
        
        // 1. Tablo: Tam genişlik ve kenarlar birleşik
        table: "w-full border-collapse", 
        
        // 2. Başlık Satırı (Pzt, Sal...): Kesinlikle bir Tablo Satırı (tr) gibi davranmalı
        head_row: "table-row", 
        
        // 3. Başlık Hücresi (th): Kesinlikle bir Tablo Hücresi (th) gibi davranmalı
        head_cell: "table-cell text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] text-center align-middle",
        
        // 4. Gün Satırı (1, 2, 3...): Kesinlikle bir Tablo Satırı (tr) gibi davranmalı
        row: "table-row mt-2", 
        
        // 5. Gün Hücresi (td): Kesinlikle bir Tablo Hücresi (td) gibi davranmalı
        cell: "table-cell text-center text-sm p-0 relative align-middle [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        
        // 6. Gün Butonu: Hücre içinde ortalanmış buton
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-full mx-auto" 
        ),
        
        // --- RENKLENDİRME ---
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground font-bold",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }