
"use client";

import * as React from 'react';
import Image from 'next/image';
import { Book, Star, Edit, UserPlus, MoreVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Book as BookType, FamilyMember } from '@/lib/data';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from './ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';

interface BookDetailDialogProps {
  book: BookType | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onEdit?: (book: BookType) => void;
  onAddToLibrary?: (bookId: string, memberId: string) => void;
  familyMembers?: FamilyMember[];
}

export function BookDetailDialog({ book, isOpen, onOpenChange, onEdit, onAddToLibrary, familyMembers = [] }: BookDetailDialogProps) {
  if (!book) return null;

  const handleEditClick = () => {
    onOpenChange(false); // Close this dialog
    if (onEdit) {
      // Use a timeout to allow this dialog to close before opening the next
      setTimeout(() => onEdit(book), 150);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px] max-h-[90vh] flex flex-col p-0 sm:p-6">
        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 flex-grow min-h-0">
          <div className="hidden sm:block">
            <Image
              src={book.image || 'https://placehold.co/300x450.png'}
              alt={book.title}
              width={300}
              height={450}
              className="w-full h-full object-cover rounded-md aspect-[2/3]"
              data-ai-hint="book cover"
            />
          </div>
          <div className="flex flex-col p-0 sm:p-0 flex-grow min-h-0">
             <ScrollArea className="flex-grow">
                <div className="p-6 sm:pr-0">
                    <div className="sm:hidden mb-4">
                        <Image
                        src={book.image || 'https://placehold.co/300x450.png'}
                        alt={book.title}
                        width={300}
                        height={450}
                        className="w-full h-auto object-cover rounded-md aspect-[2/3]"
                        data-ai-hint="book cover"
                        />
                    </div>
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
            </ScrollArea>
             <DialogFooter className="mt-auto p-6 sm:p-0 sm:pt-4 sm:justify-start gap-2 flex-shrink-0 border-t sm:border-0">
              {onEdit && (
                 <Button variant="outline" onClick={handleEditClick}>
                    <Edit className="mr-2 h-4 w-4"/> Düzenle
                </Button>
              )}
               {onAddToLibrary && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>
                      <UserPlus className="mr-2 h-4 w-4"/> Kitaplığıma Ekle
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Kimin Kitaplığına Eklensin?</DropdownMenuLabel>
                    {familyMembers.map(member => (
                      <DropdownMenuItem 
                        key={member.id} 
                        onClick={() => onAddToLibrary(book.id, member.id)}
                        disabled={(book.readers || []).includes(member.id)}
                      >
                        {member.name}
                        {(book.readers || []).includes(member.id) && <span className="text-xs text-muted-foreground ml-auto">Ekli</span>}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
