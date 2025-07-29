
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon, PlusCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { FamilyMember, Task } from "@/lib/data";
import { addTask, updateTask } from "@/lib/dataService";
import { ScrollArea } from "./ui/scroll-area";
import { Switch } from "./ui/switch";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Checkbox } from "./ui/checkbox";
import { usePathname } from "next/navigation";

const subtaskSchema = z.object({
  title: z.string().min(3, "Alt görev başlığı en az 3 karakter olmalıdır."),
});

const weekDays = [
    { id: 'Mon', label: 'Pzt' },
    { id: 'Tue', label: 'Sal' },
    { id: 'Wed', label: 'Çar' },
    { id: 'Thu', label: 'Per' },
    { id: 'Fri', label: 'Cum' },
    { id: 'Sat', label: 'Cmt' },
    { id: 'Sun', label: 'Paz' },
] as const;


const formSchema = z.object({
  title: z.string().min(3, { message: "Başlık en az 3 karakter olmalıdır." }),
  assigneeId: z.string({ required_error: "Lütfen bir sorumlu seçin." }),
  dueDate: z.date({ required_error: "Lütfen bir bitiş tarihi seçin." }),
  category: z.enum(['Ev İşleri', 'Kişisel'], { required_error: "Lütfen bir kategori seçin." }),
  subtasks: z.array(subtaskSchema).optional(),
  
  isRecurring: z.boolean().default(false),
  recurrenceType: z.enum(['daily', 'weekly', 'monthly']).optional(),
  recurrenceDays: z.array(z.string()).optional(),
  recurrenceEndDate: z.date().optional(),
  totalOccurrences: z.coerce.number().optional(),
});

type NewTaskFormProps = {
  familyMembers: FamilyMember[];
  onTaskProcessed: () => void;
  taskToEdit?: Task | null;
};

