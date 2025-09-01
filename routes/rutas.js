// backend-mantenimiento/routes/rutas.js (ACTUALIZADO)

import express from "express";
import multer from "multer";

// Importa TODAS las funciones de TODOS los controladores
import {
  registrarInventario,
  obtenerInventario,
  actualizarInventario,
  eliminarInventario,
  cargarExcelInventario,
  obtenerTiposDeActivos,
} from "../controllers/inventarioMantenimientoController.js";

import {
  registrarActividadCompleta,
  obtenerHistorialCompleto,
  actualizarActividadCompleta,
  eliminarActividadCompleta,
  eliminarImagenHistorial, // <-- importar la función
} from "../controllers/registroActividadController.js"; // Ahora importamos las funciones unificadas

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // Configuración de Multer para manejar archivos

// =========================================
// Nuevas Rutas Unificadas para Actividades y Registros Fotográficos
// =========================================
router.post(
  "/actividades/full", // Endpoint para registrar actividad y fotos
  upload.fields([
    { name: "fotoAntes", maxCount: 1 },
    { name: "fotoDespues", maxCount: 1 },
  ]),
  registrarActividadCompleta
);
router.get("/historial-completo", obtenerHistorialCompleto); // Endpoint para obtener el historial completo
router.put(
  "/actividades/full/:id", // Endpoint para actualizar actividad y fotos
  upload.fields([
    { name: "fotoAntes", maxCount: 1 },
    { name: "fotoDespues", maxCount: 1 },
  ]),
  actualizarActividadCompleta
);
router.delete("/actividades/full/:id", eliminarActividadCompleta); // Endpoint para eliminar actividad y fotos
router.post("/actividades/full/:id/eliminar-imagen", eliminarImagenHistorial);

// =========================================
// Rutas para el Módulo de Inventario de Mantenimiento (sin cambios)
// =========================================
router.get("/inventario/tipos-activos", obtenerTiposDeActivos);
router.post("/inventario", registrarInventario);
router.get("/inventario", obtenerInventario);
router.put("/inventario/:id", actualizarInventario);
router.delete("/inventario/:id", eliminarInventario);
router.post(
  "/inventario/upload-excel",
  upload.single("excelFile"),
  cargarExcelInventario
);

export default router;
