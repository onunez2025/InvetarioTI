import ExcelJS from 'exceljs';

export interface ColumnDef {
  key: string;
  header: string;
  width?: number;
  numFmt?: string;
}

export async function buildExcel(
  sheetName: string,
  columns: ColumnDef[],
  rows: Record<string, unknown>[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'InventarioTI — MT INDUSTRIAL';
  const ws = wb.addWorksheet(sheetName);
  ws.columns = columns.map((c) => ({ key: c.key, header: c.header, width: c.width ?? 20 }));
  ws.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  ws.getRow(1).height = 20;
  rows.forEach((row, i) => {
    const r = ws.addRow(row);
    r.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: i % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF' },
      };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
    });
    columns.forEach((col, ci) => {
      if (col.numFmt) r.getCell(ci + 1).numFmt = col.numFmt;
    });
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  if (columns.length > 0) {
    ws.autoFilter = { from: 'A1', to: { row: 1, column: columns.length } };
  }
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as ArrayBuffer);
}
