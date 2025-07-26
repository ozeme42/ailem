
"use client";

import * as React from 'react';
import Image from 'next/image';
import { Book, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Book as BookType } from '@/lib/data';

interface BookDetailDialogProps {
  book: BookType | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function BookDetailDialog({ book, isOpen, onOpenChange }: BookDetailDialogProps) {
  if (!book) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2">
          <div>
            <Image
              src={book.image || 'https://placehold.co/300x450.png'}
              alt={book.title}
              width={300}
              height={450}
              className="w-full h-auto object-cover rounded-md aspect-[2/3]"
              data-ai-hint="book cover"
            />
          </div>
          <div className="flex flex-col">
            <DialogHeader>
              <Badge variant="secondary" className="w-fit mb-2">Kitap</Badge>
              <DialogTitle className="text-3xl font-bold">{book.title}</DialogTitle>
              <DialogDescription className="text-lg">{book.author}</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 my-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-5 w-5 ${i < Math.floor(book.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">({(book.rating || 0).toFixed(1)})</span>
            </div>
            <p className="text-sm text-muted-foreground flex-grow">{book.description}</p>
            <div className="text-sm text-muted-foreground mt-4 space-y-1">
              {book.tags && book.tags.length > 0 && <p><strong>Tür:</strong> {book.tags.join(', ')}</p>}
              {book.pageCount && <p><strong>Sayfa Sayısı:</strong> {book.pageCount}</p>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
