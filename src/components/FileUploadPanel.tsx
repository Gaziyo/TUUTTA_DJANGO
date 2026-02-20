import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, File, Image, FileVideo, FileAudio,
  FileSpreadsheet, FileText, AlertCircle, X, Eye, Loader2
} from 'lucide-react';
import { useStore } from '../store';
import { FileUpload } from '../types';


const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit

const ACCEPTED_FILE_TYPES = {
  // Documents
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],

  // Spreadsheets
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],

  // Presentations
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],

  // Images
  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],

  // Audio
  'audio/*': ['.mp3', '.wav', '.ogg'],

  // Video
  'video/*': ['.mp4', '.webm', '.ogv']
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <Image className="h-5 w-5" />;
  if (type.startsWith('video/')) return <FileVideo className="h-5 w-5" />;
  if (type.startsWith('audio/')) return <FileAudio className="h-5 w-5" />;
  if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="h-5 w-5" />;
  if (type.includes('pdf') || type.includes('document') || type.includes('powerpoint')) return <FileText className="h-5 w-5" />;
  return <File className="h-5 w-5" />;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface ProcessingFile {
  name: string;
  progress: number;
  status: 'processing' | 'completed' | 'error';
  error?: string;
}

interface FilePreview {
  file: FileUpload;
  content: string;
}

