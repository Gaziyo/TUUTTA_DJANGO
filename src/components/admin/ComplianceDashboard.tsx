import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
  ChevronDown,
  ChevronRight,
  Mail,
  PieChart
} from 'lucide-react';
import { Course, Enrollment, OrgMember, Department } from '../../types/lms';

interface ComplianceDashboardProps {
  courses: Course[];
  enrollments: Enrollment[];
  members: OrgMember[];
  departments: Department[];
  onSendReminder: (enrollmentIds: string[]) => Promise<void>;
  onExport: (type: 'csv' | 'pdf') => void;
  isDarkMode?: boolean;
}

interface ComplianceStats {
  totalRequired: number;
  compliant: number;
  atRisk: number;
  overdue: number;
  complianceRate: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

interface DepartmentCompliance {
  department: Department;
  stats: ComplianceStats;
  members: MemberCompliance[];
}

interface MemberCompliance {
  member: OrgMember;
  requiredCourses: {
    course: Course;
    enrollment?: Enrollment;
    status: 'completed' | 'in_progress' | 'overdue' | 'not_started';
    daysRemaining?: number;
  }[];
  complianceRate: number;
}

type ViewMode = 'overview' | 'department' | 'individual';
type StatusFilter = 'all' | 'compliant' | 'at_risk' | 'overdue';

export function ComplianceDashboard({
  courses,
  enrollments,
  members,
  departments,
  onSendReminder,
  onExport,
  isDarkMode = false
}: ComplianceDashboardProps) {
  const [_viewMode, _setViewMode] = useState<ViewMode>('overview');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDepartment, setExpandedDepartment] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [sendingReminders, setSendingReminders] = useState(false);

  // Filter required/compliance courses
  const complianceCourses = useMemo(() => {
    return courses.filter(c => c.category === 'Compliance' || c.category === 'Safety');
  }, [courses]);

  // Calculate overall stats
  const overallStats = useMemo((): ComplianceStats => {
    let totalRequired = 0;
    let compliant = 0;
    let atRisk = 0;
    let overdue = 0;

    members.forEach(member => {
      complianceCourses.forEach(course => {
        const enrollment = enrollments.find(
          e => e.userId === member.id && e.courseId === course.id && e.priority === 'required'
        );

        if (enrollment) {
          totalRequired++;
          if (enrollment.status === 'completed') {
            compliant++;
          } else if (enrollment.status === 'overdue') {
            overdue++;
          } else if (enrollment.dueDate) {
            const daysRemaining = Math.ceil((enrollment.dueDate - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysRemaining <= 7) {
              atRisk++;
            }
          }
        }
      });
    });

    const complianceRate = totalRequired > 0 ? Math.round((compliant / totalRequired) * 100) : 100;

    return {
      totalRequired,
      compliant,
      atRisk,
      overdue,
      complianceRate,
      trend: complianceRate >= 90 ? 'up' : complianceRate >= 70 ? 'stable' : 'down',
      trendValue: 2.5 // Mock trend value
    };
  }, [members, complianceCourses, enrollments]);

  // Calculate per-department compliance
  const departmentCompliance = useMemo((): DepartmentCompliance[] => {
    return departments.map(dept => {
      const deptMembers = members.filter(m => m.departmentId === dept.id);
      const memberCompliance: MemberCompliance[] = deptMembers.map(member => {
        const requiredCourses = complianceCourses.map(course => {
          const enrollment = enrollments.find(
            e => e.userId === member.id && e.courseId === course.id
          );

          let status: 'completed' | 'in_progress' | 'overdue' | 'not_started';
          let daysRemaining: number | undefined;

          if (!enrollment) {
            status = 'not_started';
          } else if (enrollment.status === 'completed') {
            status = 'completed';
          } else if (enrollment.status === 'overdue') {
            status = 'overdue';
          } else if (enrollment.dueDate) {
            daysRemaining = Math.ceil((enrollment.dueDate - Date.now()) / (1000 * 60 * 60 * 24));
            status = 'in_progress';
          } else {
            status = 'in_progress';
          }

          return { course, enrollment, status, daysRemaining };
        });

        const completed = requiredCourses.filter(c => c.status === 'completed').length;
        const complianceRate = requiredCourses.length > 0
          ? Math.round((completed / requiredCourses.length) * 100)
          : 100;

        return { member, requiredCourses, complianceRate };
      });

      // Department stats
      let totalRequired = 0;
      let compliant = 0;
      let atRisk = 0;
      let overdue = 0;

      memberCompliance.forEach(mc => {
        mc.requiredCourses.forEach(rc => {
          totalRequired++;
          if (rc.status === 'completed') {
            compliant++;
          } else if (rc.status === 'overdue') {
            overdue++;
          } else if (rc.daysRemaining !== undefined && rc.daysRemaining <= 7) {
            atRisk++;
          }
        });
      });

      const complianceRate = totalRequired > 0 ? Math.round((compliant / totalRequired) * 100) : 100;

      return {
        department: dept,
        stats: {
          totalRequired,
          compliant,
          atRisk,
          overdue,
          complianceRate,
          trend: complianceRate >= 90 ? 'up' : complianceRate >= 70 ? 'stable' : 'down',
          trendValue: 0
        },
        members: memberCompliance
      };
    });
  }, [departments, members, complianceCourses, enrollments]);

  // Filter members
  const filteredDepartments = useMemo(() => {
    return departmentCompliance.map(dc => {
      let filteredMembers = dc.members;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredMembers = filteredMembers.filter(
          m => m.member.name.toLowerCase().includes(query) ||
               m.member.email.toLowerCase().includes(query)
        );
      }

      if (statusFilter !== 'all') {
        filteredMembers = filteredMembers.filter(m => {
          const hasOverdue = m.requiredCourses.some(c => c.status === 'overdue');
          const hasAtRisk = m.requiredCourses.some(
            c => c.status === 'in_progress' && c.daysRemaining !== undefined && c.daysRemaining <= 7
          );
          const isCompliant = m.complianceRate === 100;

          switch (statusFilter) {
            case 'compliant': return isCompliant;
            case 'at_risk': return hasAtRisk && !hasOverdue;
            case 'overdue': return hasOverdue;
            default: return true;
          }
        });
      }

      return { ...dc, members: filteredMembers };
    }).filter(dc => dc.members.length > 0 || statusFilter === 'all');
  }, [departmentCompliance, searchQuery, statusFilter]);

