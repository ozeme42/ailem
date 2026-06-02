"use client";

import * as React from "react";
import { PlusCircle, Search, Soup, Star, ChevronLeft, ChevronRight, XCircle, BarChart2, Calendar as CalendarIcon, Save, Utensils, Flame, Activity, PieChart as PieChartIcon, CalendarPlus, Edit, Trash2, ArrowLeft, Home, BookOpen, User, CheckCircle2, ExternalLink } from "lucide-react";
import { format, addDays, startOfWeek, parseISO, subDays, startOfMonth, endOfMonth, endOfDay, addWeeks, subWeeks, addMonths, subMonths, eachDayOfInterval, isSameDay } from "date-fns";
import { tr } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Recipe, MealPlan, CalorieLog } from "@/lib/data";
import { onMealPlanUpdate, onRecipesUpdate, addRecipe, updateRecipe, deleteRecipe, updateMealPlan, onCalorieLogsUpdate, upsertCalorieLog } from "@/lib/dataService";
import { cn } from "@/lib/utils";
import { NewRecipeForm } from "@/components/new-recipe-form";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/components/auth-provider";
import { Calendar } from "@/components/ui/calendar";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell, PieChart, Pie } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

// --- THEME & CONSTANTS ---
const mealTypes = ["Kahvaltı", "Akşam Yemeği"];

const calorieFormSchema = z.object({
    caloriesTaken: z.coerce.number().min(0).default(0),
    caloriesBurned: z.coerce.number().min(0).default(0),
    protein: z.coerce.number().min(0).default(0),
    carbs: z.coerce.number().min(0).default(0),
    fat: z.coerce.number().min(0).default(0),
});

// --- SUB-COMPONENTS ---

