const express = require('express');
const multer = require('multer');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, 'uploads');

// Check if 'uploads' folder exists, if not create it
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log("'uploads' folder created!");
} else {
  console.log("'uploads' folder already exists.");
}

const app = express();
const PORT = 3000;
const JWT_SECRET = 'mysecret123'; // This is your secret password for tokens

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Your admin login details here
const users = [
  {
    email: 'brianmuthomi851@gmail.com',
    passwordHash: bcrypt.hashSync('2101#BriAn', 10)
  }
];

// File upload settings
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, file.originalname)
});

// Only allow PDF and MP4 files
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'video/mp4'];
  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Only PDF and MP4 allowed'), false);
};

const upload = multer({ storage, fileFilter });

// Make uploads folder if missing
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Login API
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ message: 'Wrong email or password' });

  if (!bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ message: 'Wrong email or password' });
  }

  const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// Check token middleware (to protect upload & delete)
function checkToken(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ message: 'No token provided' });

  const token = auth.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

// Upload file (only admin can do)
app.post('/upload', checkToken, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'File missing or wrong type' });
  res.json({ message: 'File uploaded!', filename: req.file.originalname });
});

// Get all uploaded files (anyone can see)
app.get('/files', (req, res) => {
  fs.readdir('uploads', (err, files) => {
    if (err) return res.status(500).json({ message: 'Error reading files' });

    const fileList = files.map(f => ({
      name: f,
      url: `${req.protocol}://${req.get('host')}/uploads/${f}`
    }));

    res.json(fileList);
  });
});

// Delete a file (only admin)
app.delete('/files/:filename', checkToken, (req, res) => {
  const filePath = path.join(__dirname, 'uploads', req.params.filename);
  fs.unlink(filePath, err => {
    if (err) return res.status(404).json({ message: 'File not found' });
    res.json({ message: 'File deleted' });
  });
});

// Start backend server
app.listen(PORT, () => {
  console.log(`Backend is running on http://localhost:${PORT}`);
});
