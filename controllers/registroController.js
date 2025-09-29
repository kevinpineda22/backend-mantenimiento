// controllers/registroController.js

import supabase from "../supabase/cliente.js";
import { optimizeImageToWebP, getImageInfo } from "../utils/imageOptimizer.js";
import ExcelJS from "exceljs"; // Importar ExcelJS para manejar archivos Excel

// ===============================================
// Lógica para Registro Fotográfico
// ===============================================

export const registrarFoto = async (req, res) => {
    const { sede, responsable, fecha } = req.body;
    const fotoAntes = req.files?.fotoAntes?.[0];
    const fotoDespues = req.files?.fotoDespues?.[0];

    try {
        const subirImagen = async (file, carpeta) => {
            const nombreLimpio = file.originalname
                .replace(/\s/g, "_")
                .replace(/\.[^/.]+$/, ".webp");
            const filePath = `${carpeta}/${Date.now()}_${nombreLimpio}`;

            // Obtener información de la imagen original
            const originalInfo = await getImageInfo(file.buffer);
            console.log(`Imagen original: ${originalInfo.sizeKB}KB (${originalInfo.width}x${originalInfo.height})`);

            const webpBuffer = await optimizeImageToWebP(file.buffer, {
                maxWidth: 1200,
                maxHeight: 1200,
                quality: 65
            });

            // Obtener información de la imagen optimizada
            const optimizedInfo = await getImageInfo(webpBuffer);
            console.log(`Imagen optimizada: ${optimizedInfo.sizeKB}KB (${optimizedInfo.width}x${optimizedInfo.height})`);
            console.log(`Reducción: ${Math.round((1 - optimizedInfo.size / originalInfo.size) * 100)}%`);

            const { data, error } = await supabase.storage
                .from("registro-fotos")
                .upload(filePath, webpBuffer, {
                    contentType: "image/webp",
                });

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
                .from("registro-fotos")
                .getPublicUrl(filePath);

            return publicUrlData.publicUrl;
        };

        const urlAntes = fotoAntes ? await subirImagen(fotoAntes, "antes") : null;
        const urlDespues = fotoDespues
            ? await subirImagen(fotoDespues, "despues")
            : null;

        const { error: insertError } = await supabase
            .from("registro_fotografico")
            .insert([
                {
                    fecha,
                    sede,
                    foto_antes_url: urlAntes,
                    foto_despues_url: urlDespues,
                    responsable,
                },
            ]);

        if (insertError) throw insertError;

        res.status(200).json({ message: "Registro exitoso" });
    } catch (err) {
        console.error("Error en registrarFoto:", err);
        res.status(500).json({ error: err.message || "Error interno del servidor" });
    }
};

export const obtenerHistorial = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("registro_fotografico")
            .select("*");

        if (error) throw error;

        res.status(200).json(data);
    } catch (err) {
        console.error("Error en obtenerHistorial (fotográfico):", err);
        res.status(500).json({ error: "Error al obtener el historial fotográfico" });
    }
};

export const actualizarRegistroFotografico = async (req, res) => {
    const { id } = req.params;
    const { sede, responsable, fecha } = req.body;
    const fotoAntes = req.files?.fotoAntes?.[0];
    const fotoDespues = req.files?.fotoDespues?.[0];

    try {
        const { data: registro, error: fetchError } = await supabase
            .from("registro_fotografico")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !registro) {
            return res.status(404).json({ error: "Registro no encontrado" });
        }

        const subirImagen = async (file, carpeta) => {
            const nombreLimpio = file.originalname
                .replace(/\s/g, "_")
                .replace(/\.[^/.]+$/, ".webp");
            const filePath = `${carpeta}/${Date.now()}_${nombreLimpio}`;
            
            // Optimizar imagen a WebP
            const webpBuffer = await optimizeImageToWebP(file.buffer, {
                maxWidth: 1200,
                maxHeight: 1200,
                quality: 65
            });
            
            const { error } = await supabase.storage
                .from("registro-fotos")
                .upload(filePath, webpBuffer, {
                    contentType: "image/webp",
                });
            if (error) throw error;
            const { data: publicUrlData } = supabase.storage
                .from("registro-fotos")
                .getPublicUrl(filePath);
            return publicUrlData.publicUrl;
        };

        let urlAntes = registro.foto_antes_url;
        let urlDespues = registro.foto_despues_url;
        if (fotoAntes) {
            urlAntes = await subirImagen(fotoAntes, "antes");
        }
        if (fotoDespues) {
            urlDespues = await subirImagen(fotoDespues, "despues");
        }

        const { error: updateError } = await supabase
            .from("registro_fotografico")
            .update({
                sede,
                responsable,
                fecha,
                foto_antes_url: urlAntes,
                foto_despues_url: urlDespues,
            })
            .eq("id", id);

        if (updateError) {
            throw updateError;
        }

        res.json({ message: "Registro fotográfico actualizado correctamente" });
    } catch (error) {
        console.error("Error en actualizarRegistroFotografico:", error);
        res.status(500).json({ error: "Error al actualizar el registro fotográfico" });
    }
};

