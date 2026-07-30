const fs = require('fs');
const path = 'app/(tabs)/education.tsx';
let content = fs.readFileSync(path, 'utf8');

const mapping = {
    'Ä±': 'ı',
    'Ã–': 'Ö',
    'ÅŸ': 'ş',
    'Ã¼': 'ü',
    'Ã§': 'ç',
    'ÄŸ': 'ğ',
    'Ã‡': 'Ç',
    'Ãœ': 'Ü',
    'Ä°': 'İ',
    'Åž': 'Ş',
    'Ã¶': 'ö',
    'Ã¢': 'â',
    'ÅŸ': 'ş',
    'Ä±': 'ı',
    'Ã§': 'ç',
    'Ã¼': 'ü',
    'ÄŸ': 'ğ',
    'Ã¶': 'ö',
    'Åž': 'Ş',
    'Ä°': 'İ',
    'Ã‡': 'Ç',
    'Ãœ': 'Ü',
    'Äž': 'Ğ',
    'Ã–': 'Ö'
};

for (const [corrupted, fixed] of Object.entries(mapping)) {
    content = content.split(corrupted).join(fixed);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed encoding!');
