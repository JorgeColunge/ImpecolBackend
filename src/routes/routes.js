const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const router = express.Router();
const pool = require('../config/dbConfig');

// Configuración de almacenamiento con Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', '..', 'public', 'media', 'images', 'resized'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadImage = multer({
  storage: storage,
  fileFilter: function(req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    extname && mimetype ? cb(null, true) : cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif)'));
  },
  limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB
}).single('image');

// Middleware de procesamiento de imagen
const processImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const resizedImagePath = path.join(__dirname, '..', 'public', 'media', 'images', 'resized', req.file.filename);
    await sharp(req.file.path).resize(800, 800).toFile(resizedImagePath);
    req.file.resizedPath = resizedImagePath;
    next();
  } catch (err) {
    next(err);
  }
};

// Ruta para subir y procesar la imagen
router.post('/upload', (req, res) => {
  uploadImage(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });

    processImage(req, res, () => {
      res.json({ profilePicURL: `/media/images/resized/${req.file.filename}` });
    });
  });
});

// Ruta de inicio de sesión
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ success: false, message: "Invalid credentials" });
    
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    isMatch ? res.json({ success: true, message: "Login successful" }) : res.status(401).json({ success: false, message: "Invalid credentials" });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Ruta de registro
router.post('/register', async (req, res) => {
  const { id, name, lastname, rol, email, phone, password } = req.body;
  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) return res.status(400).json({ success: false, message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (id, name, lastname, rol, email, phone, password) VALUES ($1, $2, $3, $4, $5, $6, $7)', [id, name, lastname, rol, email, phone, hashedPassword]);
    res.json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
