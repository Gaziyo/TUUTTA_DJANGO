import React, { useState } from 'react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import { LMSReport, ReportType, ReportFilters, ReportSchedule, EnrollmentStatus } from '../../types/lms';
import { logger } from '../../lib/logger';
import {
  FileText,
  Plus,
  Save,
  Calendar,
  Clock,
  Play,
  Trash2,
  Edit,
  Filter,
  Columns,
  BarChart2,
  Users,
  BookOpen,
  Building,
  Target,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

type ViewMode = 'list' | 'create' | 'edit';

const REPORT_TYPES: { id: ReportType; label: string; description: string; icon: React.ReactNode }[] = [
  { id: 'learner_progress', label: 'Learner Progress', description: 'Track individual learner training progress', icon: <Users className="w-5 h-5" /> },
  { id: 'course_completion', label: 'Course Completion', description: 'Analyze course completion rates', icon: <BookOpen className="w-5 h-5" /> },
  { id: 'department_summary', label: 'Department Summary', description: 'Overview by department', icon: <Building className="w-5 h-5" /> },
  { id: 'compliance_status', label: 'Compliance Status', description: 'Track compliance requirements', icon: <Target className="w-5 h-5" /> },
  { id: 'training_hours', label: 'Training Hours', description: 'Time spent on training', icon: <Clock className="w-5 h-5" /> },
  { id: 'assessment_scores', label: 'Assessment Scores', description: 'Quiz and test results', icon: <BarChart2 className="w-5 h-5" /> },
  { id: 'overdue_training', label: 'Overdue Training', description: 'Trainings past due date', icon: <AlertTriangle className="w-5 h-5" /> },
  { id: 'certification_status', label: 'Certification Status', description: 'Certificate tracking', icon: <CheckCircle className="w-5 h-5" /> }
];

const AVAILABLE_COLUMNS: Record<ReportType, { id: string; label: string }[]> = {
  learner_progress: [
    { id: 'learner_name', label: 'Learner Name' },
    { id: 'learner_email', label: 'Email' },
    { id: 'department', label: 'Department' },
    { id: 'courses_assigned', label: 'Courses Assigned' },
    { id: 'courses_completed', label: 'Courses Completed' },
    { id: 'avg_progress', label: 'Avg Progress' },
    { id: 'avg_score', label: 'Avg Score' },
    { id: 'time_spent', label: 'Time Spent' },
    { id: 'last_activity', label: 'Last Activity' }
  ],
  course_completion: [
    { id: 'course_name', label: 'Course Name' },
    { id: 'category', label: 'Category' },
    { id: 'total_enrolled', label: 'Total Enrolled' },
    { id: 'completed', label: 'Completed' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'not_started', label: 'Not Started' },
    { id: 'completion_rate', label: 'Completion Rate' },
    { id: 'avg_score', label: 'Avg Score' },
    { id: 'avg_time', label: 'Avg Time' }
  ],
  department_summary: [
    { id: 'department_name', label: 'Department' },
    { id: 'total_learners', label: 'Total Learners' },
    { id: 'active_learners', label: 'Active Learners' },
    { id: 'total_enrollments', label: 'Total Enrollments' },
    { id: 'completed', label: 'Completed' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'compliance_rate', label: 'Compliance Rate' },
    { id: 'avg_score', label: 'Avg Score' }
  ],
  compliance_status: [
    { id: 'learner_name', label: 'Learner Name' },
    { id: 'department', label: 'Department' },
    { id: 'required_training', label: 'Required Training' },
    { id: 'completed', label: 'Completed' },
    { id: 'pending', label: 'Pending' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'compliance_status', label: 'Status' },
    { id: 'next_due', label: 'Next Due Date' }
  ],
  training_hours: [
    { id: 'learner_name', label: 'Learner Name' },
    { id: 'department', label: 'Department' },
    { id: 'total_hours', label: 'Total Hours' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'courses_completed', label: 'Courses Completed' },
    { id: 'avg_session', label: 'Avg Session Length' }
  ],
  assessment_scores: [
    { id: 'learner_name', label: 'Learner Name' },
    { id: 'course_name', label: 'Course' },
    { id: 'assessment_name', label: 'Assessment' },
    { id: 'score', label: 'Score' },
    { id: 'passing_score', label: 'Passing Score' },
    { id: 'attempts', label: 'Attempts' },
    { id: 'passed', label: 'Passed' },
    { id: 'completed_at', label: 'Completed At' }
  ],
  overdue_training: [
    { id: 'learner_name', label: 'Learner Name' },
    { id: 'learner_email', label: 'Email' },
    { id: 'department', label: 'Department' },
    { id: 'course_name', label: 'Course' },
    { id: 'due_date', label: 'Due Date' },
    { id: 'days_overdue', label: 'Days Overdue' },
    { id: 'progress', label: 'Progress' },
    { id: 'manager', label: 'Manager' }
  ],
  certification_status: [
    { id: 'learner_name', label: 'Learner Name' },
    { id: 'certificate_name', label: 'Certificate' },
    { id: 'issued_date', label: 'Issued Date' },
    { id: 'expiry_date', label: 'Expiry Date' },
    { id: 'days_until_expiry', label: 'Days Until Expiry' },
    { id: 'status', label: 'Status' },
    { id: 'renewal_required', label: 'Renewal Required' }
  ]
};

export const ReportBuilder: React.FC = () => {
  const { user } = useStore();
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';

  const { currentOrg, departments, courses } = useLMSStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [savedReports, setSavedReports] = useState<LMSReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<LMSReport | null>(null);

  const handleCreateReport = () => {
    setSelectedReport(null);
    setViewMode('create');
  };

  const handleEditReport = (report: LMSReport) => {
    setSelectedReport(report);
    setViewMode('edit');
  };

  const handleSaveReport = (reportData: Omit<LMSReport, 'id' | 'createdAt' | 'lastRunAt'>) => {
    if (selectedReport) {
      setSavedReports(reports =>
        reports.map(r => r.id === selectedReport.id ? { ...r, ...reportData } : r)
      );
    } else {
      const newReport: LMSReport = {
        id: `report-${Date.now()}`,
        ...reportData,
        createdAt: Date.now()
      };
      setSavedReports([...savedReports, newReport]);
    }
    setViewMode('list');
  };

  const handleDeleteReport = (reportId: string) => {
    setSavedReports(reports => reports.filter(r => r.id !== reportId));
  };

  const handleRunReport = (report: LMSReport) => {
    // In production, this would generate and download the report
    logger.debug('Running report:', report.name);
    setSavedReports(reports =>
      reports.map(r => r.id === report.id ? { ...r, lastRunAt: Date.now() } : r)
    );
    alert(`Report "${report.name}" generated! In production, this would download the report.`);
  };

  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <ReportEditor
        report={selectedReport}
        departments={departments}
        courses={courses}
        orgId={currentOrg?.id || ''}
        userId={user?.id || ''}
        isDarkMode={isDarkMode}
        onSave={handleSaveReport}
        onCancel={() => setViewMode('list')}
      />
    );
  }

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Custom Reports</h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Build and schedule custom training reports
            </p>
          </div>
          <button
            onClick={handleCreateReport}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Report
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {savedReports.length === 0 ? (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No saved reports</p>
            <p className="text-sm mb-4">Create custom reports to track training metrics</p>
            <button
              onClick={handleCreateReport}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Plus className="w-5 h-5" />
              Create First Report
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {savedReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                isDarkMode={isDarkMode}
                onEdit={() => handleEditReport(report)}
                onDelete={() => handleDeleteReport(report.id)}
                onRun={() => handleRunReport(report)}
              />
            ))}
          </div>
        )}

        {/* Report Templates */}
        <div className="mt-8">
          <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Quick Start Templates
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {REPORT_TYPES.slice(0, 4).map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedReport(null);
                  setViewMode('create');
                }}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 hover:border-indigo-500'
                    : 'bg-white border-gray-200 hover:border-indigo-500'
                }`}
              >
                <div className={`p-2 rounded-lg inline-block mb-2 ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  {type.icon}
                </div>
                <p className="font-medium">{type.label}</p>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {type.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Report Card Component
interface ReportCardProps {
  report: LMSReport;
  isDarkMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRun: () => void;
}

const ReportCard: React.FC<ReportCardProps> = ({
  report,
  isDarkMode,
  onEdit,
  onDelete,
  onRun
}) => {
  const reportType = REPORT_TYPES.find(t => t.id === report.type);

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            {reportType?.icon || <FileText className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold">{report.name}</h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {reportType?.label || report.type}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {report.columns.length} columns
              </span>
              {report.schedule && (
                <span className={`flex items-center gap-1 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  <Clock className="w-3 h-3" />
                  {report.schedule.frequency}
                </span>
              )}
              <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Last run: {formatDate(report.lastRunAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRun}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Play className="w-4 h-4" />
            Run
          </button>
          <button
            onClick={onEdit}
            className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className={`p-2 rounded-lg text-red-500 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Report Editor Component
interface ReportEditorProps {
  report: LMSReport | null;
  departments: { id: string; name: string }[];
  courses: { id: string; title: string }[];
  orgId: string;
  userId: string;
  isDarkMode: boolean;
  onSave: (report: Omit<LMSReport, 'id' | 'createdAt' | 'lastRunAt'>) => void;
  onCancel: () => void;
}

const ReportEditor: React.FC<ReportEditorProps> = ({
  report,
  departments,
  courses,
  orgId,
  userId,
  isDarkMode,
  onSave,
  onCancel
}) => {
  const [name, setName] = useState(report?.name || '');
  const [type, setType] = useState<ReportType>(report?.type || 'learner_progress');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    report?.columns || AVAILABLE_COLUMNS['learner_progress'].slice(0, 5).map(c => c.id)
  );
  const [filterDepartments, setFilterDepartments] = useState<string[]>(report?.filters.departments || []);
  const [filterCourses, setFilterCourses] = useState<string[]>(report?.filters.courses || []);
  const [filterStatus, _setFilterStatus] = useState<EnrollmentStatus[]>(report?.filters.status || []);
  const [enableSchedule, setEnableSchedule] = useState(!!report?.schedule);
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly' | 'monthly'>(
    report?.schedule?.frequency || 'weekly'
  );
  const [scheduleRecipients, setScheduleRecipients] = useState<string>(
    report?.schedule?.recipients.join(', ') || ''
  );
  const [scheduleFormat, setScheduleFormat] = useState<'pdf' | 'csv' | 'excel'>(
    report?.schedule?.format || 'pdf'
  );

  const availableColumns = AVAILABLE_COLUMNS[type] || [];

  const toggleColumn = (columnId: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(c => c !== columnId)
        : [...prev, columnId]
    );
  };

  const handleTypeChange = (newType: ReportType) => {
    setType(newType);
    setSelectedColumns(AVAILABLE_COLUMNS[newType].slice(0, 5).map(c => c.id));
  };

  const handleSave = () => {
    const filters: ReportFilters = {};
    if (filterDepartments.length > 0) filters.departments = filterDepartments;
    if (filterCourses.length > 0) filters.courses = filterCourses;
    if (filterStatus.length > 0) filters.status = filterStatus;

    let schedule: ReportSchedule | undefined;
    if (enableSchedule) {
      schedule = {
        frequency: scheduleFrequency,
        time: '09:00',
        recipients: scheduleRecipients.split(',').map(e => e.trim()).filter(Boolean),
        format: scheduleFormat
      };
      if (scheduleFrequency === 'weekly') schedule.dayOfWeek = 1;
      if (scheduleFrequency === 'monthly') schedule.dayOfMonth = 1;
    }

    onSave({
      orgId,
      name,
      type,
      filters,
      columns: selectedColumns,
      schedule,
      createdBy: userId
    });
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{report ? 'Edit Report' : 'Create Custom Report'}</h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Configure your report settings
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className={`px-4 py-2 rounded-lg ${
                isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || selectedColumns.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              Save Report
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Basic Info */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className="text-lg font-semibold mb-4">Report Details</h2>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Report Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Monthly Compliance Report"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                  } focus:ring-2 focus:ring-indigo-500`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Report Type
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {REPORT_TYPES.map((rt) => (
                    <button
                      key={rt.id}
                      onClick={() => handleTypeChange(rt.id)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        type === rt.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                          : isDarkMode
                            ? 'border-gray-700 hover:border-gray-600'
                            : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`mb-1 ${type === rt.id ? 'text-indigo-600' : isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {rt.icon}
                      </div>
                      <p className={`text-sm font-medium ${type === rt.id ? 'text-indigo-600' : ''}`}>
                        {rt.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Columns */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Columns className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <h2 className="text-lg font-semibold">Columns</h2>
              <span className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                ({selectedColumns.length} selected)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {availableColumns.map((col) => (
                <label
                  key={col.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                    selectedColumns.includes(col.id)
                      ? 'bg-indigo-50 dark:bg-indigo-900/30'
                      : isDarkMode
                        ? 'hover:bg-gray-700'
                        : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col.id)}
                    onChange={() => toggleColumn(col.id)}
                    className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                  />
                  <span className="text-sm">{col.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Filter className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <h2 className="text-lg font-semibold">Filters</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Departments
                </label>
                <select
                  multiple
                  value={filterDepartments}
                  onChange={(e) => setFilterDepartments(Array.from(e.target.selectedOptions, o => o.value))}
                  className={`w-full px-3 py-2 rounded-lg border h-32 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-indigo-500`}
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  Hold Ctrl/Cmd to select multiple
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Courses
                </label>
                <select
                  multiple
                  value={filterCourses}
                  onChange={(e) => setFilterCourses(Array.from(e.target.selectedOptions, o => o.value))}
                  className={`w-full px-3 py-2 rounded-lg border h-32 ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  } focus:ring-2 focus:ring-indigo-500`}
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className={`p-6 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <h2 className="text-lg font-semibold">Schedule</h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableSchedule}
                  onChange={(e) => setEnableSchedule(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300"
                />
                <span className="text-sm">Enable scheduled delivery</span>
              </label>
            </div>

            {enableSchedule && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Frequency
                    </label>
                    <select
                      value={scheduleFrequency}
                      onChange={(e) => setScheduleFrequency(e.target.value as 'daily' | 'weekly' | 'monthly')}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-indigo-500`}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Format
                    </label>
                    <select
                      value={scheduleFormat}
                      onChange={(e) => setScheduleFormat(e.target.value as 'pdf' | 'csv' | 'excel')}
                      className={`w-full px-4 py-2 rounded-lg border ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:ring-2 focus:ring-indigo-500`}
                    >
                      <option value="pdf">PDF</option>
                      <option value="csv">CSV</option>
                      <option value="excel">Excel</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Email Recipients
                  </label>
                  <input
                    type="text"
                    value={scheduleRecipients}
                    onChange={(e) => setScheduleRecipients(e.target.value)}
                    placeholder="email1@company.com, email2@company.com"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:ring-2 focus:ring-indigo-500`}
                  />
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Separate multiple emails with commas
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;
