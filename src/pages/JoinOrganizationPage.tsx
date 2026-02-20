// ============================================================================
// JOIN ORGANIZATION PAGE
// Allows users to join organizations via code or browse available ones
// ============================================================================

import React, { useState } from 'react';
import {
  Building2,
  Search,
  ArrowRight,
  Check,
  Lock,
  ChevronRight
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useLMSStore } from '../store/lmsStore';
import { useStore } from '../store';
import { organizationService } from '../services/organizationService';
import { userService } from '../services/userService';
import type { Organization } from '../types/lms';

interface JoinOrganizationPageProps {
  isDarkMode: boolean;
}

export default function JoinOrganizationPage({ isDarkMode }: JoinOrganizationPageProps) {
  const { user } = useStore();
  const { joinOrg } = useAppContext();
  const { createOrganization, isLoading, setCurrentOrg, setCurrentMember } = useLMSStore();
  const [inviteCode, setInviteCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Organization[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [joinedOrgs, setJoinedOrgs] = useState<string[]>([]);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [createOrgName, setCreateOrgName] = useState('');
  const [createOrgSlug, setCreateOrgSlug] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const filteredOrgs = searchResults.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ensureOrgMembership = async (org: Organization) => {
    if (!user?.id) {
      throw new Error('Please sign in to join an organization.');
    }

    // Firestore membership key required by rules: {orgId}_{authUid}
    const membershipId = `${org.id}_${user.id}`;
    let member = await userService.getMember(membershipId);

    if (!member) {
      member = await userService.addMember({
        odId: org.id,
        orgId: org.id,
        userId: user.id,
        email: user.email || `${user.id}@local.tuutta`,
        name: user.name || 'Learner',
        role: 'learner',
        status: 'active',
        joinedAt: Date.now()
      });
    }

    setCurrentOrg(org);
    setCurrentMember(member);
    joinOrg(org.id, org.name, member.role);
  };

  const handleJoinWithCode = async () => {
    if (!inviteCode.trim()) return;
    setIsJoining('code');
    setSearchError(null);
    try {
      const org = await organizationService.getBySlug(inviteCode.trim());
      if (!org) {
        setSearchError('No organization found for that code.');
        return;
      }
      await ensureOrgMembership(org);
      setInviteCode('');
      setShowCodeInput(false);
    } catch (error) {
      setSearchError((error as Error).message);
    } finally {
      setIsJoining(null);
    }
  };

  const handleJoinOrg = async (org: Organization) => {
    setIsJoining(org.id);
    try {
      await ensureOrgMembership(org);
      setJoinedOrgs(prev => [...prev, org.id]);
    } catch (error) {
      setSearchError((error as Error).message);
    } finally {
      setIsJoining(null);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const org = await organizationService.getBySlug(searchQuery.trim());
      setSearchResults(org ? [org] : []);
      if (!org) {
        setSearchError('No organization found with that slug.');
      }
    } catch (error) {
      setSearchError((error as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const handleCreateOrg = async () => {
    if (!createOrgName.trim()) return;
    if (!user) {
      setCreateError('Please sign in to create an organization.');
      return;
    }
    setCreateError(null);
    setCreatingOrg(true);
    try {
      const slug = createOrgSlug.trim() || createOrgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      await createOrganization(createOrgName.trim(), slug, {
        id: user?.id,
        name: user?.name,
        email: user?.email
      });
      setCreateOrgName('');
      setCreateOrgSlug('');
    } catch (error) {
      setCreateError((error as Error).message);
    } finally {
      setCreatingOrg(false);
    }
  };

  const getJoinButton = (org: Organization) => {
    if (joinedOrgs.includes(org.id)) {
      return (
        <button
          disabled
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isDarkMode ? 'bg-green-600/20 text-green-400' : 'bg-green-100 text-green-600'
          }`}
        >
          <Check className="w-4 h-4" />
          Joined
        </button>
      );
    }

    if (isJoining === org.id) {
      return (
        <button
          disabled
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isDarkMode ? 'bg-indigo-600/50' : 'bg-indigo-100'
          }`}
        >
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-current" />
          Joining...
        </button>
      );
    }

    return (
      <button
        onClick={() => { void handleJoinOrg(org); }}
        className="tuutta-button-primary text-sm px-4 py-2"
      >
        Join
        <ArrowRight className="w-4 h-4" />
      </button>
    );
  };

  return (
    <div className={`h-full overflow-y-auto ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Join an Organization
          </h1>
          <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Connect with learning communities and access exclusive courses
          </p>
        </div>

        {/* Create Organization Section */}
        <div className={`rounded-xl p-6 mb-8 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isDarkMode ? 'bg-emerald-600/20' : 'bg-emerald-100'
            }`}>
              <Building2 className={`w-6 h-6 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
            </div>
            <div className="flex-1">
              <h2 className={`text-xl font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Create an organization
              </h2>
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                You will become the organization admin and can create courses immediately.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Organization name
              </label>
              <input
                type="text"
                value={createOrgName}
                onChange={(e) => setCreateOrgName(e.target.value)}
                placeholder="Acme Learning"
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                } focus:ring-2 focus:ring-emerald-500`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Organization slug
              </label>
              <input
                type="text"
                value={createOrgSlug}
                onChange={(e) => setCreateOrgSlug(e.target.value)}
                placeholder="acme-learning"
                className={`w-full px-4 py-2 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                } focus:ring-2 focus:ring-emerald-500`}
              />
            </div>
          </div>

          {createError && (
            <p className="mt-3 text-sm text-red-500">{createError}</p>
          )}

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleCreateOrg}
              disabled={!createOrgName.trim() || creatingOrg || isLoading}
              className="tuutta-button-primary text-sm px-5 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creatingOrg || isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-current" />
                  Creating...
                </>
              ) : (
                <>
                  Create organization
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              You’ll be added as an admin automatically.
            </p>
          </div>
        </div>

        {/* Join with Code Section */}
        <div className={`rounded-xl p-6 mb-8 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isDarkMode ? 'bg-indigo-600/20' : 'bg-indigo-100'
            }`}>
              <Lock className={`w-6 h-6 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
            </div>
            <div className="flex-1">
              <h2 className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Have an Invite Code?
              </h2>
              <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Enter the code provided by your organization administrator
              </p>

              {showCodeInput ? (
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="Enter invite code (e.g., ABC123)"
                    className={`flex-1 px-4 py-2 rounded-lg border ${
                      isDarkMode
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                    } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  />
                  <button
                    onClick={() => { void handleJoinWithCode(); }}
                    disabled={!inviteCode.trim() || isJoining === 'code'}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      !inviteCode.trim() || isJoining === 'code'
                        ? isDarkMode
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {isJoining === 'code' ? 'Joining...' : 'Join'}
                  </button>
                  <button
                    onClick={() => {
                      setShowCodeInput(false);
                      setInviteCode('');
                    }}
                    className={`px-4 py-2 rounded-lg ${
                      isDarkMode
                        ? 'text-gray-400 hover:bg-gray-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCodeInput(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  }`}
                >
                  Enter Invite Code
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Browse Organizations */}
        <div className="mb-6">
          <h2 className={`text-xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Browse Organizations
          </h2>

          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by organization slug..."
                className={`w-full pl-10 pr-4 py-2.5 rounded-lg border ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className={`px-4 py-2.5 rounded-lg font-medium transition-colors ${
                isDarkMode
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              } disabled:opacity-60`}
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {searchError && (
            <div className={`mb-6 text-sm ${
              isDarkMode ? 'text-amber-400' : 'text-amber-600'
            }`}>
              {searchError}
            </div>
          )}
        </div>

        {/* Organizations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOrgs.map(org => (
            <div
              key={org.id}
              className={`rounded-xl p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}
            >
              <div className="flex items-start gap-4">
                {/* Logo */}
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <Building2 className={`w-7 h-7 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {org.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Organization slug: {org.slug}
                  </p>

                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5">
                      <Building2 className={`w-4 h-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Plan: {org.subscription}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    {getJoinButton(org)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredOrgs.length === 0 && (
          <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No organizations found</p>
            <p className="text-sm mt-1">Search by organization slug or use an invite code.</p>
          </div>
        )}
      </div>
    </div>
  );
}
