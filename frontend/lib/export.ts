// Utilitários de exportação compartilhados (XLSX / PNG).
// xlsx e html2canvas são pesados (~1MB), então são carregados sob demanda
// via import() dinâmico — só quando o usuário clica em exportar — em vez
// de entrarem no bundle inicial de cada página.

export async function exportRowsToXlsx<T extends object>(
  rows: T[],
  sheetName: string,
  fileName: string,
  opts?: { autoWidth?: boolean },
): Promise<void> {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(rows);
  if (opts?.autoWidth) {
    worksheet["!cols"] = Object.keys(rows[0] ?? {}).map((key) => ({
      wch: Math.max(key.length, 12),
    }));
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

export async function exportNodeToPng(
  node: HTMLElement,
  fileName: string,
  opts?: { backgroundColor?: string; delayMs?: number },
): Promise<void> {
  if (opts?.delayMs) {
    await new Promise((resolve) => setTimeout(resolve, opts.delayMs));
  }
  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(node, {
    backgroundColor: opts?.backgroundColor ?? "#07130d",
    scale: 2,
    useCORS: true,
    logging: false,
  });
  const link = document.createElement("a");
  link.download = fileName;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
