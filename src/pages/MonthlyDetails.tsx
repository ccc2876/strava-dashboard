import React, { useState } from 'react';
import { useActivities, getMonthlyDailySummaries, formatTime } from '../ActivitiesContext';
import { useDarkMode } from '../DarkModeContext';
import { useNavigate } from 'react-router-dom';


function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatPace(paceSecondsPerMile: number) {
  if (!paceSecondsPerMile || paceSecondsPerMile === Infinity) return '--:--';
  const min = Math.floor(paceSecondsPerMile / 60);
  const sec = Math.round(paceSecondsPerMile % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function MonthlyDetails() {
  const { activities, getMonthlyDailySummaries } = useActivities();
  const { darkMode, toggleDarkMode } = useDarkMode();
  const today = new Date();
  const navigate = useNavigate();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const dailySummaries = getMonthlyDailySummaries(activities, year, month);

  // Compute monthly totals:
  const totalRuns = dailySummaries.reduce((sum, day) => sum + day.runs, 0);
  const totalDistance = dailySummaries.reduce((sum, day) => sum + day.totalDistanceMeters, 0);
  const totalMovingTime = dailySummaries.reduce((sum, day) => sum + day.totalMovingTimeSeconds, 0);
  const totalHeartRate = dailySummaries.reduce((sum, day) => sum + (day.avgHeartRate * day.runs), 0);
  const avgHeartRate = totalRuns ? totalHeartRate / totalRuns : 0;
  const avgPace = totalDistance
    ? (totalMovingTime / 60) / (totalDistance / 1609.34)
    : 0;

  const daysRun = dailySummaries.length;
  const summaryMap = dailySummaries.reduce((acc, cur) => {
    acc[cur.date] = cur;
    return acc;
  }, {} as Record<string, typeof dailySummaries[0]>);

  // Adjust calendarStartDate to start on Monday (instead of Sunday)
  const firstDayOfMonth = new Date(year, month, 1);
  const firstDayWeekday = firstDayOfMonth.getDay(); // Sunday=0, Monday=1...
  // Calculate offset so calendar starts on Monday (0=Monday)
  const offset = (firstDayWeekday + 6) % 7;
  const calendarStartDate = new Date(firstDayOfMonth);
  calendarStartDate.setDate(firstDayOfMonth.getDate() - offset);

  // Build 6 weeks calendar grid
  const weeks = [];
  for (let week = 0; week < 6; week++) {
    const days = [];
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(calendarStartDate);
      currentDate.setDate(calendarStartDate.getDate() + week * 7 + day);

      const dateKey = currentDate.toISOString().split('T')[0];
      const summary = dailySummaries.find(d => d.date === dateKey);

      const isToday =
        currentDate.getFullYear() === today.getFullYear() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getDate() === today.getDate();
        days.push(
          <td
            key={dateKey}
            style={{
              border: '1px solid #ccc',
              padding: 0,
              backgroundColor: isToday ? '#4caf50' : 'transparent',
              color: currentDate.getMonth() === month ? (darkMode ? '#eee' : '#000') : '#999',
              minWidth: 100,
              height: 100,
            }}
            title={summary ? `${summary.runs} runs, ${summary.totalDistanceMi.toFixed(2)} mi` : 'No runs'}
          >
            <div
              style={{
                height: '100%',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                padding: 8,
                boxSizing: 'border-box',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                {currentDate.getDate()}
              </div>
              {summary && (
                <div style={{ fontSize: 12, lineHeight: 1.2 }}>
                  <div>Runs: {summary.runs}</div>
                  <div>Dist: {summary.totalDistanceMi.toFixed(2)} mi</div>
                  <div>HR: {Math.round(summary.avgHeartRate)}</div>
                  <div>Time: {Math.floor(summary.totalMovingTimeSeconds / 60)}m</div>
                </div>
              )}
            </div>
          </td>

        );

          }
          weeks.push(<tr key={week}>{days}</tr>);
        }

        // Optional: handlers to change month/year
        const goPrevMonth = () => {
          const prevMonth = month - 1;
          if (prevMonth < 0) {
            setYear(year - 1);
            setMonth(11);
          } else {
            setMonth(prevMonth);
          }
        };

        const goNextMonth = () => {
          const nextMonth = month + 1;
          if (nextMonth > 11) {
            setYear(year + 1);
            setMonth(0);
          } else {
            setMonth(nextMonth);
          }
        };

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
            </div>

            <div style={{ padding: 20 }}>
            <h1 style={{ color: darkMode ? '#eee' : '#000' }}>Monthly Run Details</h1>

            {/* Parent container: align nav + summary horizontally */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
                color: darkMode ? '#ccc' : '#333',
                flexWrap: 'wrap', // allows wrapping on small widths
                gap: '1rem',
              }}
            >
              {/* Month navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button onClick={goPrevMonth}>Previous</button>
                <span style={{ fontWeight: 'bold', minWidth: 150, textAlign: 'center' }}>
                  {new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={goNextMonth}>Next</button>
              </div>

              {/* Monthly totals summary */}
              <div
                style={{
                  padding: 10,
                  borderRadius: 6,
                  backgroundColor: darkMode ? '#222' : '#f7f7f7',
                  color: darkMode ? '#ddd' : '#111',
                  fontSize: 14,
                  display: 'flex',
                  gap: '1.5rem',
                  flexWrap: 'wrap',
                  minWidth: 300,
                  justifyContent: 'center',
                }}
              >
                <div><strong>Runs:</strong> {totalRuns}</div>
                <div><strong>Days Run:</strong> {daysRun}/{daysInMonth(year, month)} days</div>
                <div><strong>Distance:</strong> {(totalDistance / 1609.34).toFixed(2)} mi</div>
                <div><strong>Time:</strong> {formatTime(totalMovingTime)}</div>
                <div><strong>Avg HR:</strong> {Math.round(avgHeartRate)}</div>
                <div><strong>Avg Pace:</strong> {formatPace(avgPace)}</div>
              </div>
            </div>
          </div>

          <div>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th>Mon</th>
                    <th>Tue</th>
                    <th>Wed</th>
                    <th>Thu</th>
                    <th>Fri</th>
                    <th>Sat</th>
                    <th>Sun</th>
                  </tr>
                </thead>
                <tbody>{weeks}</tbody>
              </table>
            </div>
          </div>
        );
      }