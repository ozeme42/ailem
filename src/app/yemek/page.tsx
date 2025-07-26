
"use client";

import * as React from "react";
import { PlusCircle, Search, Clock, Soup, Star, ChevronLeft, ChevronRight, XCircle, Wheat } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { tr } from "date-fns/locale";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Recipe, MealPlan } from "@/lib/data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { onMealPlanUpdate, updateMealPlan, onRecipesUpdate, addRecipe } from "@/lib/dataService";
import { cn } from "@/lib/utils";
import { NewRecipeForm } from "@/components/new-recipe-form";
import { useToast } from "@/hooks/use-toast";


const categoryIcons: { [key: string]: React.ReactElement } = {
  "Kahvaltı": <Soup className="h-4 w-4 mr-2" />,
  "Akşam Yemeği": <Soup className="h-4 w-4 mr-2" />,
  "Atıştırmalık": <Wheat className="h-4 w-4 mr-2" />,
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

  return (
    <>
      <PageHeader title="Yemek Planı & Tarifler 🍲">
        <Button 
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl transition-shadow"
            onClick={() => {
                setCurrentMealSelection(null); // Ensure we are not in selection mode
                setIsNewRecipeDialogOpen(true);
            }}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Yeni Tarif Ekle
        </Button>
      </PageHeader>

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
      
      <Card>
          <CardHeader>
             <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <CardTitle>Tarif Kütüphanesi</CardTitle>
                 <div className="w-full sm:w-auto md:w-1/3 relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Tarif ara..." 
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
             </div>
             <CardDescription>
                Ailenizin favori tariflerini burada bulun, yönetin ve yenilerini ekleyin.
             </CardDescription>
          </CardHeader>
          <CardContent>
             <Tabs defaultValue="Hepsi" onValueChange={(value) => setActiveTab(value)}>
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6">
                    <TabsTrigger value="Hepsi">Hepsi</TabsTrigger>
                    {Object.keys(categoryIcons).map(category => (
                        <TabsTrigger key={category} value={category}>
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
                                    <Card className="overflow-hidden cursor-pointer group transition-all hover:shadow-xl hover:-translate-y-1">
                                      <CardHeader className="p-4">
                                          <CardTitle className="truncate group-hover:text-primary text-base">{recipe.title}</CardTitle>
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
