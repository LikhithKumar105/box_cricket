import express from 'express';
import dotenv from 'dotenv';
import path from 'path';

// 1. Instantly register env variables BEFORE loading the API controllers
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Force fallback environment check flags
process.env.NODE_ENV = 'development';

// 2. Dynamically import your Vercel route handlers AFTER configuration is complete
const { default: teamsHandler } = await import('./api/teams.js');
const { default: historyHandler } = await import('./api/history.js');

const app = express();
app.use(express.json());

// Helper to mimic Vercel parameters
const handleVercel = (handler) => async (req, res) => {
  const vercelRes = {
    status: (statusCode) => ({
      json: (data) => res.status(statusCode).json(data)
    })
  };
  try {
    await handler(req, vercelRes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.all('/api/teams', handleVercel(teamsHandler));
app.all('/api/history', handleVercel(historyHandler));

// Use port 5050 to fully avoid Mac AirPlay receiver port hijacking bugs!
const PORT = 5050; 
app.listen(PORT, () => {
  console.log(`\n🚀 Dev Backend Active at: http://localhost:${PORT}`);
  console.log(`🎯 Targeting Database: box_cricket_test`);
  console.log(`🔑 URI Loaded: ${process.env.BOXCRICKET_MONGODB_URI ? "✅ Yes" : "❌ No"}\n`);
});