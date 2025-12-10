"use client";

import * as React from "react";
import { PlusCircle, Search, Clock, Soup, Star, ChevronLeft, ChevronRight, XCircle, Wheat, BarChart2, MoreVertical, Edit, Trash2, Calendar as CalendarIcon, Save, Utensils, Flame, Activity, PieChart as PieChartIcon, CalendarPlus, Check, ArrowLeft, TrendingUp } from "lucide-react";
import { format, addDays, startOfWeek, parseISO, subDays, startOfMonth, endOfMonth, endOfDay, addWeeks, subWeeks, addMonths, subMonths, isWithinInterval, eachDayOfInterval, isSameDay } from "date-fns";
import { tr } from "date-fns/locale";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Recipe, MealPlan, CalorieLog } from "@/lib/data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { onMealPlanUpdate, onRecipesUpdate, addRecipe, updateRecipe, deleteRecipe, updateMealPlan, onCalorieLogsUpdate, upsertCalorieLog } from "@/lib/dataService";
import { cn } from "@/lib/utils";
import { NewRecipeForm } from "@/components/new-recipe-form";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/components/auth-provider";
import { Calendar } from "@/components/ui/calendar";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

// --- DESIGN SYSTEM: Glassmorphism Colors ---
const glassColors = {
    CARD_BG: "bg-white/5 backdrop-blur-md border border-white/10 shadow-lg",
    CARD_HOVER: "hover:bg-white/10 hover:border-white/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
    TEXT_MAIN: "text-slate-100",
    TEXT_MUTED: "text-slate-400",
    HEADER_BG: "bg-slate-950/70 backdrop-blur-lg border-b border-white/5",
    ICON_BOX: "bg-gradient-to-br from-orange-500 to-amber-500 p-2 rounded-xl shadow-lg",
    BUTTON_GLASS: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
};

const categoryColors: { [key: string]: string } = {
  "Çorba": "bg-amber-500/20 text-amber-200 border-amber-500/30",
  "Ana Yemek": "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
  "Salata": "bg-green-500/20 text-green-200 border-green-500/30",
  "Tatlı": "bg-pink-500/20 text-pink-200 border-pink-500/30",
  "Kahvaltılık": "bg-orange-500/20 text-orange-200 border-orange-500/30",
  "Hamur İşi": "bg-yellow-500/20 text-yellow-200 border-yellow-500/30",
  "Diğer": "bg-slate-500/20 text-slate-200 border-slate-500/30",
};

const mealTypes = ["Kahvaltı", "Akşam Yemeği"];

const calorieFormSchema = z.object({
    caloriesTaken: z.coerce.number().min(0, "Değer pozitif olmalı.").default(0),
    caloriesBurned: z.coerce.number().min(0, "Değer pozitif olmalı.").default(0),
    protein: z.coerce.number().min(0, "Değer pozitif olmalı.").default(0),
    carbs: z.coerce.number().min(0, "Değer pozitif olmalı.").default(0),
    fat: z.coerce.number().min(0, "Değer pozitif olmalı.").default(0),
});