  const handleSendReminders = async () => {
    if (selectedMembers.size === 0) return;

    setSendingReminders(true);
    try {
      const enrollmentIds = Array.from(selectedMembers).flatMap(memberId => {
        const memberEnrollments = enrollments.filter(
          e => e.userId === memberId &&
               (e.status === 'in_progress' || e.status === 'overdue' || e.status === 'not_started')
        );
        return memberEnrollments.map(e => e.id);
      });

      await onSendReminder(enrollmentIds);
      setSelectedMembers(new Set());
    } finally {
      setSendingReminders(false);
    }
  };

  const toggleMemberSelection = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const getStatusColor = (rate: number): string => {
    if (rate >= 90) return 'text-green-500';
    if (rate >= 70) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusBg = (rate: number): string => {
    if (rate >= 90) return isDarkMode ? 'bg-green-900/30' : 'bg-green-50';
    if (rate >= 70) return isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50';
    return isDarkMode ? 'bg-red-900/30' : 'bg-red-50';
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield size={28} className="text-indigo-500" />
            <div>
              <h1 className="text-xl font-semibold">Compliance Dashboard</h1>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Track mandatory training compliance across your organization
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedMembers.size > 0 && (
              <button
                onClick={handleSendReminders}
                disabled={sendingReminders}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 flex items-center gap-2"
              >
                <Mail size={18} />
                Send Reminders ({selectedMembers.size})
              </button>
            )}
            <button
              onClick={() => onExport('csv')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <Download size={18} />
              Export
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} />
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Total Required
              </span>
            </div>
            <p className="text-2xl font-bold">{overallStats.totalRequired}</p>
          </div>

          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck size={18} className="text-green-500" />
              <span className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                Compliant
              </span>
            </div>
            <p className="text-2xl font-bold text-green-500">{overallStats.compliant}</p>
          </div>

          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={18} className="text-yellow-500" />
              <span className={`text-sm ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                At Risk
              </span>
            </div>
            <p className="text-2xl font-bold text-yellow-500">{overallStats.atRisk}</p>
          </div>

          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert size={18} className="text-red-500" />
              <span className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                Overdue
              </span>
            </div>
            <p className="text-2xl font-bold text-red-500">{overallStats.overdue}</p>
          </div>

          <div className={`p-4 rounded-xl ${getStatusBg(overallStats.complianceRate)}`}>
            <div className="flex items-center gap-2 mb-2">
              <PieChart size={18} className={getStatusColor(overallStats.complianceRate)} />
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Compliance Rate
              </span>
            </div>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${getStatusColor(overallStats.complianceRate)}`}>
                {overallStats.complianceRate}%
              </p>
              {overallStats.trend === 'up' && (
                <TrendingUp size={18} className="text-green-500" />
              )}
              {overallStats.trend === 'down' && (
                <TrendingDown size={18} className="text-red-500" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`flex items-center gap-4 p-4 border-b ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex-1 relative">
          <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`} />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
            } focus:ring-2 focus:ring-indigo-500 outline-none`}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className={`px-4 py-2 rounded-lg border ${
            isDarkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
          } focus:ring-2 focus:ring-indigo-500 outline-none`}
        >
          <option value="all">All Status</option>
          <option value="compliant">Compliant</option>
          <option value="at_risk">At Risk</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {filteredDepartments.map(dc => (
            <div
              key={dc.department.id}
              className={`rounded-xl border ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}
            >
              {/* Department Header */}
              <div
                className={`flex items-center justify-between p-4 cursor-pointer ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }`}
                onClick={() => setExpandedDepartment(
                  expandedDepartment === dc.department.id ? null : dc.department.id
                )}
              >
                <div className="flex items-center gap-4">
                  {expandedDepartment === dc.department.id ? (
                    <ChevronDown size={20} />
                  ) : (
                    <ChevronRight size={20} />
                  )}
                  <div>
                    <h3 className="font-semibold">{dc.department.name}</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {dc.members.length} employees
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-sm text-green-500 font-medium">{dc.stats.compliant}</p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Compliant</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-yellow-500 font-medium">{dc.stats.atRisk}</p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>At Risk</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-red-500 font-medium">{dc.stats.overdue}</p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Overdue</p>
                  </div>
                  <div className={`px-4 py-2 rounded-lg font-bold ${getStatusBg(dc.stats.complianceRate)} ${getStatusColor(dc.stats.complianceRate)}`}>
                    {dc.stats.complianceRate}%
                  </div>
                </div>
              </div>

