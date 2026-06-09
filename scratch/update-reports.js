const fs = require('fs');
let content = fs.readFileSync('src/app/education/results/results-client.tsx', 'utf8');

// 1. Imports
content = content.replace(
    /import \{ onTestsUpdate, onTrackedBooksUpdate \} from "@\/lib\/dataService";/,
    `import { onTestsUpdate, onTrackedBooksUpdate, onPracticeExamsUpdate, updateTest } from "@/lib/dataService";`
);

content = content.replace(
    /import \{ Test, TrackedBook, FamilyMember \} from "@\/lib\/data";/,
    `import { Test, TrackedBook, FamilyMember, PracticeExam } from "@/lib/data";`
);

// 2. State
content = content.replace(
    /const \[tests, setTests\] = React\.useState<Test\[\]>\(\[\]\);/,
    `const [tests, setTests] = React.useState<Test[]>([]);
    const [practiceExams, setPracticeExams] = React.useState<PracticeExam[]>([]);`
);

content = content.replace(
    /const \[filterType, setFilterType\] = React\.useState\("all"\);/,
    `const [filterType, setFilterType] = React.useState("all");
    const [filterSubType, setFilterSubType] = React.useState("all");
    const [filterReviewStatus, setFilterReviewStatus] = React.useState("all");`
);

// 3. Subscriptions
content = content.replace(
    /const unsubBooks = onTrackedBooksUpdate\(setTrackedBooks\);\n\s*return \(\) => \{ unsubTests\(\); unsubBooks\(\); \};/,
    `const unsubBooks = onTrackedBooksUpdate(setTrackedBooks);
        const unsubExams = onPracticeExamsUpdate(setPracticeExams);
        return () => { unsubTests(); unsubBooks(); unsubExams(); };`
);

// 4. Enriched Data & subTypeName
content = content.replace(
    /const isCompleted = test\.status === 'Sonuçlandı';/,
    `let subTypeName = "Genel";
            if (test.sourceType === 'trackedBook' && test.sourceId) {
                const book = trackedBooks.find(b => b.id === test.sourceId);
                if (book) subTypeName = book.title;
            } else if (test.sourceType === 'exam' && test.sourceId) {
                const exam = practiceExams.find(e => e.id === test.sourceId);
                if (exam) subTypeName = exam.name;
            }

            const isCompleted = test.status === 'Sonuçlandı';`
);

content = content.replace(
    /_topicName: topicName,/,
    `_topicName: topicName,
                _subTypeName: subTypeName,`
);

