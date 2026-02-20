import React, { useState } from 'react';
import { FileText, File, Video, Headphones, Image, X, ZoomIn, Download, Eye } from 'lucide-react';

interface FilePreviewProps {
  fileName: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  isDarkMode?: boolean;
  onClose?: () => void;
}

const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-8 h-8" />,
  doc: <File className="w-8 h-8" />,
  docx: <File className="w-8 h-8" />,
  ppt: <FileText className="w-8 h-8" />,
  pptx: <FileText className="w-8 h-8" />,
  mp4: <Video className="w-8 h-8" />,
  mp3: <Headphones className="w-8 h-8" />,
  wav: <Headphones className="w-8 h-8" />,
  png: <Image className="w-8 h-8" />,
  jpg: <Image className="w-8 h-8" />,
  jpeg: <Image className="w-8 h-8" />,
};

const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || '';
};

const getFileIcon = (fileName: string): React.ReactNode => {
  const ext = getFileExtension(fileName);
  return FILE_TYPE_ICONS[ext] || <FileText className="w-8 h-8" />;
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImage = (fileName: string): boolean => {
  const ext = getFileExtension(fileName);
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);
};

const isVideo = (fileName: string): boolean => {
  const ext = getFileExtension(fileName);
  return ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
};

const isAudio = (fileName: string): boolean => {
  const ext = getFileExtension(fileName);
  return ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
};

// Mini File Preview Card - for list views
export const FilePreviewCard: React.FC<{
  fileName: string;
  fileUrl?: string;
  fileSize?: number;
  isDarkMode?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
}> = ({ fileName, fileSize, isDarkMode = false, onClick, isSelected }) => {
  const ext = getFileExtension(fileName);
  const isImageFile = isImage(fileName);
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 genie-card-hover genie-btn-press text-left w-full ${
        isSelected
          ? isDarkMode
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-indigo-400 bg-indigo-50'
          : isDarkMode
            ? 'border-gray-700 bg-gray-800 hover:bg-gray-700'
            : 'border-gray-200 bg-white hover:bg-gray-50'
      }`}
    >
      {/* Thumbnail or Icon */}
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 ${
        isSelected
          ? isDarkMode
            ? 'bg-indigo-500/20 text-indigo-400'
            : 'bg-indigo-100 text-indigo-600'
          : isDarkMode
            ? 'bg-gray-700 text-gray-400'
            : 'bg-gray-100 text-gray-500'
      }`}>
        {isImageFile && !imageError ? (
          <img
            src={fileUrl}
            alt={fileName}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          getFileIcon(fileName)
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          {fileName}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] uppercase ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {ext}
          </span>
          {fileSize && (
            <>
              <span className={isDarkMode ? 'text-gray-600' : 'text-gray-300'}>•</span>
              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {formatFileSize(fileSize)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Preview Icon */}
      <div className={`p-1.5 rounded-lg ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        <Eye className="w-4 h-4" />
      </div>
    </button>
  );
};

// Full File Preview Modal
export const FilePreviewModal: React.FC<FilePreviewProps> = ({
  fileName,
  fileUrl,
  fileSize,
  isDarkMode = false,
  onClose
}) => {
  const ext = getFileExtension(fileName);
  const isImageFile = isImage(fileName);
  const isVideoFile = isVideo(fileName);
  const isAudioFile = isAudio(fileName);

  const renderPreview = () => {
    if (isImageFile && fileUrl) {
      return (
        <div className="flex items-center justify-center p-4">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-[60vh] object-contain rounded-lg"
          />
        </div>
      );
    }

    if (isVideoFile && fileUrl) {
      return (
        <div className="flex items-center justify-center p-4">
          <video
            src={fileUrl}
            controls
            className="max-w-full max-h-[60vh] rounded-lg"
          />
        </div>
      );
    }

    if (isAudioFile && fileUrl) {
      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
            isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
          }`}>
            <Headphones className={`w-10 h-10 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </div>
          <audio src={fileUrl} controls className="w-full max-w-md" />
        </div>
      );
    }

    // Document preview (iframe for PDFs, placeholder for others)
    if (ext === 'pdf' && fileUrl) {
      return (
        <div className="p-4">
          <iframe
            src={fileUrl}
            className="w-full h-[60vh] rounded-lg border-0"
            title={fileName}
          />
        </div>
      );
    }

    // Generic file preview
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className={`w-24 h-24 rounded-2xl flex items-center justify-center ${
          isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
        }`}>
          {getFileIcon(fileName)}
        </div>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Preview not available for this file type
        </p>
        {fileUrl && (
          <a
            href={fileUrl}
            download={fileName}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDarkMode
                ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <Download className="w-4 h-4" />
            Download File
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl mx-4 ${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDarkMode ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              {getFileIcon(fileName)}
            </div>
            <div>
              <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {fileName}
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {ext.toUpperCase()} • {formatFileSize(fileSize)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? 'hover:bg-gray-800 text-gray-400'
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
                title="Open in new tab"
              >
                <ZoomIn className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode
                  ? 'hover:bg-gray-800 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className={`overflow-auto max-h-[calc(90vh-80px)] ${
          isDarkMode ? 'bg-gray-950' : 'bg-gray-50'
        }`}>
          {renderPreview()}
        </div>
      </div>
    </div>
  );
};

export default FilePreviewModal;
