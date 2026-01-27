import express from 'express';
import { config } from 'dotenv';
import { emailService } from '../services/email.service';
import meetingRoutes, { initializeCalDAV } from './routes/meeting.routes';
import pumbleRoutes from './routes/pumble.routes';
import path from 'path';

config();

const app = express();
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../../public')));

// Initialize services
emailService.initialize();
console.log('✓ Email service initialized');

// Initialize CalDAV (optional - graceful failure)
initializeCalDAV();

// API Routes
app.use('/api/meeting', meetingRoutes);
app.use('/', pumbleRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'CalBridge API' });
});

// Manifest endpoint
app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, '../../manifest.json'));
});

// Static pages
app.get('/help', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/help.html'));
});

app.get('/install', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/install.html'));
});

app.get('/privacy-policy.htm', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/privacy-policy.html'));
});

// Serve main app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 CalBridge API Server running on port ${PORT}`);
  console.log(`\n🌐 Frontend: http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/meeting/create`);
});
