

"use client";

import * as React from "react";
import { useForm, useFormContext } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Book } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, PlusCircle, Search, Trash2, Library, FilePlus, AlertTriangle, Edit, X, UploadCloud, ChevronRight, BookPlus, ChevronDown, Settings, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';
import { Combobox } from "./ui/combobox";

// SCHEMAS & TYPES
const bookFormSchema = z.object({
  title: z.string().min(2, "Kitap adı en az 2 karakter olmalıdır."),
  author: z.string().optional(),
  pageCount: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().min(1, "Sayfa sayısı pozitif bir sayı olmalı.").optional()
  ),
  isForChildren: z.boolean().default(false),
  image: z.string().optional(), // Can be existing URL or new data URI for upload
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  rating: z.number().optional(),
});
export type BookFormData = z.infer<typeof bookFormSchema>;

// BOOK FORM COMPONENT
export const BookForm = ({ existingTags }: { existingTags: string[] }) => {
  const { control, getValues, setValue, watch } = useFormContext<BookFormData>();
  const [newShelfMain, setNewShelfMain] = useState('');
  const [newShelfSub, setNewShelfSub] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const imageValue = watch('image');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('image', reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddShelf = () => {
    const main = newShelfMain.trim();
    const sub = newShelfSub.trim();
    if (!main) return;

    const newTag = sub ? `${main}/${sub}` : main;
    
    const currentTagsValue = getValues('tags') || [];
    if (!currentTagsValue.includes(newTag)) {
        setValue('tags', [...currentTagsValue, newTag], { shouldValidate: true });
    }
    setNewShelfMain('');
    setNewShelfSub('');
  };

  const removeTag = (tagToRemove: string) => {
    const currentTagsValue = getValues('tags') || [];
    setValue('tags', currentTagsValue.filter(tag => tag !== tagToRemove), { shouldValidate: true });
  };
  
  const handleToggleTag = (tag: string) => {
    const currentTagsValue = getValues('tags') || [];
    const newTags = currentTagsValue.includes(tag)
        ? currentTagsValue.filter((t) => t !== tag)
        : [...currentTagsValue, tag];
    setValue('tags', newTags, { shouldValidate: true });
  };
  
  const handleUseShelfAsTemplate = (shelfName: string) => {
    setNewShelfMain(shelfName);
    setNewShelfSub('');
  };

  const hierarchicalShelves = useMemo(() => {
    const shelves: Record<string, string[]> = {};
    const mainShelves: string[] = [];

    existingTags.forEach(tag => {
      const parts = tag.split('/');
      const main = parts[0];
      if (!shelves[main]) {
        shelves[main] = [];
        mainShelves.push(main);
      }
      if (parts.length > 1) {
        const sub = parts.slice(1).join('/');
        if (!shelves[main].includes(sub)) {
          shelves[main].push(sub);
        }
      }
    });

    mainShelves.sort((a,b) => a.localeCompare(b, 'tr'));
    Object.values(shelves).forEach(subs => subs.sort((a,b) => a.localeCompare(b, 'tr')));
    
    const sortedShelves: Record<string, string[]> = {};
    mainShelves.forEach(main => {
        sortedShelves[main] = shelves[main];
    });

    return sortedShelves;
  }, [existingTags]);

  const mainShelfOptions = useMemo(() => {
    return Object.keys(hierarchicalShelves).map(shelf => ({ label: shelf, value: shelf }));
  }, [hierarchicalShelves]);

  return (
    <div className="space-y-4">
        <FormField control={control} name="title" render={({ field }) => (
            <FormItem><FormLabel>Kitap Adı</FormLabel><FormControl><Input placeholder="Kitabın adını girin..." {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={control} name="author" render={({ field }) => (
            <FormItem><FormLabel>Yazar</FormLabel><FormControl><Input placeholder="Yazar Adı (Opsiyonel)" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={control} name="pageCount" render={({ field }) => (
            <FormItem><FormLabel>Sayfa Sayısı</FormLabel><FormControl><Input type="number" placeholder="Toplam Sayfa" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
        )} />
        
        <FormItem>
            <FormLabel>Kapak Resmi</FormLabel>
            <FormControl>
                <Input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
            </FormControl>
            <Card 
                className="aspect-video w-full border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
            >
                {imageValue && imageValue.startsWith('data:image') ? (
                    <Image src={imageValue} alt="Kapak önizlemesi" width={150} height={225} className="max-h-full w-auto object-contain rounded-md" data-ai-hint="book cover"/>
                ) : imageValue ? (
                    <Image src={imageValue} alt="Kapak" width={150} height={225} className="max-h-full w-auto object-contain rounded-md" data-ai-hint="book cover"/>
                ) : (
                    <>
                        <UploadCloud className="h-10 w-10"/>
                        <p className="mt-2 text-sm">Resim Yükle</p>
                        <p className="text-xs">Tıkla veya sürükle bırak</p>
                    </>
                )}
            </Card>
            <FormMessage />
        </FormItem>


        <FormField
            control={control}
            name="tags"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Raflar</FormLabel>
                    <Card className="p-4 bg-muted/50">
                        <CardTitle className="text-base mb-2">Yeni Raf Ekle</CardTitle>
                        <div className="space-y-2">
                             <Combobox
                                options={mainShelfOptions}
                                value={newShelfMain}
                                onChange={setNewShelfMain}
                                onCreate={(newValue) => { setNewShelfMain(newValue); }}
                                placeholder="Ana Raf Adı (örn: Yazarlar)"
                                notfoundText="Raf bulunamadı."
                                createText="Yeni raf oluştur:"
                            />
                            <Input
                                placeholder="Alt Raf Adı (opsiyonel, örn: Dostoyevski)"
                                value={newShelfSub}
                                onChange={(e) => setNewShelfSub(e.target.value)}
                            />
                            <Button type="button" size="sm" onClick={handleAddShelf}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Raf Ekle
                            </Button>
                        </div>
                    </Card>

                    <div className="pt-2">
                        <FormLabel className="text-xs text-muted-foreground">Seçili Raflar</FormLabel>
                        <div className="flex flex-wrap gap-1.5 mt-1.5 min-h-[26px]">
                            {(field.value || []).map((tag) => (
                            <Badge key={tag} variant="secondary" className="gap-1.5 py-1 px-2.5">
                                {tag}
                                <button type="button" aria-label={`${tag} rafını kaldır`} onClick={() => removeTag(tag)}>
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </Badge>
                            ))}
                        </div>
                    </div>

                    {Object.keys(hierarchicalShelves).length > 0 && (
                        <div className="pt-4 space-y-2">
                            <FormLabel className="text-xs text-muted-foreground">Mevcut Raflar</FormLabel>
                            <ScrollArea className="h-48 rounded-md border p-2">
                                <div className="space-y-2">
                                    {Object.entries(hierarchicalShelves).map(([main, subs]) => (
                                        <div key={main}>
                                            <div className="flex items-center gap-1">
                                                <Badge
                                                    variant={(field.value || []).includes(main) ? 'default' : 'outline'}
                                                    onClick={() => handleToggleTag(main)}
                                                    className="cursor-pointer text-sm flex-grow justify-start text-left"
                                                >
                                                    {main}
                                                </Badge>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 shrink-0"
                                                                onClick={() => handleUseShelfAsTemplate(main)}
                                                            >
                                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Bu rafa alt raf ekle</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                            {(subs as string[]).length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2 ml-4 pl-2 border-l">
                                                    {(subs as string[]).map(sub => (
                                                        <Badge
                                                            key={sub}
                                                            variant={(field.value || []).includes(`${main}/${sub}`) ? 'default' : 'outline'}
                                                            onClick={() => handleToggleTag(`${main}/${sub}`)}
                                                            className="cursor-pointer text-xs"
                                                        >
                                                            {sub}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    )}
                    <FormMessage />
                </FormItem>
            )}
        />

        <FormField control={control} name="isForChildren" render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5"><FormLabel>Çocuk Kitabı</FormLabel></div>
            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
        )} />
    </div>
  );
};
