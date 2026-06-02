/**
 * Resolves the client's timezone from the request headers or user profile location fallback.
 * @param {Object} req - Express request object
 * @param {Object} user - User model object
 * @returns {string} - Timezone string (e.g. 'Asia/Karachi')
 */
export const resolveTimezone = (req, user) => {
  if (req && req.headers && req.headers['x-timezone']) {
    return req.headers['x-timezone'];
  }
  
  const location = (user?.location || 'UAE').toLowerCase().trim();
  if (location.includes('pakistan') || location.includes('pk')) return 'Asia/Karachi';
  if (location.includes('uae') || location.includes('dubai') || location.includes('abudhabi')) return 'Asia/Dubai';
  
  return 'UTC';
};

/**
 * Parses and normalizes a date input relative to a specific timezone to a UTC Midnight Date object.
 * Returns a Date object representing the midnight boundary of that calendar day in UTC.
 * @param {string|Date} dateInput - 'today', 'yesterday', a Date object, or a YYYY-MM-DD string.
 * @param {string} timezone - Timezone name (e.g. 'Asia/Karachi')
 * @returns {Date} - Date object representing YYYY-MM-DDT00:00:00.000Z
 */
export const getNormalizedLocalDate = (dateInput, timezone = 'UTC') => {
  let dateObj = new Date();
  
  if (dateInput) {
    if (typeof dateInput === 'string') {
      const cleanDate = dateInput.toLowerCase().trim();
      if (cleanDate === 'today') {
        dateObj = new Date();
      } else if (cleanDate === 'yesterday') {
        dateObj = new Date();
        // Shift date by 1 day in the target timezone
        try {
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
          });
          const parts = formatter.formatToParts(dateObj);
          const year = parseInt(parts.find(p => p.type === 'year').value);
          const month = parseInt(parts.find(p => p.type === 'month').value);
          const day = parseInt(parts.find(p => p.type === 'day').value);
          
          // Create local midnight in target timezone, then shift day
          const localTime = new Date(Date.UTC(year, month - 1, day));
          localTime.setUTCDate(localTime.getUTCDate() - 1);
          return localTime;
        } catch (e) {
          // Fallback if timezone resolution fails
          dateObj.setDate(dateObj.getDate() - 1);
        }
      } else {
        // Match specific ISO date patterns like YYYY-MM-DD to avoid timezone shifting
        const match = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          return new Date(Date.UTC(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3])));
        }
        
        const parsed = new Date(dateInput);
        if (!isNaN(parsed.getTime())) {
          dateObj = parsed;
        }
      }
    } else if (dateInput instanceof Date) {
      dateObj = dateInput;
    }
  }

  // Extract the calendar day in the target timezone
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    const parts = formatter.formatToParts(dateObj);
    const year = parseInt(parts.find(p => p.type === 'year').value);
    const month = parseInt(parts.find(p => p.type === 'month').value);
    const day = parseInt(parts.find(p => p.type === 'day').value);
    return new Date(Date.UTC(year, month - 1, day));
  } catch (e) {
    // Fallback in case of invalid timezone
    const fallback = new Date(dateObj);
    fallback.setUTCHours(0, 0, 0, 0);
    return fallback;
  }
};
