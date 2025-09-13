
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Account, FamilyMember, Transaction } from "@/lib/data";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Switch } from "./ui/switch";

const formSchema = z.object({
  description: z.string().min(2, "Açıklama en az 2 karakter olmalıdır."),
  amount: z.coerce.number().positive("Tutar pozitif bir sayı olmalıdır."),
  type: z.enum(['income', 'expense']),
  accountId: z.string({ required_error: "Bir hesap seçmelisiniz." }),
  ownerId: z.string({ required_error: "Bir kişi seçmelisiniz." }),
  category: z.string().min(2, "Kategori zorunludur."),
  date: z.date({ required_error: "Tarih seçmelisiniz." }),
  isInstallment: z.boolean().default(false),
  installmentTotal: z.coerce.number().optional(),
});

type NewTransactionFormProps = {
  accounts: Account[];
  familyMembers: FamilyMember[];
  onSubmit: (data: any) => void; // More specific type based on transaction logic
  initialData?: Transaction | null;
};

export function NewTransactionForm({ accounts, familyMembers, onSubmit, initialData }: NewTransactionFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: initialData?.description || "",
      amount: initialData?.amount || undefined,
      type: initialData?.type || 'expense',
      accountId: initialData?.accountId || undefined,
      ownerId: initialData?.ownerId || undefined,
      category: initialData?.category || "",
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      isInstallment: initialData?.isInstallment || false,
      installmentTotal: initialData?.installmentDetails?.total || undefined,
    },
  });

  const isInstallment = form.watch("isInstallment");

  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    onSubmit({
      ...values,
      date: format(values.date, 'yyyy-MM-dd')
    });
    form.reset();
  }

  return (
    <Form {...form}>
       <DialogHeader>
        <DialogTitle>{initialData ? "İşlemi Düzenle" : "Yeni İşlem Ekle"}</DialogTitle>
        <DialogDescription>
          Bir gelir veya gider işlemi ekleyin.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
         <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Açıklama</FormLabel>
              <FormControl><Input placeholder="Örn: Market Alışverişi" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem>
                    <FormLabel>Tutar</FormLabel>
                    <FormControl><Input type="number" placeholder="150.75" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem>
                    <FormLabel>Türü</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                        <SelectItem value="expense">Gider</SelectItem>
                        <SelectItem value="income">Gelir</SelectItem>
                        </SelectContent>
                    </Select>
                </FormItem>
            )}/>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="accountId" render={({ field }) => (
                <FormItem>
                    <FormLabel>Hesap</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Hesap seçin"/></SelectTrigger></FormControl>
                        <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                    </Select>
                </FormItem>
            )}/>
             <FormField control={form.control} name="ownerId" render={({ field }) => (
                <FormItem>
                    <FormLabel>Kişi</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Kişi seçin"/></SelectTrigger></FormControl>
                        <SelectContent>{familyMembers.map(mem => <SelectItem key={mem.id} value={mem.id}>{mem.name}</SelectItem>)}</SelectContent>
                    </Select>
                </FormItem>
            )}/>
        </div>
         <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
                <FormLabel>Kategori</FormLabel>
                <FormControl><Input placeholder="Gıda, Fatura vb." {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )}/>
        <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>İşlem Tarihi</FormLabel>
                <Popover>
                    <PopoverTrigger asChild>
                    <FormControl>
                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? (format(field.value, "PPP", { locale: tr })) : (<span>Tarih seçin</span>)}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                    </PopoverContent>
                </Popover>
            </FormItem>
        )}/>
        <FormField control={form.control} name="isInstallment" render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <FormLabel>Taksitli İşlem</FormLabel>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
        )}/>
        {isInstallment && (
             <FormField control={form.control} name="installmentTotal" render={({ field }) => (
                <FormItem>
                    <FormLabel>Toplam Taksit Sayısı</FormLabel>
                    <FormControl><Input type="number" placeholder="12" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
        )}
        <DialogFooter>
          <Button type="submit" className="w-full">{initialData ? "İşlemi Güncelle" : "İşlemi Kaydet"}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
