const fs = require('fs');
const file = 'app/files/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\{\/\* Entities Card \*\/\}[\s\S]*?\{\/\* QA Score Card \*\/\}/;
content = content.replace(regex, '{/* QA Score Card */}');

fs.writeFileSync(file, content);
console.log('done');
