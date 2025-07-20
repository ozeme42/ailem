
"use client";

import * as React from "react";
import Image from "next/image";
import { PlusCircle, Search, Clock, Soup, Salad, Wheat, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfWeek } from "date-fns";
import { tr } from "date-fns/locale";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { recipes, Recipe } from "@/lib/data";

const categoryIcons = {
  "Kahvaltı": <Soup className="h-4 w-4 mr-2" />,
  "Öğle Yemeği": <Salad className="h-4 w-4 mr-2" />,
  "Akşam Yemeği": <Soup className="h-4 w-4 mr-2" />,
  "Atıştırmalık": <Wheat className="h-4 w-4 mr-2" />,
};

const mealTypes = ["Kahvaltı", "Öğle Yemeği", "Akşam Yemeği"];

export default function YemekPlanlamaPage() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeTab, setActiveTab] = React.useState("Hepsi");
  const [currentDate, setCurrentDate] = React.useState(new Date());

  const weekStartDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStartDate, i));


  const filteredRecipes = recipes.filter(recipe => {
    const matchesCategory = activeTab === "Hepsi" || recipe.category === activeTab;
    const matchesSearch = recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          recipe.ingredients.some(ing => ing.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <PageHeader title="Yemek Planı & Tarifler 🍲">
        <Button className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-xl transition-shadow">
          <PlusCircle className="mr-2 h-4 w-4" />
          Yeni Tarif Ekle
        </Button>
      </PageHeader>

       <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Haftalık Yemek Planı</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addDays(d, -7))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Bu Hafta</Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addDays(d, 7))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription>
            Bu haftanın menüsünü planlayın. Tarifleri aşağıdan sürükleyip bırakın.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => (
              <Card key={day.toString()} className="flex flex-col gap-2 p-2 bg-muted/40">
                <div className="font-semibold text-center text-sm capitalize">
                  {format(day, 'EEE', { locale: tr })}
                  <p className="text-xs text-muted-foreground">{format(day, 'd')}</p>
                </div>
                <div className="space-y-2 flex-grow">
                  {mealTypes.map(meal => (
                    <div key={meal} className="h-20 bg-background/50 rounded-md flex justify-center items-center border-dashed border-2 border-muted-foreground/20">
                      <span className="text-xs text-muted-foreground">{meal}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
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
                      placeholder="Tarif veya malzeme ara..." 
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
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 mb-6">
                    <TabsTrigger value="Hepsi">Hepsi</TabsTrigger>
                    {Object.keys(categoryIcons).map(category => (
                        <TabsTrigger key={category} value={category}>
                            {React.cloneElement(categoryIcons[category as keyof typeof categoryIcons], { className: "mr-2 h-4 w-4"})}
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
                                      <div className="relative">
                                          <Image src={recipe.image} alt={recipe.title} width={400} height={250} className="w-full h-40 object-cover" data-ai-hint="food meal" />
                                          <Badge className="absolute top-2 right-2 bg-black/50 text-white backdrop-blur-sm">{recipe.prepTime}</Badge>
                                      </div>
                                      <CardHeader className="p-4">
                                          <CardTitle className="truncate group-hover:text-primary text-base">{recipe.title}</CardTitle>
                                          <CardDescription className="text-xs">{recipe.category}</CardDescription>
                                      </CardHeader>
                                    </Card>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-3xl">
                                    <DialogHeader>
                                        <Badge variant="secondary" className="w-fit mb-2">{recipe.category}</Badge>
                                        <DialogTitle className="text-3xl font-bold">{recipe.title}</DialogTitle>
                                        <DialogDescription className="flex items-center gap-4 pt-2">
                                            <span><Clock className="inline-block mr-1 h-4 w-4"/>{recipe.prepTime}</span>
                                            <span><Star className="inline-block mr-1 h-4 w-4 text-yellow-400 fill-yellow-400"/>{recipe.rating}/5</span>
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid md:grid-cols-2 gap-8 mt-4 max-h-[60vh] overflow-y-auto pr-4">
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-xl border-b pb-2">Malzemeler</h3>
                                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                                {recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                                            </ul>
                                             <Image src={recipe.image} alt={recipe.title} width={400} height={250} className="w-full h-auto rounded-lg object-cover" data-ai-hint="food meal" />
                                        </div>
                                        <div className="space-y-4">
                                            <h3 className="font-semibold text-xl border-b pb-2">Hazırlanışı</h3>
                                            <ol className="list-decimal list-inside space-y-3">
                                                {recipe.instructions.map((step, i) => <li key={i}>{step}</li>)}
                                            </ol>
                                        </div>
                                    </div>
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
    </>
  );
}
