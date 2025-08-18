import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, Tooltip, XAxis, YAxis,ComposedChart,ErrorBar, 
  CartesianGrid, ResponsiveContainer, Legend, ScatterChart, Scatter,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, Customized, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

import { BrowserRouter, Link, useNavigate } from 'react-router-dom';
import './App.css'; 
import { useDarkMode } from './DarkModeContext';
import { useActivities } from './ActivitiesContext';


type Activity = {
  start_date: string;
  start_date_local: string;
  distance: number;
  average_heartrate?: number;
  moving_time: number;
  average_speed?: number;
  type: string;
  average_temp?: number;  // New optional field for temp in °F
};

export default function Dashboard() {
  const { darkMode, toggleDarkMode } = useDarkMode();
  const { activities, weeklySummary } = useActivities();
  const navigate = useNavigate();


  const [prs, setPrs] = useState<{ name: string; pace: number | null }[]>([]);
  const [annualMileage, setAnnualMileage] = useState<{ year: string; miles: number }[]>([]);
  const [timeOfDay, setTimeOfDay] = useState<{ name: string; count: number }[]>([]);
  const [mileageByDay, setMileageByDay] = useState<{ name: string; miles: number }[]>([]);
  const [paceHeartRate, setPaceHeartRate] = useState<{ pace: number; heartRate: number }[]>([]);
  const showLabelHours = new Set([0, 3, 6, 9, 12, 15, 18, 21]);
  const [distanceCounts, setDistanceCounts] = useState<{ miles: number; count: number }[]>([]);
  const [paceDistribution, setPaceDistribution] = useState([]);
  const [tempDistribution, setTempDistribution] = useState<{ range: string; count: number }[]>([]);
  const [runDays, setRunDays] = useState<{ date: string; ran: boolean }[]>([]);
  const [monthlyBoxData, setMonthlyBoxData] = useState<any[]>([]);
  const [indoorOutdoorData, setIndoorOutdoorData] = useState<any[]>([]);
  const [rolling30DayStats, setRolling30DayStats] = useState(null);


  useEffect(() => {
    const cToF = (c: number) => (c * 9) / 5 + 32;


    if (!activities.length) return [];

    const runActivities = activities.filter((act) => {
      if (act.type !== 'Run') return false;
      const date = new Date(act.start_date_local);
      const year = date.getFullYear();
      return year >= 2022;
    });


    const raceDistances = [
      { name: '1M', target: 1 },
      { name: '5K', target: 3.1 },
      { name: '10K', target: 6.2 },
      { name: '10M', target: 10 },
      { name: 'Half', target: 13.1 },
      { name: 'Marathon', target: 26.2 }
    ];

        
      // Define isRace helper here
    const isRace = (act) =>
      act.workout_type === 1 || (act.name && act.name.toLowerCase().includes('race'));

    const newPrs = raceDistances.map(({ name, target }) => {
      const relevantRuns = runActivities.filter(act => {
        const year = new Date(act.start_date_local).getFullYear();
        const miles = act.distance / 1609.34;
        return isRace(act) && year >= 2022 && miles >= target * 0.95 && miles <= target * 1.05;
      });

      const fastest = relevantRuns.reduce((best, curr) => {
        const currPace = curr.moving_time / 60 / (curr.distance / 1609.34);
        return !best || currPace < best.pace
          ? {
              name,
              pace: currPace,
              distance: curr.distance / 1609.34,
              title: curr.name,
              date: new Date(curr.start_date_local).toLocaleDateString(),
              movingTimeMs: curr.moving_time * 1000, // moving_time is seconds
              movingTimeFormatted: formatDuration(curr.moving_time * 1000)
            }
          : best;
      }, null);


      return fastest || { name, pace: null };
    });

    setPrs(newPrs);
    
    // // Weekly summary starting from Monday
    const now = new Date();

    // set 30 day stats
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);

      const last30DaysRuns = runActivities.filter(act => {
        const date = new Date(act.start_date_local);
        return date >= thirtyDaysAgo && date <= now;
      });

      if (!last30DaysRuns.length) {
        setRolling30DayStats(null);
        return;
      }

      const totalRuns30 = last30DaysRuns.length;
      const totalDistance30 = last30DaysRuns.reduce((acc, r) => acc + r.distance / 1609.34, 0); // in miles
      const totalTime30 = last30DaysRuns.reduce((acc, r) => acc + r.moving_time, 0); // in seconds
      const totalHeartRate30 = last30DaysRuns.reduce((sum, r) => sum + (r.average_heartrate || 0), 0);
      const avgHeartRate30 = last30DaysRuns.length ? totalHeartRate30 / last30DaysRuns.length : 0;
      const avgPace30 = last30DaysRuns.length ? (totalTime30 / 60) / (totalDistance30) : 0;


      setRolling30DayStats({
        totalRuns30,
        totalDistance30,
        totalTimeFormatted: formatTime(Math.round(totalTime30)),       
        avgHeartRate30: Math.round(avgHeartRate30),
        avgPace30,
      });


    const paceBuckets = new Map();
    for (const act of runActivities) {
      const pace = (act.moving_time / 60) / (act.distance / 1609.34);
      if (!pace || pace > 14 || pace < 4) continue;
      const rounded = Math.round(pace * 4) / 4;
      paceBuckets.set(rounded, (paceBuckets.get(rounded) || 0) + 1);
    }

    const distData = Array.from(paceBuckets.entries()).map(([pace, count]) => ({
      pace,
      count
    })).sort((a, b) => a.pace - b.pace);

    setPaceDistribution(distData);

    // 1. Annual Mileage
    const mileageByYear: Record<string, number> = {};
    runActivities.forEach((act) => {
      const year = new Date(act.start_date_local).getFullYear().toString();
      mileageByYear[year] = (mileageByYear[year] || 0) + act.distance;
    });

    const annual = Object.entries(mileageByYear)
      .map(([year, meters]) => ({
        year,
        miles: +(meters / 1609.34).toFixed(1),
      }))
      .sort((a, b) => a.year.localeCompare(b.year));
    setAnnualMileage(annual);

    // Create 24 hourly buckets labeled "0:00" to "23:00"
    const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const timeBuckets = hourLabels.map(label => ({ name: label, count: 0 }));

    runActivities.forEach((act) => {
      const date = new Date(act.start_date); // or start_date_local if you want
      const hour = date.getHours();
      timeBuckets[hour].count++;
    });

    setTimeOfDay(timeBuckets);



    // 3. Average Daily Mileage by Day of Week
    const dayMap = new Map<number, { totalMiles: number; dates: Set<string> }>();
    runActivities.forEach((act) => {
      const date = new Date(act.start_date_local);
      const day = date.getDay(); // 0 = Sunday, 6 = Saturday
      const dateKey = date.toISOString().split('T')[0];

      if (!dayMap.has(day)) {
        dayMap.set(day, { totalMiles: 0, dates: new Set() });
      }

      const entry = dayMap.get(day)!;
      entry.totalMiles += act.distance / 1609.34;
      entry.dates.add(dateKey);
    });

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const averageMileage = Array.from(dayMap.entries()).map(([day, data]) => ({
      name: dayLabels[day],
      miles: +(data.totalMiles / data.dates.size).toFixed(2),
    }));

    // Sort to start with Monday
    const orderedDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    averageMileage.sort((a, b) => orderedDays.indexOf(a.name) - orderedDays.indexOf(b.name));

    setMileageByDay(averageMileage);


    // 4. Pace vs Heart Rate
    const paceHR = runActivities
      .filter(
        (act) =>
          act.average_heartrate &&
          act.moving_time &&
          act.distance &&
          act.average_speed
      )
      .map((act) => {
        const pace = (act.moving_time / 60) / (act.distance / 1609.34);
        const minutes = Math.floor(pace);
        const seconds = Math.round((pace - minutes) * 60);
        return {
          pace: parseFloat((minutes + seconds / 60).toFixed(2)),
          heartRate: Math.round(act.average_heartrate),
          date: new Date(act.start_date).toLocaleDateString(),
          title: act.name,
          distance: +(act.distance / 1609.34).toFixed(2),
          time: Math.round(act.moving_time / 60)
        };
      })
      .filter((item) => item.pace <= 14); // filter out paces slower than 14 min/mile

    setPaceHeartRate(paceHR);

    // 5. Run Distances - Group by distance range (2-mile buckets)
    const bucketSize = 2;
    const distanceBucketMap = new Map<string, number>();

    runActivities.forEach((act) => {
      const miles = act.distance / 1609.34;
      const bucketStart = Math.floor(miles / bucketSize) * bucketSize;
      const bucketLabel = `${bucketStart}–${bucketStart + bucketSize - 1} mi`;

      if (!distanceBucketMap.has(bucketLabel)) {
        distanceBucketMap.set(bucketLabel, 0);
      }

      distanceBucketMap.set(bucketLabel, distanceBucketMap.get(bucketLabel)! + 1);
    });

    const distanceBuckets = Array.from(distanceBucketMap.entries())
      .map(([label, count]) => ({ range: label, count }))
      .sort((a, b) => {
        const aStart = parseInt(a.range.split('–')[0]);
        const bStart = parseInt(b.range.split('–')[0]);
        return aStart - bStart;
      });

    setDistanceCounts(distanceBuckets);


    // Temperature buckets of 15°F from 30 to 100 (you can adjust range)
    const tempBuckets = [];
    for (let start = 30; start <= 100; start += 15) {
      tempBuckets.push({ range: `${start}–${start + 14}°F`, count: 0, min: start, max: start + 14 });
    }

    // Count runs in temp buckets
    runActivities.forEach(act => {
      // Use act.temperature or fallback to 60 if missing (replace as needed)
      const temp = act.average_temp
      const tempF = cToF(temp);
      const bucket = tempBuckets.find(b => tempF >= b.min && tempF <= b.max);
      if (bucket) bucket.count++;
    });

    // Prepare final array for state (no min/max needed in UI)
    const tempDistData = tempBuckets.map(({range, count}) => ({ range, count }));
    setTempDistribution(tempDistData);

    // --- Yearly pictogram ---
    // Build array of all days in current year (e.g. 2025)
    const year = new Date().getFullYear();
    const firstDay = new Date(year, 0, 1);
    const lastDay = new Date(year, 11, 31);
    const dayCount = Math.floor((lastDay.getTime() - firstDay.getTime()) / (1000*60*60*24)) + 1;

    const runDatesSet = new Set(runActivities.map(act => act.start_date_local.split('T')[0]));

    const daysArr = [];
    for (let i = 0; i < dayCount; i++) {
      const currentDate = new Date(year, 0, 1 + i);
      const dateStr = currentDate.toISOString().slice(0,10);
      daysArr.push({ date: dateStr, ran: runDatesSet.has(dateStr) });
    }
    setRunDays(daysArr);

    const getMonthlyPaceBoxPlotData = () => {
    const boxPlotData = new Map<string, number[]>(); // "YYYY-MM" => [paces]

    runActivities.forEach((act) => {
      const pace = (act.moving_time / 60) / (act.distance / 1609.34);
      if (!pace || pace < 4 || pace > 14) return;

      const date = new Date(act.start_date_local);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!boxPlotData.has(key)) boxPlotData.set(key, []);
      boxPlotData.get(key)!.push(pace);
    });

    // Helper to compute quartiles
    const getBoxStats = (values: number[]) => {
      if (!values.length) return null;
      const sorted = values.slice().sort((a, b) => a - b);
      const q = (p: number) => {
        const pos = (sorted.length - 1) * p;
        const base = Math.floor(pos);
        const rest = pos - base;
        if (sorted[base + 1] !== undefined)
          return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
        return sorted[base];
      };

      return {
        month: '', // to fill in next step
        min: sorted[0],
        q1: q(0.25),
        median: q(0.5),
        q3: q(0.75),
        max: sorted[sorted.length - 1]
      };
    };

    const last12Months: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      last12Months.push(key);
    }

    const result = last12Months.map((monthKey) => {
      const values = boxPlotData.get(monthKey) || [];
      const stats = getBoxStats(values);
      if (!stats) return null;
      stats.month = monthKey;
      return stats;
    }).filter(Boolean);

    return result;
  };
    console.log('monthlyBoxData', monthlyBoxData);

    setMonthlyBoxData(getMonthlyPaceBoxPlotData());

    const indoor = runActivities.filter(a => a.trainer || a.treadmill).length;
    const outdoor = runActivities.length - indoor;
    setIndoorOutdoorData([
      { name: 'Indoor', value: indoor },
      { name: 'Outdoor', value: outdoor }
    ]);


  }, [activities]);

  function formatPace(val) {
    if (val == null || isNaN(val)) return '--:--';

    let minutes = Math.floor(val);
    let seconds = Math.round((val - minutes) * 60);

    if (seconds === 60) {
      minutes += 1;
      seconds = 0;
    }

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  const getIntensityColor = (miles?: number, darkMode = false) => {
      if (!miles) return darkMode ? '#2a2a2a' : '#e0e0e0';

      if (miles >= 10) return '#084594'; // darkest blue
      if (miles >= 6) return '#2171b5';
      if (miles >= 3) return '#4292c6';
      if (miles >= 1) return '#6baed6';
      return '#c6dbef'; // very light blue
    };

    const getRunHeatmapData = () => {
      const runMap = new Map<string, number>(); // date → miles

      activities
        .filter((act) => act.type === 'Run')
        .forEach((act) => {
          const dateStr = new Date(act.start_date_local).toISOString().split('T')[0];
          const miles = act.distance / 1609.34;
          runMap.set(dateStr, (runMap.get(dateStr) || 0) + miles);
        });

      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);

      // Start on the previous Sunday
      const startDate = new Date(oneYearAgo);
      startDate.setDate(startDate.getDate() - startDate.getDay());

      const endDate = new Date(today);
      const days: { date: string; miles?: number }[] = [];

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const iso = d.toISOString().split('T')[0];
        days.push({ date: iso, miles: runMap.get(iso) });
      }

      return days;
    };
    function getRaceEmoji(name) {
      switch (name) {
        case '1M': return '🏃‍♂️';
        case '5K': return '🏅';
        case '10K': return '🎽';
        case '10M': return '🥇';
        case 'Half': return '🏆';
        case 'Marathon': return '🎖️';
        default: return '🏃';
      }
    }
    function formatDuration(ms) {
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const milliseconds = ms % 1000;

      return `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}.${milliseconds.toString().padStart(3,'0')}`;
    }
    function formatTime(totalSeconds: number) {
      const hrs = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = Math.floor(totalSeconds % 60);
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    const hasNewPrThisWeek = useMemo(() => {
      if (!prs || prs.length === 0) return false;
      const now = new Date();
      const oneWeekAgo = new Date(now);
      oneWeekAgo.setDate(now.getDate() - 7);

      return prs.some(pr => {
        if (!pr.date) return false;
        const prDate = new Date(pr.date);
        return prDate >= oneWeekAgo && prDate <= now;
      });
    }, [prs]);

  return (

    <div className={darkMode ? 'container dark' : 'container'}>
      <header>
        <button onClick={toggleDarkMode}>
          {darkMode ? '☀️' : '🌙'}
        </button>
      </header>
      {/* New PR Banner */}
      {hasNewPrThisWeek && (
        <div
          style={{
            backgroundColor: darkMode ? '#4caf50' : '#d0f0c0',
            color: darkMode ? '#fff' : '#2e7d32',
            padding: '1rem',
            marginBottom: '1rem',
            borderRadius: '6px',
            fontWeight: 'bold',
            textAlign: 'center',
            boxShadow: darkMode
              ? '0 0 10px 2px rgba(76,175,80,0.7)'
              : '0 0 10px 2px rgba(144,238,144,0.7)',
          }}
        >
          🎉 Congrats! You set a new Personal Record this week! 🎉
        </div>
      )}

     <div
  style={{
    display: 'flex',
    gap: '2rem',
    marginBottom: '2rem',
    alignItems: 'flex-start',
  }}
>
  {/* Left column: Weekly + 30-Day summaries stacked vertically */}

  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: '0 0 300px' }}>
            {/* Summary card is wrapped in a Link */}
           
    {/* Weekly Summary Card */}
    {weeklySummary && (
      <Link to="/weekly" style={{ textDecoration: 'none' }}>
      <div
      className="card"
      style={{
        padding: '1rem',
        color: darkMode ? '#eee' : '#000',
        backgroundColor: darkMode ? '#222' : '#f9f9f9',
        boxShadow: darkMode
          ? '0 2px 6px rgba(0,0,0,0.8)'
          : '0 2px 6px rgba(0,0,0,0.1)',
        borderRadius: 8,
        cursor: 'pointer', // so it looks clickable
      }}
    >
        <h2>This Week's Summary</h2>
        <p><strong>Total Runs:</strong> {weeklySummary.runs}</p>
        <p><strong>Total Distance:</strong> {weeklySummary.distance} mi</p>
        <p><strong>Total Time:</strong> {weeklySummary.time}</p>
        <p><strong>Avg Heart Rate:</strong> {weeklySummary.avgHeartRate} bpm</p>
        <p>
          <strong>Avg Pace:</strong>{' '}
          {Math.floor(weeklySummary.avgPace)}:
          {Math.round((weeklySummary.avgPace % 1) * 60)
            .toString()
            .padStart(2, '0')} min/mi
        </p>
      </div>
    </Link>
    )}

    {rolling30DayStats && (
        <Link to="/monthly" style={{ textDecoration: 'none' }}>
          <div
            className="card"
            style={{
              padding: '1rem',
              color: darkMode ? '#eee' : '#000',
              backgroundColor: darkMode ? '#222' : '#f5f5f5',
              borderRadius: '8px',
              boxShadow: darkMode
                ? '0 2px 8px rgba(255, 255, 255, 0.1)'
                : '0 2px 8px rgba(0, 0, 0, 0.1)',
              cursor: 'pointer',
            }}
          >
            <h2>Rolling 30-Day Stats</h2>
            <p><strong>Total Runs:</strong> {rolling30DayStats.totalRuns30}</p>
            <p><strong>Total Distance:</strong> {rolling30DayStats.totalDistance30.toFixed(1)} mi</p>
            <p><strong>Total Time:</strong> {rolling30DayStats.totalTimeFormatted}</p>
            <p><strong>Avg Heart Rate:</strong> {rolling30DayStats.avgHeartRate30} bpm</p>
            <p>
              <strong>Avg Pace:</strong>{' '}
              {Math.floor(rolling30DayStats.avgPace30)}:
              {Math.round((rolling30DayStats.avgPace30 % 1) * 60)
                .toString()
                .padStart(2, '0')} min/mi
            </p>
          </div>
        </Link>
      )}
