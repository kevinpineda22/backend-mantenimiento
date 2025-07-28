// backend-mantenimiento/routes/rutas.js (o index.js)

import express from 'express';
import multer from 'multer';

// Importa TODAS las funciones de TODOS los controladores
// Asegúrate de que las rutas a los controladores son correctas
import {
    registrarFoto,
    obtenerHistorial,
    actualizarRegistroFotografico,
    eliminarRegistroFotografico
} from '../controllers/registroFotograficoController.js';

import {
    registrarActividad,
    obtenerHistorialActividades,
    actualizarActividad,
    eliminarActividad
} from '../controllers/registroActividadController.js';

import {
    registrarInventario,
    obtenerInventario,
    actualizarInventario,
    eliminarInventario,
    cargarExcelInventario,
    obtenerTiposDeActivos
} from '../controllers/inventarioMantenimientoController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // Configuración de Multer para manejar archivos

// =========================================
// Rutas para el Módulo de Registro Fotográfico
// =========================================
router.post(
    '/registro', // URL: /api/registro
    upload.fields([
        { name: 'fotoAntes', maxCount: 1 },
        { name: 'fotoDespues', maxCount: 1 }
    ]),
    registrarFoto
);
router.get('/historial', obtenerHistorial); // URL: /api/historial
router.put('/putRegistroFotografico/:id', 
    upload.fields([
        { name: 'fotoAntes', maxCount: 1 },
        { name: 'fotoDespues', maxCount: 1 }
    ]), 
    actualizarRegistroFotografico
); // URL: /api/putRegistroFotografico/:id
router.delete('/eliminarRegistroFotografico/:id', eliminarRegistroFotografico); // URL: /api/eliminarRegistroFotografico/:id

// =========================================
// Rutas para el Módulo de Registro de Actividades
// =========================================
router.post('/actividades', registrarActividad); // URL: /api/actividades
router.get('/historialactividades', obtenerHistorialActividades); // URL: /api/historialactividades
router.put('/actividades/:id', actualizarActividad); // URL: /api/actividades/:id
router.delete('/actividades/:id', eliminarActividad); // URL: /api/actividades/:id

// =========================================
// Rutas para el Módulo de Inventario de Mantenimiento
// =========================================
router.get('/inventario/tipos-activos', obtenerTiposDeActivos); // URL: /api/inventario/tipos-activos
router.post('/inventario', registrarInventario); // URL: /api/inventario
router.get('/inventario', obtenerInventario); // URL: /api/inventario
router.put('/inventario/:id', actualizarInventario); // URL: /api/inventario/:id
router.delete('/inventario/:id', eliminarInventario); // URL: /api/inventario/:id
router.post('/inventario/upload-excel', upload.single('excelFile'), cargarExcelInventario); // URL: /api/inventario/upload-excel

export default router;