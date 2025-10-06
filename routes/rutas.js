// backend-mantenimiento/routes/rutas.js (CORREGIDO)

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
  obtenerHistorialCompleto,
  actualizarActividadCompleta,
  eliminarActividadCompleta,
  eliminarImagenHistorial,
  registrarTareaAsignada, // Función para asignación de tareas
  obtenerHistorialPorCreador,
  obtenerHistorialPorResponsable, // ⭐ NUEVA FUNCIÓN
} from "../controllers/registroActividadController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // Configuración de Multer

// =========================================
// Rutas de Actividades y Registros Fotográficos
// =========================================

// ⭐ CORRECCIÓN CLAVE: El endpoint de asignación debe manejar archivos.
router.post(
  "/tareas/asignar",
  upload.fields([
    { name: "fotoAntes", maxCount: 1 },
    { name: "fotoDespues", maxCount: 1 },
  ]),
  registrarTareaAsignada // ⭐ NUEVO: Endpoint para asignación de tareas (Líder/SST)
);



router.get("/historial-completo", obtenerHistorialCompleto); // Historial general
router.get("/historial-por-creador", obtenerHistorialPorCreador);
router.get("/historial-por-responsable", obtenerHistorialPorResponsable); // ⭐ NUEVA RUTA

// Endpoint para actualizar actividad y fotos
router.put(
  "/actividades/full/:id",
  upload.fields([
    { name: "fotoAntes", maxCount: 1 },
    { name: "fotoDespues", maxCount: 1 },
  ]),
  actualizarActividadCompleta
);

router.delete("/actividades/full/:id", eliminarActividadCompleta);
router.post("/actividades/full/:id/eliminar-imagen", eliminarImagenHistorial);

// =========================================
// Rutas para el Módulo de Inventario (se mantienen)
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