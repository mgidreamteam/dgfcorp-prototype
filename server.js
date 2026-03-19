import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

// Load .env.local if it exists (for local development)
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

const allowedOrigins = [
  'http://localhost:3000',
  'https://mgidream.com',
  'https://www.mgidream.com',
  'https://studio.mgidream.com',
  'https://mgi-d-r-e-a-m-16824413345.us-west1.run.app'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Google Gen AI
// Use DREAM_API as requested, falling back to GEMINI_API_KEY for local compatibility if needed
const apiKey = process.env.DREAM_API || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("WARNING: DREAM_API environment variable is not set. Gemini API calls will fail.");
}

// API Endpoint for Gemini
app.post('/api/gemini', async (req, res) => {
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API is not configured on the server.' });
  }
  
  try {
    const aiLocal = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'Referer': 'https://studio.mgidream.com/'
        }
      }
    });

    const { model, contents, config } = req.body;
    
    if (!model || !contents) {
      return res.status(400).json({ error: 'Model and contents are required' });
    }

    const response = await aiLocal.models.generateContent({
      model,
      contents,
      config,
    });

    res.json(response);
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test' || fs.existsSync(path.join(__dirname, 'dist'))) {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
