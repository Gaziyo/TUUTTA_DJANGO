import React, { useEffect, useMemo, useState } from 'react';
import { Users2, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import { Team, OrgMember, Department } from '../../types/lms';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import AdminToolbar from './AdminToolbar';

interface TeamsManagementPageProps {
  isDarkMode?: boolean;
}

export const TeamsManagementPage: React.FC<TeamsManagementPageProps> = ({ isDarkMode = false }) => {
  const {
    currentOrg,
    teams,
    members,
    departments,
    loadTeams,
    loadMembers,
    loadDepartments,
    createTeam,
    updateTeam,
    updateMember,
    deleteTeam,
  } = useLMSStore();
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const themeDark = isDarkMode || (settings?.theme ?? 'light') === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [membersTeam, setMembersTeam] = useState<Team | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    departmentId: '',
    leadId: '',
  });

  useEffect(() => {
    if (currentOrg?.id) {
      loadTeams();
      loadMembers();
      loadDepartments();
    }
  }, [currentOrg?.id, loadTeams, loadMembers, loadDepartments]);

  const departmentMap = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach((dept) => map.set(dept.id, dept));
    return map;
  }, [departments]);

  const memberMap = useMemo(() => {
    const map = new Map<string, OrgMember>();
    members.forEach((member) => map.set(member.id, member));
    return map;
  }, [members]);

  const availableMembers = useMemo(() => {
    if (!membersTeam) return members;
    return members.filter((member) =>
      !member.teamId || member.teamId === membersTeam.id
    );
  }, [members, membersTeam]);

  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const query = searchQuery.toLowerCase();
    return teams.filter((team) =>
      team.name.toLowerCase().includes(query) ||
      (team.description || '').toLowerCase().includes(query)
    );
  }, [teams, searchQuery]);

  const openCreate = () => {
    setEditingTeam(null);
    setForm({ name: '', description: '', departmentId: '', leadId: '' });
    setShowModal(true);
  };

  const openEdit = (team: Team) => {
    setEditingTeam(team);
    setForm({
      name: team.name,
      description: team.description || '',
      departmentId: team.departmentId || '',
      leadId: team.leadId || '',
    });
    setShowModal(true);
  };

  const openManageMembers = (team: Team) => {
    setMembersTeam(team);
    setSelectedMemberIds(team.memberIds || []);
    setShowMembersModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      if (editingTeam) {
        await updateTeam(editingTeam.id, {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          departmentId: form.departmentId || undefined,
          leadId: form.leadId || undefined,
        });
      } else {
        const created = await createTeam(form.name.trim(), form.departmentId || undefined);
        if (form.description.trim() || form.leadId) {
          await updateTeam(created.id, {
            description: form.description.trim() || undefined,
            leadId: form.leadId || undefined,
          });
        }
      }
      setShowModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (teamId: string) => {
    await deleteTeam(teamId);
  };

  const handleSaveMembers = async () => {
    if (!membersTeam) return;
    setIsSaving(true);
    try {
      const currentIds = new Set(membersTeam.memberIds || []);
      const nextIds = new Set(selectedMemberIds);
      const added = selectedMemberIds.filter((id) => !currentIds.has(id));
      const removed = (membersTeam.memberIds || []).filter((id) => !nextIds.has(id));

      await updateTeam(membersTeam.id, { memberIds: selectedMemberIds });

      for (const memberId of added) {
        await updateMember(memberId, { teamId: membersTeam.id });
      }
      for (const memberId of removed) {
        await updateMember(memberId, { teamId: undefined });
      }
      setShowMembersModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`h-full flex flex-col ${themeDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <AdminPageHeader
        title="Teams"
        subtitle="Group learners into teams and assign leaders."
        isDarkMode={themeDark}
        badge="People"
        actions={(
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            New team
          </button>
        )}
      />

      <div className={`p-6 border-b ${themeDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <AdminSection title="Filters" isDarkMode={themeDark} minHeight="72px">
          <AdminToolbar
            isDarkMode={themeDark}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search teams"
          />
        </AdminSection>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <AdminSection title="Teams" isDarkMode={themeDark} minHeight="240px">
          {filteredTeams.length === 0 ? (
            <div className={`rounded-xl p-8 text-center border ${
              themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
            }`}>
              <Users2 className="w-8 h-8 mx-auto mb-2 text-indigo-500" />
              <p className="text-lg font-medium">No teams yet</p>
              <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Create teams to organize learners.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTeams.map((team) => {
                const department = team.departmentId ? departmentMap.get(team.departmentId) : null;
                const lead = team.leadId ? memberMap.get(team.leadId) : null;
                return (
                  <div
                    key={team.id}
                    className={`rounded-xl border p-4 ${
                      themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{team.name}</h3>
                        <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {team.description || 'No description'}
                        </p>
                        <div className="mt-2 text-xs">
                          {department && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full ${
                              themeDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {department.name}
                            </span>
                          )}
                        </div>
                        <p className={`text-xs mt-2 ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Lead: {lead?.name || 'Unassigned'} • Members: {team.memberIds.length}
                        </p>
                        <button
                          onClick={() => openManageMembers(team)}
                          className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                            themeDark
                              ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Manage members
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(team)}
                          className={`p-2 rounded-lg ${themeDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(team.id)}
                          className={`p-2 rounded-lg ${themeDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AdminSection>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`w-full max-w-lg rounded-xl p-6 ${themeDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingTeam ? 'Edit team' : 'Create team'}</h2>
              <button
                onClick={() => setShowModal(false)}
                className={`p-2 rounded-lg ${themeDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${themeDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Team name
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    themeDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${themeDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    themeDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${themeDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Department
                </label>
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    themeDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="">None</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${themeDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Team lead
                </label>
                <select
                  value={form.leadId}
                  onChange={(e) => setForm({ ...form, leadId: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    themeDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className={`px-4 py-2 rounded-lg ${themeDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !form.name.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMembersModal && membersTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`w-full max-w-lg rounded-xl p-6 ${themeDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Manage members</h2>
                <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {membersTeam.name}
                </p>
              </div>
              <button
                onClick={() => setShowMembersModal(false)}
                className={`p-2 rounded-lg ${themeDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={`border rounded-lg p-3 max-h-64 overflow-auto ${
              themeDark ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-gray-50'
            }`}>
              {availableMembers.map((member) => (
                <label key={member.id} className="flex items-center gap-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(member.id)}
                    onChange={(e) => {
                      setSelectedMemberIds((prev) =>
                        e.target.checked
                          ? [...prev, member.id]
                          : prev.filter((id) => id !== member.id)
                      );
                    }}
                  />
                  <span>{member.name}</span>
                  <span className={`text-xs ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {member.email}
                  </span>
                </label>
              ))}
              {availableMembers.length === 0 && (
                <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>No available members.</p>
              )}
            </div>
            <p className={`text-xs mt-2 ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Members assigned to other teams are not shown.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowMembersModal(false)}
                className={`px-4 py-2 rounded-lg ${themeDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMembers}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamsManagementPage;
