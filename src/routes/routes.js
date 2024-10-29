const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const router = express.Router();
const pool = require('../config/dbConfig'); // Asegúrate de que la ruta a dbConfig.js sea correcta

// Configuración de almacenamiento con Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'public', 'media', 'images'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Filtro de tipo de archivo (solo permite imágenes jpeg, jpg, png, gif)
function fileFilter(req, file, cb) {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif)'));
  }
}

// Configuración de Multer con filtro y límite de tamaño
const uploadImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Tamaño máximo de 5MB
}).single('image'); // 'image' es el nombre del campo del formulario

// Middleware de procesamiento de imagen (opcional)
const processImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    // Redimensiona la imagen a un tamaño de 800x800 y guarda en una subcarpeta 'resized'
    await sharp(req.file.path)
      .resize(800, 800)
      .toFile(path.join(__dirname, '..', 'public', 'media', 'images', 'resized', req.file.filename));
    
    next();
  } catch (err) {
    next(err);
  }
};

// Ruta para cargar y procesar la imagen
router.post('/upload', (req, res) => {
  uploadImage(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    processImage(req, res, () => { // Procesa la imagen después de cargarla
      res.json({ message: 'Imagen subida y procesada correctamente' });
    });
  });
});

// Ruta de inicio de sesión
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Buscar el usuario por correo electrónico
    const query = 'SELECT * FROM users WHERE email = $1';
    const values = [email];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      console.log("User not found for email:", email);
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const user = result.rows[0];
    console.log("User found:", user);

    // Comparar la contraseña proporcionada con la contraseña encriptada en la base de datos
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);

    if (isMatch) {
      return res.json({ success: true, message: "Login successful" });
    } else {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Ruta de registro
router.post('/register', async (req, res) => {
  const { id, name, lastname, rol, email, phone, password } = req.body;

  try {
    // Verificar si el usuario ya existe
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Encriptar la contraseña antes de guardarla
    const hashedPassword = await bcrypt.hash(password, 10); // 10 es el número de rondas de encriptación

    // Insertar el nuevo usuario con la contraseña encriptada
    const query = 'INSERT INTO users (id, name, lastname, rol, email, phone, password) VALUES ($1, $2, $3, $4, $5, $6, $7)';
    const values = [id, name, lastname, rol, email, phone, hashedPassword];
    await pool.query(query, values);

    return res.json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;