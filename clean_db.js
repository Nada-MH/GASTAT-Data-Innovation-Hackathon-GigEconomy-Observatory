const fs = require('fs');
const dbPath = './data/linkedin_freelancers.json';
const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const strictKeywords = ["freelance", "freelancer", "self-employed", "self employed", "independent", "contractor", "مستقل", "فريلانسر", "عمل حر", "العمل الحر"];

const cleaned = data.filter(p => {
   const text = (p.jobTitle || '').toLowerCase();
   return strictKeywords.some(kw => text.includes(kw));
});

console.log(`Original profiles: ${data.length}, Cleaned profiles: ${cleaned.length}`);
let removed = data.length - cleaned.length;
console.log(`Total non-freelancers purged: ${removed}`);

fs.writeFileSync(dbPath, JSON.stringify(cleaned, null, 2));
