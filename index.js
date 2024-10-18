const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = 3000;

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

// Function to handle API request without timeout
const fetchData = async (url, params) => {
  try {
    const response = await axios.get(url, { params });
    return response.data;
  } catch (error) {
    throw new Error('Error fetching data');
  }
};

// Route to fetch data from /sim endpoint
app.get('/sim', async (req, res) => {
  try {
    const data = await fetchData(
      'http://fi4.bot-hosting.net:21809/sim/sim', // Backup API
      { query: req.query.query }
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
    const data = await fetchData(
      'http://fi4.bot-hosting.net:21809/sim/teach', // Backup API
      { ask, ans }
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

// Serve the commands HTML page
app.get('/commands', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'commands.html'));
});

// Serve the endpoints HTML page
app.get('/endpoints', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'endpoints.html'));
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
