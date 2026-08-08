const ExcelJS = require('exceljs');
(async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile('pages-exploration/excel/deep__du_an.xlsx');
    const worksheet = workbook.worksheets[0];
    console.log(JSON.stringify(worksheet.getRow(1).values.slice(1), null, 2));
    console.log('rowCount:' + worksheet.rowCount);
    if (worksheet.rowCount >= 2) {
      const row = worksheet.getRow(2).values.slice(1).map((v) => (v === undefined ? '' : String(v)));
      console.log(JSON.stringify(row, null, 2));
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
