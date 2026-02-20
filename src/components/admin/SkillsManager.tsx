import React, { useState, useMemo } from 'react';
import {
  Target,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Users,
  TrendingUp,
  Save,
  X,
  BarChart2,
  Layers
} from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  description?: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  linkedCourses: string[];
  learnersWithSkill: number;
  averageProficiency: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SkillCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  skillCount: number;
}

interface CourseOption {
  id: string;
  title: string;
}

interface SkillsManagerProps {
  skills: Skill[];
  categories: SkillCategory[];
  courses: CourseOption[];
  onCreateSkill: (skill: Omit<Skill, 'id' | 'learnersWithSkill' | 'averageProficiency' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateSkill: (skillId: string, updates: Partial<Skill>) => Promise<void>;
  onDeleteSkill: (skillId: string) => Promise<void>;
  onCreateCategory: (category: Omit<SkillCategory, 'id' | 'skillCount'>) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  isDarkMode?: boolean;
}

type ViewMode = 'list' | 'matrix';

export const SkillsManager: React.FC<SkillsManagerProps> = ({
  skills,
  categories,
  courses,
  onCreateSkill,
  onUpdateSkill,
  onDeleteSkill,
  onCreateCategory,
  onDeleteCategory: _onDeleteCategory,
  isDarkMode = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newSkill, setNewSkill] = useState({
    name: '',
    description: '',
    category: '',
    level: 'beginner' as Skill['level'],
    linkedCourses: [] as string[],
  });

  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: '#6366f1',
  });

  const filteredSkills = useMemo(() => {
    let filtered = [...skills];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        skill =>
          skill.name.toLowerCase().includes(query) ||
          skill.description?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(skill => skill.category === selectedCategory);
    }

    return filtered;
  }, [skills, searchQuery, selectedCategory]);

  const skillsByCategory = useMemo(() => {
    const grouped: Record<string, Skill[]> = {};
    categories.forEach(cat => {
      grouped[cat.id] = filteredSkills.filter(s => s.category === cat.id);
    });
    return grouped;
  }, [filteredSkills, categories]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleCreateSkill = async () => {
    if (!newSkill.name || !newSkill.category) return;

    setIsSaving(true);
    try {
      await onCreateSkill(newSkill);
      setNewSkill({
        name: '',
        description: '',
        category: '',
        level: 'beginner',
        linkedCourses: [],
      });
      setIsCreating(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateSkill = async () => {
    if (!editingSkill) return;

    setIsSaving(true);
    try {
      await onUpdateSkill(editingSkill.id, editingSkill);
      setEditingSkill(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name) return;

    setIsSaving(true);
    try {
      await onCreateCategory(newCategory);
      setNewCategory({ name: '', description: '', color: '#6366f1' });
      setIsCreatingCategory(false);
    } finally {
      setIsSaving(false);
    }
  };

  const getLevelColor = (level: Skill['level']) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-700';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'advanced': return 'bg-orange-100 text-orange-700';
      case 'expert': return 'bg-red-100 text-red-700';
    }
  };

  const _getLevelValue = (level: Skill['level']) => {
    switch (level) {
      case 'beginner': return 25;
      case 'intermediate': return 50;
      case 'advanced': return 75;
      case 'expert': return 100;
    }
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Skills & Competencies</h1>
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Manage skills taxonomy and course mappings
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsCreatingCategory(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                isDarkMode
                  ? 'bg-gray-800 hover:bg-gray-700'
                  : 'bg-white hover:bg-gray-50 border border-gray-300'
              }`}
            >
              <Layers className="w-4 h-4" />
              Add Category
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Add Skill
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Skills', value: skills.length, icon: Target, color: 'text-indigo-500' },
            { label: 'Categories', value: categories.length, icon: Layers, color: 'text-blue-500' },
            { label: 'Linked Courses', value: new Set(skills.flatMap(s => s.linkedCourses)).size, icon: BookOpen, color: 'text-green-500' },
            { label: 'Avg. Proficiency', value: `${Math.round(skills.reduce((sum, s) => sum + s.averageProficiency, 0) / skills.length || 0)}%`, icon: TrendingUp, color: 'text-purple-500' },
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

      {/* Toolbar */}
      <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-white border-gray-300'
              }`}
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              isDarkMode
                ? 'bg-gray-800 border-gray-600'
                : 'bg-white border-gray-300'
            }`}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <div className={`flex rounded-lg border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white'
                  : isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              } rounded-l-lg`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-2 ${
                viewMode === 'matrix'
                  ? 'bg-indigo-600 text-white'
                  : isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              } rounded-r-lg`}
            >
              Matrix
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {viewMode === 'list' ? (
          <div className="space-y-4">
            {categories.map(category => {
              const categorySkills = skillsByCategory[category.id] || [];
              const isExpanded = expandedCategories.includes(category.id);

              return (
                <div
                  key={category.id}
                  className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
                >
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className={`w-full p-4 flex items-center justify-between ${
                      isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    } rounded-lg`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium">{category.name}</span>
                      <span className={`text-sm px-2 py-0.5 rounded-full ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        {categorySkills.length} skills
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className={`px-4 pb-4 space-y-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      {categorySkills.length === 0 ? (
                        <p className={`py-4 text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          No skills in this category
                        </p>
                      ) : (
                        categorySkills.map(skill => (
                          <div
                            key={skill.id}
                            className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium">{skill.name}</h4>
                                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${getLevelColor(skill.level)}`}>
                                    {skill.level}
                                  </span>
                                </div>
                                {skill.description && (
                                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {skill.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-sm">
                                  <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <BookOpen className="w-4 h-4" />
                                    {skill.linkedCourses.length} courses
                                  </span>
                                  <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <Users className="w-4 h-4" />
                                    {skill.learnersWithSkill} learners
                                  </span>
                                  <span className={`flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <BarChart2 className="w-4 h-4" />
                                    {skill.averageProficiency}% avg. proficiency
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingSkill(skill)}
                                  className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onDeleteSkill(skill.id)}
                                  className={`p-2 rounded text-red-500 ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Matrix View */
          <div className={`rounded-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                    <th className="px-4 py-3 text-left font-medium">Skill</th>
                    <th className="px-4 py-3 text-left font-medium">Category</th>
                    <th className="px-4 py-3 text-left font-medium">Level</th>
                    <th className="px-4 py-3 text-left font-medium">Proficiency</th>
                    <th className="px-4 py-3 text-left font-medium">Courses</th>
                    <th className="px-4 py-3 text-left font-medium">Learners</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {filteredSkills.map(skill => {
                    const category = categories.find(c => c.id === skill.category);
                    return (
                      <tr key={skill.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{skill.name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded"
                              style={{ backgroundColor: category?.color }}
                            />
                            {category?.name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded capitalize ${getLevelColor(skill.level)}`}>
                            {skill.level}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-24 h-2 rounded-full ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${skill.averageProficiency}%` }}
                              />
                            </div>
                            <span className="text-sm">{skill.averageProficiency}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">{skill.linkedCourses.length}</td>
                        <td className="px-4 py-3">{skill.learnersWithSkill}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingSkill(skill)}
                              className={`p-1.5 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onDeleteSkill(skill.id)}
                              className={`p-1.5 rounded text-red-500 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Skill Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-lg rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create New Skill</h2>
              <button onClick={() => setIsCreating(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Skill Name *</label>
                <input
                  type="text"
                  value={newSkill.name}
                  onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                  placeholder="e.g., Project Management"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newSkill.description}
                  onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                  rows={3}
                  placeholder="Describe this skill..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select
                    value={newSkill.category}
                    onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Level</label>
                  <select
                    value={newSkill.level}
                    onChange={(e) => setNewSkill({ ...newSkill, level: e.target.value as Skill['level'] })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Link to Courses</label>
                <select
                  multiple
                  value={newSkill.linkedCourses}
                  onChange={(e) => setNewSkill({
                    ...newSkill,
                    linkedCourses: Array.from(e.target.selectedOptions, opt => opt.value)
                  })}
                  className={`w-full px-3 py-2 rounded-lg border h-32 ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                >
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Hold Ctrl/Cmd to select multiple courses
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsCreating(false)}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSkill}
                disabled={!newSkill.name || !newSkill.category || isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Creating...' : 'Create Skill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Skill Modal */}
      {editingSkill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-lg rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Skill</h2>
              <button onClick={() => setEditingSkill(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Skill Name *</label>
                <input
                  type="text"
                  value={editingSkill.name}
                  onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={editingSkill.description || ''}
                  onChange={(e) => setEditingSkill({ ...editingSkill, description: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={editingSkill.category}
                    onChange={(e) => setEditingSkill({ ...editingSkill, category: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Level</label>
                  <select
                    value={editingSkill.level}
                    onChange={(e) => setEditingSkill({ ...editingSkill, level: e.target.value as Skill['level'] })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Linked Courses</label>
                <select
                  multiple
                  value={editingSkill.linkedCourses}
                  onChange={(e) => setEditingSkill({
                    ...editingSkill,
                    linkedCourses: Array.from(e.target.selectedOptions, opt => opt.value)
                  })}
                  className={`w-full px-3 py-2 rounded-lg border h-32 ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                >
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingSkill(null)}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSkill}
                disabled={!editingSkill.name || isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      {isCreatingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create Category</h2>
              <button onClick={() => setIsCreatingCategory(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Category Name *</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                  placeholder="e.g., Technical Skills"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={newCategory.color}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                    className={`flex-1 px-3 py-2 rounded-lg border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsCreatingCategory(false)}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                disabled={!newCategory.name || isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
