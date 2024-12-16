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

// Helper function to handle teaching
const teachAPI = async (ask, ans) => {
  const teachUrl = 'http://fi3.bot-hosting.net:20422/teach';
  try {
    const response = await axios.get(teachUrl, { params: { ask, ans } });
    return response.data;
  } catch (error) {
    console.error(`Teach API failed: ${error.message}`);
    throw new Error('Error teaching the API.');
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
    // Fetch response from the bot API
    const botResponse = await axios.get('http://fi3.bot-hosting.net:20422/sim', {
      params: { query },
    });

    const botMessage = botResponse.data.respond || 'No response from the API';

    // Auto-teach in the background
    (async () => {
      try {
        // Simulate a logic to determine an appropriate response (replace with your actual logic)
        const autoTeachMessage = `Simulated response for: "${query}"`;
        if (autoTeachMessage) {
          await teachAPI(query, autoTeachMessage);
        }
      } catch (error) {
        console.error(`Auto-teach failed for query "${query}":`, error.message);
      }
    })();

    // Respond with the bot's message
    res.type('json').send(
      JSON.stringify(
        {
          author: 'Jerome',
          status: 200,
          respond: botMessage,
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
    // Teach the API and get the response
    const teachResponse = await teachAPI(ask, ans);

    // Respond with the teachResponse
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