export function NewTaskForm({ familyMembers, onTaskProcessed, taskToEdit }: NewTaskFormProps) {
  const { toast } = useToast();
  const pathname = usePathname();
  const isHabitPage = pathname === '/habits';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      category: "Ev İşleri",
      subtasks: [],
      isRecurring: isHabitPage,
      recurrenceType: isHabitPage ? 'daily' : undefined,
      recurrenceDays: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "subtasks",
  });
  
  const isRecurring = form.watch("isRecurring");
  const recurrenceType = form.watch("recurrenceType");

  React.useEffect(() => {
    if (taskToEdit) {
      form.reset({
        title: taskToEdit.title,
        assigneeId: taskToEdit.assigneeId,
        dueDate: new Date(taskToEdit.dueDate),
        category: taskToEdit.category === 'Ev İşleri' || taskToEdit.category === 'Kişisel' ? taskToEdit.category : 'Ev İşleri',
        subtasks: (taskToEdit.subtasks || []).map(st => ({ title: st.title })),
        isRecurring: taskToEdit.isRecurring || false,
        recurrenceType: taskToEdit.recurrenceType,
        recurrenceDays: taskToEdit.recurrenceDays,
        recurrenceEndDate: taskToEdit.recurrenceEndDate ? new Date(taskToEdit.recurrenceEndDate) : undefined,
        totalOccurrences: taskToEdit.totalOccurrences,
      });
    } else {
       form.reset({
          title: "",
          category: "Ev İşleri",
          subtasks: [],
          assigneeId: undefined,
          dueDate: undefined,
          isRecurring: isHabitPage,
          recurrenceType: isHabitPage ? 'daily' : undefined,
          recurrenceDays: [],
          recurrenceEndDate: undefined,
          totalOccurrences: undefined,
       });
    }
  }, [taskToEdit, form, isHabitPage]);

  const difficultyPoints = {
    "Kolay": 10,
    "Orta": 25,
    "Zor": 50,
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
        const baseTaskData = {
            title: values.title,
            assigneeId: values.assigneeId,
            dueDate: format(values.dueDate, "yyyy-MM-dd"),
            category: values.category,
            points: 25, // Defaulting to 25 points as difficulty is removed
            completed: false,
            subtasks: (values.subtasks || []).map(st => ({
                id: Math.random().toString(36).substr(2, 9),
                title: st.title,
                completed: false
            })),
            isRecurring: values.isRecurring,
            completedOccurrences: 0,
            streak: 0,
            completedDates: [],
        };

        const taskData: any = { ...baseTaskData };

        if (values.isRecurring) {
            if (values.recurrenceType) taskData.recurrenceType = values.recurrenceType;
            if (values.recurrenceType === 'weekly' && values.recurrenceDays) taskData.recurrenceDays = values.recurrenceDays;
            if (values.recurrenceEndDate) taskData.recurrenceEndDate = format(values.recurrenceEndDate, "yyyy-MM-dd");
            if (values.totalOccurrences) taskData.totalOccurrences = values.totalOccurrences;
        }


        if (taskToEdit) {
            await updateTask(taskToEdit.id, taskData);
            toast({
                title: "✅ Görev Güncellendi!",
                description: `"${values.title}" görevi başarıyla güncellendi.`,
            });
        } else {
            await addTask(taskData as Omit<Task, 'id' | 'familyId'>);
            toast({
                title: "✅ Görev Başarıyla Oluşturuldu!",
                description: `"${values.title}" görevi başarıyla eklendi.`,
            });
        }
        
        form.reset();
        onTaskProcessed();
    } catch (error) {
        toast({
            title: "❌ Hata",
            description: "İşlem sırasında bir sorun oluştu.",
            variant: "destructive",
        });
    }
  }

  return (
    <Form {...form}>
       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
         <div className="space-y-4 pr-1">
            <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Görev Başlığı</FormLabel>
                <FormControl>
                    <Input placeholder="Örn: Odanı topla" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Kategori</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Bir kategori seçin" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Ev İşleri">Ev İşleri</SelectItem>
                        <SelectItem value="Kişisel">Kişisel</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Sorumlu Kişi</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Birini seçin" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {familyMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                            {member.name}
                        </SelectItem>
                        ))}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Başlangıç Tarihi</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? (
                                format(field.value, "PPP", { locale: tr })
                            ) : (
                                <span>Bir tarih seçin</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
            
            <FormField control={form.control} name="isRecurring" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <FormLabel>Tekrarlı Görev</FormLabel>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
            )}/>

            {isRecurring && (
                <div className="p-4 border rounded-lg space-y-4">
                    <FormField control={form.control} name="recurrenceType" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tekrarlanma Sıklığı</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="daily" /></FormControl><FormLabel>Günlük</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="weekly" /></FormControl><FormLabel>Haftalık</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="monthly" /></FormControl><FormLabel>Aylık</FormLabel></FormItem>
                                </RadioGroup>
                            </FormControl>
                        </FormItem>
                    )} />
                    {recurrenceType === 'weekly' && (
                        <FormField control={form.control} name="recurrenceDays" render={() => (
                            <FormItem>
                                 <FormLabel>Haftanın Günleri</FormLabel>
                                 <div className="flex flex-wrap gap-2">
                                     {weekDays.map((day) => (
                                         <FormField key={day.id} control={form.control} name="recurrenceDays" render={({ field }) => (
                                             <FormItem key={day.id} className="flex flex-row items-start space-x-2 space-y-0">
                                                 <FormControl>
                                                     <Checkbox
                                                        checked={field.value?.includes(day.id)}
                                                        onCheckedChange={(checked) => {
                                                            return checked
                                                            ? field.onChange([...(field.value || []), day.id])
                                                            : field.onChange(field.value?.filter((value) => value !== day.id))
                                                        }}
                                                     />
                                                 </FormControl>
                                                 <FormLabel className="font-normal">{day.label}</FormLabel>
                                             </FormItem>
                                         )}/>
                                     ))}
                                 </div>
                            </FormItem>
                        )}/>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="recurrenceEndDate" render={({ field }) => (
                             <FormItem className="flex flex-col">
                                <FormLabel>Bitiş Tarihi (Opsiyonel)</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < (form.getValues('dueDate') || new Date())} initialFocus/>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="totalOccurrences" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tekrar Sayısı (Opsiyonel)</FormLabel>
                                <FormControl><Input type="number" placeholder="Örn: 10" {...field} value={field.value ?? ''} /></FormControl>
                            </FormItem>
                        )}/>
                    </div>

                </div>
            )}

            <div>
                <FormLabel>Alt Görevler</FormLabel>
                <div className="space-y-2 mt-2">
                    {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                        <FormField
                        control={form.control}
                        name={`subtasks.${index}.title`}
                        render={({ field }) => (
                            <FormItem className="flex-grow">
                            <FormControl>
                                <Input {...field} placeholder={`Alt görev ${index + 1}`} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                    ))}
                    <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => append({ title: "" })}
                    >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Alt Görev Ekle
                    </Button>
                </div>
            </div>
         </div>
        <div className="pt-4 border-t">
          <Button type="submit" className="w-full">
            {taskToEdit ? 'Görevi Güncelle' : 'Görevi Ekle'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
