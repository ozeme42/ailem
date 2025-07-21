"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon } from "lucide-react";
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
import { addTask } from "@/lib/dataService";
import { useAuth } from "./auth-provider";

const formSchema = z.object({
  title: z.string().min(3, { message: "Başlık en az 3 karakter olmalıdır." }),
  assigneeId: z.string({ required_error: "Lütfen bir sorumlu seçin." }),
  difficulty: z.enum(["Kolay", "Orta", "Zor"], { required_error: "Lütfen bir zorluk seviyesi seçin." }),
  dueDate: z.date({ required_error: "Lütfen bir bitiş tarihi seçin." }),
  category: z.enum(['Ev İşleri', 'Okul', 'Kişisel', 'Aile'], { required_error: "Lütfen bir kategori seçin." }),
});

type NewTaskFormProps = {
  familyMembers: FamilyMember[];
  onTaskCreated: () => void;
};

export function NewTaskForm({ familyMembers, onTaskCreated }: NewTaskFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      difficulty: "Orta",
      category: "Ev İşleri",
    },
  });

  const difficultyPoints = {
    "Kolay": 10,
    "Orta": 25,
    "Zor": 50,
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({ title: "Hata", description: "Görevi oluşturmak için giriş yapmalısınız.", variant: "destructive"});
        return;
    }
    try {
        const newTask: Omit<Task, 'id' | 'familyId'> = {
            title: values.title,
            assigneeId: values.assigneeId,
            difficulty: values.difficulty,
            dueDate: format(values.dueDate, "yyyy-MM-dd"),
            category: values.category,
            points: difficultyPoints[values.difficulty],
            completed: false,
            subtasks: []
        };
        await addTask(newTask, user.familyId);

        toast({
            title: "✅ Görev Başarıyla Oluşturuldu!",
            description: `"${values.title}" görevi başarıyla eklendi.`,
        });
        form.reset();
        onTaskCreated();
    } catch (error) {
        toast({
            title: "❌ Hata",
            description: "Görev oluşturulurken bir sorun oluştu.",
            variant: "destructive",
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
        <Button type="submit">Görevi Ekle</Button>
      </form>
    </Form>
  );
}
