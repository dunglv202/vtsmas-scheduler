/**
 * Normalizes session numbers from API format to consistent values.
 * API uses section field: 0 = Morning; 1 = Afternoon; 2 = Evening
 * Normalized: 0 = Morning; 1 = Afternoon; 2 = Evening
 * 
 * @param sessionNumber - Session number from API (0, 1, or 2)
 * @returns Normalized session number (0, 1, or 2)
 */
export function normalizeSession(sessionNumber: number): number {
  // API section mapping: 0 = Morning; 1 = Afternoon; 2 = Evening
  // Return as is since they're already normalized
  return sessionNumber;
}

/**
 * Compares two time slots to determine if the first slot is before the second slot.
 * 
 * @param date1 - Date of the first slot
 * @param session1 - Session number of the first slot (0=Morning, 1=Afternoon, 2=Evening)
 * @param periodInSession1 - Period number within the session (1-5) for the first slot
 * @param date2 - Date of the second slot
 * @param session2 - Session number of the second slot (0=Morning, 1=Afternoon, 2=Evening)
 * @param periodInSession2 - Period number within the session (1-5) for the second slot
 * @returns true if slot1 is before slot2 (not equal), false otherwise
 */
export function isSlotBefore(
  date1: Date | string,
  session1: number,
  periodInSession1: number,
  date2: Date | string,
  session2: number,
  periodInSession2: number
): boolean {
  // Convert dates to Date objects if they're strings
  const d1 = typeof date1 === "string" ? new Date(date1) : date1;
  const d2 = typeof date2 === "string" ? new Date(date2) : date2;

  // Compare dates (only date part, ignore time)
  const date1Only = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const date2Only = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());

  // If slot1 is on an earlier date, it's before slot2
  if (date1Only < date2Only) {
    return true;
  }

  // If slot1 is on a later date, it's not before slot2
  if (date1Only > date2Only) {
    return false;
  }

  // Same date - compare by session (normalize first)
  const normalizedSession1 = normalizeSession(session1);
  const normalizedSession2 = normalizeSession(session2);

  // If slot1 is in an earlier session, it's before slot2
  if (normalizedSession1 < normalizedSession2) {
    return true;
  }

  // If slot1 is in a later session, it's not before slot2
  if (normalizedSession1 > normalizedSession2) {
    return false;
  }

  // Same date and session - compare by period number
  // If slot1 has a lower period number, it's before slot2
  if (periodInSession1 < periodInSession2) {
    return true;
  }

  // Same date, session, and period - they are equal, so slot1 is not before slot2
  return false;
}

