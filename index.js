const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up rate limiting
const limiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many requests from this IP, please try again later.',
      status: 429
    });
  }
});

app.use(limiter);

// Function to handle API request with fallback
const fetchWithFallback = async (primaryUrl, backupUrl, params, timeout) => {
  try {
    const response = await axios.get(primaryUrl, { params, timeout });
    return response.data;
  } catch (error) {
    console.error(`Primary API (${primaryUrl}) failed:`, error.message);
    const response = await axios.get(backupUrl, { params });
    return response.data;
  }
};

// Route to fetch data from /sim endpoint
app.get('/sim', async (req, res) => {
  try {
    const data = await fetchWithFallback(
      'http://45.61.161.128:1658/sim', // Primary API
      'http://158.101.198.227:8084/sim', // Backup API
      { query: req.query.query },
      1000 // 1 seconds timeout for primary API
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data from /sim endpoint' });
  }
});

// Route to teach the API
app.get('/teach', async (req, res) => {
  const { ask, ans } = req.query;
  try {
    const data = await fetchWithFallback(
      'http://45.61.161.128:1658/teach', // Primary API
      'http://158.101.198.227:8084/teach', // Backup API
      { ask, ans },
      1000 // 1 seconds timeout for primary API
    );
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error teaching the API' });
  }
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
