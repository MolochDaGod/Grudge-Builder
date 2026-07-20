import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

let h = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/^\uFEFF/, '');
const map = [
  ['assets/renders/2.jpg', 'https://assets.grudge-studio.com/videos/trailers/renders/beach_shore.jpg'],
  ['assets/renders/5.jpg', 'https://assets.grudge-studio.com/videos/trailers/renders/deep_forest.jpg'],
  ['assets/renders/1.jpg', 'https://assets.grudge-studio.com/videos/trailers/renders/volcanic.jpg'],
  ['assets/renders/3.jpg', 'https://assets.grudge-studio.com/videos/trailers/renders/winter_snow.jpg'],
  ['assets/renders/4.jpg', 'https://assets.grudge-studio.com/videos/trailers/renders/style_sheet.jpg'],
];
for (const [a, b] of map) {
  h = h.split(a).join(b);
}
h = h.split('https://assets.grudge-studio.com/https://assets.grudge-studio.com').join(
  'https://assets.grudge-studio.com',
);
fs.writeFileSync(path.join(root, 'index.html'), h);

const files = [
  'index.html',
  'app.js',
  'cutlist.json',
  'manifest.json',
  'vercel.json',
  'README.md',
  'package.json',
];
const out = files.map((f) => ({
  file: f,
  data: fs.readFileSync(path.join(root, f), 'utf8').replace(/^\uFEFF/, ''),
  encoding: 'utf-8',
}));
const dest = path.join(process.env.TEMP || '/tmp', 'wt-files.json');
fs.writeFileSync(dest, JSON.stringify(out));
console.log('wrote', dest);
console.log(out.map((o) => `${o.file}:${o.data.length}`).join(' | '));
