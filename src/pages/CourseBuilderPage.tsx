// ============================================================================
// COURSE BUILDER PAGE
// Wrapper that connects CourseBuilder component with stores and navigation
// ============================================================================

import React from 'react';
import { useLMSStore } from '../store/lmsStore';
import { useAppContext } from '../context/AppContext';
import { CourseBuilder } from '../components/admin/CourseBuilder';
import { Course } from '../types/lms';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface CourseBuilderPageProps {
  isDarkMode: boolean;
  courseId?: string; // For editing existing course
}

export default function CourseBuilderPage({ isDarkMode, courseId }: CourseBuilderPageProps) {
  const { navigate } = useAppContext();
  const {
    currentOrg,
    currentMember,
    courses,
    createCourse,
    updateCourse,
    isLoading
  } = useLMSStore();

  // Find course if editing
  const existingCourse = courseId ? courses.find(c => c.id === courseId) : undefined;

  // Handle case where org/user not set up
  if (!currentOrg || !currentMember) {
    return (
      <div className={`h-full flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`max-w-md p-8 rounded-2xl text-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            isDarkMode ? 'bg-amber-900/30' : 'bg-amber-100'
          }`}>
            <AlertCircle className={`w-8 h-8 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
          </div>
          <h2 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Organization Required
          </h2>
          <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            You need to be part of an organization to create courses. Please join or create an organization first.
          </p>
          <button
            onClick={() => navigate('/join-org')}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            Join Organization
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async (courseData: Partial<Course>) => {
    if (existingCourse) {
      await updateCourse(existingCourse.id, courseData);
    } else {
      await createCourse(courseData);
    }
    // Navigate back to courses list after save
    navigate('/admin/courses');
  };

  const handleCancel = () => {
    navigate('/admin/courses');
  };

  const handlePublish = async (courseId: string) => {
    await updateCourse(courseId, { status: 'published' });
  };

  return (
    <div className={`h-full overflow-y-auto ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Back button header */}
      <div className={`sticky top-0 z-10 px-6 py-3 border-b ${
        isDarkMode ? 'bg-gray-900/95 border-gray-700' : 'bg-gray-50/95 border-gray-200'
      } backdrop-blur-sm`}>
        <button
          onClick={handleCancel}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
            isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </button>
      </div>

      {/* CourseBuilder with proper props */}
      <CourseBuilder
        course={existingCourse}
        orgId={currentOrg.id}
        userId={currentMember.id}
        onSave={handleSave}
        onPublish={handlePublish}
        onCancel={handleCancel}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}
