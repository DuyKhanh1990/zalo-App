import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff, User, Lock, Loader2, Link } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { isInsideZMP, getZaloAccessToken } from "@/lib/zmp-sdk";

const ACCENT = "#7c6fd4";

function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
    <div className="w-full max-w-[430px] flex flex-col" style={{ background: "linear-gradient(160deg, #c3b8f5 0%, #a89de8 40%, #8f84d8 100%)", minHeight: "100svh" }}>
      {/* Top banner */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl mb-5"
          style={{ background: "white" }}
        >
          <span className="text-4xl font-black" style={{ color: ACCENT }}>E</span>
        </div>
        <h1 className="text-3xl font-black text-white text-center drop-shadow">Easyedu</h1>
        <p className="text-white/80 text-sm mt-1 font-medium text-center">Quản lý học tập của bạn</p>
      </div>

      {/* Bottom sheet */}
      <div className="bg-white rounded-t-3xl px-6 pt-7 pb-10 shadow-2xl">
        {/* Mini logo inside sheet */}
        <div className="flex justify-center mb-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background: ACCENT }}
          >
            <span className="text-white text-xl font-black">E</span>
          </div>
        </div>

        <h2 className="text-lg font-black text-center text-slate-800 mb-2">Easyedu</h2>

        <p className="text-sm text-slate-500 text-center leading-relaxed mb-7">
          Học viên/Phụ huynh hãy đăng nhập vào hệ thống để nhận được những thông báo mới nhất và quan trọng nhất về tình hình học tập của mình.
        </p>

        <button
          onClick={onContinue}
          className="w-full h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm active:scale-95 transition-transform shadow-lg"
          style={{ background: ACCENT, boxShadow: `0 4px 16px ${ACCENT}55` }}
        >
          Đăng nhập
        </button>

        <p className="text-xs text-slate-400 mt-5 text-center">
          Dữ liệu được đồng bộ từ hệ thống CRM
        </p>
      </div>
    </div>
    </div>
  );
}

export default function LoginPage() {
  const [showWelcome, setShowWelcome] = useState(true);

  const { loginWithZalo, loginWithPassword } = useAuth();

  const inZMP = isInsideZMP();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Inside ZMP: default to "link" tab (Liên kết tài khoản)
  // Outside ZMP: default to "manual" tab
  const [tab, setTab] = useState<"link" | "manual">(inZMP ? "link" : "manual");

  /**
   * "Liên kết tài khoản" — dùng khi ở trong Zalo Mini App
   * Silently lấy Zalo accessToken, kết hợp với CRM credentials để link.
   * Nếu không lấy được token → fallback về CRM login thông thường.
   */
  async function handleLinkAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim()) { setError("Vui lòng nhập tên đăng nhập"); return; }
    if (!password.trim()) { setError("Vui lòng nhập mật khẩu"); return; }
    setLoading(true);
    try {
      if (inZMP) {
        const accessToken = await getZaloAccessToken();
        if (accessToken) {
          await loginWithZalo(accessToken);
          return;
        }
      }
      // Fallback: login bằng CRM credentials
      await loginWithPassword(username.trim(), password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Liên kết tài khoản thất bại");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!username.trim()) { setError("Vui lòng nhập tên đăng nhập"); return; }
    if (!password.trim()) { setError("Vui lòng nhập mật khẩu"); return; }
    setLoading(true);
    try {
      await loginWithPassword(username.trim(), password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  const tabs = inZMP
    ? [
        { id: "link" as const, label: "Liên kết tài khoản" },
        { id: "manual" as const, label: "Mật khẩu" },
      ]
    : [
        { id: "manual" as const, label: "Đăng nhập" },
      ];

  if (showWelcome) {
    return (
      <AnimatePresence>
        <motion.div
          key="welcome"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
        >
          <WelcomeScreen onContinue={() => setShowWelcome(false)} />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
    <motion.div
      key="login"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="w-full max-w-[430px] flex flex-col items-center justify-center px-6"
      style={{ background: "linear-gradient(160deg, #e8e4fb 0%, #f5f3ff 60%, #fff 100%)", minHeight: "100svh" }}
    >
      {/* Logo / brand */}
      <div className="mb-10 text-center">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg"
          style={{ background: ACCENT }}
        >
          <span className="text-white text-3xl font-black">E</span>
        </div>
        <h1 className="text-2xl font-black" style={{ color: ACCENT }}>Easyedu</h1>
        <p className="text-slate-400 text-sm mt-1">Quản lý học tập của bạn</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-6">

        {/* Tabs — chỉ hiện khi có nhiều hơn 1 tab */}
        {tabs.length > 1 && (
          <div className="flex rounded-2xl bg-slate-100 p-1 mb-6">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setError(""); }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                style={
                  tab === t.id
                    ? { background: ACCENT, color: "white", boxShadow: "0 2px 8px rgba(124,111,212,0.3)" }
                    : { color: "#64748b" }
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Tab: Liên kết tài khoản (chỉ trong Zalo Mini App) ── */}
        {tab === "link" && (
          <form onSubmit={handleLinkAccount} className="flex flex-col gap-4">
            {/* Giải thích */}
            <div
              className="flex items-start gap-3 rounded-2xl px-4 py-3"
              style={{ background: ACCENT + "10", border: `1px solid ${ACCENT}22` }}
            >
              <Link size={16} style={{ color: ACCENT }} className="mt-0.5 flex-shrink-0" />
              <p className="text-xs leading-relaxed" style={{ color: ACCENT }}>
                Nhập tài khoản trung tâm để liên kết với Zalo. Lần sau bạn sẽ tự động đăng nhập.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ví dụ: HV-01"
                  autoComplete="username"
                  className="w-full h-12 pl-10 pr-4 rounded-2xl border border-slate-200 text-sm outline-none focus:border-indigo-400 transition-colors"
                  style={{ background: "#f8f8fb" }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Mật khẩu</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full h-12 pl-10 pr-10 rounded-2xl border border-slate-200 text-sm outline-none focus:border-indigo-400 transition-colors"
                  style={{ background: "#f8f8fb" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-60 mt-1"
              style={{ background: ACCENT }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : (
                <>
                  <Link size={16} />
                  Liên kết tài khoản
                </>
              )}
            </button>
          </form>
        )}

        {/* ── Tab: Đăng nhập mật khẩu (fallback / ngoài Zalo) ── */}
        {tab === "manual" && (
          <form onSubmit={handlePasswordLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">
                Tên đăng nhập
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ví dụ: HV-01"
                  autoComplete="username"
                  className="w-full h-12 pl-10 pr-4 rounded-2xl border border-slate-200 text-sm outline-none focus:border-indigo-400 transition-colors"
                  style={{ background: "#f8f8fb" }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Mật khẩu</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full h-12 pl-10 pr-10 rounded-2xl border border-slate-200 text-sm outline-none focus:border-indigo-400 transition-colors"
                  style={{ background: "#f8f8fb" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-sm transition-all active:scale-95 disabled:opacity-60 mt-1"
              style={{ background: ACCENT }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Đăng nhập"}
            </button>
          </form>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-6 text-center">
        Dữ liệu được đồng bộ từ hệ thống CRM
      </p>
    </motion.div>
    </div>
  );
}
