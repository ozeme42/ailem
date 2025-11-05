

"use client";

import * as React from "react";
import { PlusCircle, Search, Clock, Soup, Star, ChevronLeft, ChevronRight, XCircle, Wheat, BarChart2, MoreVertical, Edit, Trash2, Calendar as CalendarIcon, Save } from "lucide-react";
import { format, addDays, startOfWeek, parseISO, subDays, startOfMonth, endOfMonth, endOfDay, addWeeks, subWeeks, addMonths, subMonths, isWithinInterval, eachDayOfInterval } from "date-fns";
import { tr } from "date-fns/locale";
import { formatDistanceToNow } from 'date-fns';

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
import { PageHeader } from "@/components/page-header";
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
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


const categoryIcons: { [key: string]: React.ReactElement } = {
  "Kahvaltı": <Soup className="h-4 w-4 mr-2" />,
  "Akşam Yemeği": <Soup className="h-4 w-4 mr-2" />,
};

const mealTypes = ["Kahvaltı", "Akşam Yemeği"];

type MealSelection = {
  day: Date;
  mealType: string;
} | null;

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
    
    // States for statistics
    const [statsDate, setStatsDate] = React.useState<Date>(new Date());
    const [statsPeriod, setStatsPeriod] = React.useState<'weekly' | 'monthly'>('weekly');


    React.useEffect(() => {
        const unsub = onCalorieLogsUpdate(setAllLogs);
        return () => unsub();
    }, []);

    const form = useForm<z.infer<typeof calorieFormSchema>>({
        resolver: zodResolver(calorieFormSchema),
        defaultValues: {
            caloriesTaken: 0, caloriesBurned: 0, protein: 0, carbs: 0, fat: 0,
        },
    });
    
    React.useEffect(() => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        const todaysLog = allLogs.find(log => log.id === dateKey);
        form.reset(todaysLog || { caloriesTaken: 0, caloriesBurned: 0, protein: 0, carbs: 0, fat: 0 });
    }, [selectedDate, allLogs, form]);

    const { watch, handleSubmit } = form;
    const watchedValues = watch();
    const calorieDifference = watchedValues.caloriesTaken - watchedValues.caloriesBurned;
    const calorieStatus = calorieDifference > 0 ? "Kalori Fazlası" : calorieDifference < 0 ? "Kalori Açığı" : "Dengede";


    const onSubmit = async (data: z.infer<typeof calorieFormSchema>) => {
        if (!user) {
            toast({ title: 'Hata', description: 'Bu işlemi yapmak için giriş yapmalısınız.', variant: 'destructive' });
            return;
        }
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        const logData: Omit<CalorieLog, 'familyId'> = {
            id: dateKey,
            ...data,
        };
        try {
            await upsertCalorieLog(logData);
            toast({ title: 'Kaydedildi!', description: `${format(selectedDate, 'dd MMMM yyyy')} için değerler kaydedildi.` });
        } catch (error) {
            toast({ title: 'Hata', description: 'Veriler kaydedilirken bir sorun oluştu.', variant: 'destructive' });
        }
    };
    
    const handleStatsNav = (direction: 'prev' | 'next') => {
        if (statsPeriod === 'weekly') {
            setStatsDate(d => direction === 'prev' ? subWeeks(d, 1) : addWeeks(d, 1));
        } else {
            setStatsDate(d => direction === 'prev' ? subMonths(d, 1) : addMonths(d, 1));
        }
    }
    
    const { stats, chartData, macroData } = React.useMemo(() => {
        let startDate: Date;
        let endDate: Date;

        if (statsPeriod === 'weekly') {
            startDate = startOfWeek(statsDate, { weekStartsOn: 1 });
            endDate = endOfDay(addDays(startDate, 6));
        } else { // monthly
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
            "Kalori Durumu": data.caloriesTaken - data.caloriesBurned,
        }));
        
        const totalMacros = totalProtein + totalCarbs + totalFat;
        const macroData = totalMacros > 0 ? [
            { name: 'Protein', value: totalProtein, fill: 'hsl(var(--chart-1))' },
            { name: 'Karbonhidrat', value: totalCarbs, fill: 'hsl(var(--chart-2))' },
            { name: 'Yağ', value: totalFat, fill: 'hsl(var(--chart-3))' },
        ] : [];
        
        
        return {
            stats: {
                totalTaken,
                totalBurned,
                totalDeficit: totalTaken - totalBurned,
                totalProtein,
                totalCarbs,
                totalFat,
            },
            chartData,
            macroData,
        }
    }, [allLogs, statsDate, statsPeriod]);

    const macroChartConfig = {
      macros: {
        label: "Makrolar",
      },
      Protein: {
        label: "Protein",
        color: "hsl(var(--chart-1))",
      },
      Karbonhidrat: {
        label: "Karbonhidrat",
        color: "hsl(var(--chart-2))",
      },
      Yağ: {
        label: "Yağ",
        color: "hsl(var(--chart-3))",
      },
    } satisfies ChartConfig

    return (
        <Card>
            <CardHeader>
                <CardTitle>Günlük Kalori ve Makro Takibi</CardTitle>
                <CardDescription>
                    Seçtiğiniz güne ait değerleri manuel olarak girin, kaydedin ve istatistiklerinizi görüntüleyin.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="entry" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="entry">Veri Girişi</TabsTrigger>
                        <TabsTrigger value="stats">İstatistikler</TabsTrigger>
                    </TabsList>
                    <TabsContent value="entry" className="pt-6">
                        <Form {...form}>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                <div className="flex flex-col sm:flex-row gap-4 items-center">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={"outline"}
                                                className={cn("w-full sm:w-auto justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {selectedDate ? format(selectedDate, "PPP", { locale: tr }) : <span>Tarih seçin</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                            <Calendar mode="single" selected={selectedDate} onSelect={(date) => setSelectedDate(date || new Date())} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                    <div className="flex-grow text-center sm:text-right">
                                        <p className="text-sm font-medium text-muted-foreground">{calorieStatus}</p>
                                        <p className={cn("text-2xl font-bold", calorieDifference > 0 ? "text-orange-600" : calorieDifference < 0 ? "text-green-600" : "text-foreground")}>
                                            {Math.abs(calorieDifference).toLocaleString('tr-TR')} kcal
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="caloriesTaken" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Alınan Kalori (kcal)</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="caloriesBurned" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Yakılan Kalori (kcal)</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="protein" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Protein (g)</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="carbs" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Karbonhidrat (g)</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                    <FormField control={form.control} name="fat" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Yağ (g)</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}/>
                                </div>
                                <Button type="submit" className="w-full">
                                    <Save className="mr-2 h-4 w-4" />
                                    Günü Kaydet
                                </Button>
                            </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="stats" className="pt-6">
                        <div className="space-y-6">
                            <div className="flex justify-center items-center gap-2">
                                <Button variant="outline" size="icon" onClick={() => handleStatsNav('prev')}><ChevronLeft className="h-4 w-4"/></Button>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-36"><CalendarIcon className="mr-2 h-4 w-4"/> {format(statsDate, "PPP", { locale: tr })}</Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={statsDate} onSelect={(d) => setStatsDate(d || new Date())} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                 <Button variant="outline" size="icon" onClick={() => handleStatsNav('next')}><ChevronRight className="h-4 w-4"/></Button>

                                <Tabs value={statsPeriod} onValueChange={(value) => setStatsPeriod(value as 'weekly' | 'monthly')} className="w-auto ml-4">
                                    <TabsList>
                                        <TabsTrigger value="weekly">Haftalık</TabsTrigger>
                                        <TabsTrigger value="monthly">Aylık</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card><CardHeader><CardTitle className="text-sm font-medium">Toplam Alınan</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.totalTaken.toLocaleString('tr-TR')} kcal</CardContent></Card>
                                <Card><CardHeader><CardTitle className="text-sm font-medium">Toplam Yakılan</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.totalBurned.toLocaleString('tr-TR')} kcal</CardContent></Card>
                                <Card><CardHeader><CardTitle className="text-sm font-medium">Toplam Kalori Durumu</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.totalDeficit.toLocaleString('tr-TR')} kcal</CardContent></Card>
                                <Card><CardHeader><CardTitle className="text-sm font-medium">Toplam Protein</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{stats.totalProtein.toLocaleString('tr-TR')} g</CardContent></Card>
                            </div>
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader><CardTitle>Kalori Durumu Grafiği</CardTitle></CardHeader>
                                    <CardContent className="overflow-x-auto">
                                        <ChartContainer config={{}} className="h-64 min-w-[300px]">
                                            <BarChart data={chartData} barSize={20}>
                                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis fontSize={12} tickLine={false} axisLine={false} reversed={true} />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <ReferenceLine y={0} stroke="hsl(var(--foreground))" strokeDasharray="3 3" />
                                                <Bar dataKey="Kalori Durumu" radius={[4, 4, 0, 0]}>
                                                  {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry["Kalori Durumu"] >= 0 ? "hsl(var(--chart-2))" : "hsl(var(--destructive))" } />
                                                  ))}
                                                </Bar>
                                            </BarChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
                                 <Card>
                                    <CardHeader><CardTitle>Makro Dağılımı</CardTitle></CardHeader>
                                    <CardContent>
                                         <ChartContainer config={macroChartConfig} className="h-64 min-w-[300px]">
                                            <PieChart>
                                                <Pie
                                                  data={macroData}
                                                  dataKey="value"
                                                  nameKey="name"
                                                  cx="50%"
                                                  cy="50%"
                                                  outerRadius={80}
                                                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                                    const RADIAN = Math.PI / 180;
                                                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);

                                                    return (
                                                      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                                        {`${(percent * 100).toFixed(0)}%`}
                                                      </text>
                                                    );
                                                  }}
                                                  labelLine={false}
                                                >
                                                    {macroData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value, name, props) => `${value}g (${(props.payload.percent * 100).toFixed(1)}%)`} />
                                                <Legend />
                                            </PieChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}


