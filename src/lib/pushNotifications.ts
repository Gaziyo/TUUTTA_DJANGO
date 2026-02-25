/**
 * Push Notifications
 *
 * Firebase FCM push token management removed.
 * Stubbed: no Django /notifications/push-tokens/ endpoint exists yet.
 */

export async function registerPushToken(
  _orgId: string,
  _userId: string,
  _token: string
): Promise<void> {}

export async function unregisterPushToken(
  _orgId: string,
  _userId: string,
  _token: string
): Promise<void> {}

export async function getUserPushTokens(
  _orgId: string,
  _userId: string
): Promise<string[]> {
  return [];
}
