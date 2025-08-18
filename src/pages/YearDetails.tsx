import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useActivities } from '../ActivitiesContext';
import { useDarkMode } from '../DarkModeContext';

function getDayKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getRunHeatmapDataForYear(activities, year: number) {
  const start = new Date(year, 0, 1);
  const end = year === new Date().getFullYear() ? new Date() : new Date(year, 11, 31);
  const dayMap: Record<string, number> = {};

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = getDayKey(d);
    dayMap[key] = 0;
  }

  activities.forEach((act) => {
    const d = new Date(act.start_date_local);
    if (d.getFullYear() === year) {
      const key = getDayKey(d);
      if (key in dayMap) {
        dayMap[key] += act.distance / 1609.34;
      }
    }
  });

  return Object.entries(dayMap).map(([date, miles]) => ({ date, miles }));
}

function getIntensityColor(miles: number = 0, darkMode: boolean) {
  if (miles === 0) return darkMode ? '#222' : '#eee';
  if (miles < 2) return '#c6e48b';
  if (miles < 4) return '#7bc96f';
  if (miles < 6) return '#239a3b';
  return '#196127';
}

export default function YearDetailsPage() {
  const { year: yearParam } = useParams();
  const year = parseInt(yearParam || new Date().getFullYear().toString(), 10);
  const { activities } = useActivities();
  const { darkMode } = useDarkMode();
  const navigate = useNavigate();

  const heatmapData = getRunHeatmapDataForYear(activities, year);

  const totalMiles = heatmapData.reduce((sum, d) => sum + (d.miles || 0), 0);
  const daysRun = heatmapData.filter((d) => d.miles > 0).length;

  const isCurrentYear = year === new Date().getFullYear();
  const today = new Date();
  const startOfYear = new Date(year, 0, 1);
  const daysSoFar = isCurrentYear
    ? Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : isLeapYear(year) ? 366 : 365;

  const avgDaily = totalMiles / daysSoFar;
  const projectedTotal = avgDaily * (isLeapYear(year) ? 366 : 365);

  const weeks: typeof heatmapData[][] = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  return (
    <div className={darkMode ? 'container dark' : 'container'}>
      <div style={{ padding: '0 1rem' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '0.5rem 1rem',
            marginBottom: '1rem',
            cursor: 'pointer',
            borderRadius: '4px',
            border: '1px solid #ccc',
            backgroundColor: darkMode ? '#333' : '#eee',
            color: darkMode ? '#eee' : '#000',
          }}
        >
          ← Back
        </button>
      </div>

      <div style={{ padding: 20 }}>
        <h1 style={{ color: darkMode ? '#eee' : '#000' }}>Year in Runs - {year}</h1>

        <div
          style={{
            display: 'flex',
            gap: 20,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: 16,
            color: darkMode ? '#ccc' : '#333',
          }}
        >
          <div><strong>Total Distance:</strong> {totalMiles.toFixed(1)} mi</div>
          <div><strong>Days Run:</strong> {daysRun}/{daysSoFar}</div>
          <div><strong>Avg Daily:</strong> {avgDaily.toFixed(2)} mi</div>
          <div><strong>Projected Total:</strong> {projectedTotal.toFixed(0)} mi</div>
        </div>

        <div style={{ display: 'flex', gap: 2, overflowX: 'auto', minWidth: 365 }}>
          {weeks.map((week, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {week.map(({ date, miles }) => (
                <div
                  key={date}
                  title={miles ? `${date} - ${miles.toFixed(1)} mi` : `${date} - No run`}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    backgroundColor: getIntensityColor(miles, darkMode),
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        <small style={{ marginTop: '0.5rem', display: 'block', color: darkMode ? '#ccc' : '#666' }}>
          Color intensity = run distance. Darker = longer runs.
        </small>
      </div>
    </div>
  );
}
