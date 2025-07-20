
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { MediaItem } from "@/lib/data";

const formSchema = z.object({
  title: z.string().min(2, { message: "Başlık en az 2 karakter olmalıdır." }),
  author: z.string().min(2, { message: "Yazar adı en az 2 karakter olmalıdır." }),
  genre: z.string().min(3, { message: "Tür en az 3 karakter olmalıdır." }),
  description: z.string().min(10, { message: "Açıklama en az 10 karakter olmalıdır." }),
  pages: z.coerce.number().min(1, { message: "Sayfa sayısı en az 1 olmalıdır." }).optional(),
  coverImage: z.string().url({ message: "Lütfen geçerli bir URL girin." }).optional().or(z.literal('')),
});

type NewBookFormProps = {
  onSubmit: (data: Omit<MediaItem, 'id' | 'type' | 'rating'>) => void;
};

export function NewBookForm({ onSubmit }: NewBookFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      author: "",
      genre: "",
      description: "",
      coverImage: "",
    },
  });

  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    onSubmit(values);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kitap Başlığı</FormLabel>
              <FormControl>
                <Input placeholder="Örn: Yüzüklerin Efendisi" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="author"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Yazar</FormLabel>
              <FormControl>
                <Input placeholder="Örn: J.R.R. Tolkien" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="genre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tür</FormLabel>
                <FormControl>
                  <Input placeholder="Örn: Fantastik" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pages"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sayfa Sayısı</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="Örn: 423" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Açıklama</FormLabel>
              <FormControl>
                <Textarea placeholder="Kitabın kısa bir özetini girin..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="coverImage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kapak Fotoğrafı (URL)</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Kitabı Kaydet</Button>
      </form>
    </Form>
  );
}

    