const fs = require('fs');

const pagePath = 'c:/Users/pesso/benverde/benverde-v2/frontend/app/dashboard/page.tsx';
const testePath = 'c:/Users/pesso/benverde/benverde-v2/frontend/app/dashboard/teste/page.tsx';

let page = fs.readFileSync(pagePath, 'utf8');
let teste = fs.readFileSync(testePath, 'utf8');

// 1. Add extra lucide icons
page = page.replace(
  `import {\n  AlertCircle,\n  Banana,\n  BarChart3,`,
  `import {\n    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,\n    PieChart, Pie, Cell, LineChart, Line\n} from 'recharts';\nimport {\n  AlertCircle,\n  Banana,\n  BarChart3,\n  Store,\n  DollarSign,\n  Package,\n  PieChart as PieIcon,\n  Target,\n  ArrowRightLeft,\n  Tag,\n  LineChart as LineIcon,`
);

// 2. Extract Types and Components from teste
const typesReg = /<div className="mx-auto max-w-7xl/g;
// actually, let's just grab everything before `export default function DashboardHome()` from teste, 
// and filter out imports.
const testeBeforeExport = teste.split('export default function DashboardHome()')[0];
// we just need from `// --- TIPAGENS DOS DADOS ---` to the end.
const typesMatch = testeBeforeExport.match(/\/\/ --- TIPAGENS DOS DADOS ---[\s\S]*?(?=export default function)/);
if (typesMatch) {
  page = page.replace('export default function DashboardHome() {', typesMatch[0] + '\nexport default function DashboardHome() {');
}

// 3. Extract States
const statesMatch = teste.match(/const \[dadosFaturamento[\s\S]*?const \[isMetasTableOpen.*?;\n/);
if (statesMatch) {
  page = page.replace('const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);', 'const [summary, setSummary] = useState<DashboardSummary>(EMPTY_SUMMARY);\n' + statesMatch[0]);
}

// 4. Update loadDashboardData
const loadsMatch = teste.match(/setDadosFaturamento[\s\S]*?setProdutoComparativo[^;]+;/);
if (loadsMatch) {
  page = page.replace('setSummary(nextSummary);\n      setMetas(nextMetas);', 'setSummary(nextSummary);\n      setMetas(nextMetas);\n      ' + loadsMatch[0]);
}

// 5. Replace Old Layout from <header> to {isChatOpen ? ...}
const regexLayoutPage = /<header className="flex flex-col[\s\S]*?(?=<button\n[\s]*type="button"\n[\s]*onClick=\{\(\) => setIsChatOpen)/;
const regexLayoutTeste = /<header className="flex flex-col[\s\S]*?\{isMetasTableOpen \? \(/;

const matchLayoutTeste = teste.match(regexLayoutTeste);
if (matchLayoutTeste && regexLayoutPage.test(page)) {
    // Note: matchLayoutTeste ends right before `{isMetasTableOpen ? (`
    // Let's add the rest of the modal start manually for safety
    const fullNewLayout = matchLayoutTeste[0].replace('{isMetasTableOpen ? (', '') + 
`      {isMetasTableOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setIsMetasTableOpen(false)}>
            <div className="relative w-full max-w-5xl rounded-3xl border border-white/15 bg-[#0b1f15] p-6 shadow-2xl h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <PackageSearch className="text-green-400" /> Tabela de Metas
                    </h2>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setShowMetasModal(true)} className="flex items-center gap-2 text-sm text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors border border-white/5">
                            <UploadCloud size={16} /> Importar Meta
                        </button>
                        <button onClick={() => setShowExportMenu(curr => !curr)} className="flex items-center gap-2 text-sm text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors border border-white/5 relative">
                            <Download size={16} /> Exportar
                            {showExportMenu ? (
                                <div className="absolute top-full right-0 mt-2 z-50 w-40 overflow-hidden rounded-xl border border-white/10 bg-[#0b1f15]/95 shadow-2xl backdrop-blur-xl">
                                    <div onClick={(e) => { e.stopPropagation(); exportTableToExcel(); }} className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-sm text-gray-300 transition-colors hover:bg-white/10 cursor-pointer">
                                        <FileSpreadsheet size={16} className="text-green-400" /> Excel
                                    </div>
                                    <div onClick={(e) => { e.stopPropagation(); void exportTableToPng(); }} className="flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-300 transition-colors hover:bg-white/10 cursor-pointer">
                                        <ImageIcon size={16} className="text-green-400" /> PNG
                                    </div>
                                </div>
                            ) : null}
                        </button>
                        <button onClick={() => setIsMetasTableOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-full"><X size={24} /></button>
                    </div>
                </header>
                <div className="overflow-y-auto flex-1 custom-scrollbar pr-2">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-4 whitespace-pre-wrap text-sm text-gray-200">
                    Resumo do GPT: {mitaSummaryIsLoading ? "Carregando resumo..." : summary.resumoMetas}
                  </div>
                  {/* INJECT OLD TABLE SECTION HERE */}
                </div>
            </div>
        </div>
      ) : null}
`;

    page = page.replace(regexLayoutPage, fullNewLayout);
}

// 6. Move the Old table into the new Modal space
const regexTableContent = /<div\s+ref=\{tableSectionRef\}[\s\S]*?<div className="grid grid-cols-1 gap-8 md:grid-cols-2">/;
const matchTable = page.match(regexTableContent);

if (matchTable) {
    const onlyTable = matchTable[0].replace('<div className="grid grid-cols-1 gap-8 md:grid-cols-2">', '');
    page = page.replace(onlyTable, '');
    page = page.replace('{/* INJECT OLD TABLE SECTION HERE */}', onlyTable);
}

// 7. Remove the floating chat button and old table metrics (Top 5 / Media etc)
const regexOldMetrics = /<div className="grid grid-cols-1 gap-8 md:grid-cols-2">[\s\S]*?(?=<button\n[\s]*type="button"\n[\s]*onClick=\{\(\) => setIsChatOpen)/;
page = page.replace(regexOldMetrics, '');

const regexFloatingChat = /<button\s*type="button"\s*onClick=\{[^}]+\}[\s\S]*?<\/button>/;
page = page.replace(regexFloatingChat, '');

fs.writeFileSync(pagePath, page);
console.log('Merge complete!');
