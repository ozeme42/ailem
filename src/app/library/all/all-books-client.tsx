
"use client";

import * as React from "react";
import { ArrowUpDown, Search } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { onBooksUpdate } from "@/lib/dataService";
import type { Book } from "@/lib/data";
import { Badge } from "@/components/ui/badge";

type SortKey = "title" | "author" | "pageCount" | "tags";

export function AllBooksClient() {
  const [books, setBooks] = React.useState<Book[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("title");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  React.useEffect(() => {
    const unsubscribe = onBooksUpdate((allBooks) => {
      setBooks(allBooks);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedAndFilteredBooks = React.useMemo(() => {
    let filtered = books.filter(book => 
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return filtered.sort((a, b) => {
      const aVal = a[sortKey] || "";
      const bVal = b[sortKey] || "";

      if (sortKey === 'pageCount') {
          return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      }
      
      if (sortKey === 'tags') {
          const aTags = (a.tags || []).join(', ');
          const bTags = (b.tags || []).join(', ');
          return sortDirection === 'asc' ? aTags.localeCompare(bTags, 'tr') : bTags.localeCompare(aTags, 'tr');
      }

      return sortDirection === 'asc' ? (aVal as string).localeCompare(bVal as string, 'tr') : (bVal as string).localeCompare(aVal as string, 'tr');
    });
  }, [books, searchTerm, sortKey, sortDirection]);

  return (
    <div className="space-y-6">
      <PageHeader title="Tüm Kitaplar" />

      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Başlık veya yazar ara..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort("title")} className="cursor-pointer">
                Başlık <ArrowUpDown className="inline-block ml-2 h-4 w-4" />
              </TableHead>
              <TableHead onClick={() => handleSort("author")} className="cursor-pointer">
                Yazar <ArrowUpDown className="inline-block ml-2 h-4 w-4" />
              </TableHead>
              <TableHead onClick={() => handleSort("pageCount")} className="cursor-pointer text-center">
                Sayfa <ArrowUpDown className="inline-block ml-2 h-4 w-4" />
              </TableHead>
              <TableHead onClick={() => handleSort("tags")} className="cursor-pointer">
                Raflar <ArrowUpDown className="inline-block ml-2 h-4 w-4" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAndFilteredBooks.map((book) => (
              <TableRow key={book.id}>
                <TableCell className="font-medium">{book.title}</TableCell>
                <TableCell>{book.author || "-"}</TableCell>
                <TableCell className="text-center">{book.pageCount || "-"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(book.tags || []).map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {loading && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            )}
            {!loading && sortedAndFilteredBooks.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        Sonuç bulunamadı.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