// 1. Calorie Tracker
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
    const isSurplus = calorieDifference > 0;

    const onSubmit = async (data: z.infer<typeof calorieFormSchema>) => {
        if (!user) return toast({ title: 'Hata', description: 'Giriş yapmalısınız.', variant: 'destructive' });
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        try {
            await upsertCalorieLog({ id: dateKey, ...data });
            toast({ title: 'Kaydedildi!', description: `${format(selectedDate, 'dd MMMM')} güncellendi.` });
        } catch (error) {
            toast({ title: 'Hata', variant: 'destructive' });
        }
    };
    
    const { chartData, macroData, stats } = React.useMemo(() => {
        let startDate = statsPeriod === 'weekly' ? startOfWeek(statsDate, { weekStartsOn: 1 }) : startOfMonth(statsDate);
        let endDate = statsPeriod === 'weekly' ? endOfDay(addDays(startDate, 6)) : endOfMonth(statsDate);
        
        const relevantLogs = allLogs.filter(log => {
             const logDate = parseISO(log.id);
             return logDate >= startDate && logDate <= endDate;
        });
        
        let totalTaken = 0, totalBurned = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
        const dataByPeriod: { [key: string]: CalorieLog } = {};
        const periodDays = eachDayOfInterval({start: startDate, end: endDate});

        periodDays.forEach(day => {
            const dayKey = statsPeriod === 'weekly' ? format(day, 'EEE', { locale: tr }) : format(day, 'dd');
            dataByPeriod[dayKey] = { id: dayKey, caloriesTaken: 0, caloriesBurned: 0, protein: 0, carbs: 0, fat: 0, familyId: ''};
        });

        relevantLogs.forEach(log => {
            totalTaken += log.caloriesTaken;
            totalBurned += log.caloriesBurned;
            totalProtein += log.protein;
            totalCarbs += log.carbs;
            totalFat += log.fat;
            
            const logDate = parseISO(log.id);
            const key = statsPeriod === 'weekly' ? format(logDate, 'EEE', { locale: tr }) : format(logDate, 'dd');
            if (dataByPeriod[key]) {
                dataByPeriod[key].caloriesTaken += log.caloriesTaken;
                dataByPeriod[key].caloriesBurned += log.caloriesBurned;
            }
        });

        const chartData = Object.entries(dataByPeriod).map(([name, data]) => ({
            name,
            "Net": data.caloriesTaken - data.caloriesBurned,
        }));
        
        const macroData = (totalProtein + totalCarbs + totalFat) > 0 ? [
            { name: 'Protein', value: totalProtein, fill: '#8b5cf6' },
            { name: 'Karb.', value: totalCarbs, fill: '#3b82f6' },
            { name: 'Yağ', value: totalFat, fill: '#f43f5e' },
        ] : [];

        return { stats: { totalTaken, totalBurned, totalProtein, totalCarbs, totalFat }, chartData, macroData };
    }, [allLogs, statsDate, statsPeriod]);

    return (
        <div className="space-y-6 pb-24">
            {/* Daily Entry Card */}
            <div className="bg-white dark:bg-[#1a1c23] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-white/5">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-extrabold flex items-center gap-2"><Activity className="w-5 h-5 text-rose-500" /> Günlük Durum</h2>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="rounded-full bg-slate-50 dark:bg-white/5 border-0 font-bold">
                                {format(selectedDate, "d MMM", { locale: tr })} <ChevronRight className="w-4 h-4 ml-1 opacity-50"/>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-0 rounded-2xl shadow-xl"><Calendar mode="single" selected={selectedDate} onSelect={(d) => setSelectedDate(d || new Date())} initialFocus /></PopoverContent>
                    </Popover>
                </div>

                <div className="flex justify-center mb-8">
                    <div className="relative w-40 h-40 flex items-center justify-center rounded-full border-[10px] border-slate-50 dark:border-white/5 shadow-inner bg-white dark:bg-black/20">
                        <div className="text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Net Kalori</p>
                            <p className={cn("text-4xl font-black tracking-tighter", isSurplus ? "text-rose-500" : "text-emerald-500")}>
                                {Math.abs(calorieDifference)}
                            </p>
                            <p className={cn("text-[10px] font-bold uppercase mt-1", isSurplus ? "text-rose-400" : "text-emerald-400")}>{isSurplus ? "Fazla" : "Açık"}</p>
                        </div>
                    </div>
                </div>

                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="caloriesTaken" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase ml-1">Alınan (kcal)</FormLabel>
                                    <FormControl><Input type="number" className="h-14 rounded-2xl text-xl font-bold text-center bg-slate-50 dark:bg-white/5 border-0" {...field} /></FormControl>
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="caloriesBurned" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-bold text-slate-500 uppercase ml-1">Yakılan (kcal)</FormLabel>
                                    <FormControl><Input type="number" className="h-14 rounded-2xl text-xl font-bold text-center bg-slate-50 dark:bg-white/5 border-0" {...field} /></FormControl>
                                </FormItem>
                            )}/>
                        </div>
                        
                        <div className="p-4 rounded-3xl bg-slate-50 dark:bg-white/5">
                            <p className="text-[10px] font-bold text-slate-500 uppercase text-center mb-4 tracking-widest">Makro Besinler</p>
                            <div className="grid grid-cols-3 gap-3">
                                <FormField control={form.control} name="protein" render={({ field }) => (
                                    <FormItem className="text-center">
                                        <FormLabel className="text-[10px] font-bold text-violet-500">PRO (g)</FormLabel>
                                        <FormControl><Input type="number" className="h-10 rounded-xl text-sm font-bold text-center bg-white dark:bg-black/20 border-0" {...field} /></FormControl>
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="carbs" render={({ field }) => (
                                    <FormItem className="text-center">
                                        <FormLabel className="text-[10px] font-bold text-blue-500">KARB (g)</FormLabel>
                                        <FormControl><Input type="number" className="h-10 rounded-xl text-sm font-bold text-center bg-white dark:bg-black/20 border-0" {...field} /></FormControl>
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="fat" render={({ field }) => (
                                    <FormItem className="text-center">
                                        <FormLabel className="text-[10px] font-bold text-rose-500">YAĞ (g)</FormLabel>
                                        <FormControl><Input type="number" className="h-10 rounded-xl text-sm font-bold text-center bg-white dark:bg-black/20 border-0" {...field} /></FormControl>
                                    </FormItem>
                                )}/>
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-14 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform">
                            Kaydet
                        </Button>
                    </form>
                </Form>
            </div>

            {/* Analytics Card */}
            <div className="bg-white dark:bg-[#1a1c23] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-white/5">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-extrabold">Analiz</h2>
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-white/5 p-1 rounded-full">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setStatsDate(subWeeks(statsDate, 1))}><ChevronLeft className="h-4 w-4"/></Button>
                        <span className="text-xs font-bold w-16 text-center">{format(statsDate, 'MMM', {locale:tr})}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setStatsDate(addWeeks(statsDate, 1))}><ChevronRight className="h-4 w-4"/></Button>
                    </div>
                </div>

                <div className="h-48 mb-6">
                    <ChartContainer config={{ Net: { label: "Net Kalori", color: "#10b981" } }} className="h-full w-full">
                        <BarChart data={chartData}>
                            <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
                            <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} content={<ChartTooltipContent hideLabel />} />
                            <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="3 3" />
                            <Bar dataKey="Net" radius={[4, 4, 4, 4]}>
                                {chartData.map((entry, index) => <Cell key={index} fill={entry["Net"] >= 0 ? "#f43f5e" : "#10b981" } />)}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-center border border-indigo-100 dark:border-indigo-500/20">
                        <p className="text-[10px] text-indigo-500 font-bold uppercase">Haftalık Alınan</p>
                        <p className="text-xl font-black text-indigo-700 dark:text-indigo-400 mt-1">{stats.totalTaken}</p>
                     </div>
                     <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-500/10 text-center border border-orange-100 dark:border-orange-500/20">
                        <p className="text-[10px] text-orange-500 font-bold uppercase">Haftalık Yakılan</p>
                        <p className="text-xl font-black text-orange-700 dark:text-orange-400 mt-1">{stats.totalBurned}</p>
                     </div>
                </div>
            </div>
        </div>
    );
}

