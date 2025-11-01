
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { Account } from "@/lib/data";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";

const formSchema = z.object({
  fromAccountId: z.string({ required_error: "Bir kaynak hesap seçmelisiniz." }),
  toAccountId: z.string(),
  amount: z.coerce.number().positive("Tutar pozitif bir sayı olmalıdır."),
  date: z.date({ required_error: "Tarih seçmelisiniz." }),
});

type PaymentFormProps = {
  assetAccounts: Account[];
  debtAccount: Account | null;
  onSubmit: (data: z.infer<typeof formSchema>) => void;
};

export function PaymentForm({ assetAccounts, debtAccount, onSubmit }: PaymentFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      toAccountId: debtAccount?.id || "",
      amount: debtAccount?.balance ? Math.abs(debtAccount.balance) : undefined,
      date: new Date(),
    },
  });

  React.useEffect(() => {
    if (debtAccount) {
      form.reset({
        toAccountId: debtAccount.id,
        amount: debtAccount.balance > 0 ? debtAccount.balance : undefined,
        date: new Date(),
        fromAccountId: undefined,
      });
    }
  }, [debtAccount, form]);

  if (!debtAccount) return null;

  return (
    <Form {...form}>
      <DialogHeader>
        <DialogTitle>Kredi Kartı Borç Ödemesi</DialogTitle>
        <DialogDescription>
          "{debtAccount.name}" kartınızın borcunu ödeyin.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
         <FormField
          control={form.control}
          name="fromAccountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kaynak Hesap</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Ödeme yapılacak hesabı seçin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {assetAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.balance.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
            <FormLabel>Ödenen Hesap</FormLabel>
            <Input value={debtAccount.name} disabled />
        </FormItem>
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ödenecek Tutar</FormLabel>
              <FormControl>
                <Input type="number" step="any" placeholder="0,00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Ödeme Tarihi</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                    >
                      {field.value ? format(field.value, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" className="w-full">Ödemeyi Onayla</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

