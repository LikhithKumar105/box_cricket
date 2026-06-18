import { MongoClient } from 'mongodb';

// CHANGE THIS LINE:
const uri = process.env.BOXCRICKET_MONGODB_URI; // Matches your exact Vercel Environment Variable!
let client;
let clientPromise;

if (!uri) {
  throw new Error('Please add your Mongo URI to environment variables');
}

// Ensure the database connection is cached across serverless invocations
if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default async function handler(req, res) {
  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db("box_cricket_db"); // Name your database
    const collection = db.collection("history");

    // Handle GET requests (Loading history page)
    if (req.method === 'GET') {
      const historyData = await collection.find({}).sort({ date: -1 }).toArray();
      return res.status(200).json(historyData);
    }

    // Handle POST requests (Background auto-save)
    if (req.method === 'POST') {
      const matchData = req.body;
      // Using updateOne with upsert handles updates and insertions cleanly
      await collection.updateOne(
        { id: matchData.id },
        { $set: matchData },
        { upsert: true }
      );
      return res.status(201).json({ success: true, message: "Saved to MongoDB Atlas! 💾" });
    }

    return res.status(450).json({ message: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}