function CalorieTracker() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = React.useState<Date>(new Date());
    const [allLogs, setAllLogs] = React.useState<CalorieLog[]>([]);
    const [statsDate, setStatsDate] = React.useState<Date>(new Date());
    const [statsPeriod, setStatsPeriod] = React.useState<'weekly' | 'monthly'>('weekly');

    React.useEffect(() => {
        const unsub = onCalorieLogsUpdate(setAllLogs);
        return () => unsub();
    }, []);

    const form = useForm<z.infer<typeof calorieFormSchema>>({
        resolver: zodResolver(calorieFormSchema),
        defaultValues: { caloriesTaken: 0, caloriesBurned: 0, protein: 0, carbs: 0, fat: 0 },
    });
    
    React.useEffect(() => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        const todaysLog = allLogs.find(log => log.id === dateKey);
        form.reset(todaysLog || { caloriesTaken: 0, caloriesBurned: 0, protein: 0, carbs: 0, fat: 0 });
    }, [selectedDate, allLogs, form]);

    const { watch, handleSubmit } = form;
    const watchedValues = watch();
    const calorieDifference = watchedValues.caloriesTaken - watchedValues.caloriesBurned;
    const calorieStatus = calorieDifference > 0 ? "Fazla" : calorieDifference < 0 ? "Açık" : "Denge";

    const onSubmit = async (data: z.infer<typeof calorieFormSchema>) => {
        if (!user) {
            toast({ title: 'Hata', description: 'Giriş yapmalısınız.', variant: 'destructive' });
            return;
        }
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        try {
            await upsertCalorieLog({ id: dateKey, ...data });
            toast({ title: 'Kaydedildi!', description: `${format(selectedDate, 'dd MMMM')} verileri güncellendi.` });
        } catch (error) {
            toast({ title: 'Hata', variant: 'destructive' });
        }
    };
    
    const { chartData, macroData, stats } = React.useMemo(() => {
        let startDate: Date;
        let endDate: Date;

        if (statsPeriod === 'weekly') {
            startDate = startOfWeek(statsDate, { weekStartsOn: 1 });
            endDate = endOfDay(addDays(startDate, 6));
        } else { 
            startDate = startOfMonth(statsDate);
            endDate = endOfMonth(statsDate);
        }
        
        const relevantLogs = allLogs.filter(log => {
             const logDate = parseISO(log.id);
             return logDate >= startDate && logDate <= endDate;
        });
        
        let totalTaken = 0, totalBurned = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
        const dataByPeriod: { [key: string]: CalorieLog } = {};
        const periodDays = eachDayOfInterval({start: startDate, end: endDate});

        periodDays.forEach(day => {
            const dayKey = statsPeriod === 'weekly' ? format(day, 'EEE', { locale: tr }) : format(day, 'dd MMM');
            dataByPeriod[dayKey] = { id: dayKey, caloriesTaken: 0, caloriesBurned: 0, protein: 0, carbs: 0, fat: 0, familyId: ''};
        });

        relevantLogs.forEach(log => {
            totalTaken += log.caloriesTaken;
            totalBurned += log.caloriesBurned;
            totalProtein += log.protein;
            totalCarbs += log.carbs;
            totalFat += log.fat;
            
            const logDate = parseISO(log.id);
            const key = statsPeriod === 'weekly' ? format(logDate, 'EEE', { locale: tr }) : format(logDate, 'dd MMM');
            if (dataByPeriod[key]) {
                dataByPeriod[key].caloriesTaken += log.caloriesTaken;
                dataByPeriod[key].caloriesBurned += log.caloriesBurned;
            }
        });

        const chartData = Object.entries(dataByPeriod).map(([name, data]) => ({
            name,
            "Net": data.caloriesTaken - data.caloriesBurned,
        }));
        
        const totalMacros = totalProtein + totalCarbs + totalFat;
        const macroData = totalMacros > 0 ? [
            { name: 'Protein', value: totalProtein, fill: '#8b5cf6' },
            { name: 'Karb.', value: totalCarbs, fill: '#3b82f6' },
            { name: 'Yağ', value: totalFat, fill: '#f43f5e' },
        ] : [];

        return { stats: { totalTaken, totalBurned, totalDeficit: totalTaken - totalBurned, totalProtein, totalCarbs, totalFat }, chartData, macroData };
    }, [allLogs, statsDate, statsPeriod]);

    const barChartConfig = {
        Net: { label: "Net Kalori", color: "#10b981" },
    } satisfies ChartConfig;

    const pieChartConfig = {
        Protein: { label: "Protein", color: "#8b5cf6" },
        Carbs: { label: "Karb.", color: "#3b82f6" },
        Fat: { label: "Yağ", color: "#f43f5e" },
    } satisfies ChartConfig;

    const handleStatsNav = (direction: 'prev' | 'next') => {
        if (statsPeriod === 'weekly') setStatsDate(d => direction === 'prev' ? subWeeks(d, 1) : addWeeks(d, 1));
        else setStatsDate(d => direction === 'prev' ? subMonths(d, 1) : addMonths(d, 1));
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className={cn(glassColors.CARD_BG)}>
                <CardHeader className="pb-4 border-b border-white/5">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <CardTitle className={cn("text-xl font-bold flex items-center gap-2", glassColors.TEXT_MAIN)}>
                            <Activity className="h-5 w-5 text-indigo-400" /> Günlük Giriş
                        </CardTitle>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className={cn("w-full sm:w-auto rounded-full border-white/10 text-slate-300", glassColors.BUTTON_GLASS)}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {format(selectedDate, "d MMM yyyy", { locale: tr })}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10 text-slate-100">
                                <Calendar mode="single" selected={selectedDate} onSelect={(date) => setSelectedDate(date || new Date())} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="flex justify-center mb-8">
                        <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center rounded-full border-8 border-white/5 shadow-inner bg-white/5 backdrop-blur-md">
                            <div className="text-center">
                                <p className={cn("text-[10px] sm:text-xs font-bold uppercase tracking-wide mb-1", glassColors.TEXT_MUTED)}>Net Kalori</p>
                                <p className={cn("text-2xl sm:text-3xl font-black", calorieDifference > 0 ? "text-rose-400" : "text-emerald-400")}>
                                    {Math.abs(calorieDifference)}
                                </p>
                                <Badge variant="secondary" className="mt-2 bg-white/10 text-slate-300 text-[10px] sm:text-xs border-0">{calorieStatus}</Badge>
                            </div>
                        </div>
                    </div>

                    <Form {...form}>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="caloriesTaken" render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs font-bold text-slate-400 uppercase">Alınan</FormLabel>
                                        <FormControl><Input type="number" className="bg-white/5 border-white/10 h-12 text-lg font-bold text-slate-200 text-center focus:bg-white/10" {...field} /></FormControl>
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="caloriesBurned" render={({ field }) => (
                                    <FormItem className="space-y-1">
                                        <FormLabel className="text-xs font-bold text-slate-400 uppercase">Yakılan</FormLabel>
                                        <FormControl><Input type="number" className="bg-white/5 border-white/10 h-12 text-lg font-bold text-slate-200 text-center focus:bg-white/10" {...field} /></FormControl>
                                    </FormItem>
                                )}/>
                            </div>
                            
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide text-center">Makro Besinler (g)</p>
                                <div className="grid grid-cols-3 gap-3">
                                    <FormField control={form.control} name="protein" render={({ field }) => (
                                        <FormItem className="space-y-1 text-center">
                                            <FormLabel className="text-[10px] text-indigo-400 font-bold">PRO</FormLabel>
                                            <FormControl><Input type="number" className="h-9 text-sm bg-white/5 border-white/10 text-center text-slate-300" {...field} /></FormControl>
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="carbs" render={({ field }) => (
                                        <FormItem className="space-y-1 text-center">
                                            <FormLabel className="text-[10px] text-blue-400 font-bold">KARB</FormLabel>
                                            <FormControl><Input type="number" className="h-9 text-sm bg-white/5 border-white/10 text-center text-slate-300" {...field} /></FormControl>
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="fat" render={({ field }) => (
                                        <FormItem className="space-y-1 text-center">
                                            <FormLabel className="text-[10px] text-rose-400 font-bold">YAĞ</FormLabel>
                                            <FormControl><Input type="number" className="h-9 text-sm bg-white/5 border-white/10 text-center text-slate-300" {...field} /></FormControl>
                                        </FormItem>
                                    )}/>
                                </div>
                            </div>

                            <Button type="submit" className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20 border border-indigo-400/20">
                                <Save className="mr-2 h-4 w-4" /> Günü Kaydet
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Card className={cn(glassColors.CARD_BG)}>
                <CardHeader className="border-b border-white/5">
                    <div className="flex items-center justify-between">
                        <CardTitle className={cn("text-xl font-bold flex items-center gap-2", glassColors.TEXT_MAIN)}>
                            <BarChart2 className="h-5 w-5 text-indigo-400" /> Analiz
                        </CardTitle>
                        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-full border border-white/10">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10 text-slate-300" onClick={() => handleStatsNav('prev')}><ChevronLeft className="h-4 w-4"/></Button>
                            <span className="text-sm font-bold text-slate-300 w-24 text-center">{format(statsDate, statsPeriod === 'weekly' ? 'MMM' : 'yyyy', {locale: tr})}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10 text-slate-300" onClick={() => handleStatsNav('next')}><ChevronRight className="h-4 w-4"/></Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="h-56 w-full">
                        <ChartContainer config={barChartConfig} className="h-full w-full">
                            <BarChart data={chartData} accessibilityLayer>
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={<ChartTooltipContent hideLabel className="bg-slate-900 border-white/10 text-slate-100" />} />
                                <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                                <Bar dataKey="Net" radius={[4, 4, 4, 4]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry["Net"] >= 0 ? "#f43f5e" : "#10b981" } />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-center items-center">
                            <p className="text-xs font-bold text-slate-400 mb-2 uppercase">Makro Dağılımı</p>
                            <div className="h-32 w-full">
                                <ChartContainer config={pieChartConfig} className="h-full w-full aspect-square mx-auto">
                                    <PieChart>
                                        <Pie data={macroData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={50} stroke="none">
                                            {macroData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                        </Pie>
                                        <ChartTooltip content={<ChartTooltipContent hideLabel className="bg-slate-900 border-white/10 text-slate-100" />} />
                                    </PieChart>
                                </ChartContainer>
                            </div>
                            <div className="flex gap-3 text-[10px] font-bold text-slate-400 mt-2">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-violet-500"/>Pro</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"/>Karb</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"/>Yağ</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                                <p className="text-xs text-indigo-300 font-bold mb-1 uppercase">Top. Alınan</p>
                                <p className="text-lg font-black text-indigo-400">{stats.totalTaken.toLocaleString()} kcal</p>
                            </div>
                            <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
                                <p className="text-xs text-orange-300 font-bold mb-1 uppercase">Top. Yakılan</p>
                                <p className="text-lg font-black text-orange-400">{stats.totalBurned.toLocaleString()} kcal</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function YemekPlanlamaPage() {
  const router = useRouter();
  const [recipes, setRecipes] = React.useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("Hepsi");
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const { toast } = useToast();
  
  const [mealPlan, setMealPlan] = React.useState<MealPlan>({});
  const [isRecipeSelectorOpen, setIsRecipeSelectorOpen] = React.useState(false);
  const [isNewRecipeDialogOpen, setIsNewRecipeDialogOpen] = React.useState(false);
  const [isAddToPlanDialogOpen, setIsAddToPlanDialogOpen] = React.useState(false); 
  
  const [editingRecipe, setEditingRecipe] = React.useState<Recipe | null>(null);
  const [recipeToAddToPlan, setRecipeToAddToPlan] = React.useState<Recipe | null>(null); 
  
  const [currentMealSelection, setCurrentMealSelection] = React.useState<{ day: Date, mealType: string } | null>(null);
  const [recipeSearchTerm, setRecipeSearchTerm] = React.useState("");

  const [selectedPlanDay, setSelectedPlanDay] = React.useState<Date>(new Date());
  const [selectedPlanMeal, setSelectedPlanMeal] = React.useState<string>("Akşam Yemeği");

  React.useEffect(() => {
    const unsubscribePlan = onMealPlanUpdate(setMealPlan);
    const unsubscribeRecipes = onRecipesUpdate(setRecipes);
    return () => { unsubscribePlan(); unsubscribeRecipes(); };
  }, []);

  const weekStartDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStartDate, i));
  
  const handleSaveRecipe = async (recipeData: Omit<Recipe, 'id' | 'familyId'>) => {
    try {
        if (editingRecipe) {
            await updateRecipe(editingRecipe.id, recipeData);
            toast({ title: "✅ Tarif Güncellendi", className: "bg-emerald-900 border-emerald-800 text-emerald-100" });
        } else {
            const newRecipeId = await addRecipe(recipeData);
            toast({ title: "✅ Tarif Eklendi", className: "bg-emerald-900 border-emerald-800 text-emerald-100" });
            if (currentMealSelection) {
                handleSelectRecipe({ ...recipeData, id: newRecipeId, familyId: '' });
            }
        }
        setIsNewRecipeDialogOpen(false);
        setEditingRecipe(null);
    } catch (e) {
        toast({ title: "❌ Hata", variant: 'destructive'});
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    try { await deleteRecipe(id); toast({ title: "Tarif Silindi", className: "bg-rose-900 border-rose-800 text-rose-100" }); } 
    catch(e) { toast({ title: "Hata", variant: "destructive" }); }
  };

  const handleOpenRecipeSelector = (day: Date, mealType: string) => {
    setCurrentMealSelection({ day, mealType });
    setIsRecipeSelectorOpen(true);
  };
  
  const handleSelectRecipe = (recipe: Recipe) => {
    if (!currentMealSelection) return;
    const dayKey = format(currentMealSelection.day, 'yyyy-MM-dd');
    const updatedDayPlan = { ...(mealPlan[dayKey] || {}), [currentMealSelection.mealType]: recipe };
    updateMealPlan(dayKey, updatedDayPlan);
    setIsRecipeSelectorOpen(false);
    setCurrentMealSelection(null);
  };
  
  const handleRemoveRecipe = (day: Date, mealType: string) => {
     const dayKey = format(day, 'yyyy-MM-dd');
     const updatedDayPlan = { ...(mealPlan[dayKey] || {}), [mealType]: null };
     updateMealPlan(dayKey, updatedDayPlan);
  };

  const handleAddRecipeToPlan = () => {
      if (!recipeToAddToPlan) return;
      const dayKey = format(selectedPlanDay, 'yyyy-MM-dd');
      const updatedDayPlan = { ...(mealPlan[dayKey] || {}), [selectedPlanMeal]: recipeToAddToPlan };
      
      updateMealPlan(dayKey, updatedDayPlan);
      
      toast({ 
          title: "Plan Güncellendi! 📅", 
          description: `${recipeToAddToPlan.title}, ${format(selectedPlanDay, 'EEEE', {locale: tr})} günü ${selectedPlanMeal.toLowerCase()}ne eklendi.`,
          className: "bg-indigo-900 border-indigo-800 text-indigo-100"
      });
      
      setIsAddToPlanDialogOpen(false);
      setRecipeToAddToPlan(null);
  };

  const filteredRecipes = React.useMemo(() => {
    return recipes.filter(recipe => {
        const matchesCategory = activeTab === "Hepsi" || recipe.category === activeTab;
        const matchesSearch = recipe.title.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });
  }, [recipes, activeTab, searchTerm]);

  const handleOpenNewRecipeDialog = () => {
    setEditingRecipe(null);
    setCurrentMealSelection(null);
    setIsNewRecipeDialogOpen(true);
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 font-sans text-slate-100 pb-24 relative overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-orange-900/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-rose-900/20 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <div className={cn("sticky top-0 z-40 py-4 sm:px-6 transition-all duration-300", glassColors.HEADER_BG)}>
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" onClick={() => router.back()} className={cn("rounded-full mr-1 text-slate-400 hover:text-white hover:bg-white/10")}>
                      <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className={cn(glassColors.ICON_BOX, "from-orange-500 to-red-500")}>
                      <Utensils className="w-6 h-6 text-white" />
                  </div>
                  <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mutfak</p>
                      <h1 className="text-lg font-bold text-slate-100 leading-none">Yemek Planlayıcı</h1>
                  </div>
              </div>
              <Button onClick={handleOpenNewRecipeDialog} className={cn("w-full md:w-auto rounded-full px-6 h-10 font-bold shadow-lg shadow-orange-900/20", glassColors.BUTTON_GLASS, "bg-orange-600 hover:bg-orange-500 border-orange-500/50")}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Yeni Tarif
              </Button>
          </div>
      </div>

      <div className="max-w-7xl mx-auto md:p-6 p-4 relative z-10 space-y-8">
          <Tabs defaultValue="planner" className="w-full">
              <div className={cn("p-1 rounded-2xl flex relative mb-8 overflow-x-auto", glassColors.CARD_BG)}>
                  <TabsList className="bg-transparent h-auto flex w-full justify-start md:justify-center p-0 gap-2">
                      <TabsTrigger value="planner" className="rounded-xl px-6 py-3 data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400 font-bold transition-all flex-1 min-w-max">
                          <Utensils className="mr-2 h-4 w-4" /> Haftalık Plan
                      </TabsTrigger>
                      <TabsTrigger value="recipes" className="rounded-xl px-6 py-3 data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400 font-bold transition-all flex-1 min-w-max">
                          <Soup className="mr-2 h-4 w-4" /> Tarifler
                      </TabsTrigger>
                      <TabsTrigger value="calorie" className="rounded-xl px-6 py-3 data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400 font-bold transition-all flex-1 min-w-max">
                          <Flame className="mr-2 h-4 w-4" /> Kalori Takibi
                      </TabsTrigger>
                  </TabsList>
              </div>

              {/* TAB: HAFTALIK PLANLAYICI */}
              <TabsContent value="planner">
                  <div className={cn("rounded-[2rem] p-4 md:p-6", glassColors.CARD_BG)}>
                      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4 border-b border-white/5 pb-4">
                          <h3 className="text-lg md:text-xl font-bold text-slate-200 flex items-center gap-2">
                              <CalendarIcon className="h-5 w-5 text-orange-400" />
                              <span>{format(weekStartDate, 'd MMM', { locale: tr })} - {format(addDays(weekStartDate, 6), 'd MMM', { locale: tr })}</span>
                          </h3>

                          <div className="flex items-center bg-white/5 p-1 rounded-full border border-white/10">
                              <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 hover:bg-white/10 text-slate-300" onClick={() => setCurrentDate(d => addDays(d, -7))}><ChevronLeft className="h-4 w-4" /></Button>
                              <div className="h-4 w-px bg-white/10 mx-1"></div>
                              <Button variant="ghost" size="sm" className="rounded-full px-4 font-bold text-sm text-slate-300 hover:text-white hover:bg-white/10" onClick={() => setCurrentDate(new Date())}>Bu Hafta</Button>
                              <div className="h-4 w-px bg-white/10 mx-1"></div>
                              <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 hover:bg-white/10 text-slate-300" onClick={() => setCurrentDate(d => addDays(d, 7))}><ChevronRight className="h-4 w-4" /></Button>
                          </div>
                      </div>

                      <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x">
                          <div className="flex gap-4 min-w-max">
                              {weekDays.map(day => {
                                  const dayKey = format(day, 'yyyy-MM-dd');
                                  const plannedMeals = mealPlan[dayKey] || {};
                                  const isToday = isSameDay(day, new Date());

                                  return (
                                      <div key={day.toString()} className={cn("snap-center w-72 flex-shrink-0 flex flex-col gap-3 p-4 rounded-[1.5rem] border transition-all", isToday ? "bg-white/10 border-orange-500/50 shadow-lg shadow-orange-900/20 scale-100 md:scale-105" : "bg-white/5 border-white/5 hover:bg-white/10")}>
                                          <div className={cn("text-center pb-2 border-b", isToday ? "border-orange-500/30" : "border-white/5")}>
                                              <p className={cn("text-lg font-black", isToday ? "text-orange-400" : "text-slate-300")}>{format(day, 'EEEE', { locale: tr })}</p>
                                              <p className="text-sm font-medium text-slate-500">{format(day, 'd MMMM', { locale: tr })}</p>
                                          </div>
                                          
                                          <div className="space-y-3 flex-grow">
                                              {/* Kahvaltı */}
                                              <div className="group relative">
                                                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Kahvaltı</p>
                                                  {plannedMeals["Kahvaltı"] ? (
                                                      <div className="relative overflow-hidden rounded-xl bg-orange-500/10 border border-orange-500/20 p-3 hover:bg-orange-500/20 transition-all">
                                                          <p className="font-bold text-orange-200 text-sm line-clamp-2 pr-4">{plannedMeals["Kahvaltı"]!.title}</p>
                                                          <button onClick={() => handleRemoveRecipe(day, "Kahvaltı")} className="absolute top-1 right-1 text-orange-400 hover:text-orange-200 bg-black/20 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all"><XCircle className="h-4 w-4"/></button>
                                                      </div>
                                                  ) : (
                                                      <button onClick={() => handleOpenRecipeSelector(day, "Kahvaltı")} className="w-full h-12 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-slate-500 hover:text-orange-400 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all">
                                                          <PlusCircle className="h-5 w-5" />
                                                      </button>
                                                  )}
                                              </div>

                                              {/* Akşam Yemeği */}
                                              <div className="group relative">
                                                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 ml-1">Akşam</p>
                                                  {plannedMeals["Akşam Yemeği"] ? (
                                                      <div className="relative overflow-hidden rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3 hover:bg-indigo-500/20 transition-all">
                                                          <p className="font-bold text-indigo-200 text-sm line-clamp-2 pr-4">{plannedMeals["Akşam Yemeği"]!.title}</p>
                                                          <button onClick={() => handleRemoveRecipe(day, "Akşam Yemeği")} className="absolute top-1 right-1 text-indigo-400 hover:text-indigo-200 bg-black/20 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all"><XCircle className="h-4 w-4"/></button>
                                                      </div>
                                                  ) : (
                                                      <button onClick={() => handleOpenRecipeSelector(day, "Akşam Yemeği")} className="w-full h-12 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all">
                                                          <PlusCircle className="h-5 w-5" />
                                                      </button>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                  )
                              })}
                          </div>
                      </div>
                  </div>
              </TabsContent>

              {/* TAB: TARİFLER */}
              <TabsContent value="recipes">
                  <div className="flex flex-col md:flex-row gap-6">
                      {/* Sol: Filtreler */}
                      <div className="w-full md:w-64 flex-shrink-0 space-y-6">
                          <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <Input placeholder="Tarif ara..." className="pl-10 h-12 rounded-xl bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500 focus:bg-white/10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                          </div>
                          
                          <div className={cn("rounded-2xl p-4 overflow-x-auto md:overflow-visible", glassColors.CARD_BG)}>
                              <h3 className="font-bold text-slate-300 mb-3 px-2 hidden md:block uppercase text-xs tracking-wider">Kategoriler</h3>
                              <div className="flex md:flex-col gap-2 md:gap-1 min-w-max md:min-w-0">
                                  <button onClick={() => setActiveTab("Hepsi")} className={cn("text-left px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap", activeTab === "Hepsi" ? "bg-slate-100 text-slate-900 shadow-md" : "text-slate-400 hover:bg-white/5 hover:text-slate-200")}>Hepsi</button>
                                  {Object.keys(categoryColors).map(cat => (
                                      <button key={cat} onClick={() => setActiveTab(cat)} className={cn("text-left px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-between group whitespace-nowrap gap-2", activeTab === cat ? "bg-slate-100 text-slate-900 shadow-md" : "text-slate-400 hover:bg-white/5 hover:text-slate-200")}>
                                          {cat}
                                          <div className={cn("w-2 h-2 rounded-full hidden md:block", activeTab === cat ? "bg-emerald-500" : "bg-slate-600 group-hover:bg-slate-500")} />
                                      </button>
                                  ))}
                              </div>
                          </div>
                      </div>

                      {/* Sağ: Liste */}
                      <div className="flex-grow">
                          {filteredRecipes.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                  {filteredRecipes.map((recipe) => (
                                      <div key={recipe.id} className={cn("group relative rounded-[1.5rem] overflow-hidden flex flex-col h-full", glassColors.CARD_BG, glassColors.CARD_HOVER)}>
                                          <div className="absolute top-3 right-3 z-10 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                              <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-black/40 hover:bg-emerald-500/20 text-emerald-400 backdrop-blur-md border border-white/10" onClick={() => { setRecipeToAddToPlan(recipe); setIsAddToPlanDialogOpen(true); }}>
                                                  <CalendarPlus className="h-4 w-4"/>
                                              </Button>
                                              <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-black/40 hover:bg-white/10 text-slate-200 backdrop-blur-md border border-white/10" onClick={() => { setEditingRecipe(recipe); setIsNewRecipeDialogOpen(true); }}>
                                                  <Edit className="h-4 w-4"/>
                                              </Button>
                                              <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-black/40 hover:bg-rose-500/20 text-rose-400 backdrop-blur-md border border-white/10" onClick={() => handleDeleteRecipe(recipe.id)}>
                                                  <Trash2 className="h-4 w-4"/>
                                              </Button>
                                          </div>

                                          <div className={cn("h-24 w-full flex items-center justify-center relative overflow-hidden", categoryColors[recipe.category] || "bg-slate-800")}>
                                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                                              <Utensils className="h-8 w-8 opacity-40" />
                                              <Badge className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-md text-slate-200 border border-white/10">{recipe.category}</Badge>
                                          </div>
                                          
                                          <div className="p-5 flex flex-col flex-grow">
                                              <h3 className="font-bold text-lg text-slate-200 mb-1 leading-tight">{recipe.title}</h3>
                                              <div className="flex items-center gap-1 mb-3">
                                                  {Array.from({length: 5}).map((_, i) => (
                                                      <Star key={i} className={cn("h-3 w-3", i < recipe.rating ? "fill-amber-400 text-amber-400" : "text-slate-700")} />
                                                  ))}
                                              </div>
                                              {recipe.instructions && (
                                                  <p className="text-sm text-slate-400 line-clamp-3 mb-4 flex-grow">{recipe.instructions}</p>
                                              )}
                                              <Button variant="outline" className={cn("w-full rounded-xl mt-auto", glassColors.BUTTON_GLASS)} onClick={() => { setEditingRecipe(recipe); setIsNewRecipeDialogOpen(true); }}>
                                                  Detaylar
                                              </Button>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                      <Soup className="h-8 w-8 text-slate-500" />
                                  </div>
                                  <p className="text-lg font-medium text-slate-400">Tarif bulunamadı.</p>
                              </div>
                          )}
                      </div>
                  </div>
              </TabsContent>

              {/* TAB: KALORİ TAKİBİ */}
              <TabsContent value="calorie">
                  <CalorieTracker />
              </TabsContent>
          </Tabs>

          {/* --- DIALOGS --- */}
          <Dialog open={isAddToPlanDialogOpen} onOpenChange={setIsAddToPlanDialogOpen}>
              <DialogContent className="sm:max-w-md rounded-[2rem] bg-slate-900 border-white/10 text-slate-100">
                  <DialogHeader>
                      <DialogTitle>Plana Ekle</DialogTitle>
                      <DialogDescription className="text-slate-400">{recipeToAddToPlan?.title} tarifini hangi güne eklemek istersiniz?</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 pt-4">
                      {/* Gün Seçimi */}
                      <div className="space-y-3">
                          <p className="text-sm font-bold text-slate-300">Hangi Gün?</p>
                          <div className="grid grid-cols-4 gap-2">
                              {weekDays.map(day => (
                                  <button
                                      key={day.toString()}
                                      onClick={() => setSelectedPlanDay(day)}
                                      className={cn(
                                          "flex flex-col items-center justify-center py-2 rounded-xl border transition-all",
                                          isSameDay(day, selectedPlanDay) 
                                              ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20 scale-105" 
                                              : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                                      )}
                                  >
                                      <span className="text-[10px] font-bold uppercase">{format(day, 'EEE', {locale: tr})}</span>
                                      <span className="text-sm font-bold">{format(day, 'd')}</span>
                                  </button>
                              ))}
                          </div>
                      </div>

                      {/* Öğün Seçimi */}
                      <div className="space-y-3">
                          <p className="text-sm font-bold text-slate-300">Hangi Öğün?</p>
                          <div className="grid grid-cols-2 gap-3">
                              {mealTypes.map(meal => (
                                  <button
                                      key={meal}
                                      onClick={() => setSelectedPlanMeal(meal)}
                                      className={cn(
                                          "flex items-center justify-center gap-2 py-3 rounded-xl border transition-all font-bold text-sm",
                                          selectedPlanMeal === meal
                                              ? (meal === "Kahvaltı" ? "bg-orange-600 text-white border-orange-500 shadow-lg" : "bg-indigo-600 text-white border-indigo-500 shadow-lg")
                                              : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                                      )}
                                  >
                                      {meal === "Kahvaltı" ? <PlusCircle className="w-4 h-4"/> : <Soup className="w-4 h-4"/>}
                                      {meal}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <Button className="w-full h-12 rounded-xl bg-emerald-600 text-white font-bold text-lg hover:bg-emerald-500 shadow-lg shadow-emerald-900/20" onClick={handleAddRecipeToPlan}>
                          <Check className="mr-2 h-5 w-5" /> Planla
                      </Button>
                  </div>
              </DialogContent>
          </Dialog>

          <Dialog open={isRecipeSelectorOpen} onOpenChange={setIsRecipeSelectorOpen}>
              <DialogContent className="sm:max-w-2xl rounded-[2rem] max-h-[90vh] flex flex-col bg-slate-900 border-white/10 text-slate-100">
                  <DialogHeader>
                      <DialogTitle>Ne Yiyeceksiniz?</DialogTitle>
                      <DialogDescription className="text-slate-400">Listeden bir tarif seçin.</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4 flex-grow overflow-hidden flex flex-col">
                      <Input placeholder="Tariflerde ara..." value={recipeSearchTerm} onChange={(e) => setRecipeSearchTerm(e.target.value)} className="rounded-xl h-12 bg-white/5 border-white/10 text-slate-100 focus:bg-white/10" />
                      <ScrollArea className="flex-grow">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
                              {recipes.filter(r => r.title.toLowerCase().includes(recipeSearchTerm.toLowerCase())).map(recipe => (
                                  <div key={recipe.id} onClick={() => handleSelectRecipe(recipe)} className="cursor-pointer hover:ring-2 ring-orange-500/50 ring-offset-2 ring-offset-slate-900 rounded-xl border border-white/10 p-3 flex items-center gap-3 transition-all hover:bg-white/5 bg-white/5">
                                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", categoryColors[recipe.category])}>
                                          <Utensils className="h-5 w-5 opacity-80" />
                                      </div>
                                      <div className="overflow-hidden">
                                          <p className="font-bold text-sm text-slate-200 truncate">{recipe.title}</p>
                                          <p className="text-xs text-slate-500">{recipe.category}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </ScrollArea>
                  </div>
              </DialogContent>
          </Dialog>

          <Dialog open={isNewRecipeDialogOpen} onOpenChange={(open) => { if (!open) setEditingRecipe(null); setIsNewRecipeDialogOpen(open); }}>
              <DialogContent className="rounded-[2rem] max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10 text-slate-100">
                  <DialogHeader>
                      <DialogTitle>{editingRecipe ? 'Tarifi Düzenle' : 'Yeni Tarif Ekle'}</DialogTitle>
                  </DialogHeader>
                  {/* Form Wrapper for Dark Mode Styles */}
                  <div className="text-slate-100 [&_label]:text-slate-300 [&_input]:bg-white/5 [&_input]:border-white/10 [&_input]:text-slate-100 [&_textarea]:bg-white/5 [&_textarea]:border-white/10 [&_textarea]:text-slate-100 [&_select]:bg-slate-800 [&_select]:border-white/10">
                      <NewRecipeForm onSubmit={handleSaveRecipe} initialData={editingRecipe} />
                  </div>
              </DialogContent>
          </Dialog>
      </div>
    </div>
  );
}