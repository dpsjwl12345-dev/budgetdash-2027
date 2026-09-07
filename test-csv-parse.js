const XLSX = require('xlsx');
const fs = require('fs');

const filePath = '/c/Users/user/Desktop/2027문화예술과요구서_최종_UTF8.csv';
const buffer = fs.readFileSync(filePath);
console.log('File size:', buffer.length);

try {
  const workbook = XLSX.read(buffer, { type: 'array' });
  console.log('Workbook sheets:', workbook.SheetNames);
  
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  console.log('First sheet:', Object.keys(firstSheet).slice(0, 10));
  
  const imported = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
  console.log('Imported length:', imported.length);
  
  if (imported.length > 0) {
    console.log('First row keys:', Object.keys(imported[0]));
    console.log('First row data:', JSON.stringify(imported[0], null, 2));
  }
} catch (e) {
  console.error('Error:', e.message);
}
