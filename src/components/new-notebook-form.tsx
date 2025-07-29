
"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/components/auth-provider';
import { useState, useEffect } from 'react';
import { Notebook } from '@/lib/data';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { DialogHeader, DialogTitle, DialogDescription as DialogDescriptionComponent, DialogFooter } from './ui/dialog';

const formSchema = z.object({
  title: z.string().min(2, 'Defter adı en az 2 karakter olmalıdır.'),
  description: z.string().optional(),
});

type NewNotebookFormProps = {
    onSubmit: (data: Omit<Notebook, 'id' | 'familyId' | 'createdAt' | 'ownerId'>) => void;
    initialData?: Notebook | null;
}

export function NewNotebookForm({ onSubmit, initialData }: NewNotebookFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
    },
  });

  const handleFormSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    const notebookData = {
        ...values,
        sections: initialData?.sections || [], // Preserve sections if editing
    };
    try {
      onSubmit(notebookData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <DialogHeader>
        <DialogTitle>{initialData ? "Defteri Düzenle" : "Yeni Not Defteri"}</DialogTitle>
        <DialogDescriptionComponent>Notlarınızı düzenlemek için yeni bir defter oluşturun.</DialogDescriptionComponent>
    </DialogHeader>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Defter Adı</FormLabel>
              <FormControl><Input placeholder="Proje Notları" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Açıklama (Opsiyonel)</FormLabel>
              <FormControl><Textarea placeholder="Bu defterin içeriği hakkında kısa bir bilgi..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
            <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Değişiklikleri Kaydet" : "Defteri Oluştur"}
            </Button>
        </DialogFooter>
      </form>
    </Form>
    </>
  );
}
