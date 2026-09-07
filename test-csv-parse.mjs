import XLSX from 'xlsx';
import fs from 'fs';

const filePath = '/c/Users/user/Desktop/2027문화예술과요구서_최종_UTF8.csv';
const buffer = fs.readFileSync(filePath);
console.log('File size:', buffer.length);

try {
  const workbook = XLSX.read(buffer, { type: 'array' });
  console.log('Workbook sheets:', workbook.SheetNames);
  
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  console.log('First sheet keys:', Object.keys(firstSheet).slice(0, 10));
  
  const imported = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
  console.log('Imported length:', imported.length);
  
  if (imported.length > 0) {
    console.log('\nFirst row keys:', Object.keys(imported[0]));
    console.log('\nFirst row data:');
    Object.entries(imported[0]).forEach(([k, v]) => {
      console.log(`  ${k}: ${v}`);
    });
  }
} catch (e) {
  console.error('Error:', e.message);
}
