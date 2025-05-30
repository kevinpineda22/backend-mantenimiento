import express from 'express';
import multer from 'multer';
import { registrarFoto } from '../controllers/registroController.js';
import { obtenerHistorial } from '../controllers/registroController.js';
import { registrarActividad } from '../controllers/registroController.js';
import { obtenerHistorialActividades } from '../controllers/registroController.js';
import { actualizarActividad } from '../controllers/registroController.js';
import { eliminarActividad } from '../controllers/registroController.js';
import { actualizarRegistroFotografico } from '../controllers/registroController.js';
import {eliminarRegistroFotografico} from '../controllers/registroController.js';
const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });


// Ruta para registrar una foto
router.post(
  '/registro',
  upload.fields([
    { name: 'fotoAntes', maxCount: 1 },
    { name: 'fotoDespues', maxCount: 1 }
  ]),
  registrarFoto
);

// Ruta para obtener el historial de registros fotográficos
router.get('/historial', obtenerHistorial); // ✅ nueva ruta GET

// Ruta para actualizar un registro fotográfico
router.put('/putRegistroFotografico/:id', upload.fields([
  { name: 'fotoAntes', maxCount: 1 },
  { name: 'fotoDespues', maxCount: 1 }
]), actualizarRegistroFotografico);

// Ruta para eliminar un registro fotográfico
router.delete('/eliminarRegistroFotografico/:id', eliminarRegistroFotografico);



// Nuevas rutas para registro de actividades
router.post('/actividades', registrarActividad);
router.get('/historialactividades', obtenerHistorialActividades);

// Nueva ruta para actualizar actividades
router.put('/actividades/:id', actualizarActividad);

// Nueva ruta para eliminar actividades
router.delete('/actividades/:id', eliminarActividad);

export default router;