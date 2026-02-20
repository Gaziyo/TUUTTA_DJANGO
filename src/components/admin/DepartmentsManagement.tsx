import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';
import { Department } from '../../types/lms';
import AdminPageHeader from './AdminPageHeader';
import AdminSection from './AdminSection';
import AdminToolbar from './AdminToolbar';

interface DepartmentsManagementProps {
  isDarkMode?: boolean;
}

export const DepartmentsManagement: React.FC<DepartmentsManagementProps> = ({ isDarkMode = false }) => {
  const {
    currentOrg,
    departments,
    loadDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  } = useLMSStore();
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const themeDark = isDarkMode || (settings?.theme ?? 'light') === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    if (currentOrg?.id) {
      loadDepartments();
    }
  }, [currentOrg?.id, loadDepartments]);

  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const query = searchQuery.toLowerCase();
    return departments.filter((dept) =>
      dept.name.toLowerCase().includes(query) ||
      (dept.description || '').toLowerCase().includes(query)
    );
  }, [departments, searchQuery]);

  const openCreate = () => {
    setEditingDepartment(null);
    setForm({ name: '', description: '' });
    setShowModal(true);
  };

  const openEdit = (dept: Department) => {
    setEditingDepartment(dept);
    setForm({ name: dept.name, description: dept.description || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      if (editingDepartment) {
        await updateDepartment(editingDepartment.id, {
          name: form.name.trim(),
          description: form.description.trim(),
        });
      } else {
        await createDepartment(form.name.trim(), form.description.trim() || undefined);
      }
      setShowModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (deptId: string) => {
    await deleteDepartment(deptId);
  };

  return (
    <div className={`h-full flex flex-col ${themeDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <AdminPageHeader
        title="Departments"
        subtitle="Organize your organization structure."
        isDarkMode={themeDark}
        badge="People"
        actions={(
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            New department
          </button>
        )}
      />

      <div className={`p-6 border-b ${themeDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <AdminSection title="Filters" isDarkMode={themeDark} minHeight="72px">
          <AdminToolbar
            isDarkMode={themeDark}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search departments"
          />
        </AdminSection>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <AdminSection title="Departments" isDarkMode={themeDark} minHeight="240px">
          {filteredDepartments.length === 0 ? (
            <div className={`rounded-xl p-8 text-center border ${
              themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
            }`}>
              <Building2 className="w-8 h-8 mx-auto mb-2 text-indigo-500" />
              <p className="text-lg font-medium">No departments yet</p>
              <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Create your first department to organize teams.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDepartments.map((dept) => (
                <div
                  key={dept.id}
                  className={`rounded-xl border p-4 ${
                    themeDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{dept.name}</h3>
                      <p className={`text-sm ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {dept.description || 'No description'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(dept)}
                        className={`p-2 rounded-lg ${themeDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(dept.id)}
                        className={`p-2 rounded-lg ${themeDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminSection>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className={`w-full max-w-lg rounded-xl p-6 ${themeDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingDepartment ? 'Edit department' : 'Create department'}</h2>
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
                  Department name
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
    </div>
  );
};

export default DepartmentsManagement;
