import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronUp, GripHorizontal } from 'lucide-react';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  isDarkMode?: boolean;
  snapPoints?: number[];
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  isDarkMode = false,
  snapPoints = [25, 50, 85]
}) => {
  const [currentSnap, setCurrentSnap] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setCurrentSnap(0);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStartY(clientY);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const delta = clientY - dragStartY;
    if (delta > 0) {
      setCurrentTranslate(delta);
    }
  }, [isDragging, dragStartY]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const threshold = 100;
    if (currentTranslate > threshold) {
      onClose();
    } else {
      setCurrentTranslate(0);
    }
  }, [isDragging, currentTranslate, onClose]);

  const snapToPoint = useCallback((index: number) => {
    setCurrentSnap(index);
    setCurrentTranslate(0);
  }, []);

  if (!isVisible) return null;

  const translateY = isOpen 
    ? `calc(${100 - snapPoints[currentSnap]}% + ${currentTranslate}px)`
    : '100%';

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`absolute inset-x-0 bottom-0 rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${
          isDarkMode ? 'bg-gray-900' : 'bg-white'
        }`}
        style={{ 
          transform: `translateY(${isOpen ? currentTranslate : '100%'})`,
          height: `${snapPoints[snapPoints.length - 1]}vh`,
          top: 'auto'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
      >
        {/* Handle Bar */}
        <div className={`flex items-center justify-center py-3 border-b ${
          isDarkMode ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <div className={`w-12 h-1 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
        </div>

        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${
          isDarkMode ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDarkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Snap Point Indicators */}
        <div className={`flex items-center justify-center gap-2 py-2 ${
          isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50'
        }`}>
          {snapPoints.map((_, index) => (
            <button
              key={index}
              onClick={() => snapToPoint(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentSnap
                  ? 'bg-indigo-500'
                  : isDarkMode
                    ? 'bg-gray-700'
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="overflow-auto" style={{ height: 'calc(100% - 120px)' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Mobile Stage Selector Dropdown
interface MobileStageSelectorProps {
  currentStage: string;
  stages: Array<{ id: string; label: string; color: string }>;
  isDarkMode?: boolean;
  onSelect: (stageId: string) => void;
}

export const MobileStageSelector: React.FC<MobileStageSelectorProps> = ({
  currentStage,
  stages,
  isDarkMode = false,
  onSelect
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const currentStageConfig = stages.find(s => s.id === currentStage);

  return (
    <div className="relative md:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isDarkMode
            ? 'bg-gray-800 text-white'
            : 'bg-white text-gray-900 border border-gray-200'
        }`}
      >
        {currentStageConfig && (
          <span 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: currentStageConfig.color }}
          />
        )}
        {currentStageConfig?.label || currentStage}
        <ChevronUp className={`w-4 h-4 transition-transform ${isOpen ? '' : 'rotate-180'}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute top-full left-0 right-0 mt-2 py-2 rounded-xl shadow-lg border z-50 ${
            isDarkMode
              ? 'bg-gray-800 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            {stages.map((stage) => (
              <button
                key={stage.id}
                onClick={() => {
                  onSelect(stage.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  stage.id === currentStage
                    ? isDarkMode
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-100 text-gray-900'
                    : isDarkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-sm">{stage.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Mobile FAB (Floating Action Button) for quick actions
interface MobileFABProps {
  isDarkMode?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

export const MobileFAB: React.FC<MobileFABProps> = ({
  isDarkMode = false,
  onClick,
  icon
}) => (
  <button
    onClick={onClick}
    className={`fixed bottom-4 right-4 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 active:scale-90 md:hidden ${
      isDarkMode
        ? 'bg-indigo-600 text-white shadow-indigo-500/30'
        : 'bg-indigo-600 text-white shadow-indigo-500/30'
    }`}
  >
    {icon || <GripHorizontal className="w-6 h-6" />}
  </button>
);

// Hook for mobile detection
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

export default MobileBottomSheet;
