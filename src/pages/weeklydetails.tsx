import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDarkMode } from '../DarkModeContext';
import { useActivities } from '../ActivitiesContext';

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

function getPace(distanceMeters: number, timeSeconds: number) {
  if (distanceMeters === 0) return '0:00';
  
  const miles = distanceMeters / 1609.34; // meters → miles
  const paceSecPerMile = timeSeconds / miles;
  
  const mins = Math.floor(paceSecPerMile / 60);
  const secs = Math.round(paceSecPerMile % 60);
  
  return `${mins}:${secs.toString().padStart(2, '0')} min/mi`;
}

export default function WeeklyDetails() {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { weekRuns, weeklySummary } = useActivities();

  return (
    <div className={darkMode ? 'container dark' : 'container'}>
      <header style={{ padding: 10 }}>
        <button onClick={toggleDarkMode}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </header>

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
            transition: 'background-color 0.3s, color 0.3s',
          }}
        >
          ← Back
        </button>

        <h1>Weekly Details</h1>

        {weeklySummary ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-medium">Total Runs</p>
              <p className="text-2xl font-bold">{weeklySummary.runs}</p>
            </div>
            <div>
              <p className="text-lg font-medium">Total Distance</p>
              <p className="text-2xl font-bold">{weeklySummary.distance} miles</p>
            </div>
            <div>
              <p className="text-lg font-medium">Avg Pace</p>
              <p className="text-2xl font-bold">{weeklySummary.avgPace.toFixed(2)} min/mile</p>
            </div>
          </div>
        ) : (
          <p>No runs this week.</p>
        )}

        <h2 className="text-2xl font-semibold mb-4">Runs This Week</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {weekRuns.map(run => {
            const date = new Date(run.start_date_local).toLocaleDateString(undefined, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            const distance = (run.distance / 1609.34).toFixed(2);
            const duration = formatTime(run.moving_time);
            const pace = getPace(run.distance, run.moving_time);

            return (
              <div
                key={run.start_date}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 space-y-2 border border-gray-200 dark:border-gray-700"
              >
                <p className="text-lg font-semibold">{date}</p>
                <p><strong>Distance:</strong> {distance} miles</p>
                <p><strong>Time:</strong> {duration}</p>
                <p><strong>Pace:</strong> {pace}</p>
                {run.average_heartrate && (
                  <p><strong>Avg HR:</strong> {Math.round(run.average_heartrate)} bpm</p>
                )}
                {run.average_temp !== undefined && (
                  <p><strong>Temp:</strong> {Math.round((run.average_temp * 9) / 5 + 32)}°F</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
