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

async function connectDB() {
  if (!client.topology?.isConnected()) {
    await client.connect();
    usersDB = client.db("simsimi").collection("users");

    await Promise.all([
      usersDB.createIndex({ username: 1 }),
      usersDB.createIndex({ apiKey: 1 }),
    ]);

    console.log("Connected to MongoDB");
  }
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
  const existing = await usersDB.findOne({ username }, { projection: { _id: 1 } });
  if (existing) throw new Error('Username already exists');

  const hashed = await bcrypt.hash(password, 10);
  const apiKey = generateApiKey();
  const newUser = {
    username,
    password: hashed,
    apiKey,
    usage: { sim: 0, teach: 0 },
    totalUsage: 0,
    lastReset: Date.now(),
    lastSimReset: Date.now(),
    lastTeachReset: Date.now()
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
  const interval = 600_000;

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
    user.usage.sim = 0;
    user.usage.teach = 0;
    user.lastReset = now;
  }

  return user;
}

async function useSim(user) {
  const now = Date.now();
  const interval = 600_000;

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
    user.lastSimReset = now;
  }

  if (user.usage.sim >= 50) {
    throw new Error('Sim usage limit exceeded (50/10min)');
  }

  await usersDB.updateOne(
    { username: user.username },
    {
      $inc: {
        'usage.sim': 1,
        totalUsage: 1
      }
    }
  );

  return `Hello, ${user.username}!`;
}

async function useTeach(user) {
  const now = Date.now();
  const interval = 600_000;

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
    user.lastTeachReset = now;
  }

  if (user.usage.teach >= 50) {
    throw new Error('Teach usage limit exceeded (50/10min)');
  }

  await usersDB.updateOne(
    { username: user.username },
    {
      $inc: {
        'usage.teach': 1,
        totalUsage: 1
      }
    }
  );

  return 'learned';
}

function getUserInfo(user) {
  return {
    username: user.username,
    apiKey: user.apiKey,
    usage: user.usage,
    resetIn: Math.max(0, 600000 - (Date.now() - user.lastReset))
  };
}

function formatCount(num) {
  if (num < 1000) return num.toString();

  const suffixes = ['', 'k', 'M', 'B', 'T', 'P', 'E', 'Z', 'Y'];
  const tier = Math.floor(Math.log10(num) / 3);

  if (tier >= suffixes.length) {
    return num.toExponential(2); // fallback if number is *too* big
  }

  const suffix = suffixes[tier];
  const scale = Math.pow(10, tier * 3);
  const scaled = num / scale;

  return scaled.toFixed(1).replace(/\.0$/, '') + suffix;
}

async function getRanking(apiKey) {
  const user = await usersDB.findOne({ apiKey });
  if (!user) throw new Error('Invalid API key');

  const [totalUsers, totalApiCalls, rankList] = await Promise.all([
    usersDB.countDocuments(),
    usersDB.aggregate([{ $group: { _id: null, total: { $sum: "$totalUsage" } } }]).toArray(),
    usersDB.find({}, { projection: { username: 1 } }).sort({ totalUsage: -1 }).toArray()
  ]);

  const topUsersRaw = await usersDB.find({}, { projection: { username: 1, totalUsage: 1, _id: 0 } })
    .sort({ totalUsage: -1 }).limit(20).toArray();

  const topUsers = topUsersRaw.map(u => ({
    username: u.username,
    totalUsage: formatCount(u.totalUsage)
  }));

  const yourRank = rankList.findIndex(u => u.username === user.username) + 1;

  return {
    yourRank,
    totalUsers,
    totalApiCalls: totalApiCalls[0]?.total || 0,
    totalRequestUser: user.totalUsage,
    currentUsername: user.username,
    topUsers
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
  getRanking
};
