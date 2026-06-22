"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, ListChecks, ShoppingCart, Trash2, MoreVertical, CheckCircle2, Search, Sparkles, Home, Cake, Notebook, Edit, Check, ChevronUp, ChevronDown, Mic, Apple, Beef, Milk, Wheat, Coffee, Package, Droplets, Baby, Star, ShoppingBag, X, ChevronRight } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { onShoppingListsUpdate, addShoppingList, updateShoppingList, deleteShoppingList, addShoppingListItemToList, deleteShoppingListItemFromList, toggleShoppingListItemStatusInList, moveItemToBought, moveItemToPending } from '@/lib/dataService';
import { type ShoppingList, type ShoppingItem as ShoppingListItemType } from '@/lib/data';
import { defaultShoppingItems } from "@/lib/shopping-suggestions";
import { generateShoppingListItems } from '@/ai/flows/generate-shopping-list-flow';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

// ─── CATEGORY CONFIG ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, {
  icon: React.ElementType;
  solidBg: string; solidText: string; solidBorder: string;
  lightBg: string; lightText: string; lightBorder: string;
  cardBg: string; cardText: string;
  checkBg: string; dot: string;
}> = {
  'Meyve ve Sebze':       { icon: Apple,    solidBg: 'bg-green-500',   solidText: 'text-green-600',   solidBorder: 'border-green-400',  lightBg: 'bg-green-100 dark:bg-green-900/40',   lightText: 'text-green-700 dark:text-green-300',  lightBorder: 'border-green-300 dark:border-green-700',  cardBg: 'bg-green-50 dark:bg-green-950/30',   cardText: 'text-green-800 dark:text-green-200',   checkBg: 'bg-green-500',  dot: 'bg-green-500' },
  'Et ve Tavuk Ürünleri': { icon: Beef,     solidBg: 'bg-red-500',     solidText: 'text-red-600',     solidBorder: 'border-red-400',    lightBg: 'bg-red-100 dark:bg-red-900/40',       lightText: 'text-red-700 dark:text-red-300',      lightBorder: 'border-red-300 dark:border-red-700',      cardBg: 'bg-red-50 dark:bg-red-950/30',       cardText: 'text-red-800 dark:text-red-200',       checkBg: 'bg-red-500',    dot: 'bg-red-500' },
  'Süt Ürünleri':         { icon: Milk,     solidBg: 'bg-blue-500',    solidText: 'text-blue-600',    solidBorder: 'border-blue-400',   lightBg: 'bg-blue-100 dark:bg-blue-900/40',     lightText: 'text-blue-700 dark:text-blue-300',    lightBorder: 'border-blue-300 dark:border-blue-700',    cardBg: 'bg-blue-50 dark:bg-blue-950/30',     cardText: 'text-blue-800 dark:text-blue-200',     checkBg: 'bg-blue-500',   dot: 'bg-blue-500' },
  'Unlu Mamüller':        { icon: Wheat,    solidBg: 'bg-amber-500',   solidText: 'text-amber-600',   solidBorder: 'border-amber-400',  lightBg: 'bg-amber-100 dark:bg-amber-900/40',   lightText: 'text-amber-700 dark:text-amber-300',  lightBorder: 'border-amber-300 dark:border-amber-700',  cardBg: 'bg-amber-50 dark:bg-amber-950/30',   cardText: 'text-amber-800 dark:text-amber-200',   checkBg: 'bg-amber-500',  dot: 'bg-amber-500' },
  'Temel Gıda':           { icon: Package,  solidBg: 'bg-orange-500',  solidText: 'text-orange-600',  solidBorder: 'border-orange-400', lightBg: 'bg-orange-100 dark:bg-orange-900/40', lightText: 'text-orange-700 dark:text-orange-300',lightBorder: 'border-orange-300 dark:border-orange-700',cardBg: 'bg-orange-50 dark:bg-orange-950/30', cardText: 'text-orange-800 dark:text-orange-200', checkBg: 'bg-orange-500', dot: 'bg-orange-500' },
  'Atıştırmalık':         { icon: Coffee,   solidBg: 'bg-purple-500',  solidText: 'text-purple-600',  solidBorder: 'border-purple-400', lightBg: 'bg-purple-100 dark:bg-purple-900/40', lightText: 'text-purple-700 dark:text-purple-300',lightBorder: 'border-purple-300 dark:border-purple-700',cardBg: 'bg-purple-50 dark:bg-purple-950/30', cardText: 'text-purple-800 dark:text-purple-200', checkBg: 'bg-purple-500', dot: 'bg-purple-500' },
  'İçecekler':            { icon: Droplets, solidBg: 'bg-cyan-500',    solidText: 'text-cyan-600',    solidBorder: 'border-cyan-400',   lightBg: 'bg-cyan-100 dark:bg-cyan-900/40',     lightText: 'text-cyan-700 dark:text-cyan-300',    lightBorder: 'border-cyan-300 dark:border-cyan-700',    cardBg: 'bg-cyan-50 dark:bg-cyan-950/30',     cardText: 'text-cyan-800 dark:text-cyan-200',     checkBg: 'bg-cyan-500',   dot: 'bg-cyan-500' },
  'Dondurulmuş Gıdalar':  { icon: Package,  solidBg: 'bg-sky-500',     solidText: 'text-sky-600',     solidBorder: 'border-sky-400',    lightBg: 'bg-sky-100 dark:bg-sky-900/40',       lightText: 'text-sky-700 dark:text-sky-300',      lightBorder: 'border-sky-300 dark:border-sky-700',      cardBg: 'bg-sky-50 dark:bg-sky-950/30',       cardText: 'text-sky-800 dark:text-sky-200',       checkBg: 'bg-sky-500',    dot: 'bg-sky-500' },
  'Temizlik Ürünleri':    { icon: Droplets, solidBg: 'bg-teal-500',    solidText: 'text-teal-600',    solidBorder: 'border-teal-400',   lightBg: 'bg-teal-100 dark:bg-teal-900/40',     lightText: 'text-teal-700 dark:text-teal-300',    lightBorder: 'border-teal-300 dark:border-teal-700',    cardBg: 'bg-teal-50 dark:bg-teal-950/30',     cardText: 'text-teal-800 dark:text-teal-200',     checkBg: 'bg-teal-500',   dot: 'bg-teal-500' },
  'Kişisel Bakım':        { icon: Star,     solidBg: 'bg-pink-500',    solidText: 'text-pink-600',    solidBorder: 'border-pink-400',   lightBg: 'bg-pink-100 dark:bg-pink-900/40',     lightText: 'text-pink-700 dark:text-pink-300',    lightBorder: 'border-pink-300 dark:border-pink-700',    cardBg: 'bg-pink-50 dark:bg-pink-950/30',     cardText: 'text-pink-800 dark:text-pink-200',     checkBg: 'bg-pink-500',   dot: 'bg-pink-500' },
  'Bebek Ürünleri':       { icon: Baby,     solidBg: 'bg-violet-500',  solidText: 'text-violet-600',  solidBorder: 'border-violet-400', lightBg: 'bg-violet-100 dark:bg-violet-900/40', lightText: 'text-violet-700 dark:text-violet-300',lightBorder: 'border-violet-300 dark:border-violet-700',cardBg: 'bg-violet-50 dark:bg-violet-950/30', cardText: 'text-violet-800 dark:text-violet-200', checkBg: 'bg-violet-500', dot: 'bg-violet-500' },
  'Diğer':                { icon: ShoppingBag, solidBg: 'bg-slate-400',solidText: 'text-slate-600',  solidBorder: 'border-slate-300',  lightBg: 'bg-slate-100 dark:bg-slate-800',      lightText: 'text-slate-600 dark:text-slate-300',  lightBorder: 'border-slate-300 dark:border-slate-600',  cardBg: 'bg-slate-50 dark:bg-slate-900',      cardText: 'text-slate-700 dark:text-slate-300',   checkBg: 'bg-slate-400',  dot: 'bg-slate-400' },
};
const CATEGORY_ORDER = ['Meyve ve Sebze','Et ve Tavuk Ürünleri','Süt Ürünleri','Unlu Mamüller','Temel Gıda','Atıştırmalık','İçecekler','Dondurulmuş Gıdalar','Temizlik Ürünleri','Kişisel Bakım','Bebek Ürünleri','Diğer'];

