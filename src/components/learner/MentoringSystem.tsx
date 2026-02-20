import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  MessageSquare,
  Calendar,
  Star,
  Award,
  Video,
  MapPin,
  Send
} from 'lucide-react';

interface Mentor {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  title: string;
  department?: string;
  expertise: string[];
  bio?: string;
  rating: number;
  reviewCount: number;
  menteeCount: number;
  maxMentees: number;
  availability: 'available' | 'limited' | 'unavailable';
  sessionTypes: ('video' | 'chat' | 'in_person')[];
  languages: string[];
  yearsExperience: number;
  completedSessions: number;
}

interface MentorshipRequest {
  id: string;
  mentorId: string;
  menteeId: string;
  menteeName: string;
  menteeAvatar?: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  goals: string[];
  message?: string;
  createdAt: Date;
  respondedAt?: Date;
}

interface MentorSession {
  id: string;
  mentorId: string;
  mentorName: string;
  menteeId: string;
  menteeName: string;
  type: 'video' | 'chat' | 'in_person';
  scheduledAt: Date;
  duration: number; // minutes
  topic: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  feedback?: {
    rating: number;
    comment: string;
  };
}

interface MentoringSystemProps {
  currentUserId: string;
  userRole: 'mentee' | 'mentor' | 'both';
  mentors: Mentor[];
  myMentor?: Mentor;
  myMentees?: { id: string; name: string; avatar?: string; goals: string[] }[];
  pendingRequests: MentorshipRequest[];
  upcomingSessions: MentorSession[];
  pastSessions: MentorSession[];
  onRequestMentor: (mentorId: string, goals: string[], message?: string) => Promise<void>;
  onRespondToRequest: (requestId: string, accept: boolean) => Promise<void>;
  onScheduleSession: (mentorId: string, session: { type: string; scheduledAt: Date; duration: number; topic: string }) => Promise<void>;
  onCancelSession: (sessionId: string) => Promise<void>;
  onSubmitFeedback: (sessionId: string, rating: number, comment: string) => Promise<void>;
  isDarkMode?: boolean;
}

type Tab = 'find' | 'my_mentor' | 'my_mentees' | 'sessions' | 'requests';

