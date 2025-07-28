import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import registroRoutes from './routes/rutas.js';

dotenv.config();
const app = express();
// Configurar CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  
app.use(bodyParser.json());
app.use('/api', registroRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));

// Endpoint para verificar que el servidor está corriendo
app.get('/', (req, res) => {
  res.send('♥activo mi papacho♥');
});
