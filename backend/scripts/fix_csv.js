import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, 'users.csv');
const outputPath = path.join(__dirname, 'users_b64.csv');

const csv = fs.readFileSync(inputPath, 'utf8');
const lines = csv.split('\n');

const outLines = [];
// Skip header for Firebase CSV import

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  const parts = lines[i].split(',');
  const uid = parts[0];
  const email = parts[1];
  const hash = parts[2];
  
  // Base64 encode the bcrypt hash
  const b64Hash = Buffer.from(hash).toString('base64');
  outLines.push(`${uid},${email},${b64Hash}`);
}

fs.writeFileSync(outputPath, outLines.join('\n'));
console.log('Fixed CSV written to users_b64.csv');
