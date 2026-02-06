/**
 * Utility functions for time formatting
 */

/**
 * Convert decimal hours to hours and minutes format
 * @param {number} decimalHours - Hours in decimal format (e.g., 2.5)
 * @returns {string} - Formatted time string (e.g., "2h 30m")
 */
export const formatHoursMinutes = (decimalHours) => {
  if (!decimalHours || decimalHours === 0) {
    return "0h 0m";
  }

  // Round to avoid floating point precision issues
  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}m`;
  }
};

/**
 * Convert decimal hours to a clean decimal format (max 1 decimal place)
 * @param {number} decimalHours - Hours in decimal format
 * @returns {string} - Clean decimal format (e.g., "2.5")
 */
export const formatDecimalHours = (decimalHours) => {
  if (!decimalHours || decimalHours === 0) {
    return "0";
  }
  
  // Round to 1 decimal place and remove trailing zeros
  return parseFloat(decimalHours.toFixed(1)).toString();
};

/**
 * Parse hours and minutes input to decimal hours
 * @param {string} hoursInput - Hours input (e.g., "2")
 * @param {string} minutesInput - Minutes input (e.g., "30")
 * @returns {number} - Decimal hours (e.g., 2.5)
 */
export const parseToDecimalHours = (hoursInput, minutesInput) => {
  const hours = parseInt(hoursInput) || 0;
  const minutes = parseInt(minutesInput) || 0;
  return hours + (minutes / 60);
};

/**
 * Convert decimal hours to hours and minutes for form inputs
 * @param {number} decimalHours - Hours in decimal format
 * @returns {object} - Object with hours and minutes properties
 */
export const decimalToHoursMinutes = (decimalHours) => {
  if (!decimalHours || decimalHours === 0) {
    return { hours: 0, minutes: 0 };
  }

  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return { hours, minutes };
};