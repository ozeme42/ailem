"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Star, GripVertical } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Task, FamilyMember } from "@/lib/data";

interface TaskItemProps {
  task: Task;
  assignee: FamilyMember;
}

export function TaskItem({ task, assignee }: TaskItemProps) {
  const [isCompleted, setIsCompleted] = React.useState(task.completed);
  const { toast } = useToast();

  const handleCompletion = () => {
    const newCompletionState = !isCompleted;
    setIsCompleted(newCompletionState);
    if (newCompletionState) {
      toast({
        title: "🎉 Görev Tamamlandı!",
        description: `Harika iş, ${assignee.name}! ${task.points} puan kazandın.`,
      });
    }
  };

  const badgeColor = isCompleted 
    ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-500/30' 
    : 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-500/30';

  return (
    <AnimatePresence>
      <motion.div
        layout
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-4"
      >
        <Card className={`transition-all duration-300 ${isCompleted ? 'bg-muted/50 border-dashed' : 'bg-card hover:shadow-md'}`}>
          <CardContent className="p-4 flex items-center gap-4">
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
            <Checkbox
              id={`task-${task.id}`}
              checked={isCompleted}
              onCheckedChange={handleCompletion}
              className="h-5 w-5"
            />
            <div className="flex-grow">
              <label
                htmlFor={`task-${task.id}`}
                className={`font-medium transition-colors cursor-pointer ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}
              >
                {task.title}
              </label>
              <p className="text-xs text-muted-foreground">{task.dueDate}</p>
            </div>
            <Badge variant="outline" className={`flex items-center gap-1.5 py-1 px-2.5 text-sm ${badgeColor}`}>
              <Star className="h-3.5 w-3.5" />
              <span className="font-bold">{task.points}</span>
            </Badge>
            <div className="flex items-center gap-2">
              <Image
                src={assignee.avatar}
                alt={assignee.name}
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="text-sm font-medium hidden md:inline">{assignee.name}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
