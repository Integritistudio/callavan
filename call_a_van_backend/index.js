const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const authRoutes = require('./routes/authRoutes');
const initializeDatabase = require('./config/dbInit');
const db = require('./config/db');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON body parsers
app.use(cors());
// Set JSON body limit to 10mb to safely accept base64 image strings
app.use(express.json({ limit: '10mb' }));

// Serve static images from the public/uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Auto-initialize PostgreSQL tables on startup
initializeDatabase();

// Server health-check route
app.get('/', (req, res) => {
  res.json({ status: 'success', message: 'Call-A-Van Backend Server is running!' });
});

// Bind auth routes under /api/drivers prefix
app.use('/api/drivers', authRoutes);

// Bind io instance to app so express controllers can access it
app.set('io', io);

// WebSocket Real-Time Tracking Core Hub
io.on('connection', (socket) => {
  console.log(`🔌 [WebSocket] Client connected: ${socket.id}`);

  // Listen to coordinate streams from active live drivers
  socket.on('update_location', async (data) => {
    try {
      const { driverId, latitude, longitude } = data;
      if (!driverId || latitude === undefined || longitude === undefined) {
        return;
      }

      // Store driverId in this socket session so we can auto-cleanup on disconnect
      socket.driverId = driverId;

      // Upsert position to decoupled tracking table, setting both is_live and is_logged_in to true
      const upsertQuery = `
        INSERT INTO driver_locations (driver_id, latitude, longitude, is_live, is_logged_in, last_active)
        VALUES ($1, $2, $3, true, true, NOW())
        ON CONFLICT (driver_id) 
        DO UPDATE SET 
          latitude = EXCLUDED.latitude, 
          longitude = EXCLUDED.longitude, 
          is_live = true, 
          is_logged_in = true,
          last_active = NOW();
      `;
      await db.query(upsertQuery, [driverId, latitude, longitude]);

      // Broadcast coordinate change to all other connected client sockets instantly
      socket.broadcast.emit('driver_location_changed', {
        driverId,
        latitude,
        longitude,
        isLive: true
      });

    } catch (error) {
      console.error('❌ [WebSocket] Failed to process update_location:', error);
    }
  });

  // Listen for driver manually going online
  socket.on('go_live', async (data) => {
    try {
      const { driverId } = data;
      if (!driverId) return;

      // Store driverId in this socket session for disconnect cleanup
      socket.driverId = driverId;

      // Upsert to ensure driver has location record with is_live = true
      const upsertQuery = `
        INSERT INTO driver_locations (driver_id, is_live, is_logged_in, last_active)
        VALUES ($1, true, true, NOW())
        ON CONFLICT (driver_id) 
        DO UPDATE SET 
          is_live = true, 
          is_logged_in = true,
          last_active = NOW();
      `;
      await db.query(upsertQuery, [driverId]);

      // Broadcast status change
      io.emit('driver_status_changed', { driverId, isLive: true });
      console.log(`🔌 [WebSocket] Driver ${driverId} went online manually.`);
    } catch (error) {
      console.error('❌ [WebSocket] Failed to process go_live:', error);
    }
  });

  // Listen for driver manually going offline (without disconnecting socket)
  socket.on('go_offline', async (data) => {
    try {
      const { driverId } = data;
      if (!driverId) return;

      // Update location table: set is_live = false, but keep is_logged_in = true
      await db.query('UPDATE driver_locations SET is_live = false WHERE driver_id = $1', [driverId]);

      // Broadcast status change
      io.emit('driver_status_changed', { driverId, isLive: false });
      console.log(`🧹 [WebSocket] Driver ${driverId} went offline manually.`);
    } catch (error) {
      console.error('❌ [WebSocket] Failed to process go_offline:', error);
    }
  });

  // Auto-cleanup on client disconnect (app close, lost cell reception, battery death)
  socket.on('disconnect', async () => {
    console.log(`🔌 [WebSocket] Client disconnected: ${socket.id}`);
    if (socket.driverId) {
      try {
        // Set is_live = false, but KEEP is_logged_in = true (so they show as offline on map)
        await db.query('UPDATE driver_locations SET is_live = false WHERE driver_id = $1', [socket.driverId]);
        
        // Broadcast that this driver went offline
        io.emit('driver_status_changed', { driverId: socket.driverId, isLive: false });
        console.log(`🧹 [WebSocket] Driver ${socket.driverId} marked offline dynamically on disconnect.`);
      } catch (err) {
        console.error('❌ [WebSocket] Failed to mark driver offline on disconnect:', err);
      }
    }
  });
});

// Start HTTP and WebSocket server listening
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
