

"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FamilyMember, Account } from "@/lib/data";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Switch } from "./ui/switch";

const formSchema = z.object({
  name: z.string().min(2, "Hesap adı en az 2 karakter olmalıdır."),
  type: z.enum(['cash', 'bank', 'credit-card']),
  ownerId: z.string({ required_error: "Lütfen bir sorumlu seçin." }),
  creditLimit: z.coerce.number().optional(),
  statementDate: z.coerce.number().min(1).max(31).optional(),
  dueDate: z.coerce.number().min(1).max(31).optional(),
});

type NewAccountFormProps = {
  familyMembers: FamilyMember[];
  onSubmit: (data: Omit<Account, 'id' | 'familyId' | 'balance'>) => void;
  initialData?: Account | null;
};

export function NewAccountForm({ familyMembers, onSubmit, initialData }: NewAccountFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      type: initialData?.type || "bank",
      ownerId: initialData?.ownerId || undefined,
      creditLimit: initialData?.creditLimit || undefined,
      statementDate: initialData?.statementDate || undefined,
      dueDate: initialData?.dueDate || undefined,
    },
  });

  const accountType = form.watch("type");

  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    onSubmit(values);
    form.reset();
  }

  return (
    <Form {...form}>
      <DialogHeader>
        <DialogTitle>{initialData ? "Hesabı Düzenle" : "Yeni Hesap Ekle"}</DialogTitle>
        <DialogDescription>
          Nakit, banka hesabı veya kredi kartı gibi yeni bir hesap oluşturun.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hesap Adı</FormLabel>
              <FormControl><Input placeholder="Örn: Maaş Hesabım" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="type" render={({ field }) => (
            <FormItem>
              <FormLabel>Hesap Türü</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="bank">Banka Hesabı</SelectItem>
                  <SelectItem value="credit-card">Kredi Kartı</SelectItem>
                  <SelectItem value="cash">Nakit</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
        )} />
        <FormField
            control={form.control}
            name="ownerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hesap Sahibi</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Birini seçin" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {familyMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

        {accountType === 'credit-card' && (
            <div className="p-4 border rounded-lg space-y-4">
                <FormField control={form.control} name="creditLimit" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Kredi Limiti</FormLabel>
                        <FormControl><Input type="number" placeholder="50000" {...field} value={field.value ?? ''} /></FormControl>
                    </FormItem>
                )}/>
                 <div className="grid grid-cols-2 gap-4">
                     <FormField control={form.control} name="statementDate" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Hesap Kesim Günü</FormLabel>
                            <FormControl><Input type="number" placeholder="Ayın 27'si ise 27 girin" {...field} value={field.value ?? ''} /></FormControl>
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="dueDate" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Son Ödeme Günü</FormLabel>
                            <FormControl><Input type="number" placeholder="Ayın 7'si ise 7 girin" {...field} value={field.value ?? ''} /></FormControl>
                        </FormItem>
                    )}/>
                </div>
            </div>
        )}

        <DialogFooter>
          <Button type="submit" className="w-full">{initialData ? 'Değişiklikleri Kaydet' : 'Hesabı Oluştur'}</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
