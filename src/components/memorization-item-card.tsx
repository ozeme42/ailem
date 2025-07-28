
"use client";

import * as React from 'react';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { EzberItem, EzberProgress } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


interface MemorizationItemCardProps {
    item: EzberItem;
    progress?: EzberProgress;
    onProgressChange: (isCompleted: boolean) => void;
    onEdit: () => void;
    onDelete: () => void;
}

export function MemorizationItemCard({ item, progress, onProgressChange, onEdit, onDelete }: MemorizationItemCardProps) {
    const isCompleted = progress?.completed || false;

    return (
        <Card className="flex flex-col group transition-all hover:shadow-lg hover:-translate-y-1">
            <CardHeader className="p-0 relative">
                <Image 
                    src={item.imageUrl || 'https://placehold.co/400x300.png'} 
                    alt={item.title} 
                    width={400} 
                    height={300} 
                    className="aspect-video object-cover rounded-t-lg"
                    data-ai-hint="religious illustration"
                />
                 <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4"/>Düzenle</DropdownMenuItem>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                     <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4"/>Sil
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                                        <AlertDialogDescription>"{item.title}" öğesi kalıcı olarak silinecektir. Bu işlem geri alınamaz.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                        <AlertDialogAction onClick={onDelete}>Evet, Sil</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="p-4 flex-grow">
                <CardTitle className="text-lg">{item.title}</CardTitle>
            </CardContent>
            <CardFooter className="p-4 border-t">
                 <div className="flex items-center space-x-2 w-full cursor-pointer" onClick={() => onProgressChange(!isCompleted)}>
                    <Checkbox id={`check-${item.id}`} checked={isCompleted} className="size-5" />
                    <label
                        htmlFor={`check-${item.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                        Ezberlendi olarak işaretle
                    </label>
                </div>
            </CardFooter>
        </Card>
    );
}

