
"use client";
import * as React from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, ShoppingCart, TrendingUp, DollarSign, ChevronDown } from "lucide-react";
import { shoppingLists, familyMembers } from "@/lib/data";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ShoppingPage() {
  const [openLists, setOpenLists] = React.useState<number[]>(shoppingLists.map(l => l.id));

  const toggleList = (id: number) => {
    setOpenLists(prev => prev.includes(id) ? prev.filter(listId => listId !== id) : [...prev, id]);
  };
  
  const getAssignee = (assigneeId: number) => {
    return familyMembers.find((m) => m.id === assigneeId)!;
  };

  const calculateListTotals = (list: (typeof shoppingLists)[0]) => {
    const currentTotal = list.items.filter(i => i.completed).reduce((sum, item) => sum + item.price, 0);
    const completedCount = list.items.filter(i => i.completed).length;
    return { currentTotal, completedCount };
  }

  const overallBudget = shoppingLists.reduce((sum, list) => sum + list.totalBudget, 0);
  const overallSpent = shoppingLists.reduce((sum, list) => {
      const { currentTotal } = calculateListTotals(list);
      return sum + currentTotal;
  }, 0);


  return (
    <>
      <PageHeader title="Alışveriş Yönetimi 🛒">
        <Dialog>
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
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Liste Adı
                        </Label>
                        <Input id="name" defaultValue="Haftalık Market" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="budget" className="text-right">
                            Bütçe
                        </Label>
                        <Input id="budget" type="number" defaultValue="500" className="col-span-3" />
                    </div>
                </div>
                <Button type="submit">Listeyi Oluştur</Button>
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
            <CardTitle className="text-sm font-medium">Tasarruf Oranı</CardTitle>
             <div className="text-2xl font-bold text-green-600">%{(((overallBudget - overallSpent) / overallBudget) * 100).toFixed(0)}</div>
          </CardHeader>
          <CardContent>
             <Progress value={((overallSpent / overallBudget) * 100)} className="h-2"/>
             <p className="text-xs text-muted-foreground mt-2">Bütçenin kullanılma durumu</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {shoppingLists.map(list => {
          const { currentTotal, completedCount } = calculateListTotals(list);
          const budgetProgress = (currentTotal / list.totalBudget) * 100;
          const completionProgress = (completedCount / list.items.length) * 100;
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
                       <div className="flex justify-between items-center cursor-pointer">
                         <div>
                            <CardTitle>{list.title}</CardTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <Badge variant="outline">{list.category}</Badge>
                                <span>•</span>
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback>{assignee.avatar}</AvatarFallback>
                                </Avatar>
                                <span>{assignee.name}</span>
                                <span>•</span>
                                <span>Teslim: {list.dueDate}</span>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="font-semibold text-green-600">₺{currentTotal.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">/ ₺{list.totalBudget.toFixed(2)}</p>
                            </div>
                            <Button variant="ghost" size="icon">
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
                      {list.items.map(item => (
                        <div key={item.id} className={`flex items-center justify-between p-2 rounded-md ${item.completed ? 'bg-muted/50' : ''}`}>
                          <div className="flex items-center gap-3">
                            <Checkbox id={`item-${item.id}`} defaultChecked={item.completed} />
                            <div>
                               <label htmlFor={`item-${item.id}`} className={`font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>{item.name}</label>
                               <p className="text-xs text-muted-foreground">{item.quantity}</p>
                            </div>
                          </div>
                          <p className={`font-semibold ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                            ₺{item.price.toFixed(2)}
                          </p>
                        </div>
                      ))}
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
