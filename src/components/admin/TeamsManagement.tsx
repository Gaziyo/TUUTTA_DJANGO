import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Award,
  TrendingUp,
  Crown,
  X,
  Plus,
  Save,
} from 'lucide-react';

interface TeamMember {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  role: 'leader' | 'member';
  joinedAt: Date;
  coursesCompleted: number;
  averageScore: number;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  managerId: string;
  managerName: string;
  members: TeamMember[];
  assignedCourses: string[];
  createdAt: Date;
  stats: {
    totalMembers: number;
    averageProgress: number;
    averageScore: number;
    coursesCompleted: number;
  };
}

interface CourseOption {
  id: string;
  title: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface TeamsManagementProps {
  teams: Team[];
  courses: CourseOption[];
  availableUsers: UserOption[];
  onCreateTeam: (team: Omit<Team, 'id' | 'createdAt' | 'stats'>) => Promise<void>;
  onUpdateTeam: (teamId: string, updates: Partial<Team>) => Promise<void>;
  onDeleteTeam: (teamId: string) => Promise<void>;
  onAddMember: (teamId: string, userId: string, role: 'leader' | 'member') => Promise<void>;
  onRemoveMember: (teamId: string, userId: string) => Promise<void>;
  onAssignCourse: (teamId: string, courseId: string) => Promise<void>;
  onUnassignCourse: (teamId: string, courseId: string) => Promise<void>;
  isDarkMode?: boolean;
}

export const TeamsManagement: React.FC<TeamsManagementProps> = ({
  teams,
  courses,
  availableUsers,
  onCreateTeam,
  onUpdateTeam: _onUpdateTeam,
  onDeleteTeam,
  onAddMember,
  onRemoveMember,
  onAssignCourse,
  onUnassignCourse,
  isDarkMode = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTeams, setExpandedTeams] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAssignCourseModal, setShowAssignCourseModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    managerId: '',
    managerName: '',
    members: [] as TeamMember[],
    assignedCourses: [] as string[],
  });

  const filteredTeams = useMemo(() => {
    if (!searchQuery) return teams;
    const query = searchQuery.toLowerCase();
    return teams.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.managerName.toLowerCase().includes(query) ||
      t.members.some(m => m.userName.toLowerCase().includes(query))
    );
  }, [teams, searchQuery]);

  const filteredUsers = useMemo(() => {
    if (!memberSearch) return availableUsers;
    const query = memberSearch.toLowerCase();
    return availableUsers.filter(u =>
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    );
  }, [availableUsers, memberSearch]);

  const toggleTeamExpand = (teamId: string) => {
    setExpandedTeams(prev =>
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleCreateTeam = async () => {
    if (!newTeam.name) return;

    setIsSaving(true);
    try {
      await onCreateTeam(newTeam);
      setShowCreateModal(false);
      setNewTeam({
        name: '',
        description: '',
        managerId: '',
        managerName: '',
        members: [],
        assignedCourses: [],
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedTeam) return;
    await onAddMember(selectedTeam.id, userId, 'member');
    setShowAddMemberModal(false);
    setMemberSearch('');
  };

  const handleAssignCourse = async (courseId: string) => {
    if (!selectedTeam) return;
    await onAssignCourse(selectedTeam.id, courseId);
  };

  const totalStats = useMemo(() => {
    return {
      totalTeams: teams.length,
      totalMembers: teams.reduce((sum, t) => sum + t.stats.totalMembers, 0),
      avgProgress: Math.round(teams.reduce((sum, t) => sum + t.stats.averageProgress, 0) / teams.length || 0),
      avgScore: Math.round(teams.reduce((sum, t) => sum + t.stats.averageScore, 0) / teams.length || 0),
    };
  }, [teams]);

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Teams & Groups</h1>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Manage learning teams and track team progress
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Create Team
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Teams', value: totalStats.totalTeams, icon: Users, color: 'text-indigo-500' },
            { label: 'Total Members', value: totalStats.totalMembers, icon: UserPlus, color: 'text-blue-500' },
            { label: 'Avg. Progress', value: `${totalStats.avgProgress}%`, icon: TrendingUp, color: 'text-green-500' },
            { label: 'Avg. Score', value: `${totalStats.avgScore}%`, icon: Award, color: 'text-yellow-500' },
          ].map((stat, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
            >
              <div className="flex items-center gap-3">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {stat.label}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="relative max-w-md">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              isDarkMode
                ? 'bg-gray-800 border-gray-600'
                : 'bg-white border-gray-300'
            }`}
          />
        </div>
      </div>

      {/* Teams List */}
      <div className="flex-1 overflow-auto p-6">
        {filteredTeams.length === 0 ? (
          <div className={`p-12 text-center rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <Users className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <h3 className="text-lg font-medium mb-2">No teams found</h3>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Create a new team to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTeams.map(team => {
              const isExpanded = expandedTeams.includes(team.id);

              return (
                <div
                  key={team.id}
                  className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
                >
                  {/* Team Header */}
                  <div
                    className={`p-4 flex items-center gap-4 cursor-pointer ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    } rounded-t-lg`}
                    onClick={() => toggleTeamExpand(team.id)}
                  >
                    <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-indigo-100'}`}>
                      <Users className={`w-6 h-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold">{team.name}</h3>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {team.stats.totalMembers} members • Manager: {team.managerName}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-semibold">{team.stats.averageProgress}%</div>
                        <div className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Progress</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">{team.stats.averageScore}%</div>
                        <div className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Avg. Score</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">{team.stats.coursesCompleted}</div>
                        <div className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Completed</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTeam(team);
                        }}
                        className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTeam(team.id);
                        }}
                        className={`p-2 rounded text-red-500 ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      {/* Members Section */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Team Members</h4>
                          <button
                            onClick={() => {
                              setSelectedTeam(team);
                              setShowAddMemberModal(true);
                            }}
                            className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded ${
                              isDarkMode
                                ? 'bg-gray-700 hover:bg-gray-600'
                                : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                          >
                            <UserPlus className="w-4 h-4" />
                            Add Member
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {team.members.map(member => (
                            <div
                              key={member.id}
                              className={`p-3 rounded-lg flex items-center gap-3 ${
                                isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                              }`}
                            >
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
                                {member.userAvatar ? (
                                  <img src={member.userAvatar} alt={member.userName} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  member.userName.charAt(0)
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">{member.userName}</span>
                                  {member.role === 'leader' && (
                                    <Crown className="w-4 h-4 text-yellow-500" />
                                  )}
                                </div>
                                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {member.coursesCompleted} courses • {member.averageScore}% avg
                                </div>
                              </div>
                              <button
                                onClick={() => onRemoveMember(team.id, member.userId)}
                                className={`p-1 rounded text-red-500 ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Assigned Courses Section */}
                      <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Assigned Courses</h4>
                          <button
                            onClick={() => {
                              setSelectedTeam(team);
                              setShowAssignCourseModal(true);
                            }}
                            className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded ${
                              isDarkMode
                                ? 'bg-gray-700 hover:bg-gray-600'
                                : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                          >
                            <BookOpen className="w-4 h-4" />
                            Assign Course
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {team.assignedCourses.length === 0 ? (
                            <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                              No courses assigned
                            </p>
                          ) : (
                            team.assignedCourses.map(courseId => {
                              const course = courses.find(c => c.id === courseId);
                              return (
                                <div
                                  key={courseId}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                                    isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                                  }`}
                                >
                                  <BookOpen className="w-4 h-4" />
                                  {course?.title || courseId}
                                  <button
                                    onClick={() => onUnassignCourse(team.id, courseId)}
                                    className="hover:text-red-500"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-lg rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <h2 className="text-lg font-semibold mb-4">Create New Team</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Team Name *</label>
                <input
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                  placeholder="e.g., Engineering Team"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Team Manager</label>
                <select
                  value={newTeam.managerId}
                  onChange={(e) => {
                    const user = availableUsers.find(u => u.id === e.target.value);
                    setNewTeam({
                      ...newTeam,
                      managerId: e.target.value,
                      managerName: user?.name || '',
                    });
                  }}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="">Select manager</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={!newTeam.name || isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && selectedTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add Team Member</h2>
              <button onClick={() => setShowAddMemberModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600'
                      : 'bg-white border-gray-300'
                  }`}
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredUsers
                .filter(u => !selectedTeam.members.some(m => m.userId === u.id))
                .map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleAddMember(user.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        user.name.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{user.name}</div>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {user.email}
                      </div>
                    </div>
                    <Plus className="w-5 h-5 text-indigo-500" />
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Assign Course Modal */}
      {showAssignCourseModal && selectedTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Assign Course</h2>
              <button onClick={() => setShowAssignCourseModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {courses
                .filter(c => !selectedTeam.assignedCourses.includes(c.id))
                .map(course => (
                  <button
                    key={course.id}
                    onClick={() => {
                      handleAssignCourse(course.id);
                      setShowAssignCourseModal(false);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <BookOpen className="w-5 h-5 text-indigo-500" />
                    <span className="flex-1 text-left">{course.title}</span>
                    <Plus className="w-5 h-5 text-indigo-500" />
                  </button>
                ))}
              {courses.filter(c => !selectedTeam.assignedCourses.includes(c.id)).length === 0 && (
                <p className={`text-center py-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  All courses have been assigned
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