// 5. Filter Options
content = content.replace(
    /const \{ subjectOptions, topicOptions, typeOptions \} = React\.useMemo\(\(\) => \{/,
    `const { subjectOptions, topicOptions, typeOptions, subTypeOptions } = React.useMemo(() => {`
);

content = content.replace(
    /const types = Array\.from\(new Set\(enrichedData\.map\(d => d\.sourceType\)\)\)\.sort\(\);/,
    `const types = Array.from(new Set(enrichedData.map(d => d.sourceType))).sort();
        
        const filteredForSubTypes = filterType === 'all'
            ? enrichedData
            : enrichedData.filter(d => d.sourceType === filterType);
        const subTypes = Array.from(new Set(filteredForSubTypes.map(d => d._subTypeName))).filter(s => s !== 'Genel').sort();`
);

content = content.replace(
    /typeOptions: types\.map\(t => \(\{ value: t, label: translateType\(t\) \}\)\)/,
    `typeOptions: types.map(t => ({ value: t, label: translateType(t) })),
            subTypeOptions: subTypes`
);

// 6. Reset subType filter
content = content.replace(
    /React\.useEffect\(\(\) => \{\n\s*setFilterTopic\("all"\);\n\s*\}, \[filterSubject\]\);/,
    `React.useEffect(() => {
        setFilterTopic("all");
    }, [filterSubject]);

    React.useEffect(() => {
        setFilterSubType("all");
    }, [filterType]);`
);

// 7. Apply Filters
content = content.replace(
    /const matchesType = filterType === 'all' \|\| item\.sourceType === filterType;/,
    `const matchesType = filterType === 'all' || item.sourceType === filterType;
            const matchesSubType = filterSubType === 'all' || item._subTypeName === filterSubType;
            const matchesReview = filterReviewStatus === 'all' 
                ? true 
                : filterReviewStatus === 'reviewed' 
                    ? item.mistakesReviewed 
                    : !item.mistakesReviewed;`
);

content = content.replace(
    /return matchesSearch && matchesSubject && matchesTopic && matchesType;/,
    `return matchesSearch && matchesSubject && matchesTopic && matchesType && matchesSubType && matchesReview;`
);

content = content.replace(
    /\[enrichedData, searchTerm, sortConfig, filterSubject, filterTopic, filterType\]/,
    `[enrichedData, searchTerm, sortConfig, filterSubject, filterTopic, filterType, filterSubType, filterReviewStatus]`
);

// 8. Toggle Function
content = content.replace(
    /const handleSort = \(key: any\) => \{/,
    `const handleToggleReview = async (id: string, currentStatus?: boolean) => {
        try {
            await updateTest(id, { mistakesReviewed: !currentStatus });
        } catch (error) {
            console.error("Error updating review status:", error);
        }
    };

    const handleSort = (key: any) => {`
);

// 9. Clear filters
content = content.replace(
    /setFilterType\("all"\);\n\s*setSortConfig\(\{ key: '_date', direction: 'desc' \}\);/,
    `setFilterType("all");
        setFilterSubType("all");
        setFilterReviewStatus("all");
        setSortConfig({ key: '_date', direction: 'desc' });`
);

// 10. Clear filters condition
content = content.replace(
    /\{\(filterSubject !== 'all' \|\| filterTopic !== 'all' \|\| filterType !== 'all' \|\| searchTerm\) && \(/,
    `{(filterSubject !== 'all' || filterTopic !== 'all' || filterType !== 'all' || filterSubType !== 'all' || filterReviewStatus !== 'all' || searchTerm) && (`
);

// 11. Add dropdowns
content = content.replace(
    /<\/SelectContent>\n\s*<\/Select>\n\n\s*\{\(filterSubject !== 'all'/,
    `</SelectContent>
                        </Select>

                        {subTypeOptions.length > 0 && (
                            <Select value={filterSubType} onValueChange={setFilterSubType}>
                                <SelectTrigger className={cn(themeColors.FILTER_SELECT, "h-12 rounded-xl")}>
                                    <SelectValue placeholder="Alt Kategori" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-900 rounded-xl">
                                    <SelectItem value="all" className="font-bold">Tüm Alt Kategoriler</SelectItem>
                                    {subTypeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}

                        <Select value={filterReviewStatus} onValueChange={setFilterReviewStatus}>
                            <SelectTrigger className={cn(themeColors.FILTER_SELECT, "h-12 rounded-xl")}>
                                <SelectValue placeholder="İnceleme Durumu" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-slate-900 rounded-xl">
                                <SelectItem value="all" className="font-bold">Tümü</SelectItem>
                                <SelectItem value="reviewed" className="font-bold">İncelendi</SelectItem>
                                <SelectItem value="unreviewed" className="font-bold">İncelenmedi</SelectItem>
                            </SelectContent>
                        </Select>

                        {(filterSubject !== 'all'`
);

// 12. Add Table Headers
content = content.replace(
    /<TableHead className=\{themeColors\.TABLE_HEADER\}><div className="px-6">Tür<\/div><\/TableHead>/,
    `<TableHead className={themeColors.TABLE_HEADER}><div className="px-6">Tür</div></TableHead>
                                    <TableHead className={themeColors.TABLE_HEADER}><div className="px-6">Alt Kategori</div></TableHead>`
);

content = content.replace(
    /<TableHead onClick=\{.*handleSort\('_successRate'\).*?>.*?<\/div><\/TableHead>/,
    `$&
                                    <TableHead className={cn(themeColors.TABLE_HEADER, "text-center")}><div className="px-6">İnceleme</div></TableHead>`
);

// 13. Add Table Cells
content = content.replace(
    /<TableCell className="px-6 py-4">\n\s*<Badge variant="outline" className="text-\[10px\] uppercase font-black px-2 py-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">\n\s*\{test\._translatedType\}\n\s*<\/Badge>\n\s*<\/TableCell>/,
    `$&
                                        <TableCell className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                                            {test._subTypeName !== 'Genel' ? test._subTypeName : '-'}
                                        </TableCell>`
);

content = content.replace(
    /<\/TableCell>\n\s*<\/TableRow>/,
    `</TableCell>
                                        <TableCell className="px-6 py-4 text-center">
                                            {test.status === 'Sonuçlandı' && (
                                                <Button 
                                                    variant={test.mistakesReviewed ? "outline" : "default"} 
                                                    size="sm" 
                                                    onClick={(e) => { e.stopPropagation(); handleToggleReview(test.id, test.mistakesReviewed); }}
                                                    className={cn("h-8 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all", test.mistakesReviewed ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20")}
                                                >
                                                    {test.mistakesReviewed ? "İncelendi ✓" : "Kontrol Et"}
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>`
);

fs.writeFileSync('src/app/education/results/results-client-temp.tsx', content);
console.log('Done!');
