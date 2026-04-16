const fs = require('fs');
const file = 'app/files/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1) Remove the 3 cards
const startTag = '{/* Entities Card */}';
const endTag = '{/* QA Score Card */}';
const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
  content = content.substring(0, startIndex) + content.substring(endIndex);
}

// 2) Replace criteria rendering with translated version
const searchTarget = `                          {Object.entries(enhancedAnalysis.qaScore.criteria || {}).map(([criteria, data]) => (
                            <div key={criteria} className="criterion">
                              <span className="criterion-name text-xs">{criteria}</span>`;
const replacement = `                          {Object.entries(enhancedAnalysis.qaScore.criteria || {}).map(([criteria, data]) => {
                            const th: Record<string, string> = {
                              greeting: 'การทักทาย',
                              politeness: 'ความสุภาพ',
                              listening: 'การรับฟัง',
                              resolution: 'การแก้ไขปัญหา',
                              closing: 'การกล่าวปิด',
                              compliance: 'ความถูกต้องตามกฎ'
                            };
                            const label = th[criteria.toLowerCase()] ? \`\${criteria} (\${th[criteria.toLowerCase()]})\` : criteria;
                            return (
                            <div key={criteria} className="criterion">
                              <span className="criterion-name text-xs">{label}</span>`;

content = content.replace(searchTarget, replacement);

// We must also replace the closing parenthesis of the map if it was changed
const searchTargetEnd = `                            </div>
                          ))}
                        </div>`;
const replacementEnd = `                            </div>
                            );
                          })}
                        </div>`;
content = content.replace(searchTargetEnd, replacementEnd);

fs.writeFileSync(file, content);
console.log('done modifying page.tsx');
