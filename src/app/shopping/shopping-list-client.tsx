"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
    PlusCircle,
    ShoppingCart,
    Trash2
} from "lucide-react";
import {
    type ShoppingList
} from "@/lib/data";
import {
    addShoppingList as createShoppingList, // Renamed to avoid conflict
    deleteShoppingList,
    onShoppingListsUpdate,
} from "@/lib/dataService";
import {
    useToast
} from "@/hooks/use-toast";

import {
    PageHeader
} from "@/components/page-header";
import {
    Button
} from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Progress
} from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Input
} from "@/components/ui/input";
import {
    Label
} from "@/components/ui/label";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const newListSchema = z.object({
    title: z.string().min(3, "Liste adı en az 3 karakter olmalıdır."),
});

type NewListFormData = z.infer < typeof newListSchema > ;

export default function ShoppingListClient() {
    const {
        toast
    } = useToast();
    const router = useRouter();
    const [shoppingLists, setShoppingLists] = React.useState < ShoppingList[] > ([]);
    const [isNewListDialogOpen, setIsNewListDialogOpen] = React.useState(false);

    const newListForm = useForm < NewListFormData > ({
        resolver: zodResolver(newListSchema),
        defaultValues: {
            title: ""
        },
    });

    React.useEffect(() => {
        const unsubscribe = onShoppingListsUpdate(setShoppingLists);
        return () => unsubscribe();
    }, []);

    const calculateListProgress = (list: ShoppingList) => {
        if (!list.items || list.items.length === 0) return 0;
        const completedCount = list.items.filter((i) => i.isBought).length;
        return (completedCount / list.items.length) * 100;
    };

    const handleCreateList = async (data: NewListFormData) => {
        try {
            await createShoppingList(data.title, 'ShoppingCart');
            toast({
                title: "Liste Oluşturuldu",
                description: `${data.title} başarıyla eklendi.`
            });
            setIsNewListDialogOpen(false);
            newListForm.reset();
        } catch (e) {
            toast({
                title: "Hata",
                description: "Liste oluşturulamadı.",
                variant: "destructive"
            });
        }
    };

    const handleDeleteList = async (listId: string) => {
        try {
            await deleteShoppingList(listId);
            toast({
                title: "Liste Silindi",
                variant: "destructive"
            });
        } catch (e) {
            toast({
                title: "Hata",
                description: "Liste silinirken bir sorun oluştu.",
                variant: "destructive",
            });
        }
    };

    return ( <
        >
        <
        PageHeader title = "Alışveriş Yönetimi 🛒" >
        <
        Dialog open = {
            isNewListDialogOpen
        }
        onOpenChange = {
            setIsNewListDialogOpen
        } >
        <
        DialogTrigger asChild >
        <
        Button className = "bg-gradient-to-r from-green-500 to-cyan-500 text-white shadow-lg hover:shadow-xl transition-shadow" >
        <
        PlusCircle className = "mr-2 h-4 w-4" / >
        Yeni Liste Oluştur <
        /Button> <
        /DialogTrigger> <
        DialogContent className = "sm:max-w-md" >
        <
        DialogHeader >
        <
        DialogTitle > Yeni Alışveriş Listesi < /DialogTitle> <
        DialogDescription >
        Yeni bir alışveriş listesi oluşturarak ihtiyaçlarınızı takip edin. <
        /DialogDescription> <
        /DialogHeader> <
        Form { ...newListForm
        } >
        <
        form onSubmit = {
            newListForm.handleSubmit(handleCreateList)
        }
        className = "grid gap-4 py-4" >
        <
        FormField control = {
            newListForm.control
        }
        name = "title"
        render = {
            ({
                field
            }) => ( <
                FormItem >
                <
                Label htmlFor = "name" > Liste Adı < /Label> <
                Input id = "name"
                placeholder = "Haftalık Market" { ...field
                }
                /> <
                FormMessage / >
                <
                /FormItem>
            )
        }
        /> <
        Button type = "submit" > Listeyi Oluştur < /Button> <
        /form> <
        /Form> <
        /DialogContent> <
        /Dialog> <
        /PageHeader>

        <
        div className = "grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8" >
        <
        Card >
        <
        CardHeader className = "flex flex-row items-center justify-between space-y-0 pb-2" >
        <
        CardTitle className = "text-sm font-medium" > Aktif Liste Sayısı < /CardTitle> <
        ShoppingCart className = "h-4 w-4 text-primary" / >
        <
        /CardHeader> <
        CardContent >
        <
        div className = "text-2xl font-bold" > {
            shoppingLists.length
        } < /div> <
        p className = "text-xs text-muted-foreground" > Tüm alışveriş listeleri < /p> <
        /CardContent> <
        /Card> <
        /div>

        <
        div > {
            shoppingLists.length > 0 ? ( <
                div className = "grid grid-cols-1 md:grid-cols-2 gap-6" > {
                    shoppingLists.map((list) => {
                        const completionProgress = calculateListProgress(list);

                        return ( <
                            Card key = {
                                list.id
                            }
                            className = "hover:shadow-md transition-shadow cursor-pointer"
                            onClick = {
                                () => router.push(`/shopping/${list.id}`)
                            } >
                            <
                            CardHeader className = "p-4" >
                            <
                            div className = "flex justify-between items-start gap-2" >
                            <
                            div className = "flex-grow" >
                            <
                            CardTitle > {
                                list.name
                            } < /CardTitle> <
                            div className = "flex items-center gap-2 text-xs text-muted-foreground mt-1" >
                            <
                            span > {
                                list.items ? .filter((i) => i.isBought).length || 0
                            }
                            / {
                                list.items ? .length || 0
                            }
                            Tamamlandı <
                            /span> <
                            /div> <
                            /div> <
                            AlertDialog >
                            <
                            AlertDialogTrigger asChild >
                            <
                            Button variant = "ghost"
                            size = "icon"
                            className = "shrink-0 h-8 w-8 text-destructive hover:text-destructive"
                            onClick = {
                                (e) => e.stopPropagation()
                            } // Prevent card click
                            >
                            <
                            Trash2 className = "h-4 w-4" / >
                            <
                            /Button> <
                            /AlertDialogTrigger> <
                            AlertDialogContent >
                            <
                            AlertDialogHeader >
                            <
                            AlertDialogTitle >
                            "{list.name}"
                            listesini silmek istediğinize emin misiniz ?
                            <
                            /AlertDialogTitle> <
                            AlertDialogDescription >
                            Bu işlem geri alınamaz.Liste kalıcı olarak silinecektir. <
                            /AlertDialogDescription> <
                            /AlertDialogHeader> <
                            AlertDialogFooter >
                            <
                            AlertDialogCancel onClick = {
                                (e) => e.stopPropagation()
                            } >
                            İptal <
                            /AlertDialogCancel> <
                            AlertDialogAction onClick = {
                                (e) => {
                                    e.stopPropagation();
                                    handleDeleteList(list.id);
                                }
                            } >
                            Sil <
                            /AlertDialogAction> <
                            /AlertDialogFooter> <
                            /AlertDialogContent> <
                            /AlertDialog> <
                            /div> <
                            /CardHeader> <
                            CardContent className = "p-4 pt-0" >
                            <
                            Progress value = {
                                completionProgress
                            }
                            className = "h-2 w-full"
                            indicatorClassName = "bg-green-500" /
                            >
                            <
                            /CardContent> <
                            /Card>
                        );
                    })
                } <
                /div>
            ) : ( <
                Card >
                <
                CardContent className = "p-8 text-center text-muted-foreground" >
                Henüz alışveriş listesi yok.Yeni bir tane oluşturun!
                <
                /CardContent> <
                /Card>
            )
        } <
        /div> <
        />
    );
}