export default function YemekPlanlamaPage() {
  const [recipes, setRecipes] = React.useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("Hepsi");
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [statsDate, setStatsDate] = React.useState(new Date());
  const { toast } = useToast();
  
  const [mealPlan, setMealPlan] = React.useState<MealPlan>({});
  const [isRecipeSelectorOpen, setIsRecipeSelectorOpen] = React.useState(false);
  const [isNewRecipeDialogOpen, setIsNewRecipeDialogOpen] = React.useState(false);
  const [editingRecipe, setEditingRecipe] = React.useState<Recipe | null>(null);
  const [currentMealSelection, setCurrentMealSelection] = React.useState<MealSelection>(null);
  const [recipeSearchTerm, setRecipeSearchTerm] = React.useState("");
  const [recipePage, setRecipePage] = React.useState(1);


  React.useEffect(() => {
    const unsubscribePlan = onMealPlanUpdate(setMealPlan);
    const unsubscribeRecipes = onRecipesUpdate(setRecipes);
    return () => {
        unsubscribePlan();
        unsubscribeRecipes();
    };
  }, []);

  const weekStartDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStartDate, i));
  
  const handleSaveRecipe = async (recipeData: Omit<Recipe, 'id' | 'familyId'>) => {
    try {
        if (editingRecipe) {
            await updateRecipe(editingRecipe.id, recipeData);
            toast({ title: "✅ Tarif Güncellendi", description: `"${recipeData.title}" başarıyla güncellendi.`});
        } else {
            const newRecipeId = await addRecipe(recipeData);
             toast({ title: "✅ Tarif Eklendi", description: `"${recipeData.title}" başarıyla kütüphaneye eklendi.`});
            // If we are in the middle of a meal selection, add the new recipe to the plan
            if (currentMealSelection) {
                const newRecipe = { ...recipeData, id: newRecipeId };
                handleSelectRecipe(newRecipe);
            }
        }
        setIsNewRecipeDialogOpen(false);
        setEditingRecipe(null);
    } catch (e) {
        toast({ title: "❌ Hata", description: "Tarif kaydedilirken bir hata oluştu.", variant: 'destructive'});
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    try {
        await deleteRecipe(id);
        toast({ title: "Tarif Silindi", variant: "destructive" });
    } catch(e) {
        toast({ title: "Hata", description: "Tarif silinirken bir hata oluştu.", variant: "destructive" });
    }
  };

  const handleOpenRecipeSelector = (day: Date, mealType: string) => {
    setCurrentMealSelection({ day, mealType });
    setIsRecipeSelectorOpen(true);
  };
  
  const handleSelectRecipe = (recipe: Recipe) => {
    if (!currentMealSelection) return;
    const dayKey = format(currentMealSelection.day, 'yyyy-MM-dd');
    
    const updatedDayPlan = {
      ...(mealPlan[dayKey] || {}),
      [currentMealSelection.mealType]: recipe,
    };
    
    updateMealPlan(dayKey, updatedDayPlan);

    setIsRecipeSelectorOpen(false);
    setCurrentMealSelection(null);
  };
  
  const handleRemoveRecipe = (day: Date, mealType: string) => {
     const dayKey = format(day, 'yyyy-MM-dd');
     const updatedDayPlan = {
        ...(mealPlan[dayKey] || {}),
        [mealType]: null,
    };
     updateMealPlan(dayKey, updatedDayPlan);
  };

  const { allTimeCounts, lastEatenDates, monthlyStats } = React.useMemo(() => {
    const counts = new Map<string, number>();
    const lastDates = new Map<string, string>(); // recipeId -> date string 'yyyy-MM-dd'
    
    // For last eaten date (within last 90 days)
    const ninetyDaysAgo = subDays(new Date(), 90);
    
    const sortedDayKeys = Object.keys(mealPlan).sort((a, b) => b.localeCompare(a)); // Sort dates descending

    for (const dayKey of sortedDayKeys) {
        const dayPlan = mealPlan[dayKey];
        for (const recipe of Object.values(dayPlan)) {
            if (recipe?.id) {
                // Increment total count
                counts.set(recipe.id, (counts.get(recipe.id) || 0) + 1);
                
                const mealDate = parseISO(dayKey);
                // Set last eaten date if not already set and within 90 days
                if (!lastDates.has(recipe.id) && mealDate >= ninetyDaysAgo) {
                    lastDates.set(recipe.id, dayKey);
                }
            }
        }
    }
    
    // Monthly stats
    const monthStart = startOfMonth(statsDate);
    const monthEnd = endOfMonth(statsDate);
    const monthlyCounts = new Map<string, number>();

    Object.entries(mealPlan).forEach(([dayKey, dayPlan]) => {
        const mealDate = parseISO(dayKey);
        if (isWithinInterval(mealDate, { start: monthStart, end: monthEnd })) {
            Object.values(dayPlan).forEach(recipe => {
                if (recipe?.id) {
                     monthlyCounts.set(recipe.id, (monthlyCounts.get(recipe.id) || 0) + 1);
                }
            })
        }
    });

    const sortedMonthly = Array.from(monthlyCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, count]) => {
            const recipe = recipes.find(r => r.id === id);
            return recipe ? { ...recipe, count } : null;
        })
        .filter((r): r is Recipe & { count: number } => r !== null);


    return { allTimeCounts: counts, lastEatenDates: lastDates, monthlyStats: sortedMonthly };
  }, [mealPlan, recipes, statsDate]);
  
   const filteredRecipes = React.useMemo(() => {
    return recipes
        .filter(recipe => {
            const matchesCategory = activeTab === "Hepsi" || recipe.category === activeTab;
            const matchesSearch = recipe.title.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        })
        .sort((a,b) => (allTimeCounts.get(b.id) || 0) - (allTimeCounts.get(a.id) || 0));
  }, [recipes, activeTab, searchTerm, allTimeCounts]);

  const recipeSelectorFilteredRecipes = React.useMemo(() => {
    if (!recipeSearchTerm) return recipes;
    return recipes.filter(recipe =>
      recipe.title.toLowerCase().includes(recipeSearchTerm.toLowerCase()) ||
      recipe.category.toLowerCase().includes(recipeSearchTerm.toLowerCase())
    );
  }, [recipes, recipeSearchTerm]);

  const itemsPerPage = 10;
  const totalRecipePages = Math.ceil(filteredRecipes.length / itemsPerPage);
  const paginatedRecipes = filteredRecipes.slice((recipePage - 1) * itemsPerPage, recipePage * itemsPerPage);


  const handleOpenNewRecipeDialog = () => {
    setEditingRecipe(null);
    setCurrentMealSelection(null);
    setIsNewRecipeDialogOpen(true);
  }
  
  const handleOpenEditRecipeDialog = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsNewRecipeDialogOpen(true);
  }

  return (
    <div className="pb-24">
      <PageHeader title="Yemek Planı & Tarifler 🍲">
        <Button 
            variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none"
            onClick={handleOpenNewRecipeDialog}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Yeni Tarif Ekle
        </Button>
      </PageHeader>
      
        <Tabs defaultValue="planner" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="planner">Haftalık Planlayıcı</TabsTrigger>
                <TabsTrigger value="calorie">Kalori Takibi</TabsTrigger>
            </TabsList>
            <TabsContent value="planner" className="mt-6">
                <Card className="mb-8">
                    <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex-grow">
                        <CardTitle>Haftalık Yemek Planı</CardTitle>
                        <CardDescription>
                            {format(weekStartDate, 'd MMMM', { locale: tr })} - {format(addDays(weekStartDate, 6), 'd MMMM yyyy', { locale: tr })}
                        </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addDays(d, -7))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Bu Hafta</Button>
                        <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addDays(d, 7))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        </div>
                    </div>
                    </CardHeader>
                    <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-2">
                        {weekDays.map(day => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const plannedMeals = mealPlan[dayKey] || {};

                        return (
                        <Card key={day.toString()} className="flex flex-col gap-2 p-2 bg-muted/40">
                            <div className="font-semibold text-center text-sm capitalize">
                            {format(day, 'EEE', { locale: tr })}
                            <p className="text-xs text-muted-foreground">{format(day, 'd')}</p>
                            </div>
                            <div className="space-y-2 flex-grow">
                            {mealTypes.map(meal => {
                                const plannedRecipe = plannedMeals[meal];
                                return (
                                <div key={meal} className="relative group">
                                    {plannedRecipe ? (
                                        <div className={cn("h-16 rounded-md flex flex-col justify-center items-center p-2 text-center shadow-sm overflow-hidden text-white bg-gradient-to-br from-green-400 to-teal-500")}>
                                            <p className="text-xs font-semibold leading-tight">{plannedRecipe.title}</p>
                                            <button 
                                            onClick={() => handleRemoveRecipe(day, meal)}
                                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <XCircle className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                    <div 
                                        onClick={() => handleOpenRecipeSelector(day, meal)}
                                        className="h-16 bg-background/50 rounded-md flex flex-col justify-center items-center p-2 border-dashed border-2 border-muted-foreground/20 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                                        <PlusCircle className="h-5 w-5 text-muted-foreground/50 mb-1" />
                                        <span className="text-xs text-muted-foreground">{meal} Ekle</span>
                                    </div>
                                    )}
                                </div>
                                )})}
                            </div>
                        </Card>
                        )})}
                    </div>
                    </CardContent>
                </Card>

                 <Card className="mb-8">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                             <div className="flex-grow">
                                <CardTitle>Aylık Popüler Tarifler</CardTitle>
                                <CardDescription>{format(statsDate, 'MMMM yyyy', { locale: tr })}</CardDescription>
                            </div>
                             <div className="flex items-center gap-2 self-end sm:self-center">
                                <Button variant="outline" size="icon" onClick={() => setStatsDate(d => subMonths(d, 1))}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" onClick={() => setStatsDate(new Date())}>Bu Ay</Button>
                                <Button variant="outline" size="icon" onClick={() => setStatsDate(d => addMonths(d, 1))}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {monthlyStats.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {monthlyStats.map((recipe, index) => (
                                    <div key={`${recipe.id}-${index}`} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                                        <span className="font-bold text-xl text-primary">{index + 1}</span>
                                        <div>
                                            <p className="font-semibold">{recipe.title}</p>
                                            <p className="text-sm text-muted-foreground">{recipe.count} kez pişirildi</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                             <p className="text-sm text-muted-foreground text-center py-4">Bu ay için veri bulunamadı.</p>
                        )}
                    </CardContent>
                </Card>
                
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                        <Card className="bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg rounded-xl">
                            <AccordionTrigger className="w-full p-6 hover:no-underline">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
                                    <div>
                                        <CardTitle>Tarif Kütüphanesi ({recipes.length})</CardTitle>
                                        <CardDescription className="text-white/80">
                                            Ailenizin favori tariflerini burada bulun, yönetin ve yenilerini ekleyin.
                                        </CardDescription>
                                    </div>
                                    <div className="w-full sm:w-auto md:w-1/3 relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                                        <Input 
                                        placeholder="Tarif ara..." 
                                        className="pl-10 bg-white/20 border-0 placeholder:text-white/70"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-6 pt-0">
                                <div className="bg-card text-card-foreground p-4 rounded-lg">
                                    <Tabs defaultValue="Hepsi" onValueChange={(value) => setActiveTab(value)}>
                                        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-3 mb-6">
                                            <TabsTrigger value="Hepsi">Hepsi</TabsTrigger>
                                            {Object.keys(categoryIcons).map(category => (
                                                <TabsTrigger key={category} value={category}>
                                                    {React.cloneElement(categoryIcons[category], { className: "mr-2 h-4 w-4"})}
                                                    {category}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                        
                                        <div className="mt-6">
                                        {paginatedRecipes.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                                {paginatedRecipes.map(recipe => (
                                                <Dialog key={recipe.id}>
                                                        <Card className="overflow-hidden cursor-pointer group transition-all hover:shadow-xl hover:-translate-y-1 bg-card text-card-foreground relative">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <MoreVertical className="h-4 w-4"/>
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent>
                                                                    <DropdownMenuItem onClick={() => handleOpenEditRecipeDialog(recipe)}>
                                                                        <Edit className="mr-2 h-4 w-4"/> Düzenle
                                                                    </DropdownMenuItem>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                                                <Trash2 className="mr-2 h-4 w-4"/> Sil
                                                                            </DropdownMenuItem>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent>
                                                                            <AlertDialogHeader><AlertDialogTitle>Tarifi Sil</AlertDialogTitle><AlertDialogDescription>"{recipe.title}" tarifini kalıcı olarak silmek istediğinizden emin misiniz?</AlertDialogDescription></AlertDialogHeader>
                                                                            <AlertDialogFooter><AlertDialogCancel>İptal</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteRecipe(recipe.id)}>Sil</AlertDialogAction></AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                            <DialogTrigger asChild>
                                                                <div>
                                                                    <CardHeader className="p-4">
                                                                    <div className="flex justify-between items-start">
                                                                        <CardTitle className="truncate group-hover:text-primary text-base flex-grow">{recipe.title}</CardTitle>
                                                                        {(allTimeCounts.get(recipe.id) || 0) > 0 && (
                                                                            <Badge variant="secondary">{allTimeCounts.get(recipe.id)}</Badge>
                                                                        )}
                                                                    </div>
                                                                    <CardDescription className="text-xs">{recipe.category}</CardDescription>
                                                                    </CardHeader>
                                                                </div>
                                                            </DialogTrigger>
                                                        </Card>
                                                        <DialogContent className="sm:max-w-md">
                                                            <DialogHeader>
                                                                <Badge variant="secondary" className="w-fit mb-2">{recipe.category}</Badge>
                                                                <DialogTitle className="text-3xl font-bold">{recipe.title}</DialogTitle>
                                                                <DialogDescription className="flex items-center gap-4 pt-2">
                                                                    <span><Star className="inline-block mr-1 h-4 w-4 text-yellow-400 fill-yellow-400"/>{recipe.rating}/5</span>
                                                                    {lastEatenDates.has(recipe.id) && (
                                                                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                                                                            <Clock className="h-4 w-4" />
                                                                            Son Yeme: {formatDistanceToNow(parseISO(lastEatenDates.get(recipe.id)!), { addSuffix: true, locale: tr })}
                                                                        </span>
                                                                    )}
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            {recipe.instructions && (
                                                                <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-4">
                                                                    <h3 className="font-semibold text-xl border-b pb-2">Hazırlanışı</h3>
                                                                    <p className="whitespace-pre-wrap">{recipe.instructions}</p>
                                                                </div>
                                                            )}
                                                        </DialogContent>
                                                    </Dialog>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-16 text-muted-foreground">
                                                <p>Aradığınız kriterlere uygun tarif bulunamadı.</p>
                                            </div>
                                        )}
                                        </div>
                                         {totalRecipePages > 1 && (
                                            <div className="flex justify-center items-center gap-4 mt-6">
                                                <Button variant="outline" onClick={() => setRecipePage(p => Math.max(1, p - 1))} disabled={recipePage === 1}>
                                                    <ChevronLeft className="h-4 w-4 mr-2"/> Önceki
                                                </Button>
                                                <span className="text-sm text-muted-foreground">
                                                    Sayfa {recipePage} / {totalRecipePages}
                                                </span>
                                                <Button variant="outline" onClick={() => setRecipePage(p => Math.min(totalRecipePages, p + 1))} disabled={recipePage === totalRecipePages}>
                                                    Sonraki <ChevronRight className="h-4 w-4 ml-2"/>
                                                </Button>
                                            </div>
                                        )}
                                    </Tabs>
                                </div>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                </Accordion>
            </TabsContent>
            <TabsContent value="calorie" className="mt-6">
                <CalorieTracker />
            </TabsContent>
        </Tabs>

      {/* Recipe Selector Dialog */}
      <Dialog open={isRecipeSelectorOpen} onOpenChange={setIsRecipeSelectorOpen}>
          <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                  <DialogTitle>Tarif Seç</DialogTitle>
                  <DialogDescription>
                    {currentMealSelection && 
                        `${format(currentMealSelection.day, 'd MMMM, EEEE', {locale: tr})} - ${currentMealSelection.mealType}`
                    } için bir tarif seçin.
                  </DialogDescription>
              </DialogHeader>
              <div className="my-4 space-y-4">
                  <div className="relative w-full">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Tariflerde ara..." 
                      className="pl-10"
                      value={recipeSearchTerm}
                      onChange={(e) => setRecipeSearchTerm(e.target.value)}
                    />
                 </div>
                <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                        setIsRecipeSelectorOpen(false); // Close this dialog
                        handleOpenNewRecipeDialog(); // Open the new recipe dialog
                    }}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Aradığın yok mu? Yeni Tarif Oluştur
                </Button>
              </div>
              <ScrollArea className="h-72 -mx-6 px-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                    {recipeSelectorFilteredRecipes.map(recipe => (
                        <Card 
                            key={recipe.id}
                            className="overflow-hidden cursor-pointer group transition-all hover:shadow-lg hover:border-primary"
                            onClick={() => handleSelectRecipe(recipe)}
                        >
                            <CardHeader className="p-3">
                                <CardTitle className="text-sm truncate group-hover:text-primary">{recipe.title}</CardTitle>
                                <CardDescription className="text-xs">{recipe.category}</CardDescription>
                            </CardHeader>
                        </Card>
                    ))}
                     {recipeSelectorFilteredRecipes.length === 0 && (
                        <p className="col-span-full text-center text-muted-foreground py-8">
                            Tarif bulunamadı.
                        </p>
                    )}
                </div>
              </ScrollArea>
          </DialogContent>
      </Dialog>
      
      {/* New/Edit Recipe Dialog */}
       <Dialog open={isNewRecipeDialogOpen} onOpenChange={(open) => { if (!open) setEditingRecipe(null); setIsNewRecipeDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRecipe ? 'Tarifi Düzenle' : 'Yeni Tarif Ekle'}</DialogTitle>
            <DialogDescription>
              {editingRecipe ? 'Mevcut tarifin detaylarını güncelleyin.' : 'Yeni tarifi kütüphaneye ekleyin.'}
            </DialogDescription>
          </DialogHeader>
          <NewRecipeForm onSubmit={handleSaveRecipe} initialData={editingRecipe} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
