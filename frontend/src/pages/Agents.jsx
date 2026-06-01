import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  X,
  Eye,
  EyeOff,
  Loader2,
  UserPlus,
} from 'lucide-react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import toast from 'react-hot-toast';
import axiosInstance from '../api/axios';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format a JS Date (or ISO string) into a readable label like "May 31, 2026".
 * Avoids importing a date library for a simple display requirement.
 */
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ─── Skeleton row (shown while loading agents) ─────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-dark-500">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-dark-500 rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Field error helper ────────────────────────────────────────────────────

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400 font-sans">{message}</p>;
}

// ─── Main Component ────────────────────────────────────────────────────────

/**
 * Agents
 *
 * Design decisions:
 * - Inline field errors + toast: inline tells the user WHICH field is wrong,
 *   toast confirms the overall action result. Both are necessary for good UX.
 * - Modal uses body.modal-open class (defined in index.css) to lock scroll
 *   on the background page while the modal is open.
 * - react-phone-input-2 returns the full dialed number (country code + digits)
 *   in `value` and the country data in `country`. We split them so the backend
 *   stores countryCode (e.g. "+91") and mobile (digits only) separately.
 */
export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // ─── Modal form state ────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',      // Full number including country code (from PhoneInput)
    countryCode: '+91',
    mobile: '',     // Digits only (without country code)
  });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ─── Fetch agents on mount ───────────────────────────────────────────
  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoadingAgents(true);
    try {
      const { data } = await axiosInstance.get('/agents');
      setAgents(data.agents);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load agents');
    } finally {
      setLoadingAgents(false);
    }
  };

  // ─── Modal helpers ───────────────────────────────────────────────────

  const openModal = () => {
    setShowModal(true);
    document.body.classList.add('modal-open');
  };

  const closeModal = () => {
    setShowModal(false);
    document.body.classList.remove('modal-open');
    setForm({ name: '', email: '', password: '', phone: '', countryCode: '+91', mobile: '' });
    setFieldErrors({});
    setShowPassword(false);
  };

  // ─── Phone input change ──────────────────────────────────────────────

  /**
   * react-phone-input-2 gives us:
   *   value   — the full number string (country code digits + subscriber digits)
   *   country — { dialCode: '91', ... }
   *
   * We extract countryCode ("+91") and mobile (remaining digits) so the
   * backend Agent model can store them separately.
   */
  const handlePhoneChange = (value, country) => {
    const dialCode = country.dialCode; // e.g. "91"
    const mobile = value.slice(dialCode.length); // strip leading dial code digits
    setForm((prev) => ({
      ...prev,
      phone: value,
      countryCode: `+${dialCode}`,
      mobile,
    }));
    if (fieldErrors.mobile) {
      setFieldErrors((prev) => ({ ...prev, mobile: '' }));
    }
  };

  // ─── Client-side validation ──────────────────────────────────────────

  const validate = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.name.trim()) errors.name = 'Name is required';
    if (!form.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(form.email.trim())) {
      errors.email = 'Enter a valid email address';
    }
    if (!form.mobile) {
      errors.mobile = 'Mobile number is required';
    }
    if (!form.password) {
      errors.password = 'Password is required';
    } else if (form.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ─── Form submission ─────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      await axiosInstance.post('/agents', {
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile,
        countryCode: form.countryCode,
        password: form.password,
      });

      toast.success(`Agent "${form.name.trim()}" added successfully`);
      closeModal();
      fetchAgents(); // Refresh the table
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create agent';
      // If it's an email duplicate error, show it inline
      if (msg.toLowerCase().includes('email')) {
        setFieldErrors((prev) => ({ ...prev, email: msg }));
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div>
      {/* ─── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white font-bold text-xl font-sans">Agents</h2>
          <p className="text-slate-500 text-sm font-sans mt-0.5">
            Manage the team members who receive distributed task lists
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold font-sans
                     px-4 py-2.5 rounded-lg transition-colors duration-150 shadow-glow"
        >
          <Plus size={16} />
          Add Agent
        </button>
      </div>

      {/* ─── Agents table ─────────────────────────────────────────────── */}
      <div className="bg-dark-700 border border-dark-500 rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-sans">
            <thead>
              <tr className="border-b border-dark-500 bg-dark-600/50">
                <th className="text-left text-slate-500 font-medium px-4 py-3 text-xs uppercase tracking-wider">#</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3 text-xs uppercase tracking-wider">Name</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3 text-xs uppercase tracking-wider">Email</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3 text-xs uppercase tracking-wider">Mobile</th>
                <th className="text-left text-slate-500 font-medium px-4 py-3 text-xs uppercase tracking-wider">Date Added</th>
              </tr>
            </thead>
            <tbody>
              {/* Loading skeletons */}
              {loadingAgents && (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              )}

              {/* Empty state */}
              {!loadingAgents && agents.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-dark-600 flex items-center justify-center">
                        <Users size={24} className="text-slate-600" />
                      </div>
                      <p className="text-slate-500 font-sans">No agents added yet</p>
                      <button
                        onClick={openModal}
                        className="text-accent hover:text-accent-light text-sm font-medium font-sans
                                   flex items-center gap-1.5 transition-colors"
                      >
                        <UserPlus size={15} />
                        Add your first agent
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Agent rows */}
              {!loadingAgents &&
                agents.map((agent, index) => (
                  <tr
                    key={agent._id}
                    className="border-b border-dark-500/50 hover:bg-dark-600/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 text-slate-600 font-mono text-xs">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td className="px-4 py-3.5 text-white font-medium">{agent.name}</td>
                    <td className="px-4 py-3.5 text-slate-400">{agent.email}</td>
                    <td className="px-4 py-3.5 text-slate-400 font-mono">
                      {agent.countryCode} {agent.mobile}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">
                      {formatDate(agent.createdAt)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Table footer — agent count */}
        {!loadingAgents && agents.length > 0 && (
          <div className="px-4 py-3 border-t border-dark-500 bg-dark-600/30">
            <p className="text-slate-600 text-xs font-sans">
              {agents.length} agent{agents.length !== 1 ? 's' : ''} total
              {agents.length < 5 && (
                <span className="text-amber-500 ml-2">
                  — Add {5 - agents.length} more before uploading a CSV
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* ─── Add Agent Modal ───────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal card */}
          <div className="relative w-full max-w-md bg-dark-700 border border-dark-500 rounded-2xl shadow-card p-6 z-10">

            {/* Modal header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-white font-bold text-base font-sans">Add New Agent</h3>
                <p className="text-slate-500 text-xs font-sans mt-0.5">
                  All fields are required
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-dark-500"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form fields */}
            <div className="space-y-4">

              {/* Name */}
              <div>
                <label className="block text-slate-300 text-xs font-medium font-sans mb-1.5 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, name: e.target.value }));
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-dark-600 border border-dark-400 rounded-lg px-3.5 py-2.5 text-white text-sm font-sans placeholder-slate-600
                             focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
                <FieldError message={fieldErrors.name} />
              </div>

              {/* Email */}
              <div>
                <label className="block text-slate-300 text-xs font-medium font-sans mb-1.5 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, email: e.target.value }));
                    if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  placeholder="agent@example.com"
                  className="w-full bg-dark-600 border border-dark-400 rounded-lg px-3.5 py-2.5 text-white text-sm font-sans placeholder-slate-600
                             focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                />
                <FieldError message={fieldErrors.email} />
              </div>

              {/* Phone with country code — react-phone-input-2 */}
              <div>
                <label className="block text-slate-300 text-xs font-medium font-sans mb-1.5 uppercase tracking-wider">
                  Mobile Number
                </label>
                {/*
                  The dark theme CSS overrides for this component live in index.css.
                  We pass country="in" so it defaults to India (+91) — most common
                  for CSTech's Bangalore context. The user can change it via the flag dropdown.
                */}
                <PhoneInput
                  country="in"
                  value={form.phone}
                  onChange={handlePhoneChange}
                  enableSearch
                  searchPlaceholder="Search country..."
                  inputStyle={{ width: '100%' }}
                  containerStyle={{ width: '100%' }}
                />
                <FieldError message={fieldErrors.mobile} />
              </div>

              {/* Password */}
              <div>
                <label className="block text-slate-300 text-xs font-medium font-sans mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, password: e.target.value }));
                      if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }}
                    placeholder="Min. 8 characters"
                    className="w-full bg-dark-600 border border-dark-400 rounded-lg px-3.5 py-2.5 pr-10 text-white text-sm font-sans placeholder-slate-600
                               focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <FieldError message={fieldErrors.password} />
              </div>
            </div>

            {/* Modal action buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                disabled={submitting}
                className="flex-1 bg-dark-600 hover:bg-dark-500 text-slate-300 font-medium font-sans text-sm
                           py-2.5 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-accent hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed
                           text-white font-semibold font-sans text-sm py-2.5 rounded-lg
                           flex items-center justify-center gap-2 transition-colors shadow-glow"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Adding…
                  </>
                ) : (
                  <>
                    <UserPlus size={15} />
                    Add Agent
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
