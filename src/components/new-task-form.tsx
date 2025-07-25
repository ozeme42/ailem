
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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


const subtaskSchema = z.object({
  title: z.string().min(3, "Alt görev başlığı en az 3 karakter olmalıdır."),
});

const formSchema = z.object({
  title: z.string().min(3, { message: "Başlık en az 3 karakter olmalıdır." }),
  assigneeId: z.string({ required_error: "Lütfen bir sorumlu seçin." }),
  difficulty: z.enum(["Kolay", "Orta", "Zor"], { required_error: "Lütfen bir zorluk seviyesi seçin." }),
  dueDate: z.date({ required_error: "Lütfen bir bitiş tarihi seçin." }),
  category: z.enum(['Ev İşleri', 'Okul', 'Kişisel', 'Aile'], { required_error: "Lütfen bir kategori seçin." }),
  subtasks: z.array(subtaskSchema).optional(),
});

type NewTaskFormProps = {
  familyMembers: FamilyMember[];
  onTaskProcessed: () => void;
  taskToEdit?: Task | null;
};

export function NewTaskForm({ familyMembers, onTaskProcessed, taskToEdit }: NewTaskFormProps) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      difficulty: "Orta",
      category: "Ev İşleri",
      subtasks: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "subtasks",
  });

  React.useEffect(() => {
    if (taskToEdit) {
      form.reset({
        title: taskToEdit.title,
        assigneeId: taskToEdit.assigneeId,
        difficulty: taskToEdit.difficulty,
        dueDate: new Date(taskToEdit.dueDate),
        category: taskToEdit.category,
        subtasks: (taskToEdit.subtasks || []).map(st => ({ title: st.title })),
      });
    } else {
       form.reset({
          title: "",
          difficulty: "Orta",
          category: "Ev İşleri",
          subtasks: [],
          assigneeId: undefined,
          dueDate: undefined,
       });
    }
  }, [taskToEdit, form]);

  const difficultyPoints = {
    "Kolay": 10,
    "Orta": 25,
    "Zor": 50,
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
        const taskData = {
            title: values.title,
            assigneeId: values.assigneeId,
            difficulty: values.difficulty,
            dueDate: format(values.dueDate, "yyyy-MM-dd"),
            category: values.category,
            points: difficultyPoints[values.difficulty],
            completed: false,
            subtasks: (values.subtasks || []).map(st => ({
                id: Math.random().toString(36).substr(2, 9),
                title: st.title,
                completed: false
            }))
        };

        if (taskToEdit) {
            await updateTask(taskToEdit.id, taskData);
            toast({
                title: "✅ Görev Güncellendi!",
                description: `"${values.title}" görevi başarıyla güncellendi.`,
            });
        } else {
            await addTask(taskData);
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
        <ScrollArea className="max-h-[60vh] p-1">
         <div className="space-y-4 pr-6">
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
                        <SelectItem value="Okul">Okul</SelectItem>
                        <SelectItem value="Kişisel">Kişisel</SelectItem>
                        <SelectItem value="Aile">Aile</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
            <div className="grid grid-cols-2 gap-4">
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
                name="difficulty"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Zorluk</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Zorluk seçin" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Kolay">Kolay</SelectItem>
                        <SelectItem value="Orta">Orta</SelectItem>
                        <SelectItem value="Zor">Zor</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
            </div>
            <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Bitiş Tarihi</FormLabel>
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
                        disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                        initialFocus
                    />
                    </PopoverContent>
                </Popover>
                <FormMessage />
                </FormItem>
            )}
            />

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
        </ScrollArea>
        <div className="pt-4 border-t">
          <Button type="submit" className="w-full">
            {taskToEdit ? 'Görevi Güncelle' : 'Görevi Ekle'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
