import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

// Helper: Get custom period start and end (UTC) from 8th 00:00:01 to next month's 7th 23:59:59
function getCustomPeriodBoundsUTC(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  let start, end;

  if(day < 8) {
    // Period from 8th of previous month to 7th of current month
    let startYear = year;
    let startMonth = month - 1;
    if(startMonth < 0) {
      startMonth = 11;
      startYear--;
    }
    start = new Date(Date.UTC(startYear, startMonth, 8, 0, 0, 1));
    end = new Date(Date.UTC(year, month, 7, 23, 59, 59));
  } else {
    // Period from 8th of current month to 7th of next month
    let endYear = year;
    let endMonth = month + 1;
    if(endMonth > 11) {
      endMonth = 0;
      endYear++;
    }
    start = new Date(Date.UTC(year, month, 8, 0, 0, 1));
    end = new Date(Date.UTC(endYear, endMonth, 7, 23, 59, 59));
  }

  // Previous period bounds
  const prevEnd = new Date(start.getTime() - 1000); // 1 second before current period start
  let prevStartYear = prevEnd.getUTCFullYear();
  let prevStartMonth = prevEnd.getUTCMonth() - 1;
  if(prevStartMonth < 0) {
    prevStartMonth = 11;
    prevStartYear--;
  }
  const prevStart = new Date(Date.UTC(prevStartYear, prevStartMonth, 8, 0, 0, 1));

  return { currentStart: start, currentEnd: end, prevStart, prevEnd };
}

// Mask usernames (first 2 letters + *** + last 2)
function maskUsername(username) {
  if (username.length <= 4) return username;
  return username.slice(0, 2) + '***' + username.slice(-2);
}

// === /api/leaderboard/rainbet ===
app.get('/api/leaderboard/rainbet', async (req, res) => {
  try {
    const { currentStart, currentEnd } = getCustomPeriodBoundsUTC();
    const startDateStr = currentStart.toISOString().split('T')[0];
    const endDateStr = currentEnd.toISOString().split('T')[0];
    const API_URL = `https://services.rainbet.com/v1/external/affiliates?start_at=${startDateStr}&end_at=${endDateStr}&key=t4IjvvBm6zWpOxXRpuYctyKRRUnhKzvL`;

    const response = await fetch(API_URL);
    const data = await response.json();
    let leaderboard = data.affiliates.map(entry => ({
      name: maskUsername(entry.username),
      wager: parseFloat(entry.wagered_amount)
    }));
    leaderboard.sort((a, b) => b.wager - a.wager);
    leaderboard = leaderboard.slice(0, 10);
    const prizes = [
      175, 100, 25, 0, 0, 0, 0, 0, 0, 0
    ].map((reward, i) => ({ position: i + 1, reward }));
    res.json({
      leaderboard,
      prizes,
      startTime: currentStart.toISOString(),
      endTime: currentEnd.toISOString()
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});

// === /api/prev-leaderboard/rainbet ===
app.get('/api/prev-leaderboard/rainbet', async (req, res) => {
  try {
    const { prevStart, prevEnd } = getCustomPeriodBoundsUTC();
    const prevStartDateStr = prevStart.toISOString().split('T')[0];
    const prevEndDateStr = prevEnd.toISOString().split('T')[0];
    const PREV_API_URL = `https://services.rainbet.com/v1/external/affiliates?start_at=${prevStartDateStr}&end_at=${prevEndDateStr}&key=t4IjvvBm6zWpOxXRpuYctyKRRUnhKzvL`;

    const response = await fetch(PREV_API_URL);
    const data = await response.json();
    let leaderboard = data.affiliates.map(entry => ({
      name: maskUsername(entry.username),
      wager: parseFloat(entry.wagered_amount)
    }));
    leaderboard.sort((a, b) => b.wager - a.wager);
    leaderboard = leaderboard.slice(0, 10);
    const prizes = [
      175, 100, 25, 0, 0, 0, 0, 0, 0, 0
    ].map((reward, i) => ({ position: i + 1, reward }));
    res.json({
      leaderboard,
      prizes,
      startTime: prevStart.toISOString(),
      endTime: prevEnd.toISOString()
    });
  } catch (error) {
    console.error('Error fetching previous leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch previous leaderboard data' });
  }
});

// === /api/countdown/rainbet ===
app.get('/api/countdown/rainbet', (req, res) => {
  const now = new Date();
  const { currentStart, currentEnd } = getCustomPeriodBoundsUTC(now);

  const total = currentEnd - currentStart;
  const remaining = currentEnd - now;
  const percentageLeft = Math.max(0, Math.min(100, (remaining / total) * 100));
  res.json({ percentageLeft: parseFloat(percentageLeft.toFixed(2)) });
});

// Rest of your code unchanged...

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
