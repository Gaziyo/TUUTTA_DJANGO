import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  X,
  Download,
  ArrowRight,
  Users,
  BookOpen,
  GraduationCap,
  RefreshCw,
  Eye,
  AlertTriangle,
  Info
} from 'lucide-react';

type ImportType = 'users' | 'enrollments' | 'courses';

interface ColumnMapping {
  csvColumn: string;
  systemField: string;
  required: boolean;
}

interface ImportError {
  row: number;
  column: string;
  message: string;
  value?: string;
}

interface ImportPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

interface ImportResult {
  success: number;
  failed: number;
  skipped: number;
  errors: ImportError[];
}

interface BulkImportProps {
  onImportUsers: (data: Record<string, string>[]) => Promise<ImportResult>;
  onImportEnrollments: (data: Record<string, string>[]) => Promise<ImportResult>;
  onImportCourses: (data: Record<string, string>[]) => Promise<ImportResult>;
  isDarkMode?: boolean;
}

const SYSTEM_FIELDS: Record<ImportType, { field: string; label: string; required: boolean }[]> = {
  users: [
    { field: 'email', label: 'Email Address', required: true },
    { field: 'firstName', label: 'First Name', required: true },
    { field: 'lastName', label: 'Last Name', required: true },
    { field: 'role', label: 'Role (learner/instructor/admin)', required: false },
    { field: 'department', label: 'Department', required: false },
    { field: 'employeeId', label: 'Employee ID', required: false },
    { field: 'manager', label: 'Manager Email', required: false },
    { field: 'startDate', label: 'Start Date', required: false },
  ],
  enrollments: [
    { field: 'userEmail', label: 'User Email', required: true },
    { field: 'courseId', label: 'Course ID', required: true },
    { field: 'dueDate', label: 'Due Date', required: false },
    { field: 'assignedBy', label: 'Assigned By', required: false },
    { field: 'priority', label: 'Priority', required: false },
    { field: 'notes', label: 'Notes', required: false },
  ],
  courses: [
    { field: 'title', label: 'Course Title', required: true },
    { field: 'description', label: 'Description', required: false },
    { field: 'category', label: 'Category', required: false },
    { field: 'duration', label: 'Duration (minutes)', required: false },
    { field: 'instructor', label: 'Instructor Email', required: false },
    { field: 'isRequired', label: 'Required (true/false)', required: false },
    { field: 'compliance', label: 'Compliance Category', required: false },
  ],
};

