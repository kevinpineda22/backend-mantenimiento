// routes/rutas.js

import express from 'express';
import multer from 'multer';
import {
    // Registro Fotográfico
    registrarFoto,
    obtenerHistorial,
    actualizarRegistroFotografico,
    eliminarRegistroFotografico,
    // Registro de Actividades
    registrarActividad,
    obtenerHistorialActividades,
    actualizarActividad,
    eliminarActividad,
    // Inventario de Mantenimiento (NUEVAS)
    registrarInventario,
    obtenerInventario,
    actualizarInventario,
    eliminarInventario,
    cargarExcelInventario,
    obtenerTiposDeActivos // NUEVA
} from '../controllers/registroController.js'; // Asegúrate que el path es correcto

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });


// Rutas para Registro Fotográfico (EXISTENTES - NO CAMBIAN)
router.post('/registro', upload.fields([{ name: 'fotoAntes', maxCount: 1 }, { name: 'fotoDespues', maxCount: 1 }]), registrarFoto);
router.get('/historial', obtenerHistorial);
router.put('/putRegistroFotografico/:id', upload.fields([{ name: 'fotoAntes', maxCount: 1 }, { name: 'fotoDespues', maxCount: 1 }]), actualizarRegistroFotografico);
router.delete('/eliminarRegistroFotografico/:id', eliminarRegistroFotografico);


// Rutas para Registro de Actividades (EXISTENTES - NO CAMBIAN)
router.post('/actividades', registrarActividad);
router.get('/historialactividades', obtenerHistorialActividades);
router.put('/actividades/:id', actualizarActividad);
router.delete('/actividades/:id', eliminarActividad);


// ***************************************************************
// NUEVAS RUTAS PARA INVENTARIO DE MANTENIMIENTO
// ***************************************************************

// Ruta para obtener los tipos de activos (desde Hoja 2)
router.get('/inventario/tipos-activos', obtenerTiposDeActivos);

// Rutas CRUD para activos de inventario
router.post('/inventario', registrarInventario);
router.get('/inventario', obtenerInventario); // Esta ruta servirá también para Hoja de Vida
router.put('/inventario/:id', actualizarInventario);
router.delete('/inventario/:id', eliminarInventario);

// Ruta para carga masiva de inventario desde Excel
router.post('/inventario/upload-excel', upload.single('excelFile'), cargarExcelInventario);


export default router;