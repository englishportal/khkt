import React, { useState, useEffect } from 'react';
import { X, Phone, User, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    signInWithPhone,
  } = useAuth();

  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthModalOpen) {
      setPhone('');
      setDisplayName('');
      setIsSubmitting(false);
      setError(null);
    }
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 11) {
      setError('Bác vui lòng nhập đúng số điện thoại (9 – 11 chữ số) nhé.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await signInWithPhone(phone.trim(), displayName.trim() || undefined);
    } catch (err: any) {
      setError(err?.message || 'Chưa đăng nhập được. Bác thử bấm lại nhé.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-stone-900">
            Đăng nhập bằng số điện thoại
          </h2>
          <button
            type="button"
            onClick={closeAuthModal}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-600 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-start gap-2.5 text-sm sm:text-base text-stone-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <span>
              Chỉ cần nhập đúng <strong>số điện thoại</strong>. Sau này bác sang điện thoại hay máy tính khác nhập lại đúng số này, toàn bộ lịch sử khám bệnh và ảnh cũ sẽ tự hiện đầy đủ.
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-base font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handlePhoneLogin} className="space-y-4">
            <div>
              <label className="block text-base sm:text-lg font-bold text-stone-900 mb-1.5">
                Số điện thoại của bác *
              </label>
              <div className="relative">
                <Phone className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  inputMode="tel"
                  autoFocus
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ví dụ: 0912345678"
                  className="w-full min-h-[54px] pl-11 pr-4 py-3 rounded-xl border-2 border-stone-300 text-lg font-semibold focus:outline-none focus:border-emerald-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1.5">
                Tên của bác (không bắt buộc)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ví dụ: Bác Hùng"
                  className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-base focus:outline-none focus:border-emerald-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[56px] rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-lg font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Đang đồng bộ dữ liệu...</span>
                </>
              ) : (
                <span>Đăng nhập ngay</span>
              )}
            </button>
          </form>

          <p className="pt-2 border-t border-stone-200 text-sm text-stone-600 text-center">
            Không cần mật khẩu, không cần mã xác nhận, không cần Google.
          </p>
        </div>
      </div>
    </div>
  );
};