</div>

  {/* Right column: PRs Card */}
  <div
    className="card"
    style={{
      flex: 1,
      padding: '1rem',
      color: darkMode ? '#eee' : '#000',
      backgroundColor: darkMode ? '#222' : '#f9f9f9',
      boxShadow: darkMode
        ? '0 2px 6px rgba(0,0,0,0.8)'
        : '0 2px 6px rgba(0,0,0,0.1)',
      borderRadius: 8,
      maxHeight: 460,
      overflowY: 'auto',
    }}
  >
    <h2>Personal Records (PRs)</h2>
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {prs.map((pr) => {
        if (!pr.pace) {
          return (
            <li key={pr.name} style={{ marginBottom: '1rem', color: '#888' }}>
              {getRaceEmoji(pr.name)} {pr.name}: No record found
            </li>
          );
        }

        const paceMin = Math.floor(pr.pace);
        const paceSec = Math.round((pr.pace % 1) * 60)
          .toString()
          .padStart(2, '0');

        return (
          <li key={pr.name} style={{ marginBottom: '1rem' }}>
            <strong style={{ fontSize: '1.1rem' }}>
              {getRaceEmoji(pr.name)} {pr.name}: {paceMin}:{paceSec} min/mi
            </strong>
            <div style={{ fontSize: '0.9rem', color: '#555' }}>
              Distance: {pr.distance.toFixed(2)} mi | Title: {pr.title} | Date: {pr.date} | Time: {pr.movingTimeFormatted}
            </div>
          </li>
        );
      })}
    </ul>
  </div>
