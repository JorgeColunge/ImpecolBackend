const pool = require('../config/dbConfig');

const authenticateUser = async (req, res, next) => {
  const userId = req.headers['user_id'];
  if (!userId) return res.status(401).json({ message: 'Usuario no autenticado' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return res.status(401).json({ message: 'Usuario no autenticado' });

    req.user = result.rows[0]; // Añade la información del usuario a la solicitud
    next();
  } catch (error) {
    console.error("Error de autenticación:", error);
    res.status(500).json({ message: 'Error interno de servidor' });
  }
};

module.exports = { authenticateUser };
