
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useLanguage } from '../utils/LanguageContext.tsx';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  const finalConfirmText = confirmText || t.confirmText;
  const finalCancelText = cancelText || t.cancelText;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isDestructive ? 'bg-red-900/30 text-red-400' : 'bg-blue-900/30 text-blue-400'}`}>
              <AlertTriangle size={20} />
            </div>
            <h3 className="font-bold text-white text-lg">{title}</h3>
          </div>
          <button 
            onClick={onCancel}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
            {message}
          </p>
        </div>

        <div className="p-4 bg-slate-900/50 border-t border-slate-700/50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            {finalCancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white shadow-lg transition-all ${
              isDestructive 
                ? 'bg-red-600 hover:bg-red-500 shadow-red-900/20' 
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
            }`}
          >
            {finalConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
