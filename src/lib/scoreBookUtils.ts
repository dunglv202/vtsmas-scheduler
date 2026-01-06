/**
 * Utility functions for Score Book functionality
 */

/**
 * Normalize Vietnamese text by removing diacritics
 * Example: "Đăng" -> "dang"
 */
export const normalizeVietnamese = (text: string): string => {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
};

/**
 * Normalize numeric values for comparison
 * Returns null if value is not a valid number
 */
export const normalizeNumericValue = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const num = parseFloat(trimmed);
  return isNaN(num) ? null : num;
};

/**
 * Get score limit for a given batchNumberCode based on semester
 */
export const getScoreLimit = (
  batchNumberCode: string,
  subject: { regularReviewScore?: number | null; regularReviewScoreHKII?: number | null; midtermAssessmentScore?: number | null; finalAssessmentScore?: number | null },
  semester: number = 1
): number | null => {
  switch (batchNumberCode) {
    case "TX":
      // Use regularReviewScore for semester 1, regularReviewScoreHKII for semester 2
      return semester === 1 ? subject.regularReviewScore ?? null : subject.regularReviewScoreHKII ?? null;
    case "GHK":
      return subject.midtermAssessmentScore ?? null;
    case "CHK":
      return subject.finalAssessmentScore ?? null;
    default:
      return null; // No limit for unknown batchNumberCode
  }
};

/**
 * Format numeric value to 1 decimal place
 */
export const formatToDecimal = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed === "") return trimmed;

  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    return num.toFixed(1);
  }
  return trimmed;
};

