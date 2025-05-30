const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// File Upload Storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.mp4', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, MP4, JPG, JPEG, PNG files allowed'));
    }
  }
});

// Routes

// Serve homepage at '/'
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve admin page at '/admin'
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Upload file
app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ message: 'File uploaded!', filename: req.file.filename });
});

// List uploaded files
app.get('/files', (req, res) => {
  fs.readdir('uploads/', (err, files) => {
    if (err) return res.status(500).json({ error: 'Unable to list files' });
    res.json(files);
  });
});

// Delete file
app.delete('/delete/:filename', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(403).json({ message: 'Token required' });

  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    const filePath = path.join(__dirname, 'uploads', req.params.filename);
    fs.unlink(filePath, err => {
      if (err) return res.status(500).json({ message: 'File not found or error deleting' });
      res.json({ message: 'File deleted' });
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