// ─── THEME CONFIG ─────────────────────────────────────────────────────────────
const LIST_THEMES = [
  { id: 'indigo',  label: 'Mor',   gradient: 'from-indigo-500 to-violet-600', gradientLight: 'from-indigo-400/20 to-violet-500/20', solidBg: 'bg-indigo-600', solidHover: 'hover:bg-indigo-700', pageBg: 'from-indigo-50 via-violet-50 to-purple-50 dark:from-indigo-950/50 dark:via-violet-950/30 dark:to-slate-950', headerBg: 'bg-indigo-600', tabActive: 'bg-indigo-600' },
  { id: 'emerald', label: 'Yeşil', gradient: 'from-emerald-500 to-teal-600',  gradientLight: 'from-emerald-400/20 to-teal-500/20',   solidBg: 'bg-emerald-600', solidHover: 'hover:bg-emerald-700', pageBg: 'from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950/50 dark:via-teal-950/30 dark:to-slate-950', headerBg: 'bg-emerald-600', tabActive: 'bg-emerald-600' },
  { id: 'rose',    label: 'Pembe', gradient: 'from-rose-500 to-pink-600',     gradientLight: 'from-rose-400/20 to-pink-500/20',      solidBg: 'bg-rose-600',    solidHover: 'hover:bg-rose-700',    pageBg: 'from-rose-50 via-pink-50 to-fuchsia-50 dark:from-rose-950/50 dark:via-pink-950/30 dark:to-slate-950', headerBg: 'bg-rose-600',    tabActive: 'bg-rose-600' },
  { id: 'amber',   label: 'Sarı',  gradient: 'from-amber-500 to-orange-600',  gradientLight: 'from-amber-400/20 to-orange-500/20',   solidBg: 'bg-amber-600',   solidHover: 'hover:bg-amber-700',   pageBg: 'from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/50 dark:via-orange-950/30 dark:to-slate-950', headerBg: 'bg-amber-600',  tabActive: 'bg-amber-600' },
  { id: 'cyan',    label: 'Mavi',  gradient: 'from-cyan-500 to-blue-600',     gradientLight: 'from-cyan-400/20 to-blue-500/20',      solidBg: 'bg-cyan-600',    solidHover: 'hover:bg-cyan-700',    pageBg: 'from-cyan-50 via-blue-50 to-sky-50 dark:from-cyan-950/50 dark:via-blue-950/30 dark:to-slate-950', headerBg: 'bg-cyan-600',    tabActive: 'bg-cyan-600' },
  { id: 'fuchsia', label: 'Fuşya', gradient: 'from-fuchsia-500 to-purple-600',gradientLight: 'from-fuchsia-400/20 to-purple-500/20', solidBg: 'bg-fuchsia-600', solidHover: 'hover:bg-fuchsia-700', pageBg: 'from-fuchsia-50 via-purple-50 to-violet-50 dark:from-fuchsia-950/50 dark:via-purple-950/30 dark:to-slate-950', headerBg: 'bg-fuchsia-600', tabActive: 'bg-fuchsia-600' },
];
const LIST_CARD_COLORS = [
  { bg: 'bg-gradient-to-br from-indigo-500 to-violet-600',  text: 'text-white' },
  { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600',   text: 'text-white' },
  { bg: 'bg-gradient-to-br from-rose-500 to-pink-600',      text: 'text-white' },
  { bg: 'bg-gradient-to-br from-amber-500 to-orange-500',   text: 'text-white' },
  { bg: 'bg-gradient-to-br from-cyan-500 to-blue-600',      text: 'text-white' },
  { bg: 'bg-gradient-to-br from-fuchsia-500 to-purple-600', text: 'text-white' },
];
const listIcons = { ShoppingCart, Home, ListChecks, Cake, Notebook, ShoppingBag };
const getTheme = (id?: string) => LIST_THEMES.find(t => t.id === id) || LIST_THEMES[0];
const getCardColor = (idx: number) => LIST_CARD_COLORS[idx % LIST_CARD_COLORS.length];

// ─── FORM SCHEMA ──────────────────────────────────────────────────────────────
const createListSchema = z.object({
  name:    z.string().min(2, "Liste adı en az 2 karakter olmalıdır."),
  icon:    z.string().min(1),
  colorId: z.string().optional(),
});
type CreateListFormData = z.infer<typeof createListSchema>;

// ─── CREATE / EDIT LIST DIALOG ────────────────────────────────────────────────
function CreateListDialog({ isOpen, onOpenChange, onCreate, initialData }: {
  isOpen: boolean; onOpenChange: (o: boolean) => void;
  onCreate: (d: CreateListFormData) => void;
  initialData?: ShoppingList | null;
}) {
  const form = useForm<CreateListFormData>({ resolver: zodResolver(createListSchema), defaultValues: { name: '', icon: 'ShoppingCart', colorId: 'indigo' } });
  useEffect(() => {
    if (isOpen) form.reset(initialData ? { name: initialData.name, icon: initialData.icon, colorId: initialData.colorId || 'indigo' } : { name: '', icon: 'ShoppingCart', colorId: 'indigo' });
  }, [initialData, form, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">
            {initialData ? '✏️ Listeyi Düzenle' : '🛒 Yeni Liste Oluştur'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onCreate)} className="space-y-5 pt-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Liste Adı</FormLabel>
                <FormControl>
                  <Input placeholder="Örn: Haftalık Market..." className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl h-12 text-base focus:border-indigo-500 transition-all" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="icon" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">İkon</FormLabel>
                <div className="flex gap-2.5">
                  {Object.keys(listIcons).map(iconName => {
                    const Icon = listIcons[iconName as keyof typeof listIcons];
                    return (
                      <div key={iconName} onClick={() => field.onChange(iconName)}
                        className={cn("p-3 rounded-xl cursor-pointer transition-all border-2 active:scale-95",
                          field.value === iconName ? "bg-indigo-600 text-white border-indigo-500 shadow-lg scale-110" : "bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-300")}>
                        <Icon className="h-5 w-5" />
                      </div>
                    );
                  })}
                </div>
              </FormItem>
            )} />

            <FormField control={form.control} name="colorId" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Tema Rengi</FormLabel>
                <div className="flex gap-3 flex-wrap">
                  {LIST_THEMES.map(theme => (
                    <div key={theme.id} onClick={() => field.onChange(theme.id)}
                      className={cn("group flex flex-col items-center gap-1 cursor-pointer transition-all active:scale-90")}>
                      <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br transition-all", theme.gradient,
                        field.value === theme.id ? "ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110 shadow-lg" : "opacity-70 hover:opacity-100 hover:scale-105")} />
                      <span className="text-[9px] font-bold text-slate-400">{theme.label}</span>
                    </div>
                  ))}
                </div>
              </FormItem>
            )} />

            <DialogFooter className="gap-2 flex-row justify-end mt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-500 flex-1 h-12 rounded-xl">İptal</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 flex-1 h-12">Kaydet</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── LIST CARD (Home screen) ── colorful solid gradient ───────────────────────