// MAIN PAGE COMPONENT
export default function YemekPlanlamaPage() {
    const router = useRouter();
    const [recipes, setRecipes] = React.useState<Recipe[]>([]);
    const [mealPlan, setMealPlan] = React.useState<MealPlan>({});
    const [activeTab, setActiveTab] = React.useState<"plan"|"recipes"|"calorie"|"stats">("plan");
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [selectedDay, setSelectedDay] = React.useState(new Date());
    
    // UI States
    const [recipeFilter, setRecipeFilter] = React.useState("Hepsi");
    const [searchQuery, setSearchQuery] = React.useState("");
    const [isRecipeSelectorOpen, setIsRecipeSelectorOpen] = React.useState(false);
    const [isNewRecipeOpen, setIsNewRecipeOpen] = React.useState(false);
    const [currentMealType, setCurrentMealType] = React.useState<string | null>(null);
    const [editingRecipe, setEditingRecipe] = React.useState<Recipe | null>(null);
    const [viewingRecipe, setViewingRecipe] = React.useState<Recipe | null>(null);
    const [mealStatsPeriod, setMealStatsPeriod] = React.useState<"monthly"|"yearly"|"all">("monthly");
    const { toast } = useToast();

    React.useEffect(() => {
        const unsubPlan = onMealPlanUpdate(setMealPlan);
        const unsubRecipes = onRecipesUpdate(setRecipes);
        return () => { unsubPlan(); unsubRecipes(); };
    }, []);

    // Derived logic
    const weekStartDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStartDate, i));
    const dayKey = format(selectedDay, 'yyyy-MM-dd');
    const todaysMeals = mealPlan[dayKey] || {};

    const allTimeRecipeCounts = React.useMemo(() => {
        const counts: Record<string, number> = {};
        Object.values(mealPlan).forEach(meals => {
            if (meals) {
                Object.entries(meals).forEach(([key, mealItem]) => {
                    if (key === 'id' || key === 'familyId' || !mealItem) return;
                    let recipeId = typeof mealItem === 'string' ? mealItem : (mealItem as any).id;
                    if (!recipeId && typeof mealItem === 'object' && (mealItem as any).title) recipeId = (mealItem as any).title;
                    if (recipeId) counts[recipeId] = (counts[recipeId] || 0) + 1;
                });
            }
        });
        return counts;
    }, [mealPlan]);

    const filteredRecipes = React.useMemo(() => {
        return recipes.filter(r => 
            (r.title.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [recipes, searchQuery]);

    const handleSaveRecipe = async (data: Omit<Recipe, 'id'|'familyId'>) => {
        try {
            if (editingRecipe) await updateRecipe(editingRecipe.id, data);
            else {
                const newId = await addRecipe(data);
                if (currentMealType && isRecipeSelectorOpen) {
                    handleAssignRecipe({...data, id: newId, familyId: ''});
                }
            }
            setIsNewRecipeOpen(false);
            setEditingRecipe(null);
            toast({ title: "Başarılı!", description: "Tarif kaydedildi." });
        } catch(e) { toast({ title: "Hata", variant: "destructive"}); }
    };

    const handleDeleteRecipe = async (id: string) => {
        try { await deleteRecipe(id); toast({title:"Tarif silindi."}); } catch(e){}
    }

    const handleAssignRecipe = (recipe: Recipe) => {
        if (!currentMealType) return;
        updateMealPlan(dayKey, { ...todaysMeals, [currentMealType]: recipe });
        setIsRecipeSelectorOpen(false);
        setCurrentMealType(null);
        toast({ title: "Plana Eklendi", description: `${recipe.title} eklendi.` });
    };

    const handleRemoveMeal = (mealType: string) => {
        updateMealPlan(dayKey, { ...todaysMeals, [mealType]: null });
    };

    const renderPlanner = () => (
        <div className="space-y-6 pb-24">
            {/* Horizontal Calendar Strip */}
            <div className="bg-white dark:bg-[#1a1c23] py-4 rounded-3xl shadow-sm border border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between px-6 mb-4">
                    <h2 className="text-lg font-bold">{format(currentDate, 'MMMM yyyy', {locale: tr})}</h2>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-slate-50 dark:bg-white/5" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}><ChevronLeft className="w-4 h-4"/></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-slate-50 dark:bg-white/5" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}><ChevronRight className="w-4 h-4"/></Button>
                    </div>
                </div>
                <div className="flex gap-2 overflow-x-auto px-6 pb-2 scrollbar-hide snap-x">
                    {weekDays.map(day => {
                        const isSelected = isSameDay(day, selectedDay);
                        const isTodayDate = isSameDay(day, new Date());
                        return (
                            <button
                                key={day.toString()}
                                onClick={() => setSelectedDay(day)}
                                className={cn(
                                    "snap-center flex-shrink-0 w-14 flex flex-col items-center justify-center py-3 rounded-full transition-all",
                                    isSelected 
                                        ? "bg-slate-900 dark:bg-white text-white dark:text-black shadow-md scale-105" 
                                        : "bg-slate-50 dark:bg-white/5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
                                )}
                            >
                                <span className="text-[10px] font-bold uppercase mb-1">{format(day, 'EEE', {locale:tr})}</span>
                                <span className={cn("text-lg font-black", isTodayDate && !isSelected ? "text-orange-500" : "")}>{format(day, 'dd')}</span>
                                {isTodayDate && <div className={cn("w-1 h-1 rounded-full mt-1", isSelected ? "bg-white dark:bg-black" : "bg-orange-500")} />}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Meal Cards */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{format(selectedDay, 'd MMMM EEEE', {locale: tr})}</h3>
                </div>

                {mealTypes.map(meal => {
                    const mealData = todaysMeals[meal];
                    const isBreakfast = meal === "Kahvaltı";
                    
                    if (mealData) {
                        return (
                            <div key={meal} className="relative group bg-white dark:bg-[#1a1c23] rounded-[2rem] p-5 shadow-sm border border-slate-100 dark:border-white/5 overflow-hidden">
                                <div className={cn("absolute top-0 left-0 w-2 h-full", isBreakfast ? "bg-orange-400" : "bg-indigo-500")} />
                                <div className="pl-4 flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{meal}</p>
                                        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{mealData.title}</h4>
                                        <Badge variant="outline" className="mt-2 text-[10px] rounded-full">{mealData.category}</Badge>
                                    </div>
                                    <button onClick={() => handleRemoveMeal(meal)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><XCircle className="w-5 h-5"/></button>
                                </div>
                            </div>
                        )
                    }

                    return (
                        <button 
                            key={meal} 
                            onClick={() => { setCurrentMealType(meal); setIsRecipeSelectorOpen(true); }}
                            className="w-full text-left bg-transparent border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[2rem] p-6 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group flex items-center justify-between"
                        >
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{meal}</p>
                                <p className="text-slate-500 font-medium group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Menü Seçilmedi</p>
                            </div>
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-colors", isBreakfast ? "bg-orange-100 text-orange-500 group-hover:bg-orange-500 group-hover:text-white" : "bg-indigo-100 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white")}>
                                <PlusCircle className="w-5 h-5" />
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    );

    const renderRecipes = () => (
        <div className="space-y-6 pb-24">
            <div className="flex gap-2 relative">
                <div className="relative flex-grow">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                        placeholder="Tariflerde ara..." 
                        className="pl-11 h-12 rounded-2xl bg-white dark:bg-[#1a1c23] border-slate-100 dark:border-white/5 font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button className="h-12 w-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-black" onClick={() => { setEditingRecipe(null); setIsNewRecipeOpen(true); }}>
                    <PlusCircle className="w-5 h-5" />
                </Button>
            </div>


            <div className="space-y-1.5">
                {filteredRecipes.map(recipe => (
                    <div key={recipe.id} onClick={() => setViewingRecipe(recipe)} className="cursor-pointer bg-white dark:bg-[#1a1c23] rounded-xl p-2 shadow-sm border border-slate-100 dark:border-white/5 flex items-center gap-2 relative group hover:border-slate-300 dark:hover:border-white/20 transition-all">
                         <div className="flex-grow min-w-0 flex items-center gap-2">
                             <h4 className="font-bold text-[13px] truncate max-w-[130px] sm:max-w-xs">{recipe.title}</h4>
                             {recipe.rating > 0 && <span className="text-[10px] text-amber-500 flex items-center font-bold bg-amber-50 dark:bg-amber-500/10 px-1 py-0.5 rounded"><Star className="w-2.5 h-2.5 fill-amber-400 mr-0.5" />{recipe.rating}</span>}
                             {(allTimeRecipeCounts[recipe.id] || 0) > 0 && <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-white/5 px-1 py-0.5 rounded flex items-center gap-0.5"><span className="text-[8px]">🔥</span>{allTimeRecipeCounts[recipe.id]}</span>}
                             {recipe.sourceUrl && <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                         </div>

                         <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={(e) => { e.stopPropagation(); setEditingRecipe(recipe); setIsNewRecipeOpen(true); }} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-500 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5"><Edit className="w-3.5 h-3.5"/></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteRecipe(recipe.id); }} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5"><Trash2 className="w-3.5 h-3.5"/></button>
                         </div>
                    </div>
                ))}
            </div>
            {filteredRecipes.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    <Soup className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">Tarif bulunamadı.</p>
                </div>
            )}
        </div>
    );

    const renderStats = () => {
        let periodDays: Date[] = [];
        if (mealStatsPeriod === "monthly") {
            periodDays = eachDayOfInterval({ start: subDays(new Date(), 30), end: new Date() });
        } else if (mealStatsPeriod === "yearly") {
            periodDays = eachDayOfInterval({ start: subDays(new Date(), 365), end: new Date() });
        }

        const recipeCounts: Record<string, { recipe: Recipe, count: number }> = {};
        const categoryCounts: Record<string, number> = {};
        let totalMeals = 0;

        const processDay = (dayKey: string) => {
            const meals = mealPlan[dayKey];
            if (meals) {
                Object.entries(meals).forEach(([key, mealItem]) => {
                    if (key === 'id' || key === 'familyId' || !mealItem) return;
                    let rec: Recipe | undefined;
                    if (typeof mealItem === 'string') {
                        rec = recipes.find(r => r.id === mealItem || r.title === mealItem);
                        if (!rec) rec = { id: mealItem, familyId: '', title: mealItem, category: 'Diğer', rating: 0 };
                    } else {
                        rec = mealItem as Recipe;
                    }
                    if (rec) {
                        totalMeals++;
                        const id = rec.id || rec.title;
                        if (!recipeCounts[id]) recipeCounts[id] = { recipe: rec, count: 0 };
                        recipeCounts[id].count++;
                        
                        const cat = rec.category || 'Diğer';
                        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
                    }
                });
            }
        };

        if (mealStatsPeriod === "all") {
            Object.keys(mealPlan).forEach(processDay);
        } else {
            periodDays.forEach(day => processDay(format(day, 'yyyy-MM-dd')));
        }

        const topRecipes = Object.values(recipeCounts).sort((a, b) => b.count - a.count);
        const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

        return (
            <div className="space-y-6 pb-20">
                <div className="flex gap-2 bg-slate-200/50 dark:bg-white/5 p-1 rounded-2xl max-w-sm mx-auto">
                    <button onClick={() => setMealStatsPeriod("monthly")} className={cn("flex-1 py-1.5 text-xs font-bold rounded-xl transition-all", mealStatsPeriod === "monthly" ? "bg-white dark:bg-[#1a1c23] shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>Aylık</button>
                    <button onClick={() => setMealStatsPeriod("yearly")} className={cn("flex-1 py-1.5 text-xs font-bold rounded-xl transition-all", mealStatsPeriod === "yearly" ? "bg-white dark:bg-[#1a1c23] shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>Yıllık</button>
                    <button onClick={() => setMealStatsPeriod("all")} className={cn("flex-1 py-1.5 text-xs font-bold rounded-xl transition-all", mealStatsPeriod === "all" ? "bg-white dark:bg-[#1a1c23] shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>Tümü</button>
                </div>

                <div className="bg-white dark:bg-[#1a1c23] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-white/5">
                    <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2"><PieChartIcon className="w-5 h-5 text-indigo-500" /> Yemek İstatistikleri</h2>
                    <p className="text-sm text-slate-500 mb-6">{mealStatsPeriod === "monthly" ? "Son 30 güne ait" : mealStatsPeriod === "yearly" ? "Son 1 yıla ait" : "Tüm zamanlara ait"} planlanan menü analizleriniz.</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 text-center">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Planlanan Öğün</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalMeals}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 text-center">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Farklı Tarif</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{Object.keys(recipeCounts).length}</p>
                        </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Tercih Edilenler Listesi</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2 scrollbar-hide">
                        {topRecipes.length === 0 ? <p className="text-sm text-slate-400">Yeterli veri yok.</p> : topRecipes.map(({recipe, count}, i) => (
                            <div key={recipe.id || `recipe-${i}`} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-500 font-bold flex items-center justify-center text-xs">{i+1}</div>
                                    <div>
                                        <p className="font-bold text-sm">{recipe.title}</p>
                                    </div>
                                </div>
                                <div className="text-sm font-bold text-slate-500">{count} kez</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    };

    return (
        <div className="min-h-[100dvh] bg-[#f8fafc] dark:bg-[#0f1115] text-slate-900 dark:text-slate-100 font-sans pb-safe">
            {/* Minimal Header */}
            <div className="sticky top-0 z-40 bg-[#f8fafc]/80 dark:bg-[#0f1115]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full -ml-2">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-black tracking-tight">Yemek</h1>
                    </div>
                </div>
                <button 
                    onClick={() => { setEditingRecipe(null); setIsNewRecipeOpen(true); }}
                    className="w-10 h-10 rounded-full bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-black shadow-lg hover:scale-105 transition-transform"
                >
                    <PlusCircle className="w-5 h-5" />
                </button>
            </div>

            <div className="px-6 pb-2">
                <div className="bg-slate-200/50 dark:bg-white/5 p-1 rounded-2xl flex justify-between max-w-lg mx-auto overflow-x-auto scrollbar-hide">
                    <button onClick={() => setActiveTab("plan")} className={cn("flex-1 px-2 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap", activeTab === "plan" ? "bg-white dark:bg-[#1a1c23] shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                        Plan
                    </button>
                    <button onClick={() => setActiveTab("recipes")} className={cn("flex-1 px-2 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap", activeTab === "recipes" ? "bg-white dark:bg-[#1a1c23] shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                        Tarifler
                    </button>
                    <button onClick={() => setActiveTab("calorie")} className={cn("flex-1 px-2 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap", activeTab === "calorie" ? "bg-white dark:bg-[#1a1c23] shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                        Kalori
                    </button>
                    <button onClick={() => setActiveTab("stats")} className={cn("flex-1 px-2 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all whitespace-nowrap", activeTab === "stats" ? "bg-white dark:bg-[#1a1c23] shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                        İstatistik
                    </button>
                </div>
            </div>

            <div className="px-6 py-2 max-w-lg mx-auto">
                {activeTab === "plan" && renderPlanner()}
                {activeTab === "recipes" && renderRecipes()}
                {activeTab === "calorie" && <CalorieTracker />}
                {activeTab === "stats" && renderStats()}
            </div>


            {/* Modals & Dialogs */}
            
            {/* Recipe Selector Bottom Sheet */}
            <Dialog open={isRecipeSelectorOpen} onOpenChange={setIsRecipeSelectorOpen}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-[#1a1c23] border-0 rounded-t-3xl rounded-b-none sm:rounded-3xl p-0 overflow-hidden mb-0 mt-auto sm:my-auto max-h-[65vh] flex flex-col">
                    <div className="p-4 pb-2 border-b border-slate-100 dark:border-white/5 flex-shrink-0">
                        <DialogTitle className="text-lg font-bold mb-3">{currentMealType} İçin Seç</DialogTitle>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input placeholder="Ara..." className="pl-10 rounded-2xl bg-slate-50 dark:bg-white/5 border-0 h-12" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto p-3 space-y-1.5">
                        {filteredRecipes.map(recipe => (
                            <div key={recipe.id} onClick={() => handleAssignRecipe(recipe)} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/10">
                                <h4 className="font-bold text-[13px] truncate pr-2">{recipe.title}</h4>
                                <div className="flex items-center gap-2 shrink-0">
                                    {recipe.rating > 0 && <span className="text-[10px] text-amber-500 font-bold bg-amber-50 dark:bg-amber-500/10 px-1 py-0.5 rounded flex items-center"><Star className="w-2.5 h-2.5 fill-amber-400 mr-0.5" />{recipe.rating}</span>}
                                    <PlusCircle className="w-4 h-4 text-indigo-500" />
                                </div>
                            </div>
                        ))}
                        {filteredRecipes.length === 0 && searchQuery.trim() !== '' && (
                            <div className="text-center p-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 mt-2">
                                <p className="text-sm font-bold text-slate-500 mb-4">"{searchQuery}" bulunamadı.</p>
                                <Button onClick={() => handleSaveRecipe({ title: searchQuery, category: currentMealType || "Akşam Yemeği", rating: 4, instructions: "", sourceUrl: "" })} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg">
                                    <PlusCircle className="w-4 h-4 mr-2" /> Hızlı Ekle ve Plana Koy
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* New/Edit Recipe Dialog */}
            <Dialog open={isNewRecipeOpen} onOpenChange={(open) => { setIsNewRecipeOpen(open); if(!open) setEditingRecipe(null); }}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-[#1a1c23] border-0 rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">{editingRecipe ? "Tarifi Düzenle" : "Yeni Tarif Ekle"}</DialogTitle>
                    </DialogHeader>
                    <NewRecipeForm 
                        onSave={handleSaveRecipe} 
                        initialData={editingRecipe ? {
                            title: editingRecipe.title,
                            category: editingRecipe.category,
                            rating: editingRecipe.rating,
                            instructions: editingRecipe.instructions || '',
                            sourceUrl: editingRecipe.sourceUrl || ''
                        } : undefined} 
                    />
                </DialogContent>
            </Dialog>

            {/* View Recipe Dialog */}
            <Dialog open={!!viewingRecipe} onOpenChange={(open) => { if(!open) setViewingRecipe(null); }}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-[#1a1c23] border-0 rounded-3xl p-6">
                    {viewingRecipe && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center justify-between pr-6">
                                    <DialogTitle className="text-xl font-bold">{viewingRecipe.title}</DialogTitle>
                                    <button onClick={() => { setViewingRecipe(null); setEditingRecipe(viewingRecipe); setIsNewRecipeOpen(true); }} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 hover:text-blue-500 transition-colors">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                </div>
                            </DialogHeader>
                            <div className="space-y-4 mt-2">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className="rounded-full">{viewingRecipe.category}</Badge>
                                    <div className="flex gap-0.5">
                                        {Array.from({length: 5}).map((_, i) => <Star key={i} className={cn("w-4 h-4", i < viewingRecipe.rating ? "fill-amber-400 text-amber-400" : "text-slate-200 dark:text-slate-700")}/>)}
                                    </div>
                                </div>
                                {viewingRecipe.instructions && (
                                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{viewingRecipe.instructions}</p>
                                    </div>
                                )}
                                {viewingRecipe.sourceUrl && (
                                    <Button variant="default" className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold" onClick={() => window.open(viewingRecipe.sourceUrl, '_blank')}>
                                        <ExternalLink className="w-4 h-4 mr-2"/> Tarifi Sitede Gör
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
