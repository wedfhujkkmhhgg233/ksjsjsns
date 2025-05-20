const express = require('express');
const axios = require('axios');
const path = require('path');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const bodyParser = require('body-parser');
const auth = require('./simsimi-auth');
const http = require('http');
const WebSocket = require('ws');
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;

auth.connectDB();

// Set up rate limiting
const limiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 500,
  handler: (req, res) => {
    res.status(429).json({
      author: 'Jerome',
      status: 429,
      message: 'Too many requests from this IP, please try again later.',
    });
  },
});

app.use(express.json());
app.use(limiter);

// Helper function to measure processing time
const measureProcessingTime = (start) => {
  const end = process.hrtime(start);
  return `${(end[0] * 1e3 + end[1] / 1e6).toFixed(2)}ms`;
};

// Helper function to perform a GET request with a timeout
const axiosWithTimeout = async (url, params, timeout = 7000) => {
  try {
    const response = await axios.get(url, { params, timeout });
    return response;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('API request timed out');
    }
    throw error;
  }
};

// Helper function for fallback mechanism (with axios only)
const fetchWithFallback = async (primaryUrl, backupUrl, params) => {
  try {
    const response = await axiosWithTimeout(primaryUrl, params);
    return response.data;
  } catch (error) {
    console.warn(`Primary API failed: ${error.message}. Trying backup API.`);
    const response = await axios.get(backupUrl, { params });
    return response.data;
  }
};

// Helper function to teach both APIs
const teachBothAPIs = async (ask, ans) => {
  const url = 'http://fi3.bot-hosting.net:20422/teach'; // Only using fi.bot.hosting API
  try {
    await axios.get(url, { params: { ask, ans } });
  } catch (error) {
    console.error(`Teach failed for ${url}:`, error.message);
  }
};

// WebSocket Routing
wss.on('connection', (ws, req) => {
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      const apiKey = data.apiKey;
      const type = data.type;

      // Authenticate once
      const user = await auth.authenticate(apiKey);
      ws.user = user;

      // Respond based on the requested type
      if (type === 'userinfo') {
        const info = auth.getUserInfo(user);
        ws.send(JSON.stringify({ type: 'userinfo', data: info }));

        // Optional: live update every 10s
        const interval = setInterval(() => {
          const updated = auth.getUserInfo(ws.user);
          ws.send(JSON.stringify({ type: 'userinfo', data: updated }));
        }, 10000);

        ws.on('close', () => clearInterval(interval));

      } else if (type === 'ranking') {
        const stats = await auth.getRanking(apiKey);
        ws.send(JSON.stringify({ type: 'ranking', data: stats }));

        const interval = setInterval(async () => {
          const updatedStats = await auth.getRanking(apiKey);
          ws.send(JSON.stringify({ type: 'ranking', data: updatedStats }));
        }, 10000);

        ws.on('close', () => clearInterval(interval));
      }

    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: e.message }));
    }
  });
});

app.post('/api/auth', async (req, res) => {
const { username, password, mode } = req.body;

try {
if (mode === 'signup') {
const result = await auth.signup(username, password);
return res.json(result);
}
if (mode === 'login') {
const result = await auth.login(username, password);
return res.json(result);
}
res.status(400).json({ error: 'Invalid mode' });
} catch (e) {
res.status(400).json({ error: e.message });
}
});

app.get('/api/userinfo', async (req, res) => {
try {
const user = await auth.authenticate(req.headers['x-api-key']);
const info = auth.getUserInfo(user);
res.json(info);
} catch (e) {
res.status(403).json({ error: e.message });
}
});

app.get('/api/ranking', async (req, res) => {
  try {
    const stats = await auth.getRanking(req.headers['x-api-key']);
    res.json(stats);
  } catch (e) {
    res.status(403).json({ error: e.message });
  }
});

