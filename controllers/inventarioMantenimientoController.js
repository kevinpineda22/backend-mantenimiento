// backend-mantenimiento/controllers/inventarioMantenimientoController.js

import supabase from "../supabase/cliente.js";
import ExcelJS from "exceljs";
import { generarCodigoActivo } from "../utils/codeGenerator.js"; // Importar desde el nuevo util

// Función auxiliar para subir archivos (reutilizada)
const subirImagen = async (file, carpeta) => {
  if (!file) return null;
  let nombreLimpio = file.originalname
    .replace(/\s/g, "_")
    .replace(/[^a-zA-Z0-9_.-]/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const filePath = `${carpeta}/${Date.now()}_${nombreLimpio}`;

  try {
    const { error } = await supabase.storage
      .from("registro-fotos") // Usamos el mismo bucket
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });
    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from("registro-fotos")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Error al subir archivo:", err);
    throw new Error("Error al subir archivo: " + err.message);
  }
};

export const obtenerTiposDeActivos = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("tipos_activos")
            .select("codigo_tipo, nombre_tipo, descripcion, ultimo_consecutivo"); // Incluir ultimo_consecutivo

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
        area_ubicacion, // Mapear a clasificacion_ubicacion
        marca,
        modelo_referencia,
        serial,
        estado_activo,
        potencia,
        tension_fase,
        capacidad,
        diametro_placa,
        placas_disponibles,
        material_principal,
        protecciones_seguridad,
        fecha_compra,
        proveedor,
        garantia_hasta,
        costo_compra,
        responsable_gestion,
        contacto_responsable,
        codigo_qr,
        frecuencia_preventivo, // Mapear a frecuencia_mantenimiento
        ultimo_mantenimiento,
        proximo_mantenimiento,
        epp_minimo,
        riesgos_criticos,
        limpieza_segura
    } = req.body;

    const foto_activo_file = req.files?.foto_activo?.[0];
    const documento_riesgos_file = req.files?.documento_riesgos?.[0];

    try {
        const { data: tipoExistente, error: tipoError } = await supabase
            .from('tipos_activos')
            .select('codigo_tipo')
            .eq('nombre_tipo', tipo_activo)
            .single();

        if (tipoError || !tipoExistente) {
            return res.status(400).json({ error: `El tipo de activo '${tipo_activo}' no es válido o no existe en la base de datos de tipos.` });
        }

        const codigo_activo = await generarCodigoActivo(tipo_activo, nombre_activo);

        // Subir archivos
        const foto_activo_url = foto_activo_file ? await subirImagen(foto_activo_file, "inventario/fotos") : null;
        const documento_riesgos_url = documento_riesgos_file ? await subirImagen(documento_riesgos_file, "inventario/docs") : null;

        const { error: insertError } = await supabase
            .from("inventario_mantenimiento")
            .insert([
                {
                    codigo_activo,
                    nombre_activo,
                    tipo_activo,
                    sede,
                    clasificacion_ubicacion: area_ubicacion, // Mapeo
                    marca,
                    modelo_referencia,
                    serial,
                    estado_activo,
                    foto_activo: foto_activo_url,
                    potencia,
                    tension_fase,
                    capacidad,
                    diametro_placa,
                    placas_disponibles,
                    material_principal,
                    protecciones_seguridad,
                    fecha_compra,
                    proveedor,
                    garantia_hasta,
                    costo_compra,
                    responsable_gestion,
                    contacto_responsable,
                    codigo_qr,
                    frecuencia_mantenimiento: frecuencia_preventivo, // Mapeo
                    ultimo_mantenimiento,
                    proximo_mantenimiento,
                    epp_minimo,
                    riesgos_criticos,
                    limpieza_segura,
                    documento_riesgos: documento_riesgos_url
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
                    // Generar código usando el nombre completo del tipo
                    rowData.codigo_activo = await generarCodigoActivo(rowData.tipo_activo, rowData.nombre_activo); 
                } else {
                    rowData.codigo_activo = await generarCodigoActivo("GEN", rowData.nombre_activo);
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
            return res.status(500).json({ error: insertError.message });
        }

        res.status(200).json({ message: `Se insertaron ${rowsToInsert.length} registros de inventario desde el Excel.` });

    } catch (error) {
        console.error("Error al procesar el archivo Excel:", error);
        res.status(500).json({ error: error.message || "Error al procesar el archivo Excel." });
    }
};
export const subirFichaTecnica = async (req, res) => {
  const { id } = req.params; // id será el codigo_activo
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No se ha proporcionado ningún archivo." });
  }

  try {
    // 1. Subir archivo a Storage
    const url = await subirImagen(file, "inventario/fichas");
    if (!url) throw new Error("Error al subir el archivo a Storage.");

    // 2. Obtener el registro actual para actualizar el array
    const { data: currentData, error: fetchError } = await supabase
      .from("inventario_mantenimiento")
      .select("fichas_tecnicas")
      .eq("codigo_activo", id)
      .single();

    if (fetchError) throw fetchError;

    // Asegurarse de que sea un array
    let currentFichas = currentData.fichas_tecnicas;
    if (typeof currentFichas === 'string') {
        try {
            currentFichas = JSON.parse(currentFichas);
        } catch (e) {
            currentFichas = [];
        }
    }
    if (!Array.isArray(currentFichas)) currentFichas = [];

    const newFicha = { name: file.originalname, url, date: new Date().toISOString() };
    const updatedFichas = [...currentFichas, newFicha];

    // 3. Actualizar base de datos
    const { error: updateError } = await supabase
      .from("inventario_mantenimiento")
      .update({ fichas_tecnicas: updatedFichas })
      .eq("codigo_activo", id);

    if (updateError) throw updateError;

    res.status(200).json({ message: "Ficha técnica subida correctamente", fichas_tecnicas: updatedFichas });
  } catch (error) {
    console.error("Error al subir ficha técnica:", error);
    res.status(500).json({ error: error.message });
  }
};

export const eliminarFichaTecnica = async (req, res) => {
  const { id } = req.params; // codigo_activo
  const { fileUrl } = req.body;

  try {
    // 1. Obtener registro actual
    const { data: currentData, error: fetchError } = await supabase
      .from("inventario_mantenimiento")
      .select("fichas_tecnicas")
      .eq("codigo_activo", id)
      .single();

    if (fetchError) throw fetchError;

    let currentFichas = currentData.fichas_tecnicas;
    if (typeof currentFichas === 'string') {
        try {
            currentFichas = JSON.parse(currentFichas);
        } catch (e) {
            currentFichas = [];
        }
    }
    if (!Array.isArray(currentFichas)) currentFichas = [];

    const updatedFichas = currentFichas.filter(f => f.url !== fileUrl);

    // 2. Actualizar base de datos
    const { error: updateError } = await supabase
      .from("inventario_mantenimiento")
      .update({ fichas_tecnicas: updatedFichas })
      .eq("codigo_activo", id);

    if (updateError) throw updateError;

    res.status(200).json({ message: "Ficha técnica eliminada", fichas_tecnicas: updatedFichas });
  } catch (error) {
    console.error("Error al eliminar ficha técnica:", error);
    res.status(500).json({ error: error.message });
  }
};
