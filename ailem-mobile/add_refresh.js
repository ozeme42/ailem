const fs = require('fs');
const files = [
  'E:/ailem/ailem-mobile/app/(tabs)/index.tsx',
  'E:/ailem/ailem-mobile/app/tasks.tsx',
  'E:/ailem/ailem-mobile/app/meal-plan.tsx',
  'E:/ailem/ailem-mobile/app/budget.tsx',
  'E:/ailem/ailem-mobile/app/(tabs)/library.tsx'
];

files.forEach(file => {
  if(!fs.existsSync(file)) return;
  let code = fs.readFileSync(file, 'utf8');
  
  // Add RefreshControl to imports if not there
  if (!code.includes('RefreshControl')) {
    code = code.replace(/import {([^}]+)} from 'react-native';/, (match, p1) => {
      return `import {${p1}, RefreshControl} from 'react-native';`;
    });
  }

  // Add refreshing state
  if (!code.includes('const [refreshing')) {
    code = code.replace(/(export default function [^{]+\{)/, (match) => {
      return match + `\n  const [refreshing, setRefreshing] = useState(false);\n  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1200); };`;
    });
  }

  // Add RefreshControl to the first main ScrollView (not horizontal)
  let found = false;
  code = code.replace(/<ScrollView([^>]+)>/g, (match, props) => {
    if (found || props.includes('horizontal') || props.includes('refreshControl')) {
      return match;
    }
    found = true; 
    return `<ScrollView${props} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#fff' : '#000'} />}>`;
  });

  fs.writeFileSync(file, code);
  console.log('Updated ' + file);
});
