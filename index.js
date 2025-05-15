const express = require('express');
const axios = require('axios');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3000;

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

    // Send the response immediately, without waiting for auto-teach to complete
    res.type('json').send(
      JSON.stringify(
        {
          author: 'Jerome',
          status: 200,
          respond: botResponse.respond || '🚧 𝗠𝗮𝗶𝗻𝘁𝗲𝗻𝗮𝗻𝗰𝗲 𝗔𝗹𝗲𝗿𝘁 🚧\n\n𝖳𝗁𝖾 𝖲𝗂𝗆𝗌𝗂𝗆𝗂 𝖽𝖺𝗍𝖺𝖻𝖺𝗌𝖾 𝗂𝗌 𝖼𝗎𝗋𝗋𝖾𝗇𝗍𝗅𝗒 𝖾𝗑𝗉𝖾𝗋𝗂𝖾𝗇𝖼𝗂𝗇𝗀 𝗂𝗌𝗌𝗎𝖾𝗌. 𝖯𝗅𝖾𝖺𝗌𝖾 𝖼𝗈𝗇𝗍𝖺𝖼𝗍 𝗎𝗌 𝖺𝗍 [https://www.facebook.com/JeromeExpertise] 𝗍𝗈 𝖺𝖽𝖽𝗋𝖾𝗌𝗌 𝗍𝗁𝗂𝗌 𝗉𝗋𝗈𝖻𝗅𝖾𝗆 𝗂𝗆𝗆𝖾𝖽𝗂𝖺𝗍𝖾𝗅𝗒. 𝖳𝗁𝖺𝗇𝗄 𝗒𝗈𝗎 𝖿𝗈𝗋 𝗒𝗈𝗎𝗋 𝗉𝖺𝗍𝗂𝖾𝗇𝖼𝖾! 💬✨',
          processingTime: measureProcessingTime(startTime),
        },
        null,
        2
      )
    );

(async () => {
  const tasks = [];

  // Simsimi API
  tasks.push(
    axios
      .post('https://api.simsimi.vn/v1/simtalk', `text=${encodeURIComponent(query)}&lc=ph&key=`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .then((res) => {
        if (res.data.message) {
          return teachBothAPIs(query, res.data.message);
        }
      })
  );

  // Markdevs69 v1
  tasks.push(
    axios
      .get(`https://markdevs69v2.onrender.com/api/sim/get/${encodeURIComponent(query)}`)
      .then((res) => {
        if (res.data.reply) {
          return teachBothAPIs(query, res.data.reply);
        }
      })
  );

  // Markdevs69 v2
  tasks.push(
    axios
      .get(`https://markdevs69v2.onrender.com/api/simv2/get/${encodeURIComponent(query)}`)
      .then((res) => {
        if (res.data.reply && res.data.reply.trim()) {
          return teachBothAPIs(query, res.data.reply);
        }
      })
  );

  // Markdevs69 v3
  tasks.push(
    axios
      .get(`https://markdevs69v2.onrender.com/api/sim/simv3`, { params: { type: 'ask', ask: query } })
      .then((res) => {
        if (res.data.answer) {
          return teachBothAPIs(query, res.data.answer);
        }
      })
  );

  // Fire all tasks in parallel and log results
  const results = await Promise.allSettled(tasks);
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.warn(`Auto-teach task ${i + 1} failed: ${result.reason.message}`);
    }
  });
})();
    
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
    // Fetch the teach response with fi.bot.hosting API
    const teachResponse = await axiosWithTimeout('http://fi3.bot-hosting.net:20422/teach', { ask, ans });

    // Teach the fi.bot.hosting API after fetching the response
    await teachBothAPIs(ask, ans);

    // Respond with the teach response
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
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
