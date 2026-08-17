import fs from 'fs';

const files = [
  'src/pages/BunqDeContractForm.js',
  'src/pages/bunq-de/BunqDeFestgeldVertrag.js',
];

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  s = s.split("from '@/components/bunq/BunqDeContractHeader'").join("from '@/components/bunq-de/BunqDeContractHeader'");
  fs.writeFileSync(f, s);
  console.log('fixed', f);
}
