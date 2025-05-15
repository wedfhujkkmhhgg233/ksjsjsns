// simsimi-auth.js

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

  const user = await usersDB.findOne({ apiKey });
  if (!user) throw new Error('Invalid API key');

  const now = Date.now();
  const interval = 10 * 60 * 1000; // 10 minutes

  if (now - user.lastReset > interval) {
    user.usage.sim = 0;
    user.usage.teach = 0;
    user.lastReset = now;
    await usersDB.updateOne({ apiKey }, {
      $set: {
        usage: user.usage,
        lastReset: now
      }
    });
  }

  return user;
}

async function useSim(user) {
  if (user.usage.sim >= 50) throw new Error('Sim usage limit exceeded (50/10min)');
  await usersDB.updateOne({ username: user.username }, { $inc: { 'usage.sim': 1 } });
  return `Hello, ${user.username}!`;
}

async function useTeach(user) {
  if (user.usage.teach >= 50) throw new Error('Teach usage limit exceeded (50/10min)');
  await usersDB.updateOne({ username: user.username }, { $inc: { 'usage.teach': 1 } });
  return 'learned';
}

function getUserInfo(user) {
  return {
    username: user.username,
    apiKey: user.apiKey,
    usage: user.usage,
    resetIn: 600000 - (Date.now() - user.lastReset)
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
