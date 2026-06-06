import { ExternalLink } from "lucide-react";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex justify-center">
      <div
        className="w-full max-w-[430px] flex flex-col items-center justify-center px-6 bg-white"
        style={{ minHeight: "100svh" }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: "linear-gradient(135deg, #7c6fd4 0%, #a78bfa 100%)" }}
        >
          <ExternalLink size={36} color="white" />
        </div>

        <h1 className="text-xl font-bold text-gray-800 text-center mb-3">
          Mở từ link của trung tâm
        </h1>

        <p className="text-gray-500 text-center text-sm leading-relaxed max-w-xs">
          Để tiếp tục, vui lòng mở ứng dụng từ link do trung tâm học của bạn cung cấp.
        </p>

        <div className="mt-8 bg-gray-50 rounded-2xl px-5 py-4 w-full max-w-xs">
          <p className="text-xs text-gray-400 text-center font-medium uppercase tracking-wide mb-2">
            Hướng dẫn
          </p>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="font-bold text-purple-500 shrink-0">1.</span>
              <span>Liên hệ trung tâm để nhận link tham gia.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-purple-500 shrink-0">2.</span>
              <span>Nhấn vào link từ Zalo OA của trung tâm.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-purple-500 shrink-0">3.</span>
              <span>Ứng dụng sẽ tự động kết nối đúng trung tâm của bạn.</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
