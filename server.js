const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
// Use BACKEND_PORT if set, otherwise default to 5000
// This allows Railway's PORT to be used by nginx while backend uses a fixed internal port
const PORT = process.env.BACKEND_PORT || 5000;

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads - use /www bucket mount
// Supports both single files and directory uploads (preserves directory structure)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const basePath = '/www';
    
    // Check if originalname contains a path (directory upload)
    // When using FormData.append(file, webkitRelativePath), the path becomes part of originalname
    // Example: uploading "imgs/" folder with "photo.jpg" inside results in originalname = "imgs/photo.jpg"
    const originalPath = file.originalname;
    
    // If originalname contains path separators, it's a directory upload
    if (originalPath.includes('/') || originalPath.includes('\\')) {
      // Normalize path separators
      const normalizedPath = originalPath.replace(/\\/g, '/');
      // Extract directory path (remove filename)
      // Example: "imgs/photo.jpg" -> dirPath = "imgs"
      // Example: "imgs/subfolder/photo.jpg" -> dirPath = "imgs/subfolder"
      const dirPath = path.dirname(normalizedPath);
      
      // Skip if it's just '.' (root directory)
      if (dirPath !== '.' && dirPath !== '/') {
        const fullDirPath = path.join(basePath, dirPath);
        // Use fs.promises but handle it synchronously with .then/.catch
        fs.mkdir(fullDirPath, { recursive: true })
          .then(() => {
            console.log(`Creating directory structure: ${fullDirPath} for file: ${path.basename(normalizedPath)}`);
            cb(null, fullDirPath);
          })
          .catch((error) => {
            console.error('Error creating directory:', fullDirPath, error);
            cb(error, fullDirPath);
          });
        return;
      }
    }
    
    // Single file upload or root directory file - use base path
    fs.mkdir(basePath, { recursive: true })
      .then(() => cb(null, basePath))
      .catch((error) => {
        console.error('Error creating base directory:', basePath, error);
        cb(error, basePath);
      });
  },
  filename: (req, file, cb) => {
    // Extract just the filename from the path
    // For directory uploads, originalname contains the full relative path
    const originalPath = file.originalname;
    
    if (originalPath.includes('/') || originalPath.includes('\\')) {
      // Normalize and get just the basename
      const normalizedPath = originalPath.replace(/\\/g, '/');
      cb(null, path.basename(normalizedPath));
    } else {
      // Single file upload - use original name
      cb(null, file.originalname);
    }
  }
});

const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100MB limit per file
    files: 500 // Maximum number of files in a single request
  }
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

// Get credentials from environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || 
  bcrypt.hashSync('admin', 10); // Default: 'admin' password

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    // Check if username matches
    if (username !== ADMIN_USERNAME) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password using bcrypt
    // If ADMIN_PASSWORD_HASH is not set, it will use the default 'admin' hash
    const passwordMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.authenticated = true;
    req.session.username = username;
    res.json({ success: true, message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
  res.json({ 
    authenticated: req.session && req.session.authenticated || false,
    username: req.session && req.session.username || null
  });
});

