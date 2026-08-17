import fs from 'fs';
import path from 'path';

const dir = path.join('public', 'assets', 'social', 'wordmarks');

let ig = fs.readFileSync(path.join(dir, 'instagram-wordmark.svg'), 'utf8');
ig = ig.replace(/#262626/g, '#ffffff');
fs.writeFileSync(path.join(dir, 'instagram-wordmark-white.svg'), ig);

let fb = fs.readFileSync(path.join(dir, 'facebook-wordmark.svg'), 'utf8');
fb = fb.replace(/rgb\(24, 119, 242\)/g, '#ffffff');
fs.writeFileSync(path.join(dir, 'facebook-wordmark-white.svg'), fb);

let li = fs.readFileSync(path.join(dir, 'linkedin-wordmark.svg'), 'utf8');
// "Linked" + box in white; "in" glyphs in brand blue inside the white square
li = li.replace(/#006699/g, '#ffffff').replace(/#000000/g, '#ffffff');
li = li
  .replace(
    /style="fill:#ffffff;fill-opacity:1;fill-rule:evenodd;stroke:none"\s+id="path28"/,
    'style="fill:#0A66C2;fill-opacity:1;fill-rule:evenodd;stroke:none" id="path28"',
  )
  .replace(
    /style="fill:#ffffff;fill-opacity:1;fill-rule:evenodd;stroke:none"\s+id="path30"/,
    'style="fill:#0A66C2;fill-opacity:1;fill-rule:evenodd;stroke:none" id="path30"',
  );
fs.writeFileSync(path.join(dir, 'linkedin-wordmark-white.svg'), li);

console.log('Created white wordmark SVGs');
