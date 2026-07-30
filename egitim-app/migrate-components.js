const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('E:/ailem/egitim-app/components/education', (file) => {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return;
  let content = fs.readFileSync(file, 'utf8');
  
  content = content.replace(/const \{ selectedMember, familyId, familyMembers \} = useAuth\(\);/g, 'const { profile } = useAuth();');
  content = content.replace(/const \{ familyId, selectedMember \} = useAuth\(\);/g, 'const { profile } = useAuth();');
  content = content.replace(/const \{ selectedMember \} = useAuth\(\);/g, 'const { profile } = useAuth();');
  content = content.replace(/const \{ familyId \} = useAuth\(\);/g, 'const { profile } = useAuth();');
  
  content = content.replace(/selectedMember\?/g, 'profile?');
  content = content.replace(/selectedMember\./g, 'profile.');
  content = content.replace(/!selectedMember/g, '!profile');
  
  content = content.replace(/familyId/g, 'profile?.id');
  
  // Fix imports 
  content = content.replace(/import \{.*?\} from '.*?\/context\/auth-context';/g, "import { useAuth } from '../../../context/auth-context';"); // rough estimate, we might need to be exact

  fs.writeFileSync(file, content, 'utf8');
});

console.log('Components migrated');
