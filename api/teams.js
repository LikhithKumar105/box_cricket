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
    // Environment switching
    const dbName = process.env.NODE_ENV === 'development' ? 'box_cricket_test' : 'box_cricket_db';
    const db = mongoClient.db(dbName);
    const collection = db.collection("teams");

    const { id } = req.query; // Extracts ?id= from the incoming fetch URL

    // 1. GET ALL TEAMS
    if (req.method === 'GET') {
      const teams = await collection.find({}).toArray();
      return res.status(200).json(teams);
    }

    // 2. CREATE TEAM
    if (req.method === 'POST') {
      const teamData = req.body;
      await collection.insertOne(teamData);
      return res.status(201).json({ success: true, message: "Team created" });
    }

    // 3. UPDATE TEAM
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: "Missing team ID parameter" });
      const updateData = req.body;
      
      // Make sure we don't accidentally update the unique structural string ID field itself
      delete updateData._id; 
      delete updateData.id;

      await collection.updateOne({ id: id }, { $set: updateData });
      return res.status(200).json({ success: true, message: "Team updated" });
    }

    // 4. DELETE TEAM
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: "Missing team ID parameter" });
      await collection.deleteOne({ id: id });
      return res.status(200).json({ success: true, message: "Team deleted" });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}