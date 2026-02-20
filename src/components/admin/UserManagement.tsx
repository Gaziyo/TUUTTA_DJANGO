import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { OrgMember, UserRole, Department, Team } from '../../types/lms';
import { logger } from '../../lib/logger';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import AdminToolbar from './AdminToolbar';
import {
  Users,
  Filter,
  Edit,
  Trash2,
  Mail,
  MoreVertical,
  UserPlus,
  Upload,
  Shield,
  Building2,
  UserCheck,
  Clock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

type ViewMode = 'list' | 'invite' | 'edit' | 'bulk';
type StatusFilter = 'all' | 'active' | 'inactive' | 'pending';
type RoleFilter = 'all' | UserRole;

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  org_admin: 'Organization Admin',
  ld_manager: 'L&D Manager',
  team_lead: 'Team Lead',
  instructor: 'Instructor',
  learner: 'Learner'
};

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  org_admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  ld_manager: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  team_lead: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  instructor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  learner: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
};

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
};

interface UserManagementProps {
  isDarkMode?: boolean;
}

export const UserManagement: React.FC<UserManagementProps> = () => {
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';

  const {
    currentOrg,
    members,
    departments,
    teams,
    loadMembers,
    loadDepartments,
    loadTeams,
    addMember,
    updateMember,
    removeMember,
    isLoading
  } = useLMSStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<UserRole>('learner');
  const [assignDeptMember, setAssignDeptMember] = useState<OrgMember | null>(null);
  const [assignDeptId, setAssignDeptId] = useState<string>('');

  useEffect(() => {
    if (currentOrg?.id) {
      loadMembers();
      loadDepartments();
      loadTeams();
    }
  }, [currentOrg?.id, loadMembers, loadDepartments, loadTeams]);

  const filteredMembers = members.filter(member => {
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesRole && matchesSearch;
  });

  const handleInviteUser = () => {
    setSelectedMember(null);
    setInviteRole('learner');
    setViewMode('invite');
  };

  const handleInviteAdmin = () => {
    setSelectedMember(null);
    setInviteRole('org_admin');
    setViewMode('invite');
  };

  const handleEditMember = (member: OrgMember) => {
    setSelectedMember(member);
    setViewMode('edit');
  };

  const handleChangeRole = async (member: OrgMember, role: UserRole) => {
    await updateMember(member.id, { role });
  };

  const handleAssignDepartment = (member: OrgMember) => {
    setAssignDeptMember(member);
    setAssignDeptId(member.departmentId || '');
  };

  const handleSaveDepartment = async () => {
    if (!assignDeptMember) return;
    await updateMember(assignDeptMember.id, {
      departmentId: assignDeptId || undefined
    });
    setAssignDeptMember(null);
  };

  const handleDeleteMember = async (memberId: string) => {
    await removeMember(memberId);
    setShowDeleteConfirm(null);
  };

  const handleResendInvite = async (member: OrgMember) => {
    // In a real implementation, this would trigger an email
    logger.debug('Resending invite to:', member.email);
  };

  const getDepartmentName = (departmentId?: string) => {
    if (!departmentId) return '-';
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || '-';
  };

  const getTeamName = (teamId?: string) => {
    if (!teamId) return '-';
    const team = teams.find(t => t.id === teamId);
    return team?.name || '-';
  };

  if (viewMode === 'invite' || viewMode === 'edit') {
    return (
      <UserEditor
        member={selectedMember}
        departments={departments}
        teams={teams}
        isDarkMode={isDarkMode}
        defaultRole={inviteRole}
        onSave={async (memberData) => {
          if (selectedMember) {
            await updateMember(selectedMember.id, memberData);
          } else if (currentOrg) {
            await addMember(
              memberData.email || '',
              memberData.name || '',
              (memberData.role as UserRole) || 'learner',
              memberData.departmentId
            );
          }
          setViewMode('list');
        }}
        onCancel={() => setViewMode('list')}
      />
    );
  }

  if (viewMode === 'bulk') {
    return (
      <BulkImport
        isDarkMode={isDarkMode}
        onImport={async (users) => {
          if (!currentOrg) return;
          for (const userData of users) {
            await addMember(
              userData.email || '',
              userData.name || '',
              (userData.role as UserRole) || 'learner',
              userData.departmentId
            );
          }
          setViewMode('list');
        }}
        onCancel={() => setViewMode('list')}
      />
    );
  }

  const stats = {
    total: members.length,
    active: members.filter(m => m.status === 'active').length,
    pending: members.filter(m => m.status === 'pending').length,
    admins: members.filter(m => ['org_admin', 'ld_manager'].includes(m.role)).length
  };

  return (
    <div className="h-full flex flex-col bg-app-bg text-app-text">
      <AdminPageHeader
        title="User Management"
        subtitle="Manage organization members and their roles"
        isDarkMode={isDarkMode}
        badge="People"
        actions={(
          <>
            <button
              onClick={() => setViewMode('bulk')}
              className="btn-secondary-min flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Upload users
            </button>
            <button
              onClick={handleInviteAdmin}
              className="btn-secondary-min flex items-center gap-2 border-emerald-500/40 text-emerald-500 hover:border-emerald-500"
            >
              <Shield className="w-5 h-5" />
              Invite admin
            </button>
            <button
              onClick={handleInviteUser}
              className="btn-primary-min flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Add a new user
            </button>
          </>
        )}
      />

      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="grid gap-4">
          <AdminSection title="Summary" isDarkMode={isDarkMode} minHeight="120px">
            <div className="grid grid-cols-4 gap-4">
              <div className="card-min-ghost p-3">
                <div className="flex items-center gap-2">
                  <Users className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Users</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </div>
              <div className="card-min-ghost p-3">
                <div className="flex items-center gap-2">
                  <UserCheck className={`w-5 h-5 text-green-500`} />
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.active}</p>
              </div>
              <div className="card-min-ghost p-3">
                <div className="flex items-center gap-2">
                  <Clock className={`w-5 h-5 text-yellow-500`} />
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pending</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.pending}</p>
              </div>
              <div className="card-min-ghost p-3">
                <div className="flex items-center gap-2">
                  <Shield className={`w-5 h-5 text-purple-500`} />
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Admins/Managers</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.admins}</p>
              </div>
            </div>
          </AdminSection>

          <AdminSection title="Filters" isDarkMode={isDarkMode} minHeight="88px">
            <AdminToolbar
              isDarkMode={isDarkMode}
              searchValue={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search by name or email..."
              rightContent={(
                <>
                  <Filter className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className="input-min"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                    className="input-min"
                  >
                    <option value="all">All Roles</option>
                    {Object.entries(ROLE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </>
              )}
            />
          </AdminSection>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No users found</p>
            <p className="text-sm">Invite your first team member to get started</p>
          </div>
        ) : (
          <div className="card-min overflow-hidden">
            <table className="w-full">
              <thead className="bg-app-surface2">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
                    Department
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
                    Team
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
                    Last Active
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-app-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-app-surface">
                {filteredMembers.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isDarkMode={isDarkMode}
                    getDepartmentName={getDepartmentName}
                    getTeamName={getTeamName}
                    onEdit={() => handleEditMember(member)}
                    onChangeRole={(role) => handleChangeRole(member, role)}
                    onAssignDepartment={() => handleAssignDepartment(member)}
                    onDelete={() => setShowDeleteConfirm(member.id)}
                    onResendInvite={() => handleResendInvite(member)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-xl max-w-md w-full mx-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-lg font-semibold mb-2">Remove User?</h3>
            <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              This will remove the user from your organization. Their learning progress will be archived.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="btn-secondary-min"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteMember(showDeleteConfirm)}
                className="btn-primary-min bg-red-600 text-white hover:bg-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Department Modal */}
      {assignDeptMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`p-6 rounded-xl max-w-md w-full mx-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className="text-lg font-semibold mb-2">Assign Department</h3>
            <p className={`mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {assignDeptMember.name}
            </p>
            <select
              value={assignDeptId}
              onChange={(e) => setAssignDeptId(e.target.value)}
              className="input-min w-full"
            >
              <option value="">No Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setAssignDeptMember(null)}
                className="btn-secondary-min"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDepartment}
                className="btn-primary-min"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Member Row Component
interface MemberRowProps {
  member: OrgMember;
  isDarkMode: boolean;
  getDepartmentName: (id?: string) => string;
  getTeamName: (id?: string) => string;
  onEdit: () => void;
  onChangeRole: (role: UserRole) => void;
  onAssignDepartment: () => void;
  onDelete: () => void;
  onResendInvite: () => void;
}

const MemberRow: React.FC<MemberRowProps> = ({
  member,
  isDarkMode,
  getDepartmentName,
  getTeamName,
  onEdit,
  onChangeRole,
  onAssignDepartment,
  onDelete,
  onResendInvite
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const roleOptions: UserRole[] = ['org_admin', 'ld_manager', 'instructor', 'learner'];

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <tr className="border-t border-app-border hover:bg-app-surface2">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
            member.status === 'active' ? 'bg-indigo-600' : 'bg-gray-500'
          }`}>
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium">{member.name}</p>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{member.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${ROLE_COLORS[member.role]}`}>
          {ROLE_LABELS[member.role]}
        </span>
      </td>
      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        {getDepartmentName(member.departmentId)}
      </td>
      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        {getTeamName(member.teamId)}
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[member.status]}`}>
          {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
        </span>
      </td>
      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        {formatDate(member.lastActiveAt)}
      </td>
      <td className="px-4 py-3">
        <div className="relative flex justify-end">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg hover:bg-app-surface2"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 rounded-lg shadow-lg border border-app-border bg-app-surface z-20">
                <button
                  onClick={() => { onEdit(); setShowMenu(false); }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-left ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <Edit className="w-4 h-4" /> Edit
                </button>
                <div className={`px-4 py-2 text-xs uppercase tracking-wide ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Change role
                </div>
                {roleOptions.map((roleValue) => (
                  <button
                    key={roleValue}
                    onClick={() => { onChangeRole(roleValue); setShowMenu(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-left ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Shield className={`w-4 h-4 ${roleValue === member.role ? 'text-indigo-500' : isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    {ROLE_LABELS[roleValue]}
                  </button>
                ))}
                <button
                  onClick={() => { onAssignDepartment(); setShowMenu(false); }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-left ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Assign department
                </button>
                {member.status === 'pending' && (
                  <button
                    onClick={() => { onResendInvite(); setShowMenu(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-left ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <Mail className="w-4 h-4" /> Resend Invite
                  </button>
                )}
                <hr className={isDarkMode ? 'border-gray-700' : 'border-gray-200'} />
                <button
                  onClick={() => { onDelete(); setShowMenu(false); }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 ${
                    isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <Trash2 className="w-4 h-4" /> Remove
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

// User Editor Component
interface UserEditorProps {
  member: OrgMember | null;
  departments: Department[];
  teams: Team[];
  isDarkMode: boolean;
  defaultRole?: UserRole;
  onSave: (member: Partial<OrgMember>) => Promise<void>;
  onCancel: () => void;
}

const UserEditor: React.FC<UserEditorProps> = ({
  member,
  departments,
  teams,
  isDarkMode,
  defaultRole,
  onSave,
  onCancel
}) => {
  const [name, setName] = useState(member?.name || '');
  const [email, setEmail] = useState(member?.email || '');
  const [role, setRole] = useState<UserRole>(member?.role || defaultRole || 'learner');
  const [departmentId, setDepartmentId] = useState(member?.departmentId || '');
  const [teamId, setTeamId] = useState(member?.teamId || '');
  const [title, setTitle] = useState(member?.title || '');
  const [saving, setSaving] = useState(false);

  const filteredTeams = departmentId
    ? teams.filter(t => t.departmentId === departmentId)
    : teams;

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      name,
      email,
      role,
      departmentId: departmentId || undefined,
      teamId: teamId || undefined,
      title: title || undefined
    });
    setSaving(false);
  };

  return (
    <div className="h-full flex flex-col bg-app-bg text-app-text">
      {/* Header */}
      <div className="p-6 border-b border-app-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{member ? 'Edit User' : 'Invite User'}</h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {member ? 'Update user details and permissions' : 'Add a new team member to your organization'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="btn-secondary-min"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || !email.trim()}
              className="btn-primary-min flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {member ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  {saving ? 'Sending...' : 'Send Invite'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Basic Info */}
          <div className="p-6 card-min">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="input-min w-full"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@company.com"
                  disabled={!!member}
                  className={`input-min w-full ${member ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                {!member && (
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    An invitation email will be sent to this address
                  </p>
                )}
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Job Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Software Engineer"
                  className="input-min w-full"
                />
              </div>
            </div>
          </div>

          {/* Role & Permissions */}
          <div className="p-6 card-min">
            <h2 className="text-lg font-semibold mb-4">Role & Permissions</h2>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                User Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(ROLE_LABELS) as [UserRole, string][])
                  .filter(([r]) => r !== 'super_admin')
                  .map(([roleValue, roleLabel]) => (
                    <button
                      key={roleValue}
                      onClick={() => setRole(roleValue)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        role === roleValue
                          ? 'border-app-accent bg-app-surface2'
                          : 'border-app-border hover:bg-app-surface2'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Shield className={`w-4 h-4 ${role === roleValue ? 'text-app-accent' : 'text-app-muted'}`} />
                        <span className={`font-medium ${role === roleValue ? 'text-app-accent' : ''}`}>{roleLabel}</span>
                      </div>
                      <p className="text-xs mt-1 text-app-muted">
                        {getRoleDescription(roleValue)}
                      </p>
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Organization */}
          <div className="p-6 card-min">
            <h2 className="text-lg font-semibold mb-4">Organization</h2>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    setTeamId(''); // Reset team when department changes
                  }}
                  className="input-min w-full"
                >
                  <option value="">No Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Team
                </label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="input-min w-full"
                >
                  <option value="">No Team</option>
                  {filteredTeams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Bulk Import Component
interface BulkImportProps {
  isDarkMode: boolean;
  onImport: (users: Partial<OrgMember>[]) => Promise<void>;
  onCancel: () => void;
}

const BulkImport: React.FC<BulkImportProps> = ({
  isDarkMode,
  onImport,
  onCancel
}) => {
  const [_csvData, setCsvData] = useState('');
  const [parsedUsers, setParsedUsers] = useState<Partial<OrgMember>[]>([]);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvData(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    try {
      const lines = text.trim().split('\n');
      if (lines.length < 2) {
        setError('CSV must have a header row and at least one data row');
        return;
      }

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      const nameIndex = headers.indexOf('name');
      const emailIndex = headers.indexOf('email');
      const roleIndex = headers.indexOf('role');

      if (nameIndex === -1 || emailIndex === -1) {
        setError('CSV must have "name" and "email" columns');
        return;
      }

      const users: Partial<OrgMember>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const name = values[nameIndex];
        const email = values[emailIndex];
        const role = roleIndex !== -1 ? values[roleIndex] as UserRole : 'learner';

        if (name && email) {
          users.push({ name, email, role: role || 'learner' });
        }
      }

      setParsedUsers(users);
      setError('');
    } catch {
      setError('Failed to parse CSV file');
    }
  };

  const handleImport = async () => {
    setImporting(true);
    await onImport(parsedUsers);
    setImporting(false);
  };

  return (
    <div className="h-full flex flex-col bg-app-bg text-app-text">
      {/* Header */}
      <div className="p-6 border-b border-app-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bulk Import Users</h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Upload a CSV file to invite multiple users at once
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="btn-secondary-min"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={importing || parsedUsers.length === 0}
              className="btn-primary-min flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-5 h-5" />
              {importing ? 'Importing...' : `Import ${parsedUsers.length} Users`}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Upload Section */}
          <div className="p-6 card-min">
            <h2 className="text-lg font-semibold mb-4">Upload CSV File</h2>

            <div className="border-2 border-dashed rounded-lg p-8 text-center border-app-border">
              <Upload className={`w-10 h-10 mx-auto mb-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <p className={`mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Drag and drop your CSV file here, or
              </p>
              <label className="inline-block btn-primary-min cursor-pointer">
                Browse Files
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mt-4 p-4 rounded-lg bg-app-surface2">
              <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                CSV Format:
              </p>
              <code className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                name,email,role<br />
                John Doe,john@company.com,learner<br />
                Jane Smith,jane@company.com,team_lead
              </code>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}
          </div>

          {/* Preview */}
          {parsedUsers.length > 0 && (
            <div className="p-6 card-min">
              <h2 className="text-lg font-semibold mb-4">Preview ({parsedUsers.length} users)</h2>

              <div className="rounded-lg border border-app-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-app-surface2">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
                        Email
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
                        Role
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedUsers.slice(0, 10).map((user, index) => (
                      <tr key={index} className="border-t border-app-border">
                        <td className="px-4 py-2">{user.name}</td>
                        <td className="px-4 py-2">{user.email}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${ROLE_COLORS[user.role || 'learner']}`}>
                            {ROLE_LABELS[user.role || 'learner']}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedUsers.length > 10 && (
                  <p className="p-3 text-center text-sm text-app-muted bg-app-surface2">
                    ... and {parsedUsers.length - 10} more users
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function
function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    super_admin: 'Full platform access',
    org_admin: 'Manage all org settings and users',
    ld_manager: 'Create courses, assign training',
    team_lead: 'Manage team, view team reports',
    instructor: 'Create content, grade assignments',
    learner: 'Complete assigned training'
  };
  return descriptions[role];
}

export default function UserManagementWithErrorBoundary(props: React.ComponentProps<typeof UserManagement>) {
  return (
    <ErrorBoundary title="UserManagement">
      <UserManagement {...props} />
    </ErrorBoundary>
  );
}
