import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../api/axios';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format bytes into a human-readable string e.g. "42.3 KB" */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Agent accordion item ─────────────────────────────────────────────────────

/**
 * AccordionSection
 * Shows one agent's assigned items in a collapsible panel.
 *
 * Design decision — accordion over tabs:
 * Accordion lets the evaluator see ALL agents' data at once by scrolling.
 * Tabs hide data behind clicks, which is worse for demo purposes.
 */
function AccordionSection({ agentName, items, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-dark-500 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-dark-600/50 hover:bg-dark-600 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span className="text-white font-semibold text-sm font-sans">{agentName}</span>
          <span className="bg-accent/20 text-accent-light text-xs font-mono px-2 py-0.5 rounded-full">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-slate-500" />
        ) : (
          <ChevronDown size={16} className="text-slate-500" />
        )}
      </button>

      {/* Body */}
      {open && (
        <div className="overflow-x-auto">
          {items.length === 0 ? (
            <p className="text-slate-600 text-sm font-sans text-center py-6">
              No items assigned to this agent
            </p>
          ) : (
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="border-b border-dark-500/50 bg-dark-700/50">
                  <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-5 py-2.5 font-medium">
                    #
                  </th>
                  <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-5 py-2.5 font-medium">
                    First Name
                  </th>
                  <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-5 py-2.5 font-medium">
                    Phone
                  </th>
                  <th className="text-left text-slate-500 text-xs uppercase tracking-wider px-5 py-2.5 font-medium">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr
                    key={i}
                    className="border-b border-dark-500/30 hover:bg-dark-600/20 transition-colors"
                  >
                    <td className="px-5 py-3 text-slate-600 font-mono text-xs">
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td className="px-5 py-3 text-white">{item.firstName}</td>
                    <td className="px-5 py-3 text-slate-400 font-mono text-xs">{item.phone}</td>
                    <td className="px-5 py-3 text-slate-500 max-w-xs truncate">
                      {item.notes || <span className="text-slate-700 italic">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

/**
 * Lists
 *
 * Two sections:
 * 1. Upload & Distribute — drag-and-drop zone, file preview, upload button
 * 2. Distributed Lists  — accordion showing each agent's assigned items
 */
export default function Lists() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null); // { totalItems, distribution[] }

  const [agentLists, setAgentLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);

  const fileInputRef = useRef(null);

  // ─── Fetch distributed lists on mount ─────────────────────────────────
  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    setLoadingLists(true);
    try {
      const { data } = await axiosInstance.get('/lists');
      setAgentLists(data.agents || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load lists');
    } finally {
      setLoadingLists(false);
    }
  };

  // ─── File selection ────────────────────────────────────────────────────

  const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

  const handleFileSelect = (file) => {
    if (!file) return;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`Invalid file type. Only .csv, .xlsx, and .xls are accepted.`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File exceeds 5 MB limit');
      return;
    }
    setSelectedFile(file);
    setUploadResult(null);
  };

  // ─── Drag and drop handlers ────────────────────────────────────────────

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFileSelect(file);
  };

  // ─── Upload ────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    // 'file' must match the multer field name: upload.single('file')
    formData.append('file', selectedFile);

    setUploading(true);
    try {
      const { data } = await axiosInstance.post('/lists/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(`${data.totalItems} items distributed among 5 agents`);
      setUploadResult(data);
      setSelectedFile(null);
      fetchLists(); // Refresh the accordion below
    } catch (err) {
      const msg = err.response?.data?.message || 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1 — Upload & Distribute
      ══════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="mb-4">
          <h2 className="text-white font-bold text-xl font-sans">Upload &amp; Distribute</h2>
          <p className="text-slate-500 text-sm font-sans mt-0.5">
            Upload a CSV or Excel file to distribute rows equally among all 5 agents
          </p>
        </div>

        <div className="bg-dark-700 border border-dark-500 rounded-xl p-6 shadow-card">

          {/* ── Drag-and-drop zone ─────────────────────────────────────── */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            className={[
              'rounded-xl border-2 transition-all duration-200 cursor-pointer',
              'flex flex-col items-center justify-center py-10 px-6 text-center',
              isDragging
                ? 'border-accent bg-accent/5 shadow-glow'
                : selectedFile
                ? 'border-dark-400 bg-dark-600/40 cursor-default'
                : 'border-dashed border-dark-400 hover:border-accent/50 hover:bg-dark-600/20',
            ].join(' ')}
          >
            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />

            {selectedFile ? (
              /* ── File selected state ──────────────────────────────── */
              <div className="flex flex-col items-center gap-3 w-full">
                <div className="w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet size={22} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm font-sans">{selectedFile.name}</p>
                  <p className="text-slate-500 text-xs font-sans mt-0.5">
                    {formatBytes(selectedFile.size)}
                  </p>
                </div>
                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setUploadResult(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-red-400 text-xs font-sans transition-colors"
                >
                  <X size={13} />
                  Remove file
                </button>
              </div>
            ) : (
              /* ── Empty / drag state ───────────────────────────────── */
              <>
                <div className={[
                  'w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors',
                  isDragging ? 'bg-accent/20' : 'bg-dark-600',
                ].join(' ')}>
                  <Upload size={24} className={isDragging ? 'text-accent' : 'text-slate-500'} />
                </div>
                <p className="text-white font-semibold text-sm font-sans">
                  {isDragging ? 'Drop your file here' : 'Drag & drop your CSV/XLSX/XLS here'}
                </p>
                <p className="text-slate-600 text-xs font-sans mt-1 mb-3">or</p>
                <span className="inline-flex items-center gap-1.5 bg-dark-600 hover:bg-dark-500 border border-dark-400 text-slate-300 text-xs font-sans font-medium px-4 py-2 rounded-lg transition-colors">
                  Click to Browse
                </span>
                <p className="text-slate-600 text-xs font-sans mt-3">
                  Accepts: .csv, .xlsx, .xls &nbsp;•&nbsp; Max 5 MB
                </p>
              </>
            )}
          </div>

          {/* ── Upload button ──────────────────────────────────────────── */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="flex items-center gap-2 bg-accent hover:bg-accent-hover
                         disabled:opacity-40 disabled:cursor-not-allowed
                         text-white font-semibold font-sans text-sm
                         px-5 py-2.5 rounded-lg transition-colors shadow-glow"
            >
              {uploading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Upload size={15} />
                  Upload &amp; Distribute
                </>
              )}
            </button>
          </div>

          {/* ── Distribution result summary ─────────────────────────── */}
          {uploadResult && (
            <div className="mt-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <p className="text-emerald-400 font-semibold text-sm font-sans">
                  {uploadResult.totalItems} items distributed among 5 agents
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {uploadResult.distribution.map((d, i) => (
                  <div
                    key={i}
                    className="bg-dark-700 border border-dark-500 rounded-lg px-3 py-1.5 flex items-center gap-2"
                  >
                    <span className="text-slate-400 text-xs font-sans">{d.agentName}</span>
                    <span className="bg-accent/20 text-accent-light text-xs font-mono px-1.5 py-0.5 rounded">
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2 — Distributed Lists (agent accordion)
      ══════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white font-bold text-xl font-sans">Distributed Lists</h2>
            <p className="text-slate-500 text-sm font-sans mt-0.5">
              Each agent's assigned items from all uploads
            </p>
          </div>
          <button
            onClick={fetchLists}
            disabled={loadingLists}
            className="flex items-center gap-1.5 text-slate-500 hover:text-white text-xs font-sans
                       border border-dark-500 hover:border-dark-400 bg-dark-700 hover:bg-dark-600
                       px-3 py-2 rounded-lg transition-colors"
          >
            <RefreshCw size={13} className={loadingLists ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Loading state */}
        {loadingLists && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-dark-700 border border-dark-500 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loadingLists && agentLists.length === 0 && (
          <div className="bg-dark-700 border border-dark-500 rounded-xl py-16 text-center shadow-card">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-dark-600 flex items-center justify-center">
                <AlertCircle size={22} className="text-slate-600" />
              </div>
              <p className="text-slate-500 font-sans text-sm">
                No lists uploaded yet
              </p>
              <p className="text-slate-700 font-sans text-xs">
                Upload a CSV or Excel file above to get started
              </p>
            </div>
          </div>
        )}

        {/* Agent accordion — one section per agent */}
        {!loadingLists && agentLists.length > 0 && (
          <div className="space-y-3">
            {agentLists.map((ag, i) => (
              <AccordionSection
                key={ag.agentId}
                agentName={ag.agentName}
                items={ag.items}
                defaultOpen={i === 0} // First agent open by default for the demo
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
