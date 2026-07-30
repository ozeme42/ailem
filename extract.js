const fs = require('fs');
const text = fs.readFileSync('E:/ailem/original_svg_log.txt', 'utf8');
const json = JSON.parse(text);
const content = json.content;
const start = content.indexOf('<Svg');
const end = content.indexOf('</Svg>') + 6;
const svg = content.substring(start, end);
fs.writeFileSync('E:/ailem/original_clean.tsx', svg, 'utf8');