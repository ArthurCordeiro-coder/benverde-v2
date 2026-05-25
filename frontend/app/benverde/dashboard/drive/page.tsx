"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ChevronRight,
  Download,
  Eye,
  FileCode,
  FileJson,
  FileSpreadsheet,
  FileText,
  Folder,
  LayoutGrid,
  List,
  MoreVertical,
  Search,
} from "lucide-react";

/* ---------------------------------------------------------- */
/* Tipos                                                       */
/* ---------------------------------------------------------- */

type DriveApiFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
};

type FileType = "pdf" | "xlsx" | "csv" | "json" | "md" | "folder" | "outro";

type DisplayFile = {
  id: string;
  name: string;
  mimeType: string;
  type: FileType;
  label: string;
  date: string;
  dateTs: number;
  size: string;
  sizeBytes: number;
  color: string;
};

type NavEntry = { id: string; name: string };

type PreviewData =
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "iframe"; url: string }
  | { type: "text"; content: string; fileName: string };

type ToastState = { msg: string; color?: string } | null;

const FOLDER_MIME = "application/vnd.google-apps.folder";

/* ---------------------------------------------------------- */
/* Helpers de formatação                                       */
/* ---------------------------------------------------------- */

const MESES_PT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function formatDatePt(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = MESES_PT[d.getMonth()];
  return `${day} ${month} ${d.getFullYear()}`;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getExtension(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

function classifyFile(file: DriveApiFile): {
  type: FileType;
  label: string;
  color: string;
} {
  if (file.mimeType === FOLDER_MIME) {
    return { type: "folder", label: "Pasta", color: "text-emerald-400" };
  }
  const ext = getExtension(file.name);
  const mt = file.mimeType.toLowerCase();

  if (ext === "pdf" || mt.includes("pdf")) {
    return { type: "pdf", label: "PDF", color: "text-red-500" };
  }
  if (ext === "xlsx" || ext === "xls" || mt.includes("spreadsheet")) {
    return { type: "xlsx", label: "Excel", color: "text-emerald-500" };
  }
  if (ext === "csv") {
    return { type: "csv", label: "CSV", color: "text-blue-500" };
  }
  if (ext === "json") {
    return { type: "json", label: "JSON", color: "text-amber-500" };
  }
  if (ext === "md" || ext === "mk") {
    return { type: "md", label: "Markdown", color: "text-purple-400" };
  }
  return { type: "outro", label: ext.toUpperCase() || "Arquivo", color: "text-gray-400" };
}

function toDisplayFile(raw: DriveApiFile): DisplayFile {
  const { type, label, color } = classifyFile(raw);
  const sizeBytes = raw.size ? Number(raw.size) : 0;
  return {
    id: raw.id,
    name: raw.name,
    mimeType: raw.mimeType,
    type,
    label,
    date: formatDatePt(raw.modifiedTime),
    dateTs: raw.modifiedTime ? new Date(raw.modifiedTime).getTime() / 1000 : 0,
    size: type === "folder" ? "—" : formatBytes(sizeBytes),
    sizeBytes,
    color,
  };
}

function getFileIcon(type: FileType, size = 18) {
  switch (type) {
    case "pdf":    return <FileText size={size} />;
    case "xlsx":   return <FileSpreadsheet size={size} />;
    case "csv":    return <FileCode size={size} />;
    case "json":   return <FileJson size={size} />;
    case "md":     return <FileCode size={size} />;
    case "folder": return <Folder size={size} />;
    default:       return <FileText size={size} />;
  }
}

function getBadgeColor(type: FileType) {
  switch (type) {
    case "pdf":    return "bg-red-500/10 text-red-500";
    case "xlsx":   return "bg-emerald-500/10 text-emerald-500";
    case "csv":    return "bg-blue-500/10 text-blue-500";
    case "json":   return "bg-amber-500/10 text-amber-500";
    case "md":     return "bg-purple-500/10 text-purple-400";
    case "folder": return "bg-emerald-400/10 text-emerald-400";
    default:       return "bg-gray-500/10 text-gray-400";
  }
}

/* ---------------------------------------------------------- */
/* Componentes auxiliares                                      */
/* ---------------------------------------------------------- */

function Toast({ msg, color }: { msg: string; color?: string }) {
  return (
    <div className="fixed bottom-24 right-6 z-50 bg-[#111413] border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 shadow-2xl shadow-black/40">
      <div className="w-2 h-2 rounded-full" style={{ background: color || "#10b981" }} />
      <span className="text-sm text-gray-200">{msg}</span>
    </div>
  );
}

function PreviewModal({
  file,
  onClose,
}: {
  file: DisplayFile;
  onClose: () => void;
}) {
  const [data, setData] = useState<PreviewData>({ type: "loading" });

  useEffect(() => {
    let cancelled = false;
    setData({ type: "loading" });
    fetch(`/api/drive/preview?fileId=${file.id}&name=${encodeURIComponent(file.name)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) setData({ type: "error", message: json.error });
        else setData(json);
      })
      .catch(() => {
        if (!cancelled) setData({ type: "error", message: "Erro ao carregar preview" });
      });
    return () => {
      cancelled = true;
    };
  }, [file.id, file.name]);

  const isMarkdown = file.type === "md";
  const isJson = file.type === "json";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#111413] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-lg ${getBadgeColor(file.type)}`}>
              {getFileIcon(file.type, 16)}
            </div>
            <span className="text-sm font-medium text-gray-200 truncate">{file.name}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white p-1 shrink-0 ml-4"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 min-h-[320px]">
          {data.type === "loading" && (
            <p className="text-sm text-zinc-400">Carregando preview...</p>
          )}

          {data.type === "error" && (
            <p className="text-sm text-red-400">{data.message}</p>
          )}

          {data.type === "iframe" && (
            <iframe
              src={data.url}
              className="w-full h-[65vh] border-0 rounded"
              title={file.name}
            />
          )}

          {data.type === "text" && isMarkdown && (
            <article className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{data.content}</ReactMarkdown>
            </article>
          )}

          {data.type === "text" && isJson && (
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap break-words font-mono">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(data.content), null, 2);
                } catch {
                  return data.content;
                }
              })()}
            </pre>
          )}

          {data.type === "text" && !isMarkdown && !isJson && (
            <pre className="text-xs text-zinc-300 whitespace-pre-wrap break-words font-mono">
              {data.content}
            </pre>
          )}
        </div>

        <div className="px-6 py-4 grid grid-cols-2 gap-3 text-xs border-t border-white/5 shrink-0">
          <div>
            <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">
              Modificado
            </div>
            <div className="text-gray-300">{file.date}</div>
          </div>
          <div>
            <div className="text-gray-600 uppercase tracking-widest text-[10px] mb-1">
              Tamanho
            </div>
            <div className="text-gray-300 font-mono">{file.size}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/* Página                                                      */
/* ---------------------------------------------------------- */

export default function ArquivosPage() {
  const rootFolderId = "__root__"; // sentinel; o backend usa DRIVE_ROOT_FOLDER_ID quando ausente
  const [history, setHistory] = useState<NavEntry[]>([
    { id: rootFolderId, name: "Arquivos" },
  ]);
  const [files, setFiles] = useState<DisplayFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "pdf" | "xlsx" | "data" | "folder">(
    "all",
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<"name" | "dateTs" | "size">("dateTs");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [toast, setToast] = useState<ToastState>(null);
  const [preview, setPreview] = useState<DisplayFile | null>(null);

  const currentFolder = history[history.length - 1];

  const showToast = (msg: string, color?: string) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 2200);
  };

  /* ------------------ carregar do Drive ------------------ */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setSelected(new Set());

    const params = currentFolder.id !== rootFolderId
      ? `?folderId=${encodeURIComponent(currentFolder.id)}`
      : "";

    fetch(`/api/drive/files${params}`)
      .then((res) => res.json())
      .then((data: { files?: DriveApiFile[]; error?: string }) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        const mapped = (data.files ?? []).map(toDisplayFile);
        setFiles(mapped);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentFolder.id]);

  /* ------------------ derivações ------------------ */
  const visible = useMemo(() => {
    let out = files.filter((f) => {
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType === "all") return true;
      if (filterType === "pdf") return f.type === "pdf";
      if (filterType === "xlsx") return f.type === "xlsx";
      if (filterType === "data") return f.type === "csv" || f.type === "json";
      if (filterType === "folder") return f.type === "folder";
      return true;
    });
    out.sort((a, b) => {
      // pastas sempre antes ao ordenar por nome ou data
      if (a.type === "folder" && b.type !== "folder") return -1;
      if (a.type !== "folder" && b.type === "folder") return 1;
      const k = sortKey === "size" ? "sizeBytes" : sortKey;
      const av = a[k];
      const bv = b[k];
      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [files, search, filterType, sortKey, sortDir]);

  /* ------------------ ações ------------------ */
  const toggleOne = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const allChecked = visible.length > 0 && visible.every((f) => selected.has(f.id));
  const someChecked = visible.some((f) => selected.has(f.id));
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(visible.map((f) => f.id)));
  };
  const handleSort = (k: "name" | "dateTs" | "size") => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const isSheet = (f: DisplayFile) => f.type === "xlsx" || f.type === "csv";

  const openInSheets = (f: DisplayFile) => {
    window.open(
      `https://docs.google.com/spreadsheets/d/${encodeURIComponent(f.id)}/edit`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const onItemClick = (f: DisplayFile) => {
    if (f.type === "folder") {
      setHistory((prev) => [...prev, { id: f.id, name: f.name }]);
    } else if (isSheet(f)) {
      openInSheets(f);
    } else {
      setPreview(f);
    }
  };

  const onPreview = (f: DisplayFile) => {
    if (isSheet(f)) {
      openInSheets(f);
      return;
    }
    setPreview(f);
  };

  const onDownload = (f: DisplayFile) => {
    if (f.type === "folder") return;
    // Proxy through our service-account-authed endpoint so the user does not
    // need direct Drive access to the file.
    const url = `/api/drive/download?fileId=${encodeURIComponent(f.id)}&disposition=attachment`;
    window.open(url, "_blank");
    showToast(`Baixando "${f.name}"`);
  };

  const onMore = (f: DisplayFile) => {
    showToast(`Mais ações para "${f.name}" (em breve)`);
  };

  const onBulkDownload = () => {
    const items = files.filter((f) => selected.has(f.id) && f.type !== "folder");
    items.forEach((f) => {
      window.open(
        `/api/drive/download?fileId=${encodeURIComponent(f.id)}&disposition=attachment`,
        "_blank",
      );
    });
    showToast(`${items.length} arquivo(s) baixado(s)`);
  };
  const onBulkMore = () => {
    showToast(`Ações em lote em breve (${selected.size} selecionados)`);
  };

  const navigateTo = (index: number) => {
    setHistory((prev) => prev.slice(0, index + 1));
  };

  /* ---------------------------------------------------------- */
  /* Render                                                      */
  /* ---------------------------------------------------------- */
  return (
    <div className="text-gray-300 selection:bg-emerald-500/30">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="text-gray-500">Relatórios</span>
          <ChevronRight size={14} className="text-gray-600" />
          {history.map((entry, i) => {
            const isLast = i === history.length - 1;
            return (
              <span key={entry.id} className="flex items-center gap-2">
                {isLast ? (
                  <span className="text-white font-medium">{entry.name}</span>
                ) : (
                  <button
                    onClick={() => navigateTo(i)}
                    className="text-gray-500 hover:text-emerald-400 transition-colors"
                  >
                    {entry.name}
                  </button>
                )}
                {!isLast && <ChevronRight size={14} className="text-gray-600" />}
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-emerald-500 transition-colors"
              size={18}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar arquivos..."
              className="bg-[#111413] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all placeholder:text-gray-600 text-gray-200"
            />
          </div>
          <div className="flex bg-[#111413] p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 transition-colors rounded-lg ${
                viewMode === "grid"
                  ? "bg-white/5 text-emerald-400 shadow-inner"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 transition-colors rounded-lg ${
                viewMode === "list"
                  ? "bg-white/5 text-emerald-400 shadow-inner"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Action Bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {visible.length} arquivos encontrados
          </span>
          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-2 pl-4 border-l border-white/5">
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">
                {selected.size} selecionado{selected.size > 1 ? "s" : ""}
              </span>
              <button
                onClick={onBulkDownload}
                className="text-xs font-medium text-gray-400 hover:text-emerald-400 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1"
              >
                <Download size={13} /> Baixar
              </button>
              <button
                onClick={onBulkMore}
                className="text-xs font-medium text-gray-400 hover:text-emerald-400 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                Mais
              </button>
            </div>
          )}
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as typeof filterType)}
          className="bg-[#111413] border border-white/5 text-gray-400 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
        >
          <option value="all">Todos os tipos</option>
          <option value="folder">Pastas</option>
          <option value="pdf">PDF</option>
          <option value="xlsx">Planilhas</option>
          <option value="data">Dados (CSV/JSON)</option>
        </select>
      </div>

      {/* Loading / erro */}
      {loading && (
        <div className="bg-[#111413] border border-white/5 rounded-2xl py-16 text-center text-gray-500 text-sm">
          Carregando arquivos do Drive...
        </div>
      )}

      {loadError && !loading && (
        <div className="bg-[#111413] border border-red-500/20 rounded-2xl py-12 text-center text-red-400 text-sm">
          Erro ao carregar arquivos: {loadError}
        </div>
      )}

      {/* Lista / Grid */}
      {!loading && !loadError && (
        viewMode === "list" ? (
          <div className="bg-[#111413] border border-white/5 rounded-2xl overflow-hidden shadow-2xl shadow-black/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="px-6 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = someChecked && !allChecked;
                      }}
                      onChange={toggleAll}
                      className="rounded border-white/10 bg-transparent text-emerald-500 focus:ring-emerald-500"
                    />
                  </th>
                  <th
                    onClick={() => handleSort("name")}
                    className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:text-emerald-400 transition-colors ${
                      sortKey === "name" ? "text-emerald-500" : "text-gray-500"
                    }`}
                  >
                    Nome {sortKey === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th
                    onClick={() => handleSort("dateTs")}
                    className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-right cursor-pointer hover:text-emerald-400 transition-colors ${
                      sortKey === "dateTs" ? "text-emerald-500" : "text-gray-500"
                    }`}
                  >
                    Modificado {sortKey === "dateTs" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th
                    onClick={() => handleSort("size")}
                    className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-right cursor-pointer hover:text-emerald-400 transition-colors ${
                      sortKey === "size" ? "text-emerald-500" : "text-gray-500"
                    }`}
                  >
                    Tamanho {sortKey === "size" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th className="px-6 py-4 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-500 text-sm">
                      Nenhum arquivo encontrado
                    </td>
                  </tr>
                )}
                {visible.map((file) => (
                  <tr
                    key={file.id}
                    onClick={() => onItemClick(file)}
                    className={`group transition-colors cursor-pointer ${
                      selected.has(file.id) ? "bg-emerald-500/5" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td
                      className="px-6 py-4 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleOne(file.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(file.id)}
                        onChange={() => toggleOne(file.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-white/10 bg-transparent text-emerald-500 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${getBadgeColor(file.type)}`}>
                          {getFileIcon(file.type)}
                        </div>
                        <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors truncate max-w-md">
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs text-gray-400 font-medium">{file.date}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-xs text-gray-500 font-mono">{file.size}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <button
                          onClick={() => onPreview(file)}
                          className="p-2 text-gray-400 hover:text-emerald-400"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => onDownload(file)}
                          className="p-2 text-gray-400 hover:text-emerald-400"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => onMore(file)}
                          className="p-2 text-gray-400 hover:text-white"
                        >
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
            {visible.length === 0 && (
              <div className="col-span-full text-center py-16 text-gray-500 text-sm">
                Nenhum arquivo encontrado
              </div>
            )}
            {visible.map((file) => (
              <div
                key={file.id}
                onClick={() => onItemClick(file)}
                className={`relative bg-[#111413] border rounded-xl p-4 flex flex-col h-48 group transition-all cursor-pointer shadow-lg hover:shadow-emerald-500/5 ${
                  selected.has(file.id)
                    ? "border-emerald-500/30"
                    : "border-white/5 hover:border-emerald-500/30"
                }`}
              >
                <div
                  className="flex justify-between items-start mb-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(file.id)}
                    onChange={() => toggleOne(file.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-white/10 bg-transparent text-emerald-500 focus:ring-emerald-500"
                  />
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${file.color}`}
                    >
                      {file.label}
                    </span>
                  </div>
                </div>

                <div className="flex-1 flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent rounded-lg" />
                  <div className={file.color}>{getFileIcon(file.type, 36)}</div>
                </div>

                <div className="mt-4">
                  <p className="text-[11px] font-medium text-gray-300 truncate mb-1">
                    {file.name}
                  </p>
                  <div className="flex justify-between items-center">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${file.color}`}
                    >
                      {file.label}
                    </span>
                    <span className="text-[10px] text-gray-600 font-medium">{file.size}</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )
      )}

      {/* Pagination (placeholder visual) */}
      <div className="mt-8 flex items-center justify-between text-[11px] text-gray-600 font-medium uppercase tracking-widest px-2">
        <p>
          Exibindo {visible.length} de {files.length} itens
        </p>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 bg-white/5 rounded-lg text-gray-500 hover:text-emerald-500 transition-colors disabled:opacity-30"
            disabled
          >
            Anterior
          </button>
          <button className="px-3 py-1 bg-white/5 rounded-lg text-emerald-500 shadow-lg shadow-emerald-500/10">
            1
          </button>
          <button
            className="px-3 py-1 bg-white/5 rounded-lg text-gray-500 hover:text-emerald-500 transition-colors disabled:opacity-30"
            disabled
          >
            Próxima
          </button>
        </div>
      </div>

{toast && <Toast msg={toast.msg} color={toast.color} />}
      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
