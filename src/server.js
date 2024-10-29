const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const routes = require('./routes/routes');
const path = require('path');

const PORT = process.env.PORT || 10000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const app = express();

// Configuración de CORS permitiendo solicitudes desde el frontend
app.use(cors({
  origin: [FRONTEND_URL, 'https://localhost'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(bodyParser.json());
app.use('/api', routes);

app.use('/media', express.static(path.join(__dirname, 'public', 'media')));

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