              {/* Members List */}
              {expandedDepartment === dc.department.id && (
                <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {dc.members.map(mc => {
                      const hasOverdue = mc.requiredCourses.some(c => c.status === 'overdue');
                      const hasAtRisk = mc.requiredCourses.some(
                        c => c.daysRemaining !== undefined && c.daysRemaining <= 7
                      );

                      return (
                        <div
                          key={mc.member.id}
                          className={`p-4 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                        >
                          <div className="flex items-center gap-4">
                            <input
                              type="checkbox"
                              checked={selectedMembers.has(mc.member.id)}
                              onChange={() => toggleMemberSelection(mc.member.id)}
                              className="w-4 h-4 rounded text-indigo-600"
                              onClick={e => e.stopPropagation()}
                            />

                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="font-medium">{mc.member.name}</p>
                                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {mc.member.email}
                                  </p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  mc.complianceRate === 100
                                    ? (isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700')
                                    : hasOverdue
                                      ? (isDarkMode ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-700')
                                      : hasAtRisk
                                        ? (isDarkMode ? 'bg-yellow-900/50 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                                        : (isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-700')
                                }`}>
                                  {mc.complianceRate}% Complete
                                </div>
                              </div>

                              {/* Course Status */}
                              <div className="flex flex-wrap gap-2">
                                {mc.requiredCourses.map(rc => (
                                  <div
                                    key={rc.course.id}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                                      rc.status === 'completed'
                                        ? (isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700')
                                        : rc.status === 'overdue'
                                          ? (isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700')
                                          : rc.daysRemaining !== undefined && rc.daysRemaining <= 7
                                            ? (isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-700')
                                            : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')
                                    }`}
                                  >
                                    {rc.status === 'completed' ? (
                                      <CheckCircle size={14} />
                                    ) : rc.status === 'overdue' ? (
                                      <XCircle size={14} />
                                    ) : rc.daysRemaining !== undefined && rc.daysRemaining <= 7 ? (
                                      <AlertTriangle size={14} />
                                    ) : (
                                      <Clock size={14} />
                                    )}
                                    <span className="truncate max-w-[200px]">{rc.course.title}</span>
                                    {rc.daysRemaining !== undefined && rc.status !== 'completed' && (
                                      <span className="opacity-70">
                                        {rc.daysRemaining > 0 ? `${rc.daysRemaining}d left` : 'Today'}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}

          {filteredDepartments.length === 0 && (
            <div className={`text-center py-12 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <Shield size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No results found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ComplianceDashboard;