function ListCard({ list, idx, onClick, onEdit, onDelete, onMove, isFirst, isLast }: {
  list: ShoppingList; idx: number; onClick: () => void; onEdit: () => void;
  onDelete: (id: string) => void; onMove: (d: 'up' | 'down') => void;
  isFirst: boolean; isLast: boolean;
}) {
  const Icon = listIcons[list.icon as keyof typeof listIcons] || ShoppingCart;
  const items = list.items || [];
  const boughtItems = list.boughtItems || [];
  const total = items.length + boughtItems.length;
  const progress = total === 0 ? 0 : Math.round((boughtItems.length / total) * 100);
  const theme = getTheme(list.colorId);
  const done = progress === 100 && total > 0;

  return (
    <div onClick={onClick}
      className={cn(
        "group relative rounded-[1.5rem] overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.97] min-h-[180px] flex flex-col justify-between p-5",
        `bg-gradient-to-br ${theme.gradient}`
      )}>
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      {/* Top row */}
      <div className="flex items-start justify-between relative z-10">
        <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-2xl">
          <Icon className="h-6 w-6 text-white" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"
              className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-white active:scale-95"
              onClick={e => e.stopPropagation()}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-44 p-1">
            {!isFirst && <DropdownMenuItem onClick={e => { e.stopPropagation(); onMove('up'); }} className="cursor-pointer rounded-lg gap-2"><ChevronUp className="h-4 w-4 text-indigo-500" />Yukarı Taşı</DropdownMenuItem>}
            {!isLast && <DropdownMenuItem onClick={e => { e.stopPropagation(); onMove('down'); }} className="cursor-pointer rounded-lg gap-2"><ChevronDown className="h-4 w-4 text-indigo-500" />Aşağı Taşı</DropdownMenuItem>}
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
            <DropdownMenuItem onClick={e => { e.stopPropagation(); onEdit(); }} className="cursor-pointer rounded-lg gap-2"><Edit className="h-4 w-4 text-slate-500" />Düzenle</DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={e => e.preventDefault()} onClick={e => e.stopPropagation()} className="text-rose-600 hover:bg-rose-50 cursor-pointer rounded-lg gap-2">
                  <Trash2 className="h-4 w-4" />Sil
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-[90%] max-w-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl p-5" onClick={e => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitleComponent>Listeyi sil?</AlertDialogTitleComponent>
                  <AlertDialogDescription>Bu liste ve tüm ürünleri kalıcı olarak silinecek.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2">
                  <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800 border-0 h-11 rounded-xl m-0">İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={e => { e.stopPropagation(); onDelete(list.id); }} className="bg-rose-600 hover:bg-rose-700 text-white h-11 rounded-xl m-0">Sil</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bottom info */}
      <div className="relative z-10">
        <h3 className="font-black text-xl text-white leading-snug mb-1 drop-shadow-sm">{list.name}</h3>
        <div className="flex items-center justify-between text-white/80 text-xs font-semibold mb-3">
          <span>{items.length} ürün bekliyor</span>
          {done
            ? <span className="flex items-center gap-1 text-white font-bold"><CheckCircle2 className="h-3.5 w-3.5" />Tamamlandı!</span>
            : <span>{boughtItems.length}/{total} alındı</span>
          }
        </div>
        <div className="h-2 w-full bg-white/25 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── ITEM ROW (inside list detail) ── vibrant category colored ────────────────
function ItemRow({ item, onToggle, onConfirmBuy, onDelete, isBought }: {
  item: ShoppingListItemType;
  onToggle: () => void; onConfirmBuy: () => void; onDelete: () => void; isBought: boolean;
}) {
  const cat = CATEGORY_CONFIG[item.category || 'Diğer'] || CATEGORY_CONFIG['Diğer'];
  const CatIcon = cat.icon;

  if (isBought) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-800 rounded-2xl group opacity-70">
        <button onClick={e => { e.stopPropagation(); onConfirmBuy(); }}
          className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 hover:bg-emerald-600 active:scale-90 transition-all shadow-sm">
          <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
        </button>
        <div className={cn("p-1.5 rounded-lg flex-shrink-0 opacity-50", cat.lightBg)}>
          <CatIcon className={cn("h-3.5 w-3.5", cat.solidText)} />
        </div>
        <span className="flex-grow font-semibold text-sm line-through text-slate-400 dark:text-slate-500 truncate">{item.name}</span>
        <button onClick={e => { e.stopPropagation(); onDelete(); }}
          className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 md:opacity-0 md:group-hover:opacity-100 transition-all active:scale-90">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div onClick={onToggle}
      className={cn(
        "group relative flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.99] border-2 hover:shadow-md",
        cat.cardBg, cat.lightBorder
      )}>
      {/* Unchecked circle — category color border */}
      <div className={cn(
        "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all bg-white dark:bg-slate-900",
        cat.lightBorder
      )} />

      {/* Category icon badge — solid color */}
      <div className={cn("p-2 rounded-xl flex-shrink-0 shadow-sm", cat.lightBg, "border", cat.lightBorder)}>
        <CatIcon className={cn("h-4 w-4", cat.solidText)} />
      </div>

      {/* Name */}
      <span className={cn("flex-grow font-bold text-sm", cat.cardText)}>
        {item.name}
      </span>

      {/* Delete */}
      <button onClick={e => { e.stopPropagation(); onDelete(); }}
        className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-white/80 dark:hover:bg-rose-950/30 md:opacity-0 md:group-hover:opacity-100 transition-all active:scale-90">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ShoppingPage() {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();

  const [isListDialogOpen, setListDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<ShoppingList | null>(null);
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'bought'>('pending');

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const unsub = onShoppingListsUpdate(lists => {
      setShoppingLists(lists.sort((a, b) => {
        const oA = a.order ?? 0, oB = b.order ?? 0;
        if (oA !== oB) return oA - oB;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      }));
      setIsLoaded(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedList) {
      const updated = shoppingLists.find(l => l.id === selectedList.id);
      setSelectedList(updated || null);
    }
  }, [shoppingLists, selectedList?.id]);

  const historicalItems = useMemo(() => {
    const items = new Set<string>();
    shoppingLists.forEach(l => {
      (l.items || []).forEach(i => items.add(i.name));
      (l.boughtItems || []).forEach(i => items.add(i.name));
    });
    return Array.from(items);
  }, [shoppingLists]);

  useEffect(() => {
    if (!newItemName.trim()) { setSuggestions([]); return; }
    const q = newItemName.toLowerCase();
    const hist = historicalItems.filter(i => i.toLowerCase().startsWith(q)).slice(0, 3);
    const def = defaultShoppingItems.filter(i => i.toLowerCase().startsWith(q) && !hist.includes(i)).slice(0, 3);
    setSuggestions([...hist, ...def]);
  }, [newItemName, historicalItems]);

  const toggleVoice = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isListening && recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); return; }
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { toast({ title: "Desteklenmiyor", variant: 'destructive' }); return; }
    // @ts-ignore
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR(); recognitionRef.current = rec;
    rec.lang = 'tr-TR'; rec.continuous = true; rec.interimResults = true;
    const base = newItemName ? newItemName + ' ' : '';
    rec.onstart = () => setIsListening(true);
    rec.onresult = (ev: any) => { let t = ''; for (let i = 0; i < ev.results.length; ++i) t += ev.results[i][0].transcript; setNewItemName(base + t); inputRef.current?.focus(); };
    rec.onerror = rec.onend = () => setIsListening(false);
    rec.start();
  };

  const handleCreateOrUpdateList = async (data: CreateListFormData) => {
    try {
      if (editingList) { await updateShoppingList(editingList.id, { name: data.name, icon: data.icon, colorId: data.colorId }); toast({ title: "Liste güncellendi ✅" }); }
      else { await addShoppingList(data.name, data.icon, data.colorId); toast({ title: "Yeni liste oluşturuldu 🛒" }); }
      setListDialogOpen(false); setEditingList(null);
    } catch { toast({ title: "Hata", variant: 'destructive' }); }
  };

  const handleAddItem = async (e?: React.FormEvent, name?: string) => {
    e?.preventDefault();
    const itemName = name || newItemName;
    if (!itemName.trim() || !selectedList) return;
    setIsAiProcessing(true);
    try {
      const complex = itemName.includes(',') || itemName.includes('malzemeleri') || itemName.includes('için');
      if (complex) {
        const res = await generateShoppingListItems(itemName.trim());
        if (res?.items?.length > 0) { for (const it of res.items) await addShoppingListItemToList(selectedList.id, it); toast({ title: `✨ ${res.items.length} ürün eklendi` }); }
        else await addShoppingListItemToList(selectedList.id, { name: itemName.trim(), category: 'Diğer' });
      } else {
        await addShoppingListItemToList(selectedList.id, { name: itemName.trim(), category: 'Diğer' });
      }
    } catch { await addShoppingListItemToList(selectedList.id, { name: itemName.trim(), category: 'Diğer' }); }
    finally { setNewItemName(''); setIsAiProcessing(false); inputRef.current?.focus(); }
  };

  const handleDeleteList = async (id: string) => {
    try { await deleteShoppingList(id); if (selectedList?.id === id) setSelectedList(null); toast({ title: "Liste silindi" }); }
    catch { toast({ title: "Hata", variant: "destructive" }); }
  };

  const handleMoveList = async (list: ShoppingList, dir: 'up' | 'down') => {
    const idx = shoppingLists.findIndex(l => l.id === list.id);
    const tIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (tIdx < 0 || tIdx >= shoppingLists.length) return;
    const target = shoppingLists[tIdx];
    try { await updateShoppingList(list.id, { order: target.order ?? tIdx }); await updateShoppingList(target.id, { order: list.order ?? idx }); }
    catch { toast({ title: "Hata", variant: "destructive" }); }
  };

  if (!isLoaded) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-950 dark:to-slate-900">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ─── LIST DETAIL VIEW ─────────────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  if (selectedList) {
    const theme = getTheme(selectedList.colorId);
    const pendingItems = (selectedList.items || []).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    const boughtItems  = (selectedList.boughtItems || []).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    const total = pendingItems.length + boughtItems.length;
    const progress = total === 0 ? 0 : Math.round((boughtItems.length / total) * 100);

    const grouped = pendingItems.reduce((acc, item) => {
      const cat = item.category || 'Diğer';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, ShoppingListItemType[]>);
    const sortedCategories = Object.entries(grouped).sort(([a], [b]) =>
      CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b)
    );

    const ListIcon = listIcons[selectedList.icon as keyof typeof listIcons] || ShoppingCart;

    return (
      <div className={cn("min-h-screen flex flex-col pb-28 bg-gradient-to-b", theme.pageBg)}>
        {/* Colorful sticky header */}
        <div className={cn("sticky top-0 z-40 bg-gradient-to-r text-white shadow-lg", theme.gradient)}>
          <div className="px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon"
              className="rounded-full h-9 w-9 bg-white/20 hover:bg-white/30 text-white active:scale-95"
              onClick={() => setSelectedList(null)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="p-2 bg-white/20 rounded-xl">
              <ListIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-black text-white leading-tight truncate">{selectedList.name}</h1>
              <p className="text-xs text-white/70 font-semibold">{pendingItems.length} bekliyor · {boughtItems.length} alındı</p>
            </div>
            {total > 0 && (
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-xl">
                <div className="w-14 h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-white transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs font-black text-white">{progress}%</span>
              </div>
            )}
          </div>

          {/* Tabs inside colored header */}
          <div className="px-4 pb-4 flex gap-2">
            {(['pending', 'bought'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn("flex-1 h-9 rounded-xl text-xs font-bold transition-all",
                  activeTab === tab
                    ? "bg-white text-slate-800 shadow-md"
                    : "bg-white/20 text-white hover:bg-white/30"
                )}>
                {tab === 'pending' ? `🛒 Alınacaklar (${pendingItems.length})` : `✅ Alınanlar (${boughtItems.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 pt-5">
          {activeTab === 'pending' && (
            <>
              {pendingItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 rounded-full bg-white/80 dark:bg-slate-900/80 shadow-lg flex items-center justify-center mb-4">
                    <ListChecks className="h-10 w-10 text-slate-400" />
                  </div>
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-lg">Liste boş!</p>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">+ butonuna basarak ürün ekle.</p>
                </div>
              ) : (
                <div className="space-y-5 pb-4">
                  {sortedCategories.map(([category, items]) => {
                    const cat = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['Diğer'];
                    const CatIcon = cat.icon;
                    return (
                      <div key={category}>
                        {/* Colored category header pill */}
                        <div className={cn("flex items-center gap-3 px-4 py-3 rounded-2xl mb-2 shadow-sm", cat.lightBg, "border-2", cat.lightBorder)}>
                          <div className={cn("p-2 rounded-xl shadow-sm", cat.solidBg)}>
                            <CatIcon className="h-4 w-4 text-white" />
                          </div>
                          <span className={cn("text-xs font-black uppercase tracking-widest", cat.solidText)}>{category}</span>
                          <div className={cn("ml-auto flex items-center justify-center min-w-[24px] h-6 rounded-full text-[11px] font-black text-white shadow-sm px-2", cat.solidBg)}>
                            {items.length}
                          </div>
                        </div>
                        {/* Items */}
                        <div className="space-y-2">
                          {items.map((item, idx) => (
                            <ItemRow key={`${item.id}-${idx}`} item={item} isBought={!!item.isBought}
                              onToggle={() => toggleShoppingListItemStatusInList(selectedList.id, item.id, !item.isBought)}
                              onConfirmBuy={() => moveItemToBought(selectedList.id, item.id)}
                              onDelete={() => deleteShoppingListItemFromList(selectedList.id, item.id, false)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'bought' && (
            <>
              {boughtItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                  <CheckCircle2 className="h-12 w-12 text-slate-400 mb-3" />
                  <p className="font-bold text-slate-500 dark:text-slate-400">Henüz alınan ürün yok.</p>
                </div>
              ) : (
                <div className="space-y-2 pb-4">
                  {boughtItems.map((item, idx) => (
                    <ItemRow key={`${item.id}-${idx}`} item={item} isBought={true}
                      onToggle={() => moveItemToPending(selectedList.id, item.id)}
                      onConfirmBuy={() => moveItemToPending(selectedList.id, item.id)}
                      onDelete={() => deleteShoppingListItemFromList(selectedList.id, item.id, true)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* FAB */}
        <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50">
          <Button className={cn("rounded-[1.2rem] w-14 h-14 shadow-xl text-white active:scale-90 transition-all bg-gradient-to-br", theme.gradient, "shadow-black/20")}
            size="icon" onClick={() => setIsAddItemOpen(true)}>
            <Plus className="h-6 w-6" />
          </Button>
        </div>

        {/* Add Item Dialog */}
        <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
          <DialogContent className="w-[95%] sm:max-w-md rounded-[2rem] border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 top-[40%] p-5">
            <DialogHeader className="text-left">
              <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">🛒 Ürün Ekle</DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs font-medium">Hızlı ekle veya yapay zeka ile liste oluştur.</DialogDescription>
            </DialogHeader>
            <div className="pt-2 space-y-3">
              <form onSubmit={handleAddItem} className="flex items-center gap-2">
                <div className="relative flex-grow">
                  <Input ref={inputRef} value={newItemName} onChange={e => setNewItemName(e.target.value)}
                    placeholder="2kg domates, süt, ekmek..." autoComplete="off"
                    className="pl-4 pr-20 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-indigo-500 transition-all text-sm" />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button type="button" onClick={toggleVoice}
                      className={cn("h-8 w-8 rounded-xl flex items-center justify-center transition-all",
                        isListening ? "bg-rose-100 text-rose-600 animate-pulse" : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50")}>
                      <Mic className="h-4 w-4" />
                    </button>
                    {isAiProcessing && <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />}
                  </div>
                </div>
                <Button type="submit" size="icon"
                  className={cn("h-12 w-12 shrink-0 rounded-2xl shadow-md text-white active:scale-95 transition-all bg-gradient-to-br", theme.gradient)}
                  disabled={!newItemName.trim() || isAiProcessing}>
                  <Plus className="h-5 w-5" />
                </Button>
              </form>
              {suggestions.length > 0 && newItemName.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                  {suggestions.map((s, i) => (
                    <button key={i} type="button" onClick={() => { handleAddItem(undefined, s); setNewItemName(''); setSuggestions([]); }}
                      className="w-full px-4 py-2.5 text-left text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <Search className="h-3.5 w-3.5 text-slate-400" />{s}
                      <ChevronRight className="h-3.5 w-3.5 text-slate-300 ml-auto" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ─── HOME VIEW ── colorful gradient background ────────────────────────────
  // ══════════════════════════════════════════════════════════════════════════
  const totalPending = shoppingLists.reduce((s, l) => s + (l.items || []).length, 0);
  const totalBought  = shoppingLists.reduce((s, l) => s + (l.boughtItems || []).length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-violet-50 to-fuchsia-100 dark:from-slate-950 dark:via-indigo-950/30 dark:to-slate-950 relative overflow-x-hidden">
      {/* Big colorful blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-80 h-80 bg-indigo-400/30 dark:bg-indigo-700/20 rounded-full blur-3xl" />
        <div className="absolute top-[20%] right-[-10%] w-72 h-72 bg-fuchsia-400/20 dark:bg-fuchsia-700/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] left-[20%] w-64 h-64 bg-violet-400/20 dark:bg-violet-700/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6 pb-32 space-y-6">
        {/* ── Header ── */}
        <div className="pt-4 md:pt-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/30">
              <ShoppingCart className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Alışveriş <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-fuchsia-600">Listeleri</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">İhtiyaçlarını organize et.</p>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        {shoppingLists.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Liste', val: shoppingLists.length, gradient: 'from-indigo-500 to-violet-600', emoji: '📋' },
              { label: 'Alınacak', val: totalPending, gradient: 'from-amber-500 to-orange-500', emoji: '🛒' },
              { label: 'Alındı', val: totalBought, gradient: 'from-emerald-500 to-teal-500', emoji: '✅' },
            ].map(s => (
              <div key={s.label} className={cn("rounded-2xl p-4 flex flex-col items-center justify-center gap-1 text-white shadow-lg bg-gradient-to-br", s.gradient)}>
                <span className="text-2xl">{s.emoji}</span>
                <span className="text-2xl font-black">{s.val}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Lists Grid ── */}
        {shoppingLists.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Listelerim</h2>
              <Button onClick={() => { setEditingList(null); setListDialogOpen(true); }}
                className="h-9 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md shadow-indigo-500/30">
                <Plus className="h-3.5 w-3.5 mr-1" /> Yeni Liste
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {shoppingLists.map((list, index) => (
                <ListCard key={list.id} list={list} idx={index}
                  onClick={() => { setSelectedList(list); setActiveTab('pending'); }}
                  onEdit={() => { setEditingList(list); setListDialogOpen(true); }}
                  onDelete={handleDeleteList}
                  onMove={dir => handleMoveList(list, dir)}
                  isFirst={index === 0}
                  isLast={index === shoppingLists.length - 1}
                />
              ))}
              {/* Add new card */}
              <button onClick={() => { setEditingList(null); setListDialogOpen(true); }}
                className="group border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-[1.5rem] flex flex-col items-center justify-center min-h-[180px] gap-3 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/20 transition-all duration-300 active:scale-95 bg-white/40 dark:bg-slate-900/30 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-indigo-300 dark:border-indigo-700 group-hover:border-indigo-500 flex items-center justify-center transition-all">
                  <Plus className="h-5 w-5 text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <span className="text-xs font-bold text-indigo-400 group-hover:text-indigo-600 transition-colors">Yeni Liste</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-indigo-300 dark:bg-indigo-700 blur-3xl opacity-30 rounded-full" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/40 rotate-6 hover:rotate-0 transition-transform duration-500">
                <ShoppingCart className="h-12 w-12 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Alışverişe Başla</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm leading-relaxed max-w-xs">Haftalık market, pazar veya özel günler için renkli listeler oluşturun.</p>
            <Button onClick={() => { setEditingList(null); setListDialogOpen(true); }}
              className="rounded-2xl h-14 px-8 text-base font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-xl shadow-indigo-500/30 active:scale-[0.98]">
              <Plus className="mr-2 h-5 w-5" /> İlk Listeyi Oluştur
            </Button>
          </div>
        )}
      </div>

      {/* Mobile FAB */}
      {shoppingLists.length > 0 && (
        <div className="fixed bottom-24 right-4 md:hidden z-40">
          <Button className="rounded-[1.2rem] w-14 h-14 shadow-xl shadow-indigo-500/30 bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white active:scale-90 transition-all"
            size="icon" onClick={() => { setEditingList(null); setListDialogOpen(true); }}>
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      )}

      <CreateListDialog isOpen={isListDialogOpen} onOpenChange={setListDialogOpen} onCreate={handleCreateOrUpdateList} initialData={editingList} />
    </div>
  );
}
