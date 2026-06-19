import { MongoClient } from 'mongodb';

const uri = process.env.BOXCRICKET_MONGODB_URI;
let client;
let clientPromise;

if (!uri) {
  throw new Error('Please add your Mongo URI to environment variables');
}

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
    const dbName = process.env.NODE_ENV === 'development' ? 'box_cricket_test' : 'box_cricket_db';
    const db = mongoClient.db(dbName);
    const collection = db.collection("history");

    const { id } = req.query;

    // GET HISTORY
    if (req.method === 'GET') {
      const historyData = await collection.find({}).sort({ date: -1 }).toArray();
      return res.status(200).json(historyData);
    }

    // SAVE/UPSERT MATCH
    if (req.method === 'POST') {
      const matchData = req.body;
      await collection.updateOne(
        { id: matchData.id },
        { $set: matchData },
        { upsert: true }
      );
      return res.status(201).json({ success: true, message: "Saved to MongoDB Atlas! 💾" });
    }

    // DELETE MATCH
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: "Missing match ID parameter" });
      await collection.deleteOne({ id: id });
      return res.status(200).json({ success: true, message: "Match deleted" });
    }

    return res.status(405).json({ message: "Method not allowed" }); // Fixed 450 code to 405
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}