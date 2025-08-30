import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import axios from 'axios';

export type Activity = {
  start_date: string;
  start_date_local: string;
  distance: number;
  average_heartrate?: number;
  moving_time: number;
  average_speed?: number;
  type: string;
  average_temp?: number;
};

type ActivitiesContextType = {
  activities: Activity[];
  weekRuns: Activity[];
  weeklySummary: {
    runs: number;
    distance: number;
    time: string;
    avgHeartRate: number;
    avgPace: number;
  } | null;
  last30DaysRuns: Activity[];
  rolling30DayStats: {
    totalRuns30: number;
    totalDistance30: number;
    totalTime: number;
    totalTimeFormatted: string;
    avgHeartRate30: number;
    avgPace30: number;
  };
  getMonthlyDailySummaries: (
    activities: Activity[],
    year: number,
    month: number
  ) => {
    date: string;
    runs: number;
    totalDistanceMeters: number;
    totalDistanceMi: number;
    totalMovingTimeSeconds: number;
    avgHeartRate: number;
    heartRateCount: number;
  }[];
};


type DailySummary = {
  date: string; // e.g. '2025-07-30'
  runs: number;
  totalDistanceMi: number;
};

const ActivitiesContext = createContext<ActivitiesContextType | null>(null);

export const useActivities = () => {
  const context = useContext(ActivitiesContext);
  if (!context) {
    throw new Error('useActivities must be used within an ActivitiesProvider');
  }
  return context;
};

export const useAnnualMileage = (activities: Activity[]) => {
  const mileageByYear: Record<string, number> = {};

  activities.forEach((act) => {
    const year = new Date(act.start_date_local).getFullYear().toString();
    mileageByYear[year] = (mileageByYear[year] || 0) + act.distance;
  });

  return Object.entries(mileageByYear)
    .map(([year, meters]) => ({
      year,
      miles: +(meters / 1609.34).toFixed(1),
    }))
    .sort((a, b) => a.year.localeCompare(b.year));
};

export function formatTime(seconds: number) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (num: number) => num.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  } else {
    return `${pad(mins)}:${pad(secs)}`;
  }
}
export const ActivitiesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  async function loadRuns() {
    try {
      const res = await fetch("/runs.json");  
      const data = await res.json();
      setActivities(data);
    } catch (err) {
      console.error("Error loading runs:", err);
    } finally {
      setLoading(false);
    }
  }
  loadRuns();
}, []);

  // Always call hooks at top-level
  const weekRuns = useMemo(() => {
    if (!activities.length) return [];
    const now = new Date();
    const dayOfWeek = (now.getDay() + 6) % 7; // Monday=0
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    return activities.filter(
      (act) => act.type === "Run" && new Date(act.start_date_local) >= weekStart
    );
  }, [activities]);

  const weeklySummary = useMemo(() => {
    if (!weekRuns.length) return null;

    const totalDistance = weekRuns.reduce((sum, act) => sum + act.distance, 0);
    const totalTime = weekRuns.reduce((sum, act) => sum + act.moving_time, 0);
    const totalHeartRate = weekRuns.reduce((sum, act) => sum + (act.average_heartrate || 0), 0);
    const avgHeartRate = totalHeartRate / weekRuns.length;
    const avgPace = (totalTime / 60) / (totalDistance / 1609.34);

    return {
      runs: weekRuns.length,
      distance: +(totalDistance / 1609.34).toFixed(2),
      time: formatTime(Math.round(totalTime)),
      avgHeartRate: Math.round(avgHeartRate),
      avgPace,
    };
  }, [weekRuns]);

  const { last30DaysRuns, rolling30DayStats } = useMemo(
    () => calculateRolling30DayStats(activities),
    [activities]
  );

  // Render loading UI conditionally
  if (loading) return <div>Loading activities...</div>;

  return (
    <ActivitiesContext.Provider
      value={{
        activities,
        weekRuns,
        weeklySummary,
        last30DaysRuns,
        rolling30DayStats,
        getMonthlyDailySummaries,
      }}
    >
      {children}
    </ActivitiesContext.Provider>
  );
};

// Calculate rolling 30-day stats
const calculateRolling30DayStats = (activities: Activity[]) => {
  if (!activities.length) return [];
  const now = new Date();
  const startDate = new Date();
  startDate.setDate(now.getDate() - 30);
  startDate.setHours(0, 0, 0, 0);

  const last30DaysRuns = activities.filter(act => {
    const date = new Date(act.start_date_local);
    return date >= startDate && date <= now;
  });

  const totalDistance = last30DaysRuns.reduce((sum, act) => sum + act.distance, 0);
  const totalTime = last30DaysRuns.reduce((sum, act) => sum + act.moving_time, 0);
  const totalHeartRate = last30DaysRuns.reduce((sum, act) => sum + (act.average_heartrate || 0), 0);
  const avgHeartRate = last30DaysRuns.length ? totalHeartRate / last30DaysRuns.length : 0;
  const avgPace = last30DaysRuns.length ? (totalTime / 60) / (totalDistance / 1609.34) : 0;

  return {
    last30DaysRuns,
    rolling30DayStats: {
      totalRuns30: last30DaysRuns.length,
      totalDistance30: totalDistance / 1609.34,
      totalTime,
      totalTimeFormatted: formatTime(totalTime),
      avgHeartRate30: Math.round(avgHeartRate),
      avgPace30: avgPace,
    }
  };
};

export function getMonthlyDailySummaries(
  activities: Activity[],
  year: number,
  month: number
) {
  if (!activities.length) return [];
  const filtered = activities.filter((act) => {
    const d = new Date(act.start_date_local);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const dayMap: Record<
    string,
    {
      date: string;
      runs: number;
      totalDistanceMeters: number;
      totalDistanceMi: number;
      totalMovingTimeSeconds: number;
      avgHeartRate: number;
      heartRateCount: number;
    }
  > = {};

  filtered.forEach((act) => {
    const d = new Date(act.start_date_local);
    const dayKey = d.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!dayMap[dayKey]) {
      dayMap[dayKey] = {
        date: dayKey,
        runs: 0,
        totalDistanceMeters: 0,
        totalDistanceMi: 0,
        totalMovingTimeSeconds: 0,
        avgHeartRate: 0,
        heartRateCount: 0,
      };
    }

    dayMap[dayKey].runs += 1;
    dayMap[dayKey].totalDistanceMeters += act.distance;
    dayMap[dayKey].totalDistanceMi += act.distance / 1609.34;
    dayMap[dayKey].totalMovingTimeSeconds += act.moving_time;
    if (act.average_heartrate) {
      dayMap[dayKey].avgHeartRate += act.average_heartrate;
      dayMap[dayKey].heartRateCount += 1;
    }
  });

  // Compute average heart rate per day
  Object.values(dayMap).forEach((day) => {
    if (day.heartRateCount > 0) {
      day.avgHeartRate = day.avgHeartRate / day.heartRateCount;
    } else {
      day.avgHeartRate = 0;
    }
  });

  return Object.values(dayMap);
}
// Inside your provider component, after fetching activities:




