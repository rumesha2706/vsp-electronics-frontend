import 'zone.js/node';
import express, { Request, Response } from 'express';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import axios from 'axios';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env['PORT'] || 4000;
const DIST_FOLDER = join(process.cwd(), 'dist/vsp-electronics/browser');
const UPLOAD_DIR = join(process.cwd(), 'public/assets/images/products/uploads');

// Create HTTP server for Socket.io
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Real-time viewer tracking
const viewers = new Map<number, Set<string>>();  // productId -> Set of socketIds
let activeUsers = 0;
const userSessions = new Map<string, number>();  // socketId -> productId

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Middleware
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files
app.use(express.static(join(DIST_FOLDER, 'browser'), { maxAge: '1y' }));

// API Endpoints for Image Management

// Download image from URL and save locally
app.post('/api/images/download-from-url', async (req: Request, res: Response) => {
  try {
    const { imageUrl, altText, productId } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    // Validate URL
    try {
      new URL(imageUrl);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format'
      });
    }

    // Download image from URL
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000
    });

    // Get file extension from URL or default to jpg
    const urlPath = new URL(imageUrl).pathname;
    let extension = '.jpg';
    const match = urlPath.match(/\.\w+$/);
    if (match) {
      extension = match[0];
    }

    // Check content-type header if no extension found
    const contentType = response.headers['content-type'];
    if (!match && contentType) {
      if (contentType.includes('png')) extension = '.png';
      else if (contentType.includes('webp')) extension = '.webp';
      else if (contentType.includes('gif')) extension = '.gif';
    }

    const filename = `${uuidv4()}${extension}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Write file to disk
    writeFileSync(filepath, response.data);

    // Return relative path for storing in database
    const relativePath = `/assets/images/products/uploads/${filename}`;

    return res.json({
      success: true,
      imageUrl: relativePath,
      message: 'Image downloaded and saved successfully'
    });
  } catch (error: any) {
    console.error('Error downloading image:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to download image from URL'
    });
  }
});

// Upload file directly
app.post('/api/images/upload-file', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    // Rename file with UUID and preserve extension
    const ext = req.file.originalname.split('.').pop();
    const newFilename = `${uuidv4()}.${ext}`;
    const newFilepath = join(UPLOAD_DIR, newFilename);
    const oldFilepath = req.file.path;

    // Rename uploaded file
    const fs = require('fs');
    fs.renameSync(oldFilepath, newFilepath);

    // Return relative path for storing in database
    const relativePath = `/assets/images/products/uploads/${newFilename}`;

    return res.json({
      success: true,
      imageUrl: relativePath,
      message: 'File uploaded successfully'
    });
  } catch (error: any) {
    console.error('Error uploading file:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload file'
    });
  }
});

// ============ SOCKET.IO REAL-TIME VIEWERS ============

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  activeUsers++;

  // Broadcast active users count to all clients
  io.emit('activeUsers', activeUsers);

  // Handle user viewing a product
  socket.on('viewProduct', (productId: number) => {
    console.log(`User ${socket.id} viewing product ${productId}`);

    // Remove from previous product if any
    if (userSessions.has(socket.id)) {
      const prevProductId = userSessions.get(socket.id)!;
      if (viewers.has(prevProductId)) {
        viewers.get(prevProductId)!.delete(socket.id);
        if (viewers.get(prevProductId)!.size === 0) {
          viewers.delete(prevProductId);
        } else {
          io.emit('productViewers', {
            productId: prevProductId,
            count: viewers.get(prevProductId)!.size
          });
        }
      }
    }

    // Add to new product viewers
    if (!viewers.has(productId)) {
      viewers.set(productId, new Set());
    }
    viewers.get(productId)!.add(socket.id);
    userSessions.set(socket.id, productId);

    // Broadcast viewer count for this product
    io.emit('productViewers', {
      productId,
      count: viewers.get(productId)!.size
    });
  });

  // Handle user stopping to view a product
  socket.on('stopViewingProduct', (productId: number) => {
    console.log(`User ${socket.id} stopped viewing product ${productId}`);

    if (viewers.has(productId)) {
      viewers.get(productId)!.delete(socket.id);
      if (viewers.get(productId)!.size === 0) {
        viewers.delete(productId);
      } else {
        io.emit('productViewers', {
          productId,
          count: viewers.get(productId)!.size
        });
      }
    }

    userSessions.delete(socket.id);
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    activeUsers--;

    // Remove from product viewers
    if (userSessions.has(socket.id)) {
      const productId = userSessions.get(socket.id)!;
      if (viewers.has(productId)) {
        viewers.get(productId)!.delete(socket.id);
        if (viewers.get(productId)!.size === 0) {
          viewers.delete(productId);
        } else {
          io.emit('productViewers', {
            productId,
            count: viewers.get(productId)!.size
          });
        }
      }
    }

    userSessions.delete(socket.id);

    // Broadcast updated active users count
    io.emit('activeUsers', activeUsers);
  });
});

// ============ STATIC FILE SERVING ============

// Serve static assets
app.use(express.static(DIST_FOLDER));

// API and upload routes
app.post('/api/upload-images', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file provided'
    });
  }

  try {
    const fileName = `${uuidv4()}-${req.file.originalname}`;
    const newPath = join(UPLOAD_DIR, fileName);
    
    writeFileSync(newPath, req.file.buffer);
    
    const relativePath = `/assets/images/products/uploads/${fileName}`;
    
    return res.json({
      success: true,
      imageUrl: relativePath,
      message: 'File uploaded successfully'
    });
  } catch (error: any) {
    console.error('Error uploading file:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload file'
    });
  }
});

// Fallback to index.html for Angular routing
app.get('*', (req: Request, res: Response) => {
  res.sendFile(join(DIST_FOLDER, 'index.html'));
});

// Start up the Node server
httpServer.listen(PORT, () => {
  console.log(`Node Express server listening on http://localhost:${PORT}`);
  console.log(`Socket.io server ready for real-time connections`);
});