// Recursively get all files in a directory
async function getAllFiles(dir, baseDir = dir) {
  const files = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      
      if (entry.isDirectory()) {
        // Recursively get files from subdirectories
        const subFiles = await getAllFiles(fullPath, baseDir);
        files.push(...subFiles);
      } else {
        const stats = await fs.stat(fullPath);
        files.push({
          name: entry.name,
          path: relativePath,
          type: 'file',
          size: stats.size,
          modified: stats.mtime
        });
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return files;
}

// Get list of files in /www bucket directory (recursively)
app.get('/api/files', requireAuth, async (req, res) => {
  try {
    const siteDir = '/www';
    const fileList = await getAllFiles(siteDir, siteDir);
    res.json(fileList);
  } catch (error) {
    console.error('Error reading files:', error);
    res.status(500).json({ error: 'Failed to read files' });
  }
});

// Get file content
app.get('/api/files/*', requireAuth, async (req, res) => {
  try {
    // Get the path from the request - remove '/api/files' prefix
    const filePath = req.path.replace('/api/files/', '') || req.path.replace('/api/files', '');
    
    // Security: prevent path traversal
    if (filePath.includes('..') || path.isAbsolute(filePath)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    
    const fullPath = path.join('/www', filePath);
    // Ensure the path is within /www directory
    const resolvedPath = path.resolve(fullPath);
    if (!resolvedPath.startsWith(path.resolve('/www'))) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    
    const content = await fs.readFile(fullPath, 'utf8');
    res.json({ content, filename: filePath });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Failed to read file' });
  }
});

// Save file content
app.post('/api/files/*', requireAuth, async (req, res) => {
  try {
    // Get the path from the request - remove '/api/files' prefix
    const filePath = req.path.replace('/api/files/', '') || req.path.replace('/api/files', '');
    
    // Security: prevent path traversal
    if (filePath.includes('..') || path.isAbsolute(filePath)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    const { content } = req.body;
    if (content === undefined) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const fullPath = path.join('/www', filePath);
    // Ensure the path is within /www directory
    const resolvedPath = path.resolve(fullPath);
    if (!resolvedPath.startsWith(path.resolve('/www'))) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    
    // Create directory if it doesn't exist
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf8');
    res.json({ success: true, message: 'File saved successfully' });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `File too large. Maximum size is 100MB. File: ${err.field}` });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum is 500 files per upload.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message || 'Failed to upload files' });
  }
  next();
};

// Upload file(s) - supports single files, multiple files, and directory uploads
app.post('/api/upload', requireAuth, (req, res, next) => {
  upload.array('files', 500)(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = req.files.map(file => {
      // For directory uploads, reconstruct the full path
      let filePath = file.filename;
      if (file.path && file.path !== '/www') {
        // Extract relative path from the stored path
        const relativePath = file.path.replace('/www/', '').replace('/www', '');
        if (relativePath) {
          filePath = path.join(relativePath, file.filename).replace(/\\/g, '/');
        }
      }
      
      return {
        filename: filePath,
        size: file.size,
        originalName: file.originalname,
        path: filePath
      };
    });

    res.json({ 
      success: true, 
      message: `${req.files.length} file(s) uploaded successfully`,
      files: uploadedFiles,
      count: req.files.length
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to upload files',
      message: error.message || 'Unknown error occurred'
    });
  }
});

// Delete file
app.delete('/api/files/*', requireAuth, async (req, res) => {
  try {
    // Get the path from the request - remove '/api/files' prefix
    const filePath = req.path.replace('/api/files/', '') || req.path.replace('/api/files', '');
    
    // Security: prevent path traversal
    if (filePath.includes('..') || path.isAbsolute(filePath)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    const fullPath = path.join('/www', filePath);
    // Ensure the path is within /www directory
    const resolvedPath = path.resolve(fullPath);
    if (!resolvedPath.startsWith(path.resolve('/www'))) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    
    await fs.unlink(fullPath);
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Verify /www directory exists and is writable on startup
async function verifyWwwDirectory() {
  const wwwPath = '/www';
  try {
    await fs.access(wwwPath);
    // Check if writable by trying to write a test file
    const testFile = path.join(wwwPath, '.write-test');
    try {
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      console.log(`✓ /www directory exists and is writable`);
    } catch (writeError) {
      console.warn(`⚠ /www directory exists but may not be writable:`, writeError.message);
    }
  } catch (error) {
    console.warn(`⚠ /www directory check failed:`, error.message);
    try {
      await fs.mkdir(wwwPath, { recursive: true });
      console.log(`✓ Created /www directory`);
    } catch (mkdirError) {
      console.error(`✗ Failed to create /www directory:`, mkdirError.message);
      console.error(`  This may cause upload failures. Ensure Railway volume is mounted at /www`);
    }
  }
}

// Start server
verifyWwwDirectory().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to verify /www directory:', error);
  // Start server anyway - errors will be caught during upload
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} (with warnings)`);
  });
});

