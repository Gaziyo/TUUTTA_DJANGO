import React from 'react';
import { X } from 'lucide-react';
import GamificationSystem from './GamificationSystem';
import { useStore } from '../store';

interface GamificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GamificationModal: React.FC<GamificationModalProps> = ({ isOpen, onClose }) => {
  const { user } = useStore();
  const isDarkMode = user?.settings?.theme === 'dark';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto relative`}>
        <button
          type="button" // Explicitly set button type
          onClick={onClose}
          className={`absolute top-4 right-4 ${
            isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
          } z-10`}
          aria-label="Close modal" // Accessible label for screen readers
          title="Close" // Tooltip for mouse users
        >
          <X className="h-5 w-5" />
        </button>
        
        <GamificationSystem />
      </div>
    </div>
  );
};

export default GamificationModal;