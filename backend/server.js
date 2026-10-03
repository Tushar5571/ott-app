require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.warn('Warning: set JWT_SECRET in .env to a random text of 32+ characters.');
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Movies and sports still work even if the database is down
connectDB().catch((err) => console.error('Database connection failed:', err.message));