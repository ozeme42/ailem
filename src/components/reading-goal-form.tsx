
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { ReadingGoals } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { DialogFooter } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const goalSchema = z.object({
  pages: z.coerce.number().min(0).optional(),
  books: z.coerce.number().min(0).optional(),
});

const formSchema = z.object({
  primaryGoal: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('monthly'),
  daily: goalSchema.optional(),
  weekly: goalSchema.optional(),
  monthly: goalSchema.optional(),
  yearly: goalSchema.optional(),
});

type ReadingGoalFormProps = {
  initialGoals?: ReadingGoals | null;
  onSave: (goals: ReadingGoals) => void;
};

type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';


export function SetReadingGoalForm({ initialGoals, onSave }: ReadingGoalFormProps) {
    const [primaryGoal, setPrimaryGoal] = React.useState<GoalPeriod>(initialGoals?.primaryGoal || 'monthly');

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            primaryGoal: initialGoals?.primaryGoal || 'monthly',
            daily: initialGoals?.daily || { pages: 0, books: 0 },
            weekly: initialGoals?.weekly || { pages: 0, books: 0 },
            monthly: initialGoals?.monthly || { pages: 0, books: 0 },
            yearly: initialGoals?.yearly || { pages: 0, books: 0 },
        },
    });

    const { watch, setValue } = form;
    const watchedValues = watch();

    React.useEffect(() => {
        const calculateGoals = (sourcePeriod: GoalPeriod, sourceValue: number, sourceType: 'pages' | 'books') => {
            const calculations = {
                pages: { daily: 1, weekly: 7, monthly: 30, yearly: 365 },
                books: { daily: 1, weekly: 7, monthly: 30, yearly: 365 }
            };
            const sourceDays = calculations[sourceType][sourcePeriod];
            
            (Object.keys(calculations[sourceType]) as GoalPeriod[]).forEach(targetPeriod => {
                if (targetPeriod !== sourcePeriod) {
                    const targetDays = calculations[sourceType][targetPeriod];
                    const calculatedValue = Math.round((sourceValue / sourceDays) * targetDays);
                    setValue(`${targetPeriod}.${sourceType}`, calculatedValue, { shouldValidate: true });
                }
            });
        };

        const sourceValuePages = watchedValues[primaryGoal]?.pages;
        if (sourceValuePages !== undefined) {
            calculateGoals(primaryGoal, sourceValuePages, 'pages');
        }
        
        const sourceValueBooks = watchedValues[primaryGoal]?.books;
        if (sourceValueBooks !== undefined) {
             calculateGoals(primaryGoal, sourceValueBooks, 'books');
        }

    }, [watchedValues[primaryGoal], primaryGoal, setValue]);


    function handleFormSubmit(values: z.infer<typeof formSchema>) {
        onSave(values);
    }
    
    const onTabChange = (value: string) => {
        const newPrimaryGoal = value as GoalPeriod;
        setPrimaryGoal(newPrimaryGoal);
        setValue('primaryGoal', newPrimaryGoal);
    };

    const renderGoalInputs = (period: GoalPeriod) => {
        const isEnabled = primaryGoal === period;
        return (
            <CardContent className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name={`${period}.pages`}
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Sayfa</FormLabel>
                        <FormControl><Input type="number" {...field} disabled={!isEnabled} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={`${period}.books`}
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Kitap</FormLabel>
                        <FormControl><Input type="number" {...field} disabled={!isEnabled} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        );
    }

    return (
        <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 pt-4">
            <Tabs value={primaryGoal} onValueChange={onTabChange} className="w-full">
                 <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="daily">Günlük</TabsTrigger>
                    <TabsTrigger value="weekly">Haftalık</TabsTrigger>
                    <TabsTrigger value="monthly">Aylık</TabsTrigger>
                    <TabsTrigger value="yearly">Yıllık</TabsTrigger>
                </TabsList>
                <TabsContent value="daily" className="mt-4">{renderGoalInputs('daily')}</TabsContent>
                <TabsContent value="weekly" className="mt-4">{renderGoalInputs('weekly')}</TabsContent>
                <TabsContent value="monthly" className="mt-4">{renderGoalInputs('monthly')}</TabsContent>
                <TabsContent value="yearly" className="mt-4">{renderGoalInputs('yearly')}</TabsContent>
            </Tabs>
            
            <DialogFooter>
                <Button type="submit" className="w-full">Hedefleri Kaydet</Button>
            </DialogFooter>
        </form>
        </Form>
    );
}
