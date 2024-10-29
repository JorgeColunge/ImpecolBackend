const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const routes = require('./routes/routes');

const PORT = process.env.PORT || 10000;

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use('/api', routes);

// Permitir solicitudes desde el frontend en localhost:3000
app.use(cors({
  origin: 'http://localhost:3000', // Reemplaza con la URL de tu frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos que quieres permitir
  allowedHeaders: ['Content-Type', 'Authorization'], // Headers permitidos
}));

app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
  });