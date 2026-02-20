import React from 'react';
import { FileText, Link as LinkIcon, Video, Download } from 'lucide-react';
import { useStore } from '../../store';
import { useLMSStore } from '../../store/lmsStore';

interface CourseResourcesProps {
  courseId: string;
  isDarkMode?: boolean;
}

const CourseResources: React.FC<CourseResourcesProps> = ({ courseId, isDarkMode: isDarkModeProp }) => {
  const { user } = useStore();
  const settings = useStore(state => {
    if (!state.user) return null;
    return state.userData[state.user.id]?.settings ?? null;
  });
  const isDarkMode = isDarkModeProp ?? (settings?.theme ?? 'light') === 'dark';
  const { courses } = useLMSStore();

  const course = courses.find((c) => c.id === courseId) ?? null;

  if (!course) {
    return (
      <div className={`h-full flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <p className="text-sm">Course not found.</p>
      </div>
    );
  }

  const resources = course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      type: lesson.type,
      url: lesson.content.documentUrl || lesson.content.externalUrl || lesson.content.videoUrl,
    }))
  ).filter((resource) => Boolean(resource.url));

  return (
    <div className={`h-full overflow-auto ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Course resources</h1>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {course.title} • {resources.length} resources
          </p>
        </div>

        <div className="space-y-3">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                {resource.type === 'video' && <Video className="w-5 h-5 text-indigo-400" />}
                {resource.type === 'document' && <FileText className="w-5 h-5 text-indigo-400" />}
                {resource.type === 'external_link' && <LinkIcon className="w-5 h-5 text-indigo-400" />}
                {!['video', 'document', 'external_link'].includes(resource.type) && (
                  <FileText className="w-5 h-5 text-indigo-400" />
                )}
                <div>
                  <p className="font-medium">{resource.title}</p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {resource.type.replace('_', ' ')}
                  </p>
                </div>
              </div>
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-700"
              >
                <Download className="w-4 h-4" />
                Open
              </a>
            </div>
          ))}
          {resources.length === 0 && (
            <div className={`rounded-xl border p-6 text-center ${
              isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
            }`}>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                No resources available for this course yet.
              </p>
            </div>
          )}
        </div>

        {user && (
          <div className={`rounded-xl border p-4 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Signed in as {user.email}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseResources;
