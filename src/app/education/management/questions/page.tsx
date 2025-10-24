
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus, FileText, KeyRound, CheckCircle, MoreVertical, Edit, Trash2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { onBankQuestionsUpdate, onTestsUpdate, addTest, updateTest, deleteTest } from "@/lib/dataService";
import { useAuth } from "@/components/auth-provider";
import { BankQuestion, Test, FamilyMember } from "@/lib/data";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { QuestionsClient } from "./questions-client";


export default function QuestionBankPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Soru Bankası">
         <div className="flex items-center gap-2">
            <Link href="/education/management">
                <Button variant="outline" className="bg-white/20 text-white hover:bg-white/30 border-none">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Yönetim Paneli
                </Button>
            </Link>
        </div>
      </PageHeader>
      
      <QuestionsClient />
    </div>
  );
}
