
"use client";

import * as React from "react";
import { PlusCircle, Search, Clock, Soup, Star, ChevronLeft, ChevronRight, XCircle, Wheat, BarChart2 } from "lucide-react";
import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { formatDistanceToNow } from 'date-fns';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Recipe, MealPlan } from "@/lib/data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { onMealPlanUpdate, onRecipesUpdate, addRecipe } from "@/lib/dataService";
import { cn } from "@/lib/utils";
import { NewRecipeForm } from "@/components/new-recipe-form";
import { useToast } from "@/hooks/use-toast";


const categoryIcons: { [key: string]: React.ReactElement } = {
  "Kahvaltı": <Soup className="h-4 w-4 mr-2" />,
  "Akşam Yemeği": <Soup className="h-4 w-4 mr-2" />,
};

const mealTypes = ["Kahvaltı", "Akşam Yemeği"];

type MealSelection = {
  day: Date;
  mealType: string;
} | null;


export default function YemekPlanlamaPage() {
  const [recipes, setRecipes] = React.useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("Hepsi");
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const { toast } = useToast();
  
  const [mealPlan, setMealPlan] = React.useState<MealPlan>({});
  const [isRecipeSelectorOpen, setIsRecipeSelectorOpen] = React.useState(false);
  const [isNewRecipeDialogOpen, setIsNewRecipeDialogOpen] = React.useState(false);
  const [currentMealSelection, setCurrentMealSelection] = React.useState<MealSelection>(null);

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


  const filteredRecipes = recipes.filter(recipe => {
    const matchesCategory = activeTab === "Hepsi" || recipe.category === activeTab;
    const matchesSearch = recipe.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  const handleAddNewRecipe = async (recipeData: Omit<Recipe, 'id' | 'familyId'>) => {
    try {
        const newRecipeId = await addRecipe(recipeData);
        toast({ title: "✅ Tarif Eklendi", description: `"${recipeData.title}" başarıyla kütüphaneye eklendi.`});
        setIsNewRecipeDialogOpen(false);
        
        // If we are in the middle of a meal selection, add the new recipe to the plan
        if (currentMealSelection) {
            const newRecipe = { ...recipeData, id: newRecipeId };
            handleSelectRecipe(newRecipe);
        }

    } catch (e) {
        toast({ title: "❌ Hata", description: "Tarif eklenirken bir hata oluştu.", variant: 'destructive'});
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

  const { mostEaten, recipeCounts, lastEatenDates } = React.useMemo(() => {
    const counts = new Map<string, number>();
    const lastDates = new Map<string, string>(); // recipeId -> date string 'yyyy-MM-dd'
    
    const sortedDayKeys = Object.keys(mealPlan).sort((a, b) => b.localeCompare(a)); // Sort dates descending

    for (const dayKey of sortedDayKeys) {
        const dayPlan = mealPlan[dayKey];
        for (const recipe of Object.values(dayPlan)) {
            if (recipe?.id) {
                // Increment count
                counts.set(recipe.id, (counts.get(recipe.id) || 0) + 1);
                // Set last eaten date if not already set (since we iterate from most recent)
                if (!lastDates.has(recipe.id)) {
                    lastDates.set(recipe.id, dayKey);
                }
            }
        }
    }

    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, count]) => {
        const recipe = recipes.find(r => r.id === id);
        return { ...recipe, count };
      });

    return { mostEaten: sorted, recipeCounts: counts, lastEatenDates: lastDates };
  }, [mealPlan, recipes]);

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl shadow-lg mb-6">
        <h1 className="text-2xl font-bold">Yemek Planı & Tarifler 🍲</h1>
        <Button 
            variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none"
            onClick={() => {
                setCurrentMealSelection(null); // Ensure we are not in selection mode
                setIsNewRecipeDialogOpen(true);
            }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Yeni Tarif Ekle
        </Button>
      </div>

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
      
      <Card className="mb-8 bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart2/> İstatistikler</CardTitle>
          <CardDescription className="text-white/80">Ailenin yemek tercihleri ve en popüler tarifler.</CardDescription>
        </CardHeader>
        <CardContent>
            <h3 className="font-semibold mb-2 text-center">En Çok Yenenler</h3>
            {mostEaten.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {mostEaten.map((recipe, index) => (
                       recipe.id ? (
                        <Card key={recipe.id} className="p-4 flex items-center gap-4 bg-white/20 text-white border-0">
                             <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white/30 font-bold text-lg">{index + 1}</div>
                             <div>
                                 <p className="font-semibold">{recipe.title}</p>
                                 <p className="text-sm text-white/80">{recipe.count} kez pişirildi</p>
                             </div>
                        </Card>
                       ) : null
                    ))}
                </div>
            ) : (
                <p className="text-sm text-white/80 text-center py-4">İstatistik gösterecek kadar veri henüz yok.</p>
            )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg rounded-xl">
          <CardHeader>
             <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <CardTitle>Tarif Kütüphanesi</CardTitle>
                 <div className="w-full sm:w-auto md:w-1/3 relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/70" />
                    <Input 
                      placeholder="Tarif ara..." 
                      className="pl-10 bg-white/20 border-0 placeholder:text-white/70"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
             </div>
             <CardDescription className="text-white/80">
                Ailenizin favori tariflerini burada bulun, yönetin ve yenilerini ekleyin.
             </CardDescription>
          </CardHeader>
          <CardContent>
             <Tabs defaultValue="Hepsi" onValueChange={(value) => setActiveTab(value)}>
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-3 mb-6 bg-white/20 text-white">
                    <TabsTrigger value="Hepsi" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">Hepsi</TabsTrigger>
                    {Object.keys(categoryIcons).map(category => (
                        <TabsTrigger key={category} value={category} className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                            {React.cloneElement(categoryIcons[category], { className: "mr-2 h-4 w-4"})}
                            {category}
                        </TabsTrigger>
                    ))}
                </TabsList>
                
                <div className="mt-6">
                 {filteredRecipes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredRecipes.map(recipe => (
                           <Dialog key={recipe.id}>
                                <DialogTrigger asChild>
                                    <Card className="overflow-hidden cursor-pointer group transition-all hover:shadow-xl hover:-translate-y-1 bg-card text-card-foreground">
                                      <CardHeader className="p-4">
                                          <div className="flex justify-between items-start">
                                            <CardTitle className="truncate group-hover:text-primary text-base flex-grow">{recipe.title}</CardTitle>
                                            {(recipeCounts.get(recipe.id) || 0) > 0 && (
                                                <Badge variant="secondary">{recipeCounts.get(recipe.id)}</Badge>
                                            )}
                                          </div>
                                          <CardDescription className="text-xs">{recipe.category}</CardDescription>
                                      </CardHeader>
                                    </Card>
                                </DialogTrigger>
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
                    <div className="text-center py-16 text-white/80">
                        <p>Aradığınız kriterlere uygun tarif bulunamadı.</p>
                    </div>
                 )}
                </div>
            </Tabs>
          </CardContent>
      </Card>

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
              <div className="my-4">
                <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                        setIsRecipeSelectorOpen(false); // Close this dialog
                        setIsNewRecipeDialogOpen(true); // Open the new recipe dialog
                    }}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Aradığın yok mu? Yeni Tarif Oluştur
                </Button>
              </div>
              <ScrollArea className="h-72 -mx-6 px-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                    {recipes.map(recipe => (
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
                </div>
              </ScrollArea>
          </DialogContent>
      </Dialog>
      
      {/* New Recipe Dialog */}
       <Dialog open={isNewRecipeDialogOpen} onOpenChange={setIsNewRecipeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Tarif Ekle</DialogTitle>
            <DialogDescription>
              Yeni tarifi kütüphaneye ekleyin. Kaydedince plana da eklenecektir.
            </DialogDescription>
          </DialogHeader>
          <NewRecipeForm onSubmit={handleAddNewRecipe} />
        </DialogContent>
      </Dialog>
    </>
  );
}



    