// Route: /sim with fallback and auto-teach functionality
app.get('/sim', async (req, res) => {
  const startTime = process.hrtime();
  const query = req.query.query;
  const apiKey = req.query.apikey;

if (!query || !apiKey) {
  return res
    .type('json')
    .status(400)
    .send(JSON.stringify({
      author: 'Jerome',
      status: 400,
      message: 'Both query and apikey parameters are required',
    }, null, 2));
}
  
  try {
    const user = await auth.authenticate(apiKey);

    // Enforce usage limit before proceeding
    await auth.useSim(user);

    // Fetch response from primary Simsimi API
    const botResponse = await fetchWithFallback(
      'http://fi3.bot-hosting.net:20422/sim',
      'http://fi3.bot-hosting.net:20422/sim',
      { query }
    );

    res.type('json').send(JSON.stringify({
      author: 'Jerome',
      status: 200,
      respond: botResponse.respond || 'Fallback response',
      processingTime: measureProcessingTime(startTime),
    }, null, 2));

    // Start auto-teach in background (unchanged)
    (async () => {
      const tasks = [];

      tasks.push(
        axios.post('https://api.simsimi.vn/v1/simtalk', 
          `text=${encodeURIComponent(query)}&lc=ph&key=`, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }).then(res => {
          if (res.data.message) teachBothAPIs(query, res.data.message);
        })
      );

      tasks.push(
        axios.get(`https://markdevs69v2.onrender.com/api/sim/get/${encodeURIComponent(query)}`)
          .then(res => {
            if (res.data.reply) teachBothAPIs(query, res.data.reply);
          })
      );

      tasks.push(
        axios.get(`https://markdevs69v2.onrender.com/api/simv2/get/${encodeURIComponent(query)}`)
          .then(res => {
            if (res.data.reply?.trim()) teachBothAPIs(query, res.data.reply);
          })
      );

      tasks.push(
        axios.get('https://markdevs69v2.onrender.com/api/sim/simv3', {
          params: { type: 'ask', ask: query }
        }).then(res => {
          if (res.data.answer) teachBothAPIs(query, res.data.answer);
        })
      );

      const results = await Promise.allSettled(tasks);
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          console.warn(`Auto-teach task ${i + 1} failed: ${result.reason?.message}`);
        }
      });
    })();

  } catch (error) {
    res.status(500).json({
      author: 'Jerome',
      status: 500,
      message: error.message || 'Internal server error',
      processingTime: measureProcessingTime(startTime),
    });
  }
});

// Route: /teach with fallback mechanism for teaching response
app.get('/teach', async (req, res) => {
  const startTime = process.hrtime();
  const { ask, ans, apikey } = req.query;

  if (!ask || !ans || !apikey) {
  return res
    .type('json')
    .status(400)
    .send(JSON.stringify({
      author: 'Jerome',
      status: 400,
      message: 'Parameters "ask", "ans", and "apikey" are required',
    }, null, 2)); // Pretty-print with 2 spaces
}
  
  try {
    // Authenticate the user
    const user = await auth.authenticate(apikey);

    // Apply teach usage logic
    await auth.useTeach(user);

    // Teach to fi.bot.hosting API
    const teachResponse = await axiosWithTimeout('http://fi3.bot-hosting.net:20422/teach', { ask, ans });

    // Optionally teach to a second API
    await teachBothAPIs(ask, ans);

    // Respond
    res.type('json').send(
      JSON.stringify(
        {
          author: 'Jerome',
          status: 200,
          message: 'Successfully taught the API',
          teachResponse: teachResponse.data,
          processingTime: measureProcessingTime(startTime),
        },
        null,
        2
      )
    );
  } catch (error) {
    res.status(500).json({
      author: 'Jerome',
      status: 500,
      message: error.message || 'Error teaching the API',
      processingTime: measureProcessingTime(startTime),
    });
  }
});

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/commands', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'commands.html'));
});
app.get('/endpoints', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'endpoints.html'));
});
app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

// Middleware to handle 404 errors
app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