</div>



        <div style={{ flex: 1, minWidth: 300 }}>
          <h2>Annual Mileage</h2>
        {annualMileage.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={annualMileage}>
              <XAxis dataKey="year" />
              <YAxis />
              <Bar dataKey="miles" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {/*</div>*/}

    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem' }}>

       <div style={{ flex: 1, minWidth: 300, marginBottom: '2rem' }}>
        <h2>Pace Distribution</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={paceDistribution} layout="horizontal" margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#ccc'} />
            <XAxis dataKey="pace" type="number" domain={[6.5, 13.5]} tickFormatter={formatPace} stroke={darkMode ? '#eee' : '#333'} label={{ value: 'Pace (min/mi)', position: 'insideBottom', offset: -5 }} />
            <YAxis dataKey="count" type="number" stroke={darkMode ? '#eee' : '#333'} label={{ value: 'Runs', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', color: '#000' }}
              formatter={(value, name) => [`${value} runs`, 'Count']}
              labelFormatter={(label) => `Pace: ${formatPace(label)} min/mi`}
            />
            <Area dataKey="count" stroke="#8884d8" fill="#ddd" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
          <div style={{ flex: 1, minWidth: 300 }}>
        <h2>Pace vs Heart Rate</h2>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid stroke={darkMode ? '#444' : '#ccc'} />
            <XAxis
              dataKey="pace"
              name="Pace"
              stroke={darkMode ? '#eee' : '#333'}
              reversed
              type="number"
              domain={['dataMax + 1', 'dataMin - 1']}
              tickFormatter={(val) => {
                const min = Math.floor(val);
                const sec = Math.round((val - min) * 60);
                return `${min}:${sec.toString().padStart(2, '0')} min/mi`;
              }}
            />

            <YAxis
              dataKey="heartRate"
              name="Heart Rate"
              stroke={darkMode ? '#eee' : '#333'}
              type="number"
              domain={['dataMin - 10', 'dataMax + 10']}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#fff', color: '#000' }}
              formatter={(value, name, props) => {
                if (name === 'pace') {
                  const min = Math.floor(value);
                  const sec = Math.round((value - min) * 60);
                  return [`${min}:${sec.toString().padStart(2, '0')} min/mi`, 'Pace'];
                } else if (name === 'heartRate') {
                  return [`${value} bpm`, 'Heart Rate'];
                }
                return value;
              }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div style={{ backgroundColor: '#fff', color: '#000', padding: '0.5rem', borderRadius: 4 }}>
                      <p><strong>Date:</strong> {d.date}</p>
                      <p><strong>Title:</strong> {d.title}</p>
                      <p><strong>Distance:</strong> {d.distance} mi</p>
                      <p><strong>Time:</strong> {d.time} min</p>
                      <p><strong>Pace:</strong> {Math.floor(d.pace)}:{Math.round((d.pace % 1) * 60).toString().padStart(2, '0')} min/mi</p>
                      <p><strong>Heart Rate:</strong> {d.heartRate} bpm</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter name="Runs" data={paceHeartRate} fill="#8884d8" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

  <div style={{ flex: 1, minWidth: 300 }}>
          <h2>Workout Activity by Time of Day</h2>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={timeOfDay} cx="50%" cy="50%" outerRadius="80%">
            <PolarGrid stroke={darkMode ? '#444' : '#ccc'} />
            <PolarAngleAxis dataKey="name" stroke={darkMode ? '#eee' : '#333'} />
            <PolarRadiusAxis stroke={darkMode ? '#eee' : '#333'} />
            <Radar
              name="Runs"
              dataKey="count"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.6}
            />
            <Tooltip contentStyle={{ backgroundColor: '#fff', color: '#000' }} />
            <Legend />
          </RadarChart>

        </ResponsiveContainer>
      </div>
</div>

<div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
  <div style={{ flex: 1, minWidth: 300, maxWidth: '100%' }}>
  <h2>Run Distances</h2>
  <ResponsiveContainer width="100%" height={400}>
    <BarChart data={distanceCounts} layout="vertical" margin={{ top: 30, right: 30, left: 10, bottom: 40 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#ccc'} />
      <XAxis
        type="number"
        label={{ value: 'Runs', position: 'insideBottom', offset: -5 }}
        stroke={darkMode ? '#eee' : '#333'}
      />
      <YAxis
        type="category"
        dataKey="range"
        stroke={darkMode ? '#eee' : '#333'}
        width={80}
      />
      <Tooltip contentStyle={{ backgroundColor: '#fff', color: '#000' }} />
      <Legend />
      <Bar dataKey="count" fill="#ff7300" name="Number of Runs" />
    </BarChart>
  </ResponsiveContainer>
</div>

<div style={{ flex: 1, minWidth: 300 }}>
  <h2>Average Daily Mileage by Day</h2>
  <ResponsiveContainer width="100%" height={300}>
    <RadarChart data={mileageByDay} cx="50%" cy="50%" outerRadius="80%">
      <PolarGrid stroke={darkMode ? '#444' : '#ccc'} />
      <PolarAngleAxis dataKey="name" stroke={darkMode ? '#eee' : '#333'} />
      <PolarRadiusAxis stroke={darkMode ? '#eee' : '#333'} />
      <Radar
        name="Avg Miles"
        dataKey="miles"
        stroke="#82ca9d"
        fill="#82ca9d"
        fillOpacity={0.6}
      />
      <Tooltip contentStyle={{ backgroundColor: '#fff', color: '#000' }} />
      <Legend />
    </RadarChart>
  </ResponsiveContainer>
</div>

{/* Indoor vs Outdoor Pie Chart */}
  <div style={{ flex: 1, minWidth: 300 }}>
        <h2>Indoor vs Outdoor Runs</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={indoorOutdoorData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {indoorOutdoorData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={['#8884d8', '#82ca9d'][index % 2]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#fff', color: '#000' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      </div>

<div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
  <div style={{ flex: 1, minWidth: 300 }}>
    <h2>Temperature Distribution</h2>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={tempDistribution} margin={{ top: 30, right: 30, left: 10, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#444' : '#ccc'} />
        <XAxis dataKey="range" stroke={darkMode ? '#eee' : '#333'} angle={-45} textAnchor="end" interval={0} />
        <YAxis stroke={darkMode ? '#eee' : '#333'} label={{ value: 'Runs', angle: -90, position: 'insideLeft' }} />
        <Tooltip contentStyle={{ backgroundColor: '#fff', color: '#000' }} />
        <Bar dataKey="count" fill="#ff7f50" />
      </BarChart>
    </ResponsiveContainer>
  </div>

  <div className="card" style={{ flex: 1.5, minWidth: 300, overflowX: 'auto' }}>
    <h2>Year in Runs</h2>
    <div style={{ display: 'flex', gap: 2, minWidth: 365 }}>
      {(() => {
        const days = getRunHeatmapData();
        const weeks: { date: string; miles?: number }[][] = [];

        for (let i = 0; i < days.length; i += 7) {
          weeks.push(days.slice(i, i + 7));
        }

        return weeks.map((week, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {week.map(({ date, miles }) => (
              <div
                key={date}
                title={
                  miles
                    ? `${date} - ${miles.toFixed(1)} mi`
                    : `${date} - No run`
                }
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  backgroundColor: getIntensityColor(miles, darkMode),
                }}
              />
            ))}
          </div>
        ));
      })()}
    </div>
    <small style={{ marginTop: '0.5rem', display: 'block', color: darkMode ? '#ccc' : '#666' }}>
      Color intensity = run distance. Darker = longer runs.
    </small>
  </div>
</div>

{/*<div style={{ width: '100%' }}>
  <h2 style={{ color: darkMode ? '#fff' : '#000' }}>Pace Breakdown</h2>
  
  <ResponsiveContainer width="100%" height={400}>
  <ComposedChart
    data={monthlyBoxData}
    margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
  >
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="month" />
    <YAxis />
    <Tooltip />

    <Layer
      children={({ xAxisMap, yAxisMap }) => {
        const xScale = xAxisMap[0].scale;
        const yScale = yAxisMap[0].scale;

        return monthlyBoxData.map((entry, index) => {
          const x = xScale(entry.month);
          const boxTop = yScale(entry.q3);
          const boxHeight = yScale(entry.q1) - yScale(entry.q3);
          const medianY = yScale(entry.median);
          const minY = yScale(entry.min);
          const maxY = yScale(entry.max);

          return (
            <g key={index}>
              <rect
                x={x - 15} 
                y={boxTop}
                width={30}
                height={boxHeight}
                fill="#8884d8"
                stroke="#000"
              />
              <line
                x1={x - 15}
                x2={x + 15}
                y1={medianY}
                y2={medianY}
                stroke="#000"
                strokeWidth={2}
              />
              <line x1={x} x2={x} y1={minY} y2={yScale(entry.q1)} stroke="#000" />
              <line x1={x} x2={x} y1={yScale(entry.q3)} y2={maxY} stroke="#000" />
              <line x1={x - 10} x2={x + 10} y1={minY} y2={minY} stroke="#000" />
              <line x1={x - 10} x2={x + 10} y1={maxY} y2={maxY} stroke="#000" />
            </g>
          );
        });
      }}
    />
  </ComposedChart>
</ResponsiveContainer>
</div>*/}
</div>
  // );
)
}