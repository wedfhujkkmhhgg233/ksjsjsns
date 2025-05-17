const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

const uri = "mongodb+srv://jerome123:jerome123@cluster0.npjyg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let usersDB;
let connected = false;

async function connectDB() {
  if (connected) return;
  await client.connect();
  usersDB = client.db("simsimi").collection("users");
  await usersDB.createIndex({ username: 1 }, { unique: true });
  await usersDB.createIndex({ apiKey: 1 }, { unique: true });
  connected = true;
  console.log("Connected to MongoDB");
}

function generateApiKey() {
  return uuidv4().replace(/-/g, '') + uuidv4().slice(0, 8);
}

function generateToken(user) {
  return jwt.sign(
    { username: user.username, apiKey: user.apiKey },
    'jerdv472'
  );
}

async function signup(username, password) {
  const existing = await usersDB.findOne({ username });
  if (existing) throw new Error('Username already exists');

  const hashed = await bcrypt.hash(password, 10);
  const apiKey = generateApiKey();
  const now = Date.now();
  const newUser = {
    username,
    password: hashed,
    apiKey,
    usage: { sim: 0, teach: 0 },
    totalCalls: 0,
    lastReset: now,
    lastSimReset: now,
    lastTeachReset: now
  };

  await usersDB.insertOne(newUser);
  return {
    token: generateToken(newUser),
    apiKey
  };
}

async function login(username, password) {
  const user = await usersDB.findOne({ username });
  if (!user) throw new Error('User not found');

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error('Invalid password');

  return {
    token: generateToken(user),
    apiKey: user.apiKey
  };
}

async function authenticate(apiKey) {
  if (!apiKey) throw new Error('API key required');
  let user = await usersDB.findOne({ apiKey });
  if (!user) throw new Error('Invalid API key');

  const now = Date.now();
  const interval = 10 * 60 * 1000;

  if (now - user.lastReset > interval) {
    await usersDB.updateOne(
      { apiKey },
      {
        $set: {
          'usage.sim': 0,
          'usage.teach': 0,
          lastReset: now
        }
      }
    );
    user = await usersDB.findOne({ apiKey });
  }

  return user;
}

async function useSim(user) {
  const now = Date.now();
  const interval = 10 * 60 * 1000;

  if (now - user.lastSimReset > interval) {
    await usersDB.updateOne(
      { username: user.username },
      {
        $set: {
          'usage.sim': 0,
          lastSimReset: now
        }
      }
    );
    user.usage.sim = 0;
  }

  if (user.usage.sim >= 50) throw new Error('Sim usage limit exceeded (50/10min)');

  await usersDB.updateOne(
    { username: user.username },
    {
      $inc: {
        'usage.sim': 1,
        totalCalls: 1
      }
    }
  );
  return `Hello, ${user.username}!`;
}

async function useTeach(user) {
  const now = Date.now();
  const interval = 10 * 60 * 1000;

  if (now - user.lastTeachReset > interval) {
    await usersDB.updateOne(
      { username: user.username },
      {
        $set: {
          'usage.teach': 0,
          lastTeachReset: now
        }
      }
    );
    user.usage.teach = 0;
  }

  if (user.usage.teach >= 50) throw new Error('Teach usage limit exceeded (50/10min)');

  await usersDB.updateOne(
    { username: user.username },
    {
      $inc: {
        'usage.teach': 1,
        totalCalls: 1
      }
    }
  );
  return 'learned';
}

function getUserInfo(user) {
  return {
    username: user.username,
    apiKey: user.apiKey,
    usage: user.usage || { sim: 0, teach: 0 },
    totalCalls: user.totalCalls || 0,
    resetIn: Math.max(0, 600000 - (Date.now() - user.lastReset))
  };
}

async function getStatsAndRank(apiKey) {
  const user = await authenticate(apiKey);
  const allUsers = await usersDB.find({}).sort({ totalCalls: -1 }).toArray();

  const totalUsers = allUsers.length;
  const totalApiCalls = allUsers.reduce((sum, u) => sum + (u.totalCalls || 0), 0);

  const rank = allUsers.findIndex(u => u.apiKey === apiKey) + 1;

  const top20 = allUsers.slice(0, 20).map(u => ({
    username: u.username,
    totalCalls: u.totalCalls || 0
  }));

  return {
    totalUsers,
    totalApiCalls,
    yourRank: rank,
    yourTotalCalls: user.totalCalls || 0,
    top20
  };
}

module.exports = {
  connectDB,
  signup,
  login,
  authenticate,
  useSim,
  useTeach,
  getUserInfo,
  getStatsAndRank
};