export const eliminarRegistroFotografico = async (req, res) => {
    const { id } = req.params;

    try {
        const { data: registro, error: fetchError } = await supabase
            .from("registro_fotografico")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !registro) {
            return res.status(404).json({ error: "Registro no encontrado" });
        }

        const { error: deleteError } = await supabase
            .from("registro_fotografico")
            .delete()
            .eq("id", id);

        if (deleteError) {
            throw deleteError;
        }

        res.json({ message: "Registro fotográfico eliminado correctamente" });
    } catch (error) {
        console.error("Error en eliminarRegistroFotografico:", error);
        res.status(500).json({ error: "Error al eliminar el registro fotográfico" });
    }
};


// ===============================================
// Lógica para Registro de Actividades
// ===============================================

export const registrarActividad = async (req, res) => {
    try {
        const {
            sede,
            actividad,
            fechaInicio,
            fechaFinal,
            precio,
            estado,
            responsable,
        } = req.body;

        if (
            !sede ||
            !actividad ||
            !fechaInicio ||
            !fechaFinal ||
            !precio ||
            !responsable ||
            !estado
        ) {
            return res.status(400).json({ error: "Faltan campos obligatorios" });
        }

        const { error: insertError } = await supabase
            .from("registro_mantenimiento")
            .insert([
                {
                    sede,
                    actividad,
                    fecha_inicio: fechaInicio,
                    fecha_final: fechaFinal,
                    precio: parseFloat(precio),
                    estado,
                    responsable,
                },
            ]);

        if (insertError) {
            console.error("Error al insertar en Supabase (actividad):", insertError);
            return res.status(500).json({ error: insertError.message });
        }

        return res
            .status(200)
            .json({ message: "Actividad registrada exitosamente" });
    } catch (err) {
        console.error("Error general en registrarActividad:", err);
        return res
            .status(500)
            .json({ error: err.message || "Error interno del servidor" });
    }
};

export const obtenerHistorialActividades = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("registro_mantenimiento")
            .select("*");

        if (error) throw error;

        res.status(200).json(data);
    } catch (err) {
        console.error("Error en obtenerHistorialActividades:", err);
        res
            .status(500)
            .json({ error: "Error al obtener el historial de actividades" });
    }
};

export const actualizarActividad = async (req, res) => {
    const { id } = req.params;
    const { estado, precio, fechaInicio, fechaFinal, sede, actividad, responsable } = req.body;

    try {
        const { data: activity, error } = await supabase
            .from("registro_mantenimiento")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !activity) {
            return res.status(404).json({ error: "Actividad no encontrada" });
        }

        const { error: updateError } = await supabase
            .from("registro_mantenimiento")
            .update({
                sede,
                actividad,
                estado,
                precio,
                responsable,
                fecha_inicio: fechaInicio,
                fecha_final: fechaFinal,
            })
            .eq("id", id);

        if (updateError) {
            throw updateError;
        }

        res.json({ message: "Actividad actualizada correctamente" });
    } catch (error) {
        console.error("Error en actualizarActividad:", error);
        res.status(500).json({ error: "Error al actualizar la actividad" });
    }
};

export const eliminarActividad = async (req, res) => {
    const { id } = req.params;

    try {
        const { data: actividad, error: fetchError } = await supabase
            .from("registro_mantenimiento")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !actividad) {
            return res.status(404).json({ error: "Actividad no encontrada" });
        }

        const { error: deleteError } = await supabase
            .from("registro_mantenimiento")
            .delete()
            .eq("id", id);

        if (deleteError) {
            throw deleteError;
        }

        res.json({ message: "Actividad eliminada correctamente" });
    } catch (error) {
        console.error("Error en eliminarActividad:", error);
        res.status(500).json({ error: "Error al eliminar la actividad" });
    }
};


// ===============================================
// Lógica para Inventario de Mantenimiento
// ===============================================

