import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type WorkspaceContext = 'personal' | 'org' | 'master';

interface WorkspaceState {
  activeContext: WorkspaceContext;
  activeOrgSlug: string | null;
  lastResolvedRoute: string | null;
  setWorkspace: (context: WorkspaceContext, orgSlug?: string | null) => void;
  setLastResolvedRoute: (route: string | null) => void;
  resetWorkspace: () => void;
}

export function parseWorkspaceFromPath(pathname: string): {
  activeContext: WorkspaceContext;
  activeOrgSlug: string | null;
} | null {
  if (!pathname) return null;

  const masterMatch = pathname.match(/^\/master(?:\/|$)/);
  if (masterMatch) {
    return { activeContext: 'master', activeOrgSlug: null };
  }

  const orgMatch = pathname.match(/^\/org\/([^/]+)(?:\/|$)/);
  if (orgMatch) {
    return { activeContext: 'org', activeOrgSlug: orgMatch[1] || null };
  }

  const meMatch = pathname.match(/^\/me(?:\/|$)/);
  if (meMatch) {
    return { activeContext: 'personal', activeOrgSlug: null };
  }

  return null;
}

const INITIAL_STATE: Pick<WorkspaceState, 'activeContext' | 'activeOrgSlug' | 'lastResolvedRoute'> = {
  activeContext: 'personal',
  activeOrgSlug: null,
  lastResolvedRoute: null,
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      setWorkspace: (context, orgSlug = null) =>
        set({
          activeContext: context,
          activeOrgSlug: context === 'org' ? orgSlug : null,
        }),
      setLastResolvedRoute: (route) => set({ lastResolvedRoute: route }),
      resetWorkspace: () => set(INITIAL_STATE),
    }),
    {
      name: 'tuutta-workspace-context-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeContext: state.activeContext,
        activeOrgSlug: state.activeOrgSlug,
        lastResolvedRoute: state.lastResolvedRoute,
      }),
    }
  )
);
