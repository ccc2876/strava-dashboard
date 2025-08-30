import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDarkMode } from '../DarkModeContext';
import { useActivities } from '../ActivitiesContext';

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

function getPace(distanceMeters: number, timeSeconds: number, avgPaceMin?: number): string {
  if (avgPaceMin !== undefined) {
    const mins = Math.floor(avgPaceMin);
    const decimalSecs = (avgPaceMin - mins) * 60;
    const secs = Math.round(decimalSecs);
    return `${mins}:${secs.toString().padStart(2, '0')} min/mi`;
  }
  if (distanceMeters === 0) return '0:00';
  const miles = distanceMeters / 1609.34;
  const paceSecPerMile = timeSeconds / miles;
  const mins = Math.floor(paceSecPerMile / 60);
  const secs = Math.round(paceSecPerMile % 60);
  return `${mins}:${secs.toString().padStart(2, '0')} min/mi`;
}

export default function WeeklyDetails() {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { weekRuns, weeklySummary } = useActivities();

  console.log("darkMode:", darkMode);
  console.log("weekRuns:", weekRuns);
  console.log("weeklySummary:", weeklySummary);

  const bgClass = darkMode ? 'bg-gray-950' : 'bg-gray-50';
  const textClass = darkMode ? 'text-white' : 'text-gray-800';

  return (
    <div
      className={`min-h-screen ${bgClass} ${textClass} p-4 sm:p-6`}
      style={{ padding: '1rem', minHeight: '100vh', backgroundColor: darkMode ? '#1a202c' : '#f9fafb', color: darkMode ? '#ffffff' : '#1f2937' }}
    >
      <header className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${darkMode ? 'bg-blue-900 hover:bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'} ${textClass} transition`}
          style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: darkMode ? '#1e40af' : '#2563eb', color: darkMode ? '#ffffff' : '#fff' }}
        >
          <span>←</span> Back
        </button>
        <button
          onClick={toggleDarkMode}
          className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} transition`}
          style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: darkMode ? '#374151' : '#e5e7eb' }}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </header>

      <h1 className={`text-3xl font-bold mb-8 text-center ${textClass}`} style={{ fontSize: '1.875rem', marginBottom: '2rem', fontWeight: '700', color: darkMode ? '#ffffff' : '#1f2937' }}>
        Weekly Details
      </h1>

      {/* Summary Section */}
      {weeklySummary ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          {[
            { label: 'Total Runs', value: weeklySummary.runs },
            { label: 'Total Distance', value: `${weeklySummary.distance} miles` },
            { label: 'Avg Pace', value: getPace(0, 0, weeklySummary.avgPace) }, // Use avgPace from weeklySummary
          ].map((item, index) => (
            <div
              key={index}
              className={`p-4 rounded-xl shadow-md hover:shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}
              style={{ padding: '1rem', borderRadius: '0.75rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', backgroundColor: darkMode ? '#2d3748' : '#ffffff' }}
            >
              <p className={`text-sm font-medium ${textClass}`} style={{ fontSize: '0.875rem', fontWeight: '500', color: darkMode ? '#ffffff' : '#4b5563' }}>
                {item.label}
              </p>
              <p className="text-xl font-semibold" style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className={`text-center text-lg ${textClass}`} style={{ fontSize: '1.125rem', color: darkMode ? '#ffffff' : '#6b7280' }}>
          No runs this week.
        </p>
      )}

      {/* Runs List */}
      <h2 className={`text-2xl font-semibold mb-6 ${textClass}`} style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: darkMode ? '#ffffff' : '#1f2937' }}>
        Runs This Week
      </h2>
      <div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 min-h-[300px]"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', minHeight: '300px' }}
      >
        {weekRuns.length ? (
          weekRuns.map(run => {
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
                className={`p-4 rounded-xl shadow-md hover:shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border border-gray-200 dark:border-gray-700`}
                style={{ padding: '1rem', borderRadius: '0.75rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', backgroundColor: darkMode ? '#2d3748' : '#ffffff', minHeight: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  <h3 className={`text-lg font-semibold ${textClass} mb-3`} style={{ fontSize: '1.125rem', fontWeight: '600', color: darkMode ? '#93c5fd' : '#2563eb', marginBottom: '0.75rem' }}>
                    {date}
                  </h3>
                  <div className="space-y-2">
                    <p className={`${textClass}`} style={{ color: darkMode ? '#ffffff' : '#1f2937' }}>
                      <span className="font-medium" style={{ fontWeight: '500' }}>Distance:</span> {distance} miles
                    </p>
                    <p className={`${textClass}`} style={{ color: darkMode ? '#ffffff' : '#1f2937' }}>
                      <span className="font-medium" style={{ fontWeight: '500' }}>Time:</span> {duration}
                    </p>
                    <p className={`${textClass}`} style={{ color: darkMode ? '#ffffff' : '#1f2937' }}>
                      <span className="font-medium" style={{ fontWeight: '500' }}>Pace:</span> {pace}
                    </p>
                    {run.average_heartrate && (
                      <p className={`${textClass}`} style={{ color: darkMode ? '#ffffff' : '#1f2937' }}>
                        <span className="font-medium" style={{ fontWeight: '500' }}>Avg HR:</span> {Math.round(run.average_heartrate)} bpm
                      </p>
                    )}
                    {run.average_temp !== undefined && (
                      <p className={`${textClass}`} style={{ color: darkMode ? '#ffffff' : '#1f2937' }}>
                        <span className="font-medium" style={{ fontWeight: '500' }}>Temp:</span> {Math.round((run.average_temp * 9) / 5 + 32)}°F
                      </p>
                    )}
                  </div>
                </div>
                <div className="h-2"></div>
              </div>
            );
          })
        ) : (
          <p className={`text-center col-span-full text-lg ${textClass}`} style={{ fontSize: '1.125rem', color: darkMode ? '#ffffff' : '#6b7280' }}>
            No runs to display.
          </p>
        )}
      </div>
    </div>
  );
}