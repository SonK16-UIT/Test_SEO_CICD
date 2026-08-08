const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const filepath = path.join(process.cwd(), 'pages-exploration', 'excel', 'deep__du_an.xlsx');
console.log('exists', fs.existsSync(filepath));
if (!fs.existsSync(filepath)) process.exit(0);
(async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filepath);
  const sheet = workbook.worksheets[0];
  console.log('sheet', sheet.name);
  const header = sheet.getRow(1).values.slice(1);
  console.log('header', JSON.stringify(header));
  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 5) return;
    rows.push(row.values.slice(1));
  });
  console.log('rows', JSON.stringify(rows));
})();
