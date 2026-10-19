import { readFileSync } from 'node:fs';
const list = JSON.parse(readFileSync(new URL('../src/places.json', import.meta.url), 'utf8'));
if (!Array.isArray(list) || list.length < 1) throw Error('Missing directory preview data');
const ids = new Set();
for (const item of list) {
  for (const field of ['id','name','type','city','state','address','certified','accessibility','source']) {
    if (typeof item[field] !== 'string' || !item[field].trim()) throw Error('Invalid ' + field + ' in ' + item.id);
  }
  if (ids.has(item.id)) throw Error('Duplicate id: ' + item.id);
  if (!item.source.startsWith('https://rampapproved.com/')) throw Error('Unexpected source: ' + item.source);
  ids.add(item.id);
}
console.log('Validated ' + list.length + ' public-directory preview locations.');
