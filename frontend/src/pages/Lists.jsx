// frontend/src/pages/Lists.jsx

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  FileSpreadsheet,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import axiosInstance from '../api/axios';

export default function Lists() {
  // ── Upload state ────────────────────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null); // distribution summary card
  const fileInputRef = useRef(null);

  // ── Agent lists state ───────────────────────────────────────────────────────
  const [agentGroups, setAgentGroups] = useState([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [openAccordions, setOpenAccordions] = useState({});

  // ── Clear modal state ───────────────────────────────────────────────────────
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    setIsLoadingLists(true);
    try {
      const res = await axiosInstance.get('/lists');
      const groups = res.data.agents || [];
      setAgentGroups(groups);
      // Default: all accordions open so the evaluator sees content immediately
      const defaultOpen = {};
      groups.forEach((g) => {
        defaultOpen[g.agentId] = true;
      });
      setOpenAccordions(defaultOpen);
    } catch (err) {
      console.error('fetchLists error:', err);
      toast.error(err.response?.data?.message || 'Failed to load lists.');
    } finally {
      setIsLoadingLists(false);
    }
  };

  // ── File helpers ────────────────────────────────────────────────────────────
  const ACCEPTED = ['.csv', '.xlsx', '.xls'];

  const isValidType = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    return ACCEPTED.includes(ext);
  };

  const fmtSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const pickFile = (file) => {
    if (!file) return;
    if (!isValidType(file)) {
      toast.error('Invalid file type. Please upload .csv, .xlsx, or .xls only.');
      return;
    }
    setSelectedFile(file);
    setUploadResult(null); // clear previous summary when a new file is picked
  };

  // ── Drag-and-drop handlers ──────────────────────────────────────────────────
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    pickFile(e.dataTransfer.files[0]);
  }, []);

  const handleInputChange = (e) => {
    pickFile(e.target.files[0]);
    e.target.value = ''; // reset so same file can be re-selected after removal
  };

  // ── Upload handler ──────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    setIsUploading(true);
    try {
      const res = await axiosInstance.post('/lists/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadResult(res.data);
      setSelectedFile(null);
      toast.success(`✅ ${res.data.totalItems} items distributed among 5 agents!`);
      await fetchLists(); // refresh the accordion immediately
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // ── Accordion toggle ────────────────────────────────────────────────────────
  const toggleAccordion = (agentId) => {
    setOpenAccordions((prev) => ({ ...prev, [agentId]: !prev[agentId] }));
  };

  // ── Clear handlers ──────────────────────────────────────────────────────────
  const handleClearConfirm = async () => {
    setIsClearing(true);
    try {
      const res = await axiosInstance.delete('/lists');
      toast.success(`🗑️ Cleared ${res.data.deletedCount} item(s) successfully.`);
      // Update UI immediately — no need for a second GET request
      setAgentGroups([]);
      setOpenAccordions({});
      setUploadResult(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear lists.');
    } finally {
      setIsClearing(false);
      setShowClearModal(false);
    }
  };

  // ── Spinner SVG (reused in two buttons) ────────────────────────────────────
  const Spinner = () => (
    <svg
      className="animate-spin w-4 h-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* ═══════════════════════════════════════════════════════════════════════
          UPLOAD SECTION
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-5">Upload &amp; Distribute</h2>

        {/* Drag-and-drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !selectedFile && fileInputRef.current?.click()}
          className={`
            relative flex flex-col items-center justify-center
            border-2 border-dashed rounded-xl p-10 transition-all duration-200
            ${isDragging
              ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01] cursor-copy'
              : selectedFile
              ? 'border-emerald-500 bg-emerald-500/5 cursor-default'
              : 'border-zinc-600 hover:border-indigo-500 hover:bg-zinc-800/60 cursor-pointer'
            }
          `}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleInputChange}
            className="hidden"
          />

          {!selectedFile ? (
            /* Empty state: prompt to drag or click */
            <>
              <Upload
                className={`w-10 h-10 mb-3 ${isDragging ? 'text-indigo-400' : 'text-zinc-500'}`}
              />
              <p className="text-sm font-medium text-zinc-300 mb-1">
                Drag &amp; drop your file here
              </p>
              <p className="text-xs text-zinc-500 mb-4">or</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
              >
                Click to Browse
              </button>
              <p className="text-xs text-zinc-500 mt-4">
                Accepts: .csv, .xlsx, .xls &nbsp;•&nbsp; Max 5 MB
              </p>
            </>
          ) : (
            /* File selected: preview card */
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                  <p className="text-xs text-zinc-400">{fmtSize(selectedFile.size)}</p>
                </div>
              </div>
              {/* Remove file button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                }}
                className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
                title="Remove file"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          )}
        </div>

        {/* Upload & Distribute button */}
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className={`
            mt-4 w-full py-3 rounded-xl font-medium text-sm
            flex items-center justify-center gap-2 transition-all duration-200
            ${!selectedFile || isUploading
              ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }
          `}
        >
          {isUploading ? (
            <><Spinner /> Distributing...</>
          ) : (
            <><Upload className="w-4 h-4" /> Upload &amp; Distribute</>
          )}
        </button>

        {/* Distribution summary — shown immediately after a successful upload */}
        {uploadResult && (
          <div className="mt-5 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            <p className="text-sm font-semibold text-emerald-400 mb-3">
              ✅ {uploadResult.totalItems} items distributed among{' '}
              {uploadResult.distribution.length} agents
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {uploadResult.distribution.map((d, i) => (
                <div key={i} className="bg-zinc-800 rounded-lg p-2 text-center">
                  <p className="text-xs text-zinc-400 truncate">{d.agentName}</p>
                  <p className="text-2xl font-bold text-white">{d.count}</p>
                  <p className="text-[10px] text-zinc-500">items</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          DISTRIBUTED LISTS SECTION
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">

        {/* Section header: title + Refresh + Clear All */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Distributed Lists</h2>

          <div className="flex items-center gap-2">
            {/* Refresh */}
            <button
              type="button"
              onClick={fetchLists}
              disabled={isLoadingLists}
              className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingLists ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {/* Clear All — only rendered when there is data to clear */}
            {agentGroups.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearModal(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-white hover:bg-red-600 border border-red-700 hover:border-red-600 rounded-lg transition-all duration-200"
                title="Delete all distributed list items"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Loading skeletons */}
        {isLoadingLists ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-pulse h-12 bg-zinc-800 rounded-xl" />
            ))}
          </div>

        ) : agentGroups.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileSpreadsheet className="w-14 h-14 text-zinc-700 mb-4" />
            <p className="text-zinc-400 font-medium">No lists uploaded yet.</p>
            <p className="text-zinc-600 text-sm mt-1">
              Upload a CSV file above to get started.
            </p>
          </div>

        ) : (
          /* Agent accordion */
          <div className="space-y-3">
            {agentGroups.map((group) => (
              <div
                key={group.agentId}
                className="border border-zinc-700 rounded-xl overflow-hidden"
              >
                {/* Accordion header */}
                <button
                  type="button"
                  onClick={() => toggleAccordion(group.agentId)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-zinc-800 hover:bg-zinc-700/60 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">
                      {group.agentName}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                      {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {openAccordions[group.agentId] ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  )}
                </button>

                {/* Accordion body — table */}
                {openAccordions[group.agentId] && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-zinc-900">
                          <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider w-10">
                            #
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            First Name
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            Phone
                          </th>
                          <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {group.items.map((item, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-zinc-800/50 transition-colors"
                          >
                            <td className="px-5 py-3 text-zinc-500 text-xs">
                              {idx + 1}
                            </td>
                            <td className="px-5 py-3 text-zinc-200 font-medium">
                              {item.firstName}
                            </td>
                            <td className="px-5 py-3 text-zinc-300">{item.phone}</td>
                            <td className="px-5 py-3 text-zinc-400">
                              {item.notes || (
                                <span className="text-zinc-600 italic">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          CLEAR CONFIRMATION MODAL
          Rendered into the DOM but only visible when showClearModal === true.
          Clicking the backdrop cancels (unless a clear is already in progress).
      ═══════════════════════════════════════════════════════════════════════ */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Semi-transparent backdrop — click outside to dismiss */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !isClearing && setShowClearModal(false)}
          />

          {/* Modal card */}
          <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6">

            {/* Warning icon */}
            <div className="flex items-center justify-center w-14 h-14 bg-red-500/10 border border-red-500/30 rounded-full mx-auto mb-5">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>

            <h3 className="text-lg font-semibold text-white text-center mb-2">
              Clear All Lists?
            </h3>
            <p className="text-sm text-zinc-400 text-center mb-2">
              This will permanently delete all distributed list items.
            </p>
            <p className="text-xs text-zinc-500 text-center mb-7">
              Your admin account and all 5 agents will remain untouched.
            </p>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearConfirm}
                disabled={isClearing}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isClearing ? (
                  <><Spinner /> Clearing...</>
                ) : (
                  <><Trash2 className="w-4 h-4" /> Yes, Clear All</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}