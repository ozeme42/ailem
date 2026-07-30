const fs = require('fs');
const sourceFile = 'E:/ailem/ailem-mobile/app/(tabs)/education.tsx';
const targetFile = 'E:/ailem/egitim-app/app/(tabs)/index.tsx';

let content = fs.readFileSync(sourceFile, 'utf8');

// Replace imports
content = content.replace(/import \{.*?\} from '\.\.\/lib\/dataService';/g, import { onTestsUpdate, onPracticeExamsUpdate, onStudyAssignmentsUpdate, deleteTest, deletePracticeExam, deleteStudyAssignment } from '../../lib/dataService';);
content = content.replace(/import \{.*?\} from '\.\.\/lib\/data';/g, import { Test, PracticeExam, StudyAssignment } from '../../lib/data';);
content = content.replace(/import \{ useAuth \} from '\.\.\/context\/auth-context';/g, import { useAuth } from '../../context/auth-context';);
content = content.replace(/import MemberDashboardCard from '\.\.\/components\/MemberDashboardCard';/g, ''); // We won't use it, or we will remove the reference

// Replace Family Member logic with User logic
content = content.replace(/const \{ selectedMember, familyMembers \} = useAuth\(\);/g, const { profile } = useAuth(););
content = content.replace(/selectedMember\?/g, profile?);
content = content.replace(/selectedMember\./g, profile.);
content = content.replace(/!selectedMember/g, !profile);

// Remove pendingMemorization and other non-education things
content = content.replace(/const \[pendingMemorization, setPendingMemorization\] = useState.*?;\n/g, '');
content = content.replace(/const \[memorizationItems, setMemorizationItems\] = useState.*?;\n/g, '');
content = content.replace(/import \{ onMemorizationProgressUpdate, onMemorizationItemsUpdate \} from '\.\.\/lib\/dataService';/g, '');

content = content.replace(/useEffect\(\(\) => \{[\s\S]*?const unsubProgress = onMemorizationProgressUpdate\(\(prog\) => \{[\s\S]*?\}\);[\s\S]*?return \(\) => \{[\s\S]*?\}\);/g, '');

// The education file is very large. Instead of complex regex, let me just create a simplified version of it.