export const MentoringSystem: React.FC<MentoringSystemProps> = ({
  currentUserId: _currentUserId,
  userRole,
  mentors,
  myMentor,
  myMentees,
  pendingRequests,
  upcomingSessions,
  pastSessions,
  onRequestMentor,
  onRespondToRequest,
  onScheduleSession: _onScheduleSession,
  onCancelSession,
  onSubmitFeedback: _onSubmitFeedback,
  isDarkMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>(myMentor ? 'my_mentor' : 'find');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [_showScheduleModal, _setShowScheduleModal] = useState(false);
  const [_showFeedbackModal, _setShowFeedbackModal] = useState<string | null>(null);
  const [requestGoals, setRequestGoals] = useState<string[]>(['']);
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allExpertise = useMemo(() => {
    const expertiseSet = new Set<string>();
    mentors.forEach(m => m.expertise.forEach(e => expertiseSet.add(e)));
    return Array.from(expertiseSet).sort();
  }, [mentors]);

  const filteredMentors = useMemo(() => {
    let filtered = mentors.filter(m => m.availability !== 'unavailable');

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(query) ||
        m.expertise.some(e => e.toLowerCase().includes(query)) ||
        m.title.toLowerCase().includes(query)
      );
    }

    if (selectedExpertise.length > 0) {
      filtered = filtered.filter(m =>
        selectedExpertise.some(e => m.expertise.includes(e))
      );
    }

    return filtered.sort((a, b) => b.rating - a.rating);
  }, [mentors, searchQuery, selectedExpertise]);

  const handleRequestMentor = async () => {
    if (!selectedMentor) return;
    const goals = requestGoals.filter(g => g.trim());
    if (goals.length === 0) return;

    setIsSubmitting(true);
    try {
      await onRequestMentor(selectedMentor.id, goals, requestMessage || undefined);
      setShowRequestModal(false);
      setSelectedMentor(null);
      setRequestGoals(['']);
      setRequestMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : isDarkMode ? 'text-gray-600' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getAvailabilityColor = (availability: Mentor['availability']) => {
    switch (availability) {
      case 'available': return 'bg-green-500';
      case 'limited': return 'bg-yellow-500';
      case 'unavailable': return 'bg-red-500';
    }
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'in_person': return MapPin;
      default: return MessageSquare;
    }
  };

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: 'find', label: 'Find a Mentor', show: userRole !== 'mentor' },
    { id: 'my_mentor', label: 'My Mentor', show: !!myMentor },
    { id: 'my_mentees', label: 'My Mentees', show: userRole === 'mentor' || userRole === 'both' },
    { id: 'sessions', label: 'Sessions', show: true },
    { id: 'requests', label: `Requests (${pendingRequests.length})`, show: pendingRequests.length > 0 },
  ];

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h1 className="text-2xl font-bold mb-2">Mentoring</h1>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
          Connect with mentors and accelerate your learning journey
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {tabs.filter(t => t.show).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Find Mentor Tab */}
        {activeTab === 'find' && (
          <div>
            {/* Search and Filters */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <input
                  type="text"
                  placeholder="Search mentors by name or expertise..."
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

            {/* Expertise Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {allExpertise.slice(0, 10).map(expertise => (
                <button
                  key={expertise}
                  onClick={() => setSelectedExpertise(prev =>
                    prev.includes(expertise)
                      ? prev.filter(e => e !== expertise)
                      : [...prev, expertise]
                  )}
                  className={`px-3 py-1 rounded-full text-sm ${
                    selectedExpertise.includes(expertise)
                      ? 'bg-indigo-600 text-white'
                      : isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {expertise}
                </button>
              ))}
            </div>

            {/* Mentor Cards */}
            <div className="grid grid-cols-2 gap-6">
              {filteredMentors.map(mentor => (
                <div
                  key={mentor.id}
                  className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                        {mentor.avatar ? (
                          <img src={mentor.avatar} alt={mentor.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          mentor.name.charAt(0)
                        )}
                      </div>
                      <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full ${getAvailabilityColor(mentor.availability)} border-2 ${
                        isDarkMode ? 'border-gray-800' : 'border-white'
                      }`} />
                    </div>

                    <div className="flex-1">
                      <h3 className="font-semibold">{mentor.name}</h3>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {mentor.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(mentor.rating)}
                        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          ({mentor.reviewCount} reviews)
                        </span>
                      </div>
                    </div>
                  </div>

                  {mentor.bio && (
                    <p className={`mt-4 text-sm line-clamp-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {mentor.bio}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4">
                    {mentor.expertise.slice(0, 4).map(exp => (
                      <span
                        key={exp}
                        className={`px-2 py-1 text-xs rounded ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}
                      >
                        {exp}
                      </span>
                    ))}
                    {mentor.expertise.length > 4 && (
                      <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        +{mentor.expertise.length - 4} more
                      </span>
                    )}
                  </div>

                  <div className={`flex items-center gap-4 mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {mentor.menteeCount}/{mentor.maxMentees} mentees
                    </span>
                    <span className="flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      {mentor.yearsExperience} yrs exp
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    {mentor.sessionTypes.map(type => {
                      const Icon = getSessionTypeIcon(type);
                      return (
                        <span
                          key={type}
                          className={`p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                          title={type}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedMentor(mentor);
                      setShowRequestModal(true);
                    }}
                    disabled={mentor.menteeCount >= mentor.maxMentees}
                    className={`w-full mt-4 py-2 rounded-lg ${
                      mentor.menteeCount >= mentor.maxMentees
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {mentor.menteeCount >= mentor.maxMentees ? 'Fully Booked' : 'Request Mentorship'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Mentor Tab */}
        {activeTab === 'my_mentor' && myMentor && (
          <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                {myMentor.avatar ? (
                  <img src={myMentor.avatar} alt={myMentor.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  myMentor.name.charAt(0)
                )}
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-bold">{myMentor.name}</h2>
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>{myMentor.title}</p>
                {myMentor.bio && (
                  <p className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{myMentor.bio}</p>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  {myMentor.expertise.map(exp => (
                    <span
                      key={exp}
                      className={`px-3 py-1 text-sm rounded-full ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}
                    >
                      {exp}
                    </span>
                  ))}
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                  >
                    <Calendar className="w-4 h-4" />
                    Schedule Session
                  </button>
                  <button className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  }`}>
                    <MessageSquare className="w-4 h-4" />
                    Send Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Mentees Tab */}
        {activeTab === 'my_mentees' && myMentees && (
          <div className="space-y-4">
            {myMentees.map(mentee => (
              <div
                key={mentee.id}
                className={`p-4 rounded-lg flex items-center gap-4 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
                  {mentee.avatar ? (
                    <img src={mentee.avatar} alt={mentee.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    mentee.name.charAt(0)
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{mentee.name}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {mentee.goals.map((goal, i) => (
                      <span key={i} className={`text-xs px-2 py-0.5 rounded ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        {goal}
                      </span>
                    ))}
                  </div>
                </div>
                <button className={`px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                }`}>
                  View Profile
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-4">Upcoming Sessions</h3>
              {upcomingSessions.length === 0 ? (
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No upcoming sessions</p>
              ) : (
                <div className="space-y-3">
                  {upcomingSessions.map(session => {
                    const TypeIcon = getSessionTypeIcon(session.type);
                    return (
                      <div
                        key={session.id}
                        className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                              <TypeIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-medium">{session.topic}</h4>
                              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                with {session.mentorName}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatDate(session.scheduledAt)}</div>
                            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {session.duration} minutes
                            </div>
                          </div>
                          <button
                            onClick={() => onCancelSession(session.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-4">Past Sessions</h3>
              {pastSessions.length === 0 ? (
                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No past sessions</p>
              ) : (
                <div className="space-y-3">
                  {pastSessions.map(session => (
                    <div
                      key={session.id}
                      className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{session.topic}</h4>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {formatDate(session.scheduledAt)} with {session.mentorName}
                          </p>
                        </div>
                        {session.feedback ? (
                          <div className="flex items-center gap-2">
                            {renderStars(session.feedback.rating)}
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowFeedbackModal(session.id)}
                            className="text-indigo-500 hover:text-indigo-600"
                          >
                            Leave Feedback
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {pendingRequests.map(request => (
              <div
                key={request.id}
                className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
                    {request.menteeAvatar ? (
                      <img src={request.menteeAvatar} alt={request.menteeName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      request.menteeName.charAt(0)
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{request.menteeName}</h4>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Requested mentorship
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {request.goals.map((goal, i) => (
                        <span key={i} className={`text-xs px-2 py-1 rounded ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                          {goal}
                        </span>
                      ))}
                    </div>
                    {request.message && (
                      <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        "{request.message}"
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onRespondToRequest(request.id, true)}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => onRespondToRequest(request.id, false)}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Mentorship Modal */}
      {showRequestModal && selectedMentor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-lg rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <h2 className="text-lg font-semibold mb-4">Request Mentorship from {selectedMentor.name}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Your Learning Goals *</label>
                {requestGoals.map((goal, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={goal}
                      onChange={(e) => {
                        const newGoals = [...requestGoals];
                        newGoals[index] = e.target.value;
                        setRequestGoals(newGoals);
                      }}
                      className={`flex-1 px-3 py-2 rounded-lg border ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                      placeholder="e.g., Learn React best practices"
                    />
                    {index === requestGoals.length - 1 && (
                      <button
                        onClick={() => setRequestGoals([...requestGoals, ''])}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg"
                      >
                        +
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Message (optional)</label>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                  rows={3}
                  placeholder="Introduce yourself and explain why you'd like this mentor..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setSelectedMentor(null);
                }}
                className={`px-4 py-2 rounded-lg ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleRequestMentor}
                disabled={requestGoals.filter(g => g.trim()).length === 0 || isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
