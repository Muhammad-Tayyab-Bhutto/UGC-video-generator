import fs from 'fs';
import path from 'path';

console.log('.env.local exists:', fs.existsSync('.env.local'));
if (fs.existsSync('.env.local')) {
  const content = fs.readFileSync('.env.local', 'utf-8');
  const lines = content.split('\n');
  lines.forEach(l => {
    const trimmed = l.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      console.log(`Key found: ${key}, Value length: ${val.length}`);
    }
  });
}
