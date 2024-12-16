const express = require('express');
const axios = require('axios');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3000;

// Rate limiting setup
const limiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 1000,
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

// Helper to measure processing time
const measureProcessingTime = (start) => {
  const end = process.hrtime(start);
  return `${(end[0] * 1e3 + end[1] / 1e6).toFixed(2)}ms`;
};

// Helper to teach the Bot Hosting API
const teachBotHostingAPI = async (ask, ans) => {
  const teachUrl = 'http://fi3.bot-hosting.net:20422/teach';
  try {
    await axios.get(teachUrl, { params: { ask, ans } });
  } catch (error) {
    console.error(`Teach failed for Bot Hosting API:`, error.message);
  }
};

// Route: /sim
app.get('/sim', async (req, res) => {
  const startTime = process.hrtime();
  const query = req.query.query;

  if (!query) {
    return res.status(400).json({
      author: 'Jerome',
      status: 400,
      message: 'Query parameter is required',
    });
  }

  try {
    // Fetch response from Bot Hosting API
    const simUrl = 'http://fi3.bot-hosting.net:20422/sim';
    const response = await axios.get(simUrl, { params: { query } });
    const botResponse = response.data;

    // Teach the Bot Hosting API in the background
    if (botResponse.respond) {
      await teachBotHostingAPI(query, botResponse.respond);
    }

    // Respond to the user
    res.type('json').send(
      JSON.stringify(
        {
          author: 'Jerome',
          status: 200,
          respond: botResponse.respond || 'No response from API',
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
      message: 'Error fetching data from the Bot Hosting API',
      error: error.message,
      processingTime: measureProcessingTime(startTime),
    });
  }
});

// Route: /teach
app.get('/teach', async (req, res) => {
  const startTime = process.hrtime();
  const { ask, ans } = req.query;

  if (!ask || !ans) {
    return res.status(400).json({
      author: 'Jerome',
      status: 400,
      message: 'Both "ask" and "ans" parameters are required',
    });
  }

  try {
    // Teach the Bot Hosting API
    await teachBotHostingAPI(ask, ans);

    res.type('json').send(
      JSON.stringify(
        {
          author: 'Jerome',
          status: 200,
          message: 'Successfully taught the Bot Hosting API',
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
      message: 'Error teaching the Bot Hosting API',
      error: error.message,
      processingTime: measureProcessingTime(startTime),
    });
  }
});

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