// Helper para generar código de activo (sin parte aleatoria)
function generarCodigoActivo(tipoActivoCorto, nombreActivo) {
    const prefix = "MT";
    const tipoPart = tipoActivoCorto ? tipoActivoCorto.toUpperCase().replace(/\s/g, '').substring(0, 3) : "GEN";
    const nombrePart = nombreActivo ? nombreActivo.toUpperCase().replace(/\s/g, '').substring(0, 3) : "ACC";
    
    return `${prefix}-${tipoPart}-${nombrePart}`;
}

export const obtenerTiposDeActivos = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("tipos_activos")
            .select("codigo_tipo, nombre_tipo, descripcion");

        if (error) {
            console.error("Error al obtener tipos de activos:", error);
            throw error;
        }
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener tipos de activos: " + err.message });
    }
};

export const registrarInventario = async (req, res) => {
    const {
        nombre_activo,
        tipo_activo,
        sede,
        clasificacion_ubicacion,
        estado_activo,
        frecuencia_mantenimiento,
        responsable_gestion
    } = req.body;

    try {
        const { data: tipoExistente, error: tipoError } = await supabase
            .from('tipos_activos')
            .select('codigo_tipo')
            .eq('nombre_tipo', tipo_activo)
            .single();

        if (tipoError || !tipoExistente) {
            return res.status(400).json({ error: `El tipo de activo '${tipo_activo}' no es válido o no existe en la base de datos de tipos.` });
        }

        const codigo_activo = generarCodigoActivo(tipoExistente.codigo_tipo, nombre_activo);

        const { error: insertError } = await supabase
            .from("inventario_mantenimiento")
            .insert([
                {
                    codigo_activo,
                    nombre_activo,
                    tipo_activo,
                    sede,
                    clasificacion_ubicacion,
                    estado_activo,
                    frecuencia_mantenimiento,
                    responsable_gestion,
                },
            ]);

        if (insertError) {
            console.error("Error al registrar inventario en Supabase:", insertError);
            return res.status(500).json({ error: insertError.message });
        }

        return res.status(200).json({ message: "Activo de inventario registrado exitosamente", codigo_activo });
    } catch (err) {
        console.error("Error general en registrarInventario:", err);
        return res.status(500).json({ error: err.message || "Error interno del servidor" });
    }
};

export const obtenerInventario = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("inventario_mantenimiento")
            .select("*")
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json(data);
    } catch (err) {
        console.error("Error en obtenerInventario:", err);
        res.status(500).json({ error: "Error al obtener el inventario" });
    }
};

export const actualizarInventario = async (req, res) => {
    const { id } = req.params;
    const {
        nombre_activo,
        tipo_activo,
        sede,
        clasificacion_ubicacion,
        estado_activo,
        frecuencia_mantenimiento,
        responsable_gestion
    } = req.body;

    try {
        const { data: tipoExistente, error: tipoError } = await supabase
            .from('tipos_activos')
            .select('codigo_tipo')
            .eq('nombre_tipo', tipo_activo)
            .single();

        if (tipoError || !tipoExistente) {
            return res.status(400).json({ error: `El tipo de activo '${tipo_activo}' no es válido o no existe.` });
        }

        const { error: updateError } = await supabase
            .from("inventario_mantenimiento")
            .update({
                nombre_activo,
                tipo_activo,
                sede,
                clasificacion_ubicacion,
                estado_activo,
                frecuencia_mantenimiento,
                responsable_gestion,
            })
            .eq("id", id);

        if (updateError) {
            throw updateError;
        }

        res.json({ message: "Activo de inventario actualizado correctamente" });
    } catch (error) {
        console.error("Error en actualizarInventario:", error);
        res.status(500).json({ error: "Error al actualizar el activo de inventario" });
    }
};

export const eliminarInventario = async (req, res) => {
    const { id } = req.params;

    try {
        const { data: asset, error: fetchError } = await supabase
            .from("inventario_mantenimiento")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !asset) {
            return res.status(404).json({ error: "Activo de inventario no encontrado" });
        }

        const { error: deleteError } = await supabase
            .from("inventario_mantenimiento")
            .delete()
            .eq("id", id);

        if (deleteError) {
            throw deleteError;
        }

        res.json({ message: "Activo de inventario eliminado correctamente" });
    } catch (error) {
        console.error("Error en eliminarInventario:", error);
        res.status(500).json({ error: "Error al eliminar el activo de inventario" });
    }
};

