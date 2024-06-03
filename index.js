const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up rate limiting
const limiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many requests from this IP, please try again later.',
      status: 429
    });
  }
});

app.use(limiter);

// Route to fetch data from /sim endpoint
app.get('/sim', async (req, res) => {
  try {
    const response = await axios.get('http://65.108.103.151:20437/sim', {
      params: { query: req.query.query }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching data from /sim endpoint' });
  }
});

// Route to teach the API
app.get('/teach', async (req, res) => {
  const { ask, ans } = req.query;
  try {
    const response = await axios.get('https://sim-api-ctqz.onrender.com/teach', {
      params: { ask, ans }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Error teaching the API' });
  }
});

// Serve the main HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Block access to other routes if rate limit is exceeded
app.use((req, res, next) => {
  res.status(429).json({
    message: 'Too many requests from this IP, please try again later.',
    status: 429
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
