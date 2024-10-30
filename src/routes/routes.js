const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const pool = require('../config/dbConfig');

// Configuración de almacenamiento con Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', '..', 'public', 'media', 'images'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Definición de fileFilter para permitir solo imágenes (jpeg, jpg, png, gif)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif)'));
  }
};

const uploadImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
}).single('image'); // Cambiamos `.fields` por `.single`

// Ruta para actualizar el perfil del usuario (datos y foto)
router.post('/updateProfile', uploadImage, async (req, res) => {
  const { name, lastname, email, phone, userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  // Construye la URL de la imagen si se subió un archivo
  let imageUrl = null;
  if (req.file) {
    imageUrl = `/media/images/${req.file.filename}`;
  }  

  try {
    // Consulta para actualizar el perfil del usuario
    const query = `
      UPDATE users 
      SET name = $1, lastname = $2, email = $3, phone = $4, image = COALESCE($5, image) 
      WHERE id = $6
    `;
    const values = [name, lastname, email, phone, imageUrl, userId];
    await pool.query(query, values);

    res.json({ message: 'Perfil actualizado exitosamente', profilePicURL: imageUrl });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: 'Error al actualizar el perfil' });
  }
});

// Ruta para subir y almacenar la URL de la imagen (sin actualizar otros datos)
router.post('/upload', (req, res) => {
  uploadImage(req, res, async (err) => {
    if (err) {
      console.error("Error uploading image:", err.message);
      return res.status(400).json({ message: err.message });
    }

    const userId = req.body.userId;
    console.log("Received User ID:", userId);

    if (!userId) {
      console.error("User ID is missing in request");
      return res.status(400).json({ message: 'User ID is required to upload the image.' });
    }

    if (!req.file) {
      console.error("No file found after upload");
      return res.status(400).json({ message: "No file uploaded" });
    }

    const imageUrl = `/media/images/${req.file.filename}`;
    try {
      const updateQuery = 'UPDATE users SET image = $1 WHERE id = $2';
      const values = [imageUrl, userId];
      await pool.query(updateQuery, values);

      console.log("Image URL stored in database for user:", userId);
      res.json({ profilePicURL: imageUrl, message: 'Imagen subida y URL almacenada correctamente' });
    } catch (dbError) {
      console.error("Error updating database:", dbError);
      res.status(500).json({ message: 'Error storing image URL in database' });
    }
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
    
    if (isMatch) {
      res.json({
        success: true,
        message: "Login successful",
        user: { id_usuario: user.id, name: user.name, lastname: user.lastname, email: user.email, phone: user.phone, rol: user.rol, image: user.image }
      });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
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