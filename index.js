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

// Route: /sim with auto-teach functionality
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
    // Fetch response from FI Bot Hosting
    const simResponse = await axios.get('http://nova.hidencloud.com:25710/sim', {
      params: { query },
    });

    const botResponse = simResponse.data.respond || 'No response from FI Bot Hosting';

    // Proceed with auto-teach in the background
    (async () => {
      try {
        // Fetch Simsimi.vn response for teaching
        const simsimiResponse = await axios.post(
          'https://api.simsimi.vn/v1/simtalk',
          `text=${encodeURIComponent(query)}&lc=ph&key=`,
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          }
        );

        const teachMessage = simsimiResponse.data.message || 'No response from Simsimi';

        // Teach your own /teach endpoint
        await axios.get('http://nova.hidencloud.com:25710/teach', {
          params: { ask: query, ans: teachMessage },
        });
      } catch (error) {
        console.error(`Auto-teach failed for query "${query}":`, error.message);
      }
    })();

    // Respond to the user with FI Bot Hosting's response
    res.type('json').send(
      JSON.stringify(
        {
          author: 'Jerome',
          status: 200,
          respond: botResponse,
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
      message: 'Error fetching data from FI Bot Hosting',
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
    const teachResponse = await axios.get('http://nova.hidencloud.com:25710/teach', {
      params: { ask, ans },
    });

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
