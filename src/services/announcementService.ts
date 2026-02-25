/**
 * Announcement Service
 *
 * Cognitive OS — Notifications layer.
 * Stubbed: no Django /notifications/announcements/ endpoint exists yet.
 * When the endpoint is added, delegate to /organizations/{orgId}/announcements/.
 */

import type { Announcement } from '../types/lms';

export const announcementService = {
  /**
   * List all announcements for an organization.
   * Stubbed until a Django announcements endpoint is available.
   */
  list: async (_orgId: string): Promise<Announcement[]> => {
    return [];
  },

  /**
   * Create a new announcement.
   * Stubbed — returns an empty string ID until endpoint exists.
   */
  create: async (
    _announcement: Omit<Announcement, 'id' | 'viewCount' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    return '';
  },

  /**
   * Update an existing announcement.
   */
  update: async (_announcementId: string, _updates: Partial<Announcement>): Promise<void> => {},

  /**
   * Delete an announcement.
   */
  remove: async (_announcementId: string): Promise<void> => {},

  /**
   * Publish an announcement (set status to 'published').
   */
  publish: async (_announcementId: string): Promise<void> => {},
};
