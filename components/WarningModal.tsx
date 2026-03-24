import React from 'react';
import { AlertCircle } from 'lucide-react';
import GlobalModal from './GlobalModal';

interface WarningModalProps {
  title: string;
  message: React.ReactNode;
  onClose: () => void;
}

const WarningModal: React.FC<WarningModalProps> = ({ title, message, onClose }) => {
  return (
    <GlobalModal
      isOpen={true}
      onClose={onClose}
      title={
        <div>
          <div className="text-sm font-bold uppercase">{title}</div>
          <div className="text-xs text-zinc-400 font-normal">Action not permitted</div>
        </div>
      }
      icon={
        <div className="bg-[#f97316]/10 p-2 rounded-lg border border-[#f97316]/20 mr-2">
          <AlertCircle className="w-6 h-6 text-[#f97316]" />
        </div>
      }
      footer={
        <button onClick={onClose} className="bg-[#ea580c] hover:bg-[#c2410c] text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-[#ea580c]/20 transition-all">
          Understood
        </button>
      }
      maxWidth="28rem"
    >
      <div className="text-[#d4d4d8]">
        {message}
      </div>
    </GlobalModal>
  );
};

export default WarningModal;
