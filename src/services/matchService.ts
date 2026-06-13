// services/matchService.ts

const BACKEND_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL;

export interface Match {
  ccode: string;
  league: string;
  leagueName: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  matchTime: string;
  matchId: string;
  homeScore: string;
  awayScore: string;
  cancelled: boolean;
  started: boolean;
  finished: boolean;
  comp_name: string;
}

export interface League {
  id: string;
  name: string;
  leagueName: string;
}

export interface MatchesResponse {
  success: boolean;
  matches: Match[];
  leagues: League[];
  date: string;
  error?: string;
  details?: string;
}

/**
 * Fetch matches by date and sport
 * @param date - Date in YYYYMMDD format (e.g., "20231225")
 * @param sport - Sport category (default: "soccer")
 * @returns Promise with matches data
 */
export const fetchMatches = async (
  date: string,
  sport: string = "soccer"
): Promise<MatchesResponse> => {
  try {
    const response = await fetch(
      `${BACKEND_URL}/sports/next-matches?date=${date}&sport=${sport}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to fetch matches: ${response.status}`
      );
    }

    const data: MatchesResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching matches:", error);
    throw error;
  }
};

/**
 * Format date to YYYYMMDD format required by API
 * @param date - JavaScript Date object
 * @returns Formatted date string
 */
export const formatDateForAPI = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

/**
 * Parse API date/time format (YYYYMMDDHHmmss) to JavaScript Date
 * @param dateTimeString - Date/time string from API (e.g., "20251216190000")
 * @returns JavaScript Date object
 */
export const parseAPIDateTime = (dateTimeString: string): Date => {
  if (!dateTimeString || dateTimeString.length !== 14) {
    return new Date();
  }

  const year = parseInt(dateTimeString.substring(0, 4));
  const month = parseInt(dateTimeString.substring(4, 6)) - 1; // Month is 0-indexed
  const day = parseInt(dateTimeString.substring(6, 8));
  const hours = parseInt(dateTimeString.substring(8, 10));
  const minutes = parseInt(dateTimeString.substring(10, 12));
  const seconds = parseInt(dateTimeString.substring(12, 14));

  return new Date(year, month, day, hours, minutes, seconds);
};

/**
 * Format match time for display
 * @param matchTime - Match time from API (e.g., "20251216190000")
 * @param format - Display format ("short" | "full" | "time-only")
 * @returns Formatted time string
 */
export const formatMatchTime = (
  matchTime: string,
  format: "short" | "full" | "time-only" = "short"
): string => {
  const date = parseAPIDateTime(matchTime);

  if (format === "time-only") {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (format === "full") {
    return date.toLocaleString([], {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Default "short" format
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeString = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) {
    return `Today, ${timeString}`;
  } else if (isTomorrow) {
    return `Tomorrow, ${timeString}`;
  } else {
    const dateString = date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
    return `${dateString}, ${timeString}`;
  }
};

/**
 * Get matches for today
 * @param sport - Sport category (default: "soccer")
 * @returns Promise with matches data
 */
export const fetchTodayMatches = async (
  sport: string = "soccer"
): Promise<MatchesResponse> => {
  const today = new Date();
  const dateString = formatDateForAPI(today);
  return fetchMatches(dateString, sport);
};

/**
 * Get matches for tomorrow
 * @param sport - Sport category (default: "soccer")
 * @returns Promise with matches data
 */
export const fetchTomorrowMatches = async (
  sport: string = "soccer"
): Promise<MatchesResponse> => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateString = formatDateForAPI(tomorrow);
  return fetchMatches(dateString, sport);
};

/**
 * Get matches for a date range
 * @param startDate - Start date
 * @param endDate - End date
 * @param sport - Sport category (default: "soccer")
 * @returns Promise with array of matches data for each date
 */
export const fetchMatchesInRange = async (
  startDate: Date,
  endDate: Date,
  sport: string = "soccer"
): Promise<MatchesResponse[]> => {
  const promises: Promise<MatchesResponse>[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateString = formatDateForAPI(currentDate);
    promises.push(fetchMatches(dateString, sport));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  try {
    return await Promise.all(promises);
  } catch (error) {
    console.error("Error fetching matches in range:", error);
    throw error;
  }
};

/**
 * Filter matches by league
 * @param matches - Array of matches
 * @param leagueId - League ID to filter by ("all" for no filter)
 * @returns Filtered matches array
 */
export const filterMatchesByLeague = (
  matches: Match[],
  leagueId: string
): Match[] => {
  if (leagueId === "all") {
    return matches;
  }
  return matches.filter((match) => match.ccode === leagueId);
};

/**
 * Get upcoming matches (not started, not cancelled)
 * @param matches - Array of matches
 * @returns Filtered upcoming matches
 */
export const getUpcomingMatches = (matches: Match[]): Match[] => {
  return matches.filter((match) => !match.started && !match.cancelled);
};

/**
 * Get live matches (currently in progress)
 * @param matches - Array of matches
 * @returns Filtered live matches
 */
export const getLiveMatches = (matches: Match[]): Match[] => {
  return matches.filter((match) => match.started && !match.finished);
};

/**
 * Get finished matches
 * @param matches - Array of matches
 * @returns Filtered finished matches
 */
export const getFinishedMatches = (matches: Match[]): Match[] => {
  return matches.filter((match) => match.finished);
};