const express = require('express');
const axios = require('axios');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3000;

// Set up rate limiting
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

// Helper function to measure processing time
const measureProcessingTime = (start) => {
  const end = process.hrtime(start);
  return `${(end[0] * 1e3 + end[1] / 1e6).toFixed(2)}ms`;
};

// Helper function for fallback mechanism
const fetchWithFallback = async (primaryUrl, backupUrl, params) => {
  try {
    const response = await axios.get(primaryUrl, { params });
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

// Route: /sim with fallback and auto-teach functionality
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
    // Fetch response from the fi.bot.hosting API (primary)
    const botResponse = await fetchWithFallback(
      'http://fi3.bot-hosting.net:20422/sim',
      'http://fi3.bot-hosting.net:20422/sim', // Only fi.bot.hosting is used
      { query }
    );

    // Auto-teach in the background
    (async () => {
      try {
        const simsimiResponse = await axios.post(
          'https://api.simsimi.vn/v1/simtalk',
          `text=${encodeURIComponent(query)}&lc=ph&key=`,
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const teachMessage = simsimiResponse.data.message;

        if (teachMessage) {
          // Teach the fi.bot.hosting API only if a valid message is returned
          await teachBothAPIs(query, teachMessage);
        } else {
          console.warn(`Simsimi returned no valid response for query "${query}". Skipping teaching.`);
        }
      } catch (error) {
        console.error(`Auto-teach failed for query "${query}":`, error.message);
      }
    })();

    // Respond to the user with the bot's response
    res.type('json').send(
      JSON.stringify(
        {
          author: 'Jerome',
          status: 200,
          respond: botResponse.respond || 'No response from the API',
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
      message: 'Error fetching data from the API',
      error: error.message,
      processingTime: measureProcessingTime(startTime),
    });
  }
});

// Route: /teach with fallback mechanism for teaching response
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
    // Helper function to fetch teach response from fi.bot.hosting API
    const fetchTeachResponse = async (ask, ans) => {
      const url = 'http://fi3.bot-hosting.net:20422/teach'; // Only using fi.bot.hosting API
      try {
        const response = await axios.get(url, { params: { ask, ans } });
        return response.data;
      } catch (error) {
        console.warn(`Teach API failed: ${error.message}.`);
        throw new Error('Teach API failed');
      }
    };

    // Fetch the teach response with fi.bot.hosting API
    const teachResponse = await fetchTeachResponse(ask, ans);

    // Teach the fi.bot.hosting API after fetching the response
    await teachBothAPIs(ask, ans);

    // Respond with the teach response
    res.type('json').send(
      JSON.stringify(
        {
          author: 'Jerome',
          status: 200,
          message: 'Successfully taught the API',
          teachResponse,
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
      message: 'Error teaching the API',
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