export const cargarExcelInventario = async (req, res) => {
    const excelFile = req.file;

    if (!excelFile) {
        return res.status(400).json({ error: "No se encontró el archivo Excel" });
    }

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(excelFile.buffer);

        const inventarioWorksheet = workbook.getWorksheet(1); // Hoja 1
        
        if (!inventarioWorksheet) {
            return res.status(400).json({ error: "No se encontró la Hoja 1 'Inventario de Mantenimiento' en el archivo Excel." });
        }

        const rowsToInsert = [];

        const headers = inventarioWorksheet.getRow(1).values
            .map(h => (typeof h === 'object' && h !== null && h.richText) ? h.richText.map(part => part.text).join('') : h)
            .filter(Boolean)
            .map(h => h.toString().toLowerCase().trim());
            
        const columnMap = {
            "código": "codigo_activo_excel",
            "nombre del activo": "nombre_activo",
            "tipo de activo": "tipo_activo",
            "sede": "sede",
            "clasificación por ubicación": "clasificacion_ubicacion",
            "estado del activo": "estado_activo",
            "frecuencia de mantenimiento": "frecuencia_mantenimiento",
            "responsable de gestión interno/externo": "responsable_gestion"
        };

        const requiredHeaders = Object.keys(columnMap).filter(key => key !== "código");

        const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
        if (missingHeaders.length > 0) {
            return res.status(400).json({ error: `Faltan los siguientes encabezados en la Hoja 1 del Excel: ${missingHeaders.join(", ")}. Por favor, asegúrate de que los encabezados coincidan exactamente (incluyendo tildes si las tienen y en minúsculas).` });
        }

        const { data: allCurrentTipos, error: fetchAllTiposError } = await supabase.from('tipos_activos').select('nombre_tipo, codigo_tipo');
        if (fetchAllTiposError) {
            console.error("Error al obtener tipos de activos de Supabase:", fetchAllTiposError);
            throw new Error("No se pudieron cargar los tipos de activos para validación.");
        }
        const validTiposActivos = new Set(allCurrentTipos.map(t => t.nombre_tipo));
        const tipoCodigoMap = new Map(allCurrentTipos.map(t => [t.nombre_tipo, t.codigo_tipo]));

        for (let i = 2; i <= inventarioWorksheet.rowCount; i++) {
            const row = inventarioWorksheet.getRow(i);
            const rowData = {};
            let isEmptyRow = true;

            const getCellValue = (cellIndex) => {
                let value = row.getCell(cellIndex + 1).value;
                if (typeof value === 'object' && value !== null && value.richText) {
                    value = value.richText.map(part => part.text).join('');
                }
                return value ? value.toString().trim() : null;
            };

            for (let j = 0; j < headers.length; j++) {
                const header = headers[j];
                const dbColumnName = columnMap[header];

                if (dbColumnName) {
                    const cellValue = getCellValue(j);
                    rowData[dbColumnName] = cellValue;
                    if (cellValue !== null && cellValue !== "") {
                        isEmptyRow = false;
                    }
                }
            }

            if (!isEmptyRow) {
                if (!rowData.tipo_activo || !validTiposActivos.has(rowData.tipo_activo)) {
                    console.warn(`Advertencia: Tipo de activo no válido o ausente en la fila ${i} de Hoja 1: '${rowData.tipo_activo}'. Se omitirá esta fila.`);
                    continue;
                }

                const tipoCorto = tipoCodigoMap.get(rowData.tipo_activo);
                if (tipoCorto) {
                    rowData.codigo_activo = generarCodigoActivo(tipoCorto, rowData.nombre_activo);
                } else {
                    rowData.codigo_activo = generarCodigoActivo("GEN", rowData.nombre_activo);
                }

                delete rowData.codigo_activo_excel;

                rowsToInsert.push(rowData);
            }
        }

        if (rowsToInsert.length === 0) {
            return res.status(400).json({ message: "El archivo Excel no contiene datos válidos para el inventario en la Hoja 1." });
        }

        const { error: insertError } = await supabase
            .from("inventario_mantenimiento")
            .insert(rowsToInsert);

        if (insertError) {
            console.error("Error al insertar datos de inventario desde Excel:", insertError);
            // La restricción UNIQUE ya no debería existir, así que eliminamos el manejo específico del 23505
            return res.status(500).json({ error: insertError.message });
        }

        res.status(200).json({ message: `Se insertaron ${rowsToInsert.length} registros de inventario desde el Excel.` });

    } catch (error) {
        console.error("Error al procesar el archivo Excel:", error);
        res.status(500).json({ error: error.message || "Error al procesar el archivo Excel." });
    }
};