import React, { useState } from 'react';
import { Book, Plus, Pencil, Check, X, Trash2, Search, Filter, Folder } from 'lucide-react';
import { useStore } from '../store';
import { Note } from '../types';
import NoteEditor from './NoteEditor';
import FolderManager from './FolderManager';

interface NoteInput {
  id: string;
  subject: string;
  content: string;
  folderId: string | null;
}

interface EditingNote extends Note {
  newContent: string;
  newSubject: string;
  folderId: string | null;
}

interface FilterOptions {
  search: string;
  sortBy: 'newest' | 'oldest' | 'subject';
  folderId: string | null;
}

const NotePanel = () => {
  const [noteInputs, setNoteInputs] = useState<NoteInput[]>([
    { id: Date.now().toString(), subject: '', content: '', folderId: null }
  ]);
  const [editingNote, setEditingNote] = useState<EditingNote | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    search: '',
    sortBy: 'newest',
    folderId: null
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showFolders, setShowFolders] = useState(false);
  
  const { 
    getNotes,
    getSubjects,
    getFolders,
    addNote, 
    updateNote, 
    deleteNote,
    addSubject,
  } = useStore();

  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = (settings?.theme ?? 'light') === 'dark';
  const notes = getNotes();
  const subjects = getSubjects();
  const folders = getFolders();

  const getFolderName = (folderId: string | null) => {
    if (!folderId) return 'Root (No Folder)';
    const folder = folders.find(f => f.id === folderId);
    return folder ? folder.name : 'Root (No Folder)';
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = filterOptions.search 
      ? note.content.toLowerCase().includes(filterOptions.search.toLowerCase()) ||
        note.subject.toLowerCase().includes(filterOptions.search.toLowerCase())
      : true;

    const matchesFolder = filterOptions.folderId === null || note.folderId === filterOptions.folderId;

    return matchesSearch && matchesFolder;
  }).sort((a, b) => {
    switch (filterOptions.sortBy) {
      case 'newest':
        return b.timestamp - a.timestamp;
      case 'oldest':
        return a.timestamp - b.timestamp;
      case 'subject':
        return a.subject.localeCompare(b.subject);
      default:
        return 0;
    }
  });

  const addNoteInput = () => {
    setNoteInputs([
      ...noteInputs,
      { id: Date.now().toString(), subject: '', content: '', folderId: filterOptions.folderId }
    ]);
  };

  const removeNoteInput = (id: string) => {
    if (noteInputs.length === 1) return;
    setNoteInputs(noteInputs.filter(input => input.id !== id));
  };

  const updateNoteInput = (id: string, field: keyof NoteInput, value: string | null) => {
    setNoteInputs(noteInputs.map(input => 
      input.id === id ? { ...input, [field]: value } : input
    ));
  };

  const handleSaveAll = () => {
    const validNotes = noteInputs.filter(input => 
      input.subject.trim() && input.content.trim()
    );

    if (validNotes.length === 0) return;

    validNotes.forEach(input => {
      if (!subjects.includes(input.subject)) {
        addSubject(input.subject);
      }
      
      addNote({
        id: Date.now().toString(),
        content: input.content,
        subject: input.subject,
        timestamp: Date.now(),
        folderId: input.folderId
      });
    });

    setNoteInputs([{ 
      id: Date.now().toString(), 
      subject: '', 
      content: '', 
      folderId: filterOptions.folderId 
    }]);
  };

  const startEditing = (note: Note) => {
    setEditingNote({
      ...note,
      newContent: note.content,
      newSubject: note.subject,
      folderId: note.folderId
    });
  };

  const cancelEditing = () => {
    setEditingNote(null);
  };

  const saveEdit = () => {
    if (!editingNote || !editingNote.newContent.trim() || !editingNote.newSubject.trim()) return;
    
    if (!subjects.includes(editingNote.newSubject)) {
      addSubject(editingNote.newSubject);
    }
    
    const updatedNote = {
      id: editingNote.id,
      content: editingNote.newContent,
      subject: editingNote.newSubject,
      timestamp: editingNote.timestamp,
      folderId: editingNote.folderId
    };
    
    updateNote(updatedNote);
    setEditingNote(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      deleteNote(id);
    }
  };

  return (
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md`} data-tour="notes-panel">
      <div className={`p-5 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Book className={`h-6 w-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Study Notes</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFolders(!showFolders)}
              className={`p-2 rounded-lg transition-colors ${
                showFolders 
                  ? isDarkMode
                    ? 'bg-indigo-900 text-indigo-400'
                    : 'bg-indigo-100 text-indigo-600'
                  : isDarkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Toggle folders"
            >
              <Folder className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters 
                  ? isDarkMode
                    ? 'bg-indigo-900 text-indigo-400'
                    : 'bg-indigo-100 text-indigo-600'
                  : isDarkMode
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Toggle filters"
            >
              <Filter className="h-5 w-5" />
            </button>
            <button
              onClick={addNoteInput}
              className={`p-2 ${
                isDarkMode
                  ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              } rounded-lg transition-colors shadow-sm`}
              title="Add note"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {showFolders && (
        <div className={`p-5 ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <FolderManager
            selectedFolderId={filterOptions.folderId}
            onSelectFolder={(folderId) => setFilterOptions(prev => ({ ...prev, folderId }))}
          />
        </div>
      )}

      {showFilters && (
        <div className={`p-5 ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className={`h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
              <input
                type="text"
                value={filterOptions.search}
                onChange={(e) => setFilterOptions(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search notes..."
                className={`w-full ${
                  isDarkMode
                    ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600'
                    : 'bg-white text-gray-900 placeholder-gray-500 border-gray-300'
                } rounded-lg pl-10 pr-4 py-2 border focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm`}
              />
            </div>
            <select
              value={filterOptions.sortBy}
              onChange={(e) => setFilterOptions(prev => ({ 
                ...prev, 
                sortBy: e.target.value as FilterOptions['sortBy']
              }))}
              className={`${
                isDarkMode
                  ? 'bg-gray-700 text-white border-gray-600'
                  : 'bg-white text-gray-900 border-gray-300'
              } rounded-lg px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm`}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="subject">By Subject</option>
            </select>
          </div>
        </div>
      )}

      <div className="p-5 space-y-5">
        {noteInputs.map((input, index) => (
          <div key={input.id} className={`border rounded-xl p-5 ${
            isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
          } shadow-sm hover-card`}>
            <div className="flex justify-between items-center mb-3">
              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                Note {index + 1}
              </span>
              {noteInputs.length > 1 && (
                <button
                  onClick={() => removeNoteInput(input.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    isDarkMode
                      ? 'text-red-400 hover:bg-gray-700'
                      : 'text-red-600 hover:bg-red-100'
                  }`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="text"
                value={input.subject}
                onChange={(e) => updateNoteInput(input.id, 'subject', e.target.value)}
                placeholder="Enter subject name..."
                className={`w-full rounded-lg ${
                  isDarkMode
                    ? 'bg-gray-700 text-white placeholder-gray-400 border-gray-600'
                    : 'bg-white text-gray-900 placeholder-gray-500 border-gray-300'
                } border p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm`}
                list="subjects"
              />
              <select
                value={input.folderId || ''}
                onChange={(e) => updateNoteInput(input.id, 'folderId', e.target.value || null)}
                className={`w-full rounded-lg ${
                  isDarkMode
                    ? 'bg-gray-700 text-white border-gray-600'
                    : 'bg-white text-gray-900 border-gray-300'
                } border p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm`}
              >
                <option value="">Root (No Folder)</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
            <datalist id="subjects">
              {subjects.map((subject) => (
                <option key={subject} value={subject} />
              ))}
            </datalist>
            <NoteEditor
              content={input.content}
              onChange={(content) => updateNoteInput(input.id, 'content', content)}
              isDarkMode={isDarkMode}
            />
          </div>
        ))}

        <button
          onClick={handleSaveAll}
          disabled={!noteInputs.some(input => input.subject.trim() && input.content.trim())}
          className={`w-full rounded-lg py-3 flex items-center justify-center space-x-2 transition-colors ${
            isDarkMode
              ? 'bg-indigo-500 text-white hover:bg-indigo-600 disabled:bg-gray-700 disabled:text-gray-500'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-400'
          } disabled:cursor-not-allowed shadow-sm font-medium`}
        >
          <Check className="h-5 w-5" />
          <span>Save All Notes</span>
        </button>

        <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} pt-5`}>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Saved Notes
              </h3>
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
              </span>
            </div>
            
            <div className="space-y-4">
              {filteredNotes.length === 0 ? (
                <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {notes.length === 0 ? 'No notes yet' : 'No notes match your filters'}
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <div 
                    key={note.id} 
                    className={`border rounded-xl p-5 ${
                      isDarkMode
                        ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/50'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    } transition-colors shadow-sm hover-card`}
                  >
                    {editingNote?.id === note.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={editingNote.newSubject}
                            onChange={(e) => setEditingNote({
                              ...editingNote,
                              newSubject: e.target.value,
                            })}
                            className={`w-full rounded-lg ${
                              isDarkMode
                                ? 'bg-gray-700 text-white border-gray-600'
                                : 'bg-white text-gray-900 border-gray-300'
                            } border p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm`}
                            placeholder="Enter subject name..."
                            list="subjects"
                          />
                          <select
                            value={editingNote.folderId || ''}
                            onChange={(e) => setEditingNote({
                              ...editingNote,
                              folderId: e.target.value || null,
                            })}
                            className={`w-full rounded-lg ${
                              isDarkMode
                                ? 'bg-gray-700 text-white border-gray-600'
                                : 'bg-white text-gray-900 border-gray-300'
                            } border p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm`}
                          >
                            <option value="">Root (No Folder)</option>
                            {folders.map(folder => (
                              <option key={folder.id} value={folder.id}>
                                {folder.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <NoteEditor
                          content={editingNote.newContent}
                          onChange={(content) => setEditingNote({
                            ...editingNote,
                            newContent: content,
                          })}
                          isDarkMode={isDarkMode}
                        />
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={cancelEditing}
                            className={`p-2 rounded-lg ${
                              isDarkMode
                                ? 'text-gray-300 hover:bg-gray-600'
                                : 'text-gray-600 hover:bg-gray-200'
                            } transition-colors`}
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            onClick={saveEdit}
                            className={`p-2 rounded-lg ${
                              isDarkMode
                                ? 'text-green-400 hover:bg-gray-600'
                                : 'text-green-600 hover:bg-green-100'
                            } transition-colors`}
                            title="Save changes"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div className="space-y-1">
                            <div className={`text-lg font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                              {note.subject}
                            </div>
                            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {getFolderName(note.folderId)}
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => startEditing(note)}
                              className={`p-2 rounded-lg ${
                                isDarkMode
                                  ? 'text-gray-400 hover:text-indigo-400 hover:bg-gray-600'
                                  : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-200'
                              } transition-colors`}
                              title="Edit note"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(note.id)}
                              className={`p-2 rounded-lg ${
                                isDarkMode
                                  ? 'text-gray-400 hover:text-red-400 hover:bg-gray-600'
                                  : 'text-gray-600 hover:text-red-600 hover:bg-red-100'
                              } transition-colors`}
                              title="Delete note"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div 
                          className={`prose ${isDarkMode ? 'prose-invert' : ''} max-w-none`}
                          dangerouslySetInnerHTML={{ __html: note.content }}
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotePanel;
