const fs = require('fs');
const path = require('path');

const srcDir = 'E:/ailem/ailem-mobile/app';
const destDir = 'E:/ailem/egitim-app/app';

const filesToCopy = [
  'all-tests.tsx',
  'assign-test.tsx',
  'bank-questions.tsx',
  'education-category.tsx',
  'education-results.tsx',
  'education-stats.tsx',
  'exam-detail.tsx',
  'html-tests.tsx',
  'json-tests.tsx',
  'mistakes.tsx',
  'new-html-test.tsx',
  'new-json-test.tsx',
  'new-pdf-test.tsx',
  'new-practice-exam.tsx',
  'pdf-tests.tsx',
  'practice-exam-detail.tsx',
  'practice-exams.tsx',
  'retake-test.tsx',
  'test-session.tsx',
  'test-solver.tsx'
];

filesToCopy.forEach(file => {
  let content = fs.readFileSync(path.join(srcDir, file), 'utf8');
  
  // Replace auth logic
  content = content.replace(/const \{ selectedMember, familyId, familyMembers \} = useAuth\(\);/g, 'const { profile } = useAuth();');
  content = content.replace(/const \{ familyId, selectedMember \} = useAuth\(\);/g, 'const { profile } = useAuth();');
  content = content.replace(/const \{ selectedMember \} = useAuth\(\);/g, 'const { profile } = useAuth();');
  content = content.replace(/const \{ familyId \} = useAuth\(\);/g, 'const { profile } = useAuth();');
  
  content = content.replace(/selectedMember\?/g, 'profile?');
  content = content.replace(/selectedMember\./g, 'profile.');
  content = content.replace(/!selectedMember/g, '!profile');
  
  content = content.replace(/familyId/g, 'profile?.id');
  
  // Fix imports if necessary
  content = content.replace(/import \{.*?\} from '\.\.\/lib\/dataService';/g, (match) => {
      // Just copy whatever was there, the original methods still exist but we need to supply them in egitim-app/lib/dataService.ts
      return match;
  });

  fs.writeFileSync(path.join(destDir, file), content, 'utf8');
  console.log('Migrated', file);
});

// Now migrate (tabs)/education.tsx -> (tabs)/index.tsx
let eduContent = fs.readFileSync(path.join(srcDir, '(tabs)/education.tsx'), 'utf8');
eduContent = eduContent.replace(/const \{ selectedMember, familyMembers \} = useAuth\(\);/g, 'const { profile } = useAuth();');
eduContent = eduContent.replace(/selectedMember\?/g, 'profile?');
eduContent = eduContent.replace(/selectedMember\./g, 'profile.');
eduContent = eduContent.replace(/!selectedMember/g, '!profile');
eduContent = eduContent.replace(/familyId/g, 'profile?.id');

// Remove pendingMemorization and other non-education things
eduContent = eduContent.replace(/const \[pendingMemorization, setPendingMemorization\] = useState<any>\(null\);/g, '');
eduContent = eduContent.replace(/const \[memorizationItems, setMemorizationItems\] = useState<any\[\]>\(\[\]\);/g, '');
eduContent = eduContent.replace(/const unsubProgress = onMemorizationProgressUpdate\(\(prog\) => \{[\s\S]*?\}\);/g, '');
eduContent = eduContent.replace(/const unsubItems = onMemorizationItemsUpdate\(\(items\) => setMemorizationItems\(items\)\);/g, '');

fs.writeFileSync(path.join(destDir, '(tabs)/index.tsx'), eduContent, 'utf8');
console.log('Migrated education.tsx -> index.tsx');

