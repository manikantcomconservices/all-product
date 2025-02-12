const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');
const app = express();
require('dotenv').config();

const PORT = 3000;
const allowedOrigins = ['https://www.comcon.co.in', 'http://192.168.68.68:5500'];

app.use(cors(
    {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    }
));

app.use(bodyParser.json());

// Authenticate with Google Sheets API
const auth = new google.auth.GoogleAuth({

    credentials: {
        type: process.env.TYPE,
        project_id: process.env.PROJECT_ID,
        private_key_id: process.env.PRIVATE_KEY_ID,
        private_key: process.env.PRIVATE_KEY,
        client_email: process.env.CLIENT_EMAIL,
        client_id: process.env.CLIENT_ID,
        auth_uri: process.env.AUTH_URL,
        token_uri: process.env.TOEKN_URL,
        auth_provider_x509_cert_url: process.env.AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: process.env.CLIENT_X509_CERT_URL,
        universe_domain: process.env.UNIVERSE_DOMAIN,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

const spreadsheetId = process.env.SPREADSHEETID;

// Add this route before other API routes
app.get('/', (req, res) => {
    res.send('<h1>API working</h1><p>Visit <a href="https://www.comcon.co.in" target="_blank">https://www.comcon.co.in</a></p>'); // Sends an HTML response
});

// Get all categories (dropdown options)
app.get('/api/categories', async (req, res) => {
    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });
        const range = 'Sheet1!E1:Z1'; // Adjust based on the number of columns

        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        const categories = response.data.values[0];

        res.json({ categories });
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Search based on dropdown selection
app.post('/api/search', async (req, res) => {
    const { category } = req.body;
    if (!category) return res.status(400).json({ error: 'Category is required' });

    try {
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });
        const range = 'Sheet1!A:Z'; // Adjust the range

        const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
        const rows = response.data.values;

        if (!rows || rows.length < 2) return res.status(404).json({ error: 'No data found' });

        const headers = rows[0]; // First row contains column names
        const categoryIndex = headers.indexOf(category);
        if (categoryIndex === -1) return res.status(400).json({ error: 'Invalid category' });

        const filteredData = rows.slice(1).filter(row => row[categoryIndex] === '1').map(row => ({
            currentSuppliers: row[0] || '',
            possibleSuppliers: row[1] || '',
            industries: row[2] || '',
            technology: row[3] || ''
        }));

        res.json({ results: filteredData });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start the Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