export const BulkImport: React.FC<BulkImportProps> = ({
  onImportUsers,
  onImportEnrollments,
  onImportCourses,
  isDarkMode = false,
}) => {
  const [importType, setImportType] = useState<ImportType>('users');
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'results'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [validationErrors, setValidationErrors] = useState<ImportError[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [_isProcessing, _setIsProcessing] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [sendWelcomeEmails, setSendWelcomeEmails] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());
      return values;
    });

    return { headers, rows };
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const text = await selectedFile.text();
      const { headers, rows } = parseCSV(text);

      setPreview({
        headers,
        rows: rows.slice(0, 10),
        totalRows: rows.length,
      });

      // Auto-map columns based on header names
      const autoMappings: ColumnMapping[] = headers.map(header => {
        const normalizedHeader = header.toLowerCase().replace(/[_\s-]/g, '');
        const systemFields = SYSTEM_FIELDS[importType];

        const matchedField = systemFields.find(sf => {
          const normalizedField = sf.field.toLowerCase();
          const normalizedLabel = sf.label.toLowerCase().replace(/[_\s-]/g, '');
          return normalizedHeader.includes(normalizedField) ||
                 normalizedHeader.includes(normalizedLabel) ||
                 normalizedField.includes(normalizedHeader);
        });

        return {
          csvColumn: header,
          systemField: matchedField?.field || '',
          required: matchedField?.required || false,
        };
      });

      setMappings(autoMappings);
      setStep('mapping');
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV file. Please check the file format.');
    } finally {
      setIsProcessing(false);
    }
  }, [importType]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.csv')) {
      const input = fileInputRef.current;
      if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(droppedFile);
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, []);

  const updateMapping = (csvColumn: string, systemField: string) => {
    setMappings(prev =>
      prev.map(m =>
        m.csvColumn === csvColumn ? { ...m, systemField } : m
      )
    );
  };

  const validateData = useCallback((): ImportError[] => {
    if (!preview) return [];

    const errors: ImportError[] = [];
    const systemFields = SYSTEM_FIELDS[importType];
    const requiredFields = systemFields.filter(f => f.required).map(f => f.field);

    // Check if all required fields are mapped
    const mappedFields = mappings.filter(m => m.systemField).map(m => m.systemField);
    const missingRequired = requiredFields.filter(f => !mappedFields.includes(f));

    if (missingRequired.length > 0) {
      missingRequired.forEach(field => {
        const fieldInfo = systemFields.find(f => f.field === field);
        errors.push({
          row: 0,
          column: field,
          message: `Required field "${fieldInfo?.label}" is not mapped`,
        });
      });
    }

    // Validate each row
    preview.rows.forEach((row, rowIndex) => {
      mappings.forEach((mapping, colIndex) => {
        if (!mapping.systemField) return;

        const value = row[colIndex] || '';
        const fieldInfo = systemFields.find(f => f.field === mapping.systemField);

        // Check required fields
        if (fieldInfo?.required && !value.trim()) {
          errors.push({
            row: rowIndex + 2, // +2 for header and 0-indexing
            column: mapping.systemField,
            message: `${fieldInfo.label} is required`,
            value,
          });
        }

        // Email validation
        if (mapping.systemField.toLowerCase().includes('email') && value) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors.push({
              row: rowIndex + 2,
              column: mapping.systemField,
              message: 'Invalid email format',
              value,
            });
          }
        }

        // Date validation
        if (mapping.systemField.toLowerCase().includes('date') && value) {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push({
              row: rowIndex + 2,
              column: mapping.systemField,
              message: 'Invalid date format',
              value,
            });
          }
        }
      });
    });

    return errors;
  }, [preview, mappings, importType]);

  const handleProceedToPreview = () => {
    const errors = validateData();
    setValidationErrors(errors);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!preview) return;

    setStep('importing');
    setIsProcessing(true);

    try {
      // Convert rows to objects using mappings
      const data = preview.rows.map(row => {
        const obj: Record<string, string> = {};
        mappings.forEach((mapping, index) => {
          if (mapping.systemField && row[index] !== undefined) {
            obj[mapping.systemField] = row[index];
          }
        });
        return obj;
      });

      let result: ImportResult;
      switch (importType) {
        case 'users':
          result = await onImportUsers(data);
          break;
        case 'enrollments':
          result = await onImportEnrollments(data);
          break;
        case 'courses':
          result = await onImportCourses(data);
          break;
      }

      setImportResult(result);
      setStep('results');
    } catch (error) {
      console.error('Import error:', error);
      setImportResult({
        success: 0,
        failed: preview.totalRows,
        skipped: 0,
        errors: [{ row: 0, column: '', message: 'Import failed. Please try again.' }],
      });
      setStep('results');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetImport = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setMappings([]);
    setValidationErrors([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const fields = SYSTEM_FIELDS[importType];
    const headers = fields.map(f => f.label).join(',');
    const sampleRow = fields.map(f => {
      switch (f.field) {
        case 'email': return 'john.doe@example.com';
        case 'firstName': return 'John';
        case 'lastName': return 'Doe';
        case 'role': return 'learner';
        case 'department': return 'Engineering';
        case 'userEmail': return 'john.doe@example.com';
        case 'courseId': return 'course-123';
        case 'dueDate': return '2024-12-31';
        case 'title': return 'Introduction to Safety';
        case 'description': return 'Learn basic safety protocols';
        case 'duration': return '60';
        default: return '';
      }
    }).join(',');

    const csv = `${headers}\n${sampleRow}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${importType}_import_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTypeConfig = {
    users: { icon: Users, label: 'Users', description: 'Import users with roles and departments' },
    enrollments: { icon: BookOpen, label: 'Enrollments', description: 'Enroll users in courses' },
    courses: { icon: GraduationCap, label: 'Courses', description: 'Import course catalog' },
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h1 className="text-2xl font-bold mb-2">Bulk Import</h1>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
          Import users, enrollments, or courses from CSV files
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Import Type Selection */}
        {step === 'upload' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Select Import Type</h2>
              <div className="grid grid-cols-3 gap-4">
                {(Object.keys(importTypeConfig) as ImportType[]).map(type => {
                  const config = importTypeConfig[type];
                  const Icon = config.icon;
                  const isSelected = importType === type;

                  return (
                    <button
                      key={type}
                      onClick={() => setImportType(type)}
                      className={`p-4 rounded-lg border-2 transition-colors text-left ${
                        isSelected
                          ? isDarkMode
                            ? 'border-indigo-500 bg-indigo-900/30'
                            : 'border-indigo-500 bg-indigo-50'
                          : isDarkMode
                            ? 'border-gray-700 hover:border-gray-600'
                            : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-8 h-8 mb-2 ${isSelected ? 'text-indigo-500' : isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <div className="font-medium">{config.label}</div>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {config.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Upload Area */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Upload CSV File</h2>
                <button
                  onClick={downloadTemplate}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
                    isDarkMode
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  isDarkMode
                    ? 'border-gray-700 hover:border-gray-600'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <FileSpreadsheet className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                  <p className="text-lg font-medium mb-2">
                    Drop your CSV file here or click to browse
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    Supports CSV files up to 10MB
                  </p>
                </label>
              </div>

              {/* Import Options */}
              <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <h3 className="font-medium mb-3">Import Options</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Skip duplicate records</span>
                  </label>
                  {importType === 'users' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendWelcomeEmails}
                        onChange={(e) => setSendWelcomeEmails(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm">Send welcome emails to new users</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Required Fields Info */}
              <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
                isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-800'
              }`}>
                <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Required Fields for {importTypeConfig[importType].label}</p>
                  <p className="text-sm mt-1">
                    {SYSTEM_FIELDS[importType].filter(f => f.required).map(f => f.label).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Column Mapping */}
        {step === 'mapping' && preview && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Map Columns</h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {file?.name} • {preview.totalRows} rows
                </p>
              </div>
              <button
                onClick={resetImport}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
                  isDarkMode
                    ? 'bg-gray-800 hover:bg-gray-700'
                    : 'bg-white hover:bg-gray-50 border border-gray-300'
                }`}
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>

            <div className={`rounded-lg border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <table className="w-full">
                <thead>
                  <tr className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                    <th className="px-4 py-3 text-left text-sm font-medium">CSV Column</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Sample Data</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Map To</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {mappings.map((mapping, index) => (
                    <tr key={mapping.csvColumn}>
                      <td className="px-4 py-3">
                        <span className="font-medium">{mapping.csvColumn}</span>
                      </td>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {preview.rows[0]?.[index] || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={mapping.systemField}
                          onChange={(e) => updateMapping(mapping.csvColumn, e.target.value)}
                          className={`w-full px-3 py-1.5 rounded border ${
                            isDarkMode
                              ? 'bg-gray-800 border-gray-600'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          <option value="">-- Do not import --</option>
                          {SYSTEM_FIELDS[importType].map(field => (
                            <option key={field.field} value={field.field}>
                              {field.label} {field.required && '*'}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={resetImport}
                className={`px-4 py-2 rounded ${
                  isDarkMode
                    ? 'bg-gray-800 hover:bg-gray-700'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Back
              </button>
              <button
                onClick={handleProceedToPreview}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
              >
                Preview Import
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Preview & Validation */}
        {step === 'preview' && preview && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Preview Import</h2>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Review data before importing
                </p>
              </div>
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-red-600">
                    {validationErrors.length} validation error{validationErrors.length !== 1 ? 's' : ''} found
                  </span>
                </div>
                <ul className="space-y-1 text-sm max-h-40 overflow-y-auto">
                  {validationErrors.slice(0, 10).map((error, index) => (
                    <li key={index} className={isDarkMode ? 'text-red-300' : 'text-red-700'}>
                      {error.row > 0 ? `Row ${error.row}: ` : ''}{error.message}
                      {error.value && ` (value: "${error.value}")`}
                    </li>
                  ))}
                  {validationErrors.length > 10 && (
                    <li className={isDarkMode ? 'text-red-400' : 'text-red-600'}>
                      ...and {validationErrors.length - 10} more errors
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Data Preview Table */}
            <div className={`rounded-lg border overflow-hidden ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className={`px-4 py-2 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Showing first {preview.rows.length} of {preview.totalRows} rows
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                      <th className="px-3 py-2 text-left font-medium">#</th>
                      {mappings.filter(m => m.systemField).map(m => (
                        <th key={m.systemField} className="px-3 py-2 text-left font-medium">
                          {SYSTEM_FIELDS[importType].find(f => f.field === m.systemField)?.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {preview.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        <td className={`px-3 py-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {rowIndex + 1}
                        </td>
                        {mappings.filter(m => m.systemField).map((m, _colIndex) => {
                          const originalIndex = mappings.findIndex(mapping => mapping.csvColumn === m.csvColumn);
                          const hasError = validationErrors.some(
                            e => e.row === rowIndex + 2 && e.column === m.systemField
                          );
                          return (
                            <td
                              key={m.systemField}
                              className={`px-3 py-2 ${hasError ? 'bg-red-100 text-red-800' : ''}`}
                            >
                              {row[originalIndex] || '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Import Summary */}
            <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <h3 className="font-medium mb-3">Import Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Total Rows:</span>
                  <span className="ml-2 font-medium">{preview.totalRows}</span>
                </div>
                <div>
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Fields Mapped:</span>
                  <span className="ml-2 font-medium">{mappings.filter(m => m.systemField).length}</span>
                </div>
                <div>
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Validation Errors:</span>
                  <span className={`ml-2 font-medium ${validationErrors.length > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {validationErrors.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStep('mapping')}
                className={`px-4 py-2 rounded ${
                  isDarkMode
                    ? 'bg-gray-800 hover:bg-gray-700'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={validationErrors.some(e => e.row === 0)} // Disable if missing required fields
                className={`flex items-center gap-2 px-4 py-2 rounded ${
                  validationErrors.some(e => e.row === 0)
                    ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <Upload className="w-4 h-4" />
                Import {preview.totalRows} Records
              </button>
            </div>
          </div>
        )}

        {/* Importing Progress */}
        {step === 'importing' && (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="w-16 h-16 text-indigo-500 animate-spin mb-6" />
            <h2 className="text-xl font-semibold mb-2">Importing Data...</h2>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Please wait while we process your file
            </p>
          </div>
        )}

        {/* Results */}
        {step === 'results' && importResult && (
          <div className="space-y-6">
            <div className="text-center py-8">
              {importResult.failed === 0 ? (
                <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
              ) : importResult.success === 0 ? (
                <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
              ) : (
                <AlertTriangle className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
              )}
              <h2 className="text-2xl font-bold mb-2">
                {importResult.failed === 0 ? 'Import Complete!' :
                 importResult.success === 0 ? 'Import Failed' :
                 'Import Completed with Errors'}
              </h2>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg text-center ${
                isDarkMode ? 'bg-green-900/30' : 'bg-green-50'
              }`}>
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                <div className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
                  Imported
                </div>
              </div>
              <div className={`p-4 rounded-lg text-center ${
                isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'
              }`}>
                <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-600">{importResult.skipped}</div>
                <div className={`text-sm ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                  Skipped
                </div>
              </div>
              <div className={`p-4 rounded-lg text-center ${
                isDarkMode ? 'bg-red-900/30' : 'bg-red-50'
              }`}>
                <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                <div className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>
                  Failed
                </div>
              </div>
            </div>

            {/* Error Details */}
            {importResult.errors.length > 0 && (
              <div className={`p-4 rounded-lg ${
                isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                <h3 className="font-medium mb-3">Error Details</h3>
                <ul className="space-y-1 text-sm max-h-40 overflow-y-auto">
                  {importResult.errors.map((error, index) => (
                    <li key={index} className={isDarkMode ? 'text-red-300' : 'text-red-700'}>
                      {error.row > 0 ? `Row ${error.row}: ` : ''}{error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-center gap-3">
              <button
                onClick={resetImport}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded"
              >
                <Upload className="w-4 h-4" />
                Import More Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
