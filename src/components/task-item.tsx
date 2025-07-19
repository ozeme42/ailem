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

  const badgeColor = isCompleted ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1, height: 'auto' }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`mb-4 transition-all duration-300 ${isCompleted ? 'bg-muted/50' : 'bg-card hover:shadow-md'}`}>
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
                className={`font-medium transition-colors ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}
              >
                {task.title}
              </label>
              <p className="text-xs text-muted-foreground">{task.dueDate}</p>
            </div>
            <Badge className={`flex items-center gap-1 ${badgeColor}`}>
              <Star className="h-3 w-3" />
              <span>{task.points}</span>
            </Badge>
            <div className="flex items-center gap-2">
              <Image
                src={assignee.avatar}
                alt={assignee.name}
                width={28}
                height={28}
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
