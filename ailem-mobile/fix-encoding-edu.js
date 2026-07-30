const fs = require('fs');
const path = 'app/(tabs)/education.tsx';
let content = fs.readFileSync(path, 'utf8');

// The file was originally UTF-8. 
// Get-Content read the UTF-8 bytes as Windows-1252 characters.
// Set-Content -Encoding UTF8 then encoded those Windows-1252 characters as UTF-8.
// To reverse: read UTF-8 string -> convert to buffer treating each char's code point as a byte -> decode buffer as UTF-8.

try {
    let bytes = [];
    for (let i = 0; i < content.length; i++) {
        bytes.push(content.charCodeAt(i) & 0xFF);
    }
    let buf = Buffer.from(bytes);
    let restored = buf.toString('utf8');
    
    // Check if restored looks correct
    if (restored.includes('Hızlı Erişim')) {
        console.log('Restoration successful!');
        fs.writeFileSync(path, restored, 'utf8');
    } else {
        console.log('Failed to restore. Sample:', restored.substring(0, 100));
    }
} catch (e) {
    console.error('Error:', e);
}