const FileUploadPanel = () => {
  const { getFiles, addFile, removeFile, user } = useStore();
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';
  const files = getFiles();

  const [processingFiles, setProcessingFiles] = useState<Map<string, ProcessingFile>>(new Map());
  const [previewFile, setPreviewFile] = useState<FilePreview | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      alert('Please sign in to upload files');
      return;
    }

    for (const file of acceptedFiles) {
      const tempId = `${file.name}-${Date.now()}`;

      if (file.size > MAX_FILE_SIZE) {
        setProcessingFiles(prev => {
          const next = new Map(prev);
          next.set(tempId, {
            name: file.name,
            progress: 0,
            status: 'error',
            error: 'File exceeds the 50MB size limit'
          });
          return next;
        });
        setTimeout(() => {
          setProcessingFiles(prev => {
            const next = new Map(prev);
            next.delete(tempId);
            return next;
          });
        }, 5000);
        continue;
      }

      try {
        // Start processing
        setProcessingFiles(prev => {
          const next = new Map(prev);
          next.set(tempId, {
            name: file.name,
            progress: 10,
            status: 'processing'
          });
          return next;
        });

        // Upload and process file using storage service
        // This handles upload to Firebase + text extraction
        const uploadedFile = await import('../lib/storage').then(m => m.uploadFile(file, user.id));

        // Update progress
        setProcessingFiles(prev => {
          const next = new Map(prev);
          next.set(tempId, { name: file.name, progress: 80, status: 'processing' });
          return next;
        });

        // Add file to store
        addFile(uploadedFile);

        // Complete
        setProcessingFiles(prev => {
          const next = new Map(prev);
          next.set(tempId, { name: file.name, progress: 100, status: 'completed' });
          return next;
        });

        // Remove from processing after 2 seconds
        setTimeout(() => {
          setProcessingFiles(prev => {
            const next = new Map(prev);
            next.delete(tempId);
            return next;
          });
        }, 2000);

      } catch (error: unknown) {
        console.error(`Error processing file ${file.name}:`, error);
        const message = error instanceof Error ? error.message : 'Failed to process file';
        setProcessingFiles(prev => {
          const next = new Map(prev);
          next.set(tempId, {
            name: file.name,
            progress: 0,
            status: 'error',
            error: message
          });
          return next;
        });
        setTimeout(() => {
          setProcessingFiles(prev => {
            const next = new Map(prev);
            next.delete(tempId);
            return next;
          });
        }, 5000);
      }
    }
  }, [addFile, user]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: 10,
    maxSize: MAX_FILE_SIZE,
    multiple: true
  });

  return (
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md`} data-tour="files-panel">
      <div className={`p-5 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center space-x-2">
          <Upload className={`h-6 w-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Upload Files
          </h2>
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive
            ? isDarkMode
              ? 'border-indigo-400 bg-indigo-900/50'
              : 'border-indigo-600 bg-indigo-50'
            : isDarkMode
              ? 'border-gray-600 hover:border-gray-500'
              : 'border-gray-300 hover:border-gray-400'
            }`}
        >
          <input {...getInputProps()} />
          <div className="space-y-3">
            <Upload className={`h-12 w-12 mx-auto ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to select'}
            </p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Supported formats: Documents, Spreadsheets, Images, Audio, and Video
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Maximum file size: 50MB
            </p>
          </div>
        </div>

        {/* Processing Files */}
        {processingFiles.size > 0 && (
          <div className="space-y-3">
            <h3 className={`text-lg font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Processing Files
            </h3>
            <div className="space-y-2">
              {Array.from(processingFiles.entries()).map(([id, fileInfo]) => (
                <div
                  key={id}
                  className={`border rounded-xl p-4 ${isDarkMode
                    ? 'bg-gray-700/50 border-gray-600'
                    : 'bg-gray-50 border-gray-200'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {fileInfo.status === 'processing' && (
                        <Loader2 className={`h-4 w-4 animate-spin ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                      )}
                      {fileInfo.status === 'completed' && (
                        <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                          <X className="h-3 w-3 text-white" style={{ transform: 'rotate(45deg)' }} />
                        </div>
                      )}
                      {fileInfo.status === 'error' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {fileInfo.name}
                      </p>
                    </div>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {fileInfo.status === 'error' ? 'Failed' : `${fileInfo.progress}%`}
                    </p>
                  </div>
                  {fileInfo.status === 'processing' && (
                    <div className={`w-full h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                      <div
                        className="h-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${fileInfo.progress}%` }}
                      />
                    </div>
                  )}
                  {fileInfo.status === 'error' && fileInfo.error && (
                    <p className="text-xs text-red-500 mt-1">{fileInfo.error}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-3">
            <h3 className={`text-lg font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              Uploaded Files ({files.length})
            </h3>
            <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center justify-between space-x-3 border rounded-xl p-4 ${isDarkMode
                    ? 'bg-gray-700/50 border-gray-600'
                    : 'bg-gray-50 border-gray-200'
                    } shadow-sm hover-card`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'
                      }`}>
                      {getFileIcon(file.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {file.name}
                      </p>
                      <div className="flex items-center space-x-2">
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {formatFileSize(file.size || 0)}
                        </p>
                        {file.extractedText && (
                          <div className={`flex items-center space-x-1 text-xs ${isDarkMode ? 'text-green-400' : 'text-green-600'
                            }`}>
                            <span>•</span>
                            <span>Content extracted</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.extractedText && (
                      <button
                        type="button"
                        onClick={() => setPreviewFile({ file, content: file.extractedText || '' })}
                        className={`p-2 rounded-lg transition-colors ${isDarkMode
                          ? 'text-gray-400 hover:text-indigo-400 hover:bg-gray-600'
                          : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-100'
                          }`}
                        title="Preview extracted content"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className={`p-2 rounded-lg transition-colors ${isDarkMode
                        ? 'text-gray-400 hover:text-red-400 hover:bg-gray-600'
                        : 'text-gray-500 hover:text-red-600 hover:bg-red-100'
                        }`}
                      title="Remove file"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`flex items-start space-x-3 p-4 rounded-xl ${isDarkMode
          ? 'bg-amber-900/20 text-amber-200'
          : 'bg-amber-50 text-amber-600'
          } shadow-sm`}>
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <p className="text-sm">Files are processed locally and their content is extracted for the AI to analyze. Your data remains private and secure.</p>
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className={`max-w-4xl w-full max-h-[80vh] rounded-xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'
              }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-5 border-b flex items-center justify-between ${isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {getFileIcon(previewFile.file.type)}
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {previewFile.file.name}
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {formatFileSize(previewFile.file.size || 0)} • Extracted Content
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className={`p-2 rounded-lg transition-colors ${isDarkMode
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className={`p-5 overflow-y-auto max-h-[calc(80vh-100px)] ${isDarkMode ? 'text-gray-300' : 'text-gray-800'
              }`}>
              <pre className="whitespace-pre-wrap font-mono text-sm">
                {previewFile.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadPanel;
