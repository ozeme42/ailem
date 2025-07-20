
"use client";
import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, ShoppingCart, TrendingUp, DollarSign, ChevronDown } from "lucide-react";
import { familyMembers, type ShoppingList, type ShoppingItem } from "@/lib/data";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { onShoppingListsUpdate, addShoppingList, updateShoppingList } from "@/lib/dataService";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const newListSchema = z.object({
    title: z.string().min(3, "Liste adı en az 3 karakter olmalıdır."),
    budget: z.coerce.number().min(0, "Bütçe pozitif bir değer olmalıdır."),
    assigneeId: z.string({ required_error: "Lütfen bir sorumlu seçin." }),
});

type NewListFormData = z.infer<typeof newListSchema>;


export default function ShoppingPage() {
  const { toast } = useToast();
  const [shoppingLists, setShoppingLists] = React.useState<ShoppingList[]>([]);
  const [openLists, setOpenLists] = React.useState<string[]>([]);
  const [isNewListDialogOpen, setIsNewListDialogOpen] = React.useState(false);
  const form = useForm<NewListFormData>({
    resolver: zodResolver(newListSchema),
    defaultValues: { title: "", budget: 0 }
  });

  React.useEffect(() => {
    const unsubscribe = onShoppingListsUpdate((lists) => {
        setShoppingLists(lists);
        // Keep newly created lists open
        if (openLists.length === 0 && lists.length > 0) {
            setOpenLists(lists.map(l => l.id));
        }
    });
    return () => unsubscribe();
  }, [openLists.length]);

  const toggleList = (id: string) => {
    setOpenLists(prev => prev.includes(id) ? prev.filter(listId => listId !== id) : [...prev, id]);
  };
  
  const getAssignee = (assigneeId: number) => {
    return familyMembers.find((m) => m.id === assigneeId)!;
  };

  const calculateListTotals = (list: ShoppingList) => {
    const currentTotal = list.items.filter(i => i.completed).reduce((sum, item) => sum + (item.price || 0), 0);
    const completedCount = list.items.filter(i => i.completed).length;
    return { currentTotal, completedCount };
  }

  const overallBudget = shoppingLists.reduce((sum, list) => sum + list.totalBudget, 0);
  const overallSpent = shoppingLists.reduce((sum, list) => {
      const { currentTotal } = calculateListTotals(list);
      return sum + currentTotal;
  }, 0);
  const budgetUsagePercentage = overallBudget > 0 ? (overallSpent / overallBudget) * 100 : 0;
  
  const handleItemToggle = async (list: ShoppingList, itemId: number) => {
    const newItems = list.items.map(item => 
        item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    try {
        await updateShoppingList(list.id, { items: newItems });
    } catch (e) {
        toast({ title: "Hata", description: "Ürün güncellenemedi.", variant: 'destructive'});
    }
  }

  const handleCreateList = async (data: NewListFormData) => {
      const newList: Omit<ShoppingList, 'id'> = {
          title: data.title,
          totalBudget: data.budget,
          assigneeId: Number(data.assigneeId),
          category: 'Market', // Default category
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week from now
          items: []
      }
      try {
          await addShoppingList(newList);
          toast({ title: "Liste Oluşturuldu", description: `${data.title} başarıyla eklendi.`});
          setIsNewListDialogOpen(false);
          form.reset();
      } catch (e) {
          toast({ title: "Hata", description: "Liste oluşturulamadı.", variant: 'destructive'});
      }
  }


  return (
    <>
      <PageHeader title="Alışveriş Yönetimi 🛒">
        <Dialog open={isNewListDialogOpen} onOpenChange={setIsNewListDialogOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-green-500 to-cyan-500 text-white shadow-lg hover:shadow-xl transition-shadow">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Yeni Liste Oluştur
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Yeni Alışveriş Listesi</DialogTitle>
                    <DialogDescription>
                        Yeni bir alışveriş listesi oluşturarak ihtiyaçlarınızı takip edin.
                    </DialogDescription>
                </DialogHeader>
                 <form onSubmit={form.handleSubmit(handleCreateList)} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Liste Adı
                        </Label>
                        <Input id="name" {...form.register("title")} placeholder="Haftalık Market" className="col-span-3" />
                         {form.formState.errors.title && <p className="col-span-4 text-sm text-destructive">{form.formState.errors.title.message}</p>}
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="budget" className="text-right">
                            Bütçe (₺)
                        </Label>
                        <Input id="budget" type="number" {...form.register("budget")} placeholder="500" className="col-span-3" />
                        {form.formState.errors.budget && <p className="col-span-4 text-sm text-destructive">{form.formState.errors.budget.message}</p>}
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="assigneeId" className="text-right">
                            Sorumlu
                        </Label>
                        <Controller
                            control={form.control}
                            name="assigneeId"
                            render={({ field }) => (
                               <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Birini seçin" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {familyMembers.map(member => (
                                            <SelectItem key={member.id} value={member.id.toString()}>{member.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                         {form.formState.errors.assigneeId && <p className="col-span-4 text-sm text-destructive">{form.formState.errors.assigneeId.message}</p>}
                    </div>
                    <Button type="submit">Listeyi Oluştur</Button>
                </form>
            </DialogContent>
        </Dialog>
      </PageHeader>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Liste Sayısı</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shoppingLists.length}</div>
            <p className="text-xs text-muted-foreground">Tüm alışveriş listeleri</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Bütçe</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₺{overallBudget.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Tüm listeler için</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Harcama</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₺{overallSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Tamamlanan ürünler</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bütçe Kullanımı</CardTitle>
             <div className="text-2xl font-bold text-green-600">%{budgetUsagePercentage.toFixed(0)}</div>
          </CardHeader>
          <CardContent>
             <Progress value={budgetUsagePercentage} className="h-2"/>
             <p className="text-xs text-muted-foreground mt-2">Bütçenin kullanılma durumu</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {shoppingLists.map(list => {
          const { currentTotal, completedCount } = calculateListTotals(list);
          const budgetProgress = list.totalBudget > 0 ? (currentTotal / list.totalBudget) * 100 : 0;
          const completionProgress = list.items.length > 0 ? (completedCount / list.items.length) * 100 : 0;
          const assignee = getAssignee(list.assigneeId);

          return (
            <Collapsible
              key={list.id}
              open={openLists.includes(list.id)}
              onOpenChange={() => toggleList(list.id)}
              className="w-full"
            >
              <Card>
                <CardHeader>
                   <CollapsibleTrigger asChild>
                       <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 cursor-pointer">
                         <div className="flex-grow">
                            <CardTitle>{list.title}</CardTitle>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground mt-1">
                                <Badge variant="outline">{list.category}</Badge>
                                <span className="hidden sm:inline">•</span>
                                <div className="flex items-center gap-1">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={assignee.avatar} alt={assignee.name} />
                                      <AvatarFallback>{assignee.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span>{assignee.name}</span>
                                </div>
                                <span className="hidden sm:inline">•</span>
                                <span>Teslim: {new Date(list.dueDate).toLocaleDateString('tr-TR')}</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                            <div className="text-right flex-grow">
                                <p className="font-semibold text-green-600">₺{currentTotal.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">/ ₺{list.totalBudget.toFixed(2)}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="shrink-0">
                               <ChevronDown className={`h-4 w-4 transition-transform ${openLists.includes(list.id) ? 'rotate-180' : ''}`} />
                            </Button>
                         </div>
                       </div>
                   </CollapsibleTrigger>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Tamamlanma: {completedCount}/{list.items.length}</span>
                        <span>Bütçe Kullanımı: {budgetProgress.toFixed(0)}%</span>
                      </div>
                      <Progress value={completionProgress} indicatorClassName="bg-blue-500" />
                    </div>
                  <CollapsibleContent>
                    <div className="space-y-2 border-t pt-4">
                      {list.items.length > 0 ? list.items.map(item => (
                        <div key={item.id} className={`flex items-center justify-between p-2 rounded-md ${item.completed ? 'bg-muted/50' : ''}`}>
                          <div className="flex items-center gap-3">
                            <Checkbox 
                                id={`item-${item.id}`} 
                                checked={item.completed} 
                                onCheckedChange={() => handleItemToggle(list, item.id)}
                            />
                            <div>
                               <label htmlFor={`item-${item.id}`} className={`font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>{item.name}</label>
                               <p className="text-xs text-muted-foreground">{item.quantity}</p>
                            </div>
                          </div>
                          <p className={`font-semibold ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                            ₺{item.price.toFixed(2)}
                          </p>
                        </div>
                      )) : (
                          <p className="text-center text-muted-foreground py-4">Bu listede henüz ürün yok.</p>
                      )}
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          )
        })}
      </div>
    </>
  );
}

    