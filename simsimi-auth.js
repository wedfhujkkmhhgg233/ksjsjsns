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
  await client.connect();
  usersDB = client.db("simsimi").collection("users");
  await usersDB.createIndex({ username: 1 });
  await usersDB.createIndex({ apiKey: 1 });
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
  const newUser = {
    username,
    password: hashed,
    apiKey,
    usage: { sim: 0, teach: 0 },
    lastReset: Date.now()
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
  const interval = 10 * 60 * 1000; // 10 minutes

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
    // Re-fetch user to get fresh usage counts and lastReset
    user = await usersDB.findOne({ apiKey });
  }

  return user;
}
  
async function useSim(user) {
  const result = await usersDB.findOneAndUpdate(
    {
      username: user.username,
      'usage.sim': { $lt: 50 }
    },
    { $inc: { 'usage.sim': 1 } },
    { returnDocument: 'after' }
  );

  if (!result.value) throw new Error('Sim usage limit exceeded (50/10min)');
  user.usage.sim = result.value.usage.sim;
  return `Hello, ${user.username}!`;
}

async function useTeach(user) {
  const result = await usersDB.findOneAndUpdate(
    {
      username: user.username,
      'usage.teach': { $lt: 50 }
    },
    { $inc: { 'usage.teach': 1 } },
    { returnDocument: 'after' }
  );

  if (!result.value) throw new Error('Teach usage limit exceeded (50/10min)');
  user.usage.teach = result.value.usage.teach;
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

module.exports = {
  connectDB,
  signup,
  login,
  authenticate,
  useSim,
  useTeach,
  getUserInfo
};
