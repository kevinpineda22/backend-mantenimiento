import supabase from "../supabase/cliente.js";
import sharp from "sharp"; // Importar sharp para la conversión a WebP
import ExcelJS from "exceljs"; // Importar ExcelJS para manejar archivos Excel

// Logica post
export const registrarFoto = async (req, res) => {
  const { sede,responsable, fecha } = req.body;
  const fotoAntes = req.files?.fotoAntes?.[0];
  const fotoDespues = req.files?.fotoDespues?.[0];

  try {
    const subirImagen = async (file, carpeta) => {
      // Limpiar el nombre del archivo y reemplazar la extensión por .webp
      const nombreLimpio = file.originalname
        .replace(/\s/g, "_")
        .replace(/\.[^/.]+$/, ".webp");
      const filePath = `${carpeta}/${Date.now()}_${nombreLimpio}`;

      // Convertir la imagen a WebP usando sharp
      const webpBuffer = await sharp(file.buffer)
        .webp({ quality: 65 }) // Calidad del 80% para equilibrar tamaño y calidad
        .toBuffer();

      // Subir la imagen convertida a Supabase
      const { data, error } = await supabase.storage
        .from("registro-fotos")
        .upload(filePath, webpBuffer, {
          contentType: "image/webp", // Especificar el tipo de contenido como WebP
        });

      if (error) throw error;

      // Obtener la URL pública de la imagen
      const { data: publicUrlData } = supabase.storage
        .from("registro-fotos")
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    };

    // Subir ambas imágenes (antes y después)
    const urlAntes = fotoAntes ? await subirImagen(fotoAntes, "antes") : null;
    const urlDespues = fotoDespues
      ? await subirImagen(fotoDespues, "despues")
      : null;

    // Insertar el registro en la tabla registro_fotografico
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
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Obtener historial de registro fotográfico
export const obtenerHistorial = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("registro_fotografico")
      .select("*");

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener el historial" });
  }
};
// Editar un registro fotográfico
export const actualizarRegistroFotografico = async (req, res) => {
  const { id } = req.params;
  const { sede, responsable, fecha } = req.body;
  const fotoAntes = req.files?.fotoAntes?.[0];
  const fotoDespues = req.files?.fotoDespues?.[0];

  try {
    // Verificar si el registro existe
    const { data: registro, error: fetchError } = await supabase
      .from("registro_fotografico")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !registro) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    // Función para subir imagen si existe archivo nuevo
    const subirImagen = async (file, carpeta) => {
      const nombreLimpio = file.originalname
        .replace(/\s/g, "_")
        .replace(/\.[^/.]+$/, ".webp");
      const filePath = `${carpeta}/${Date.now()}_${nombreLimpio}`;
      const webpBuffer = await sharp(file.buffer)
        .webp({ quality: 65 })
        .toBuffer();
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

    // Subir nuevas imágenes si se enviaron, si no, mantener las actuales
    let urlAntes = registro.foto_antes_url;
    let urlDespues = registro.foto_despues_url;
    if (fotoAntes) {
      urlAntes = await subirImagen(fotoAntes, "antes");
    }
    if (fotoDespues) {
      urlDespues = await subirImagen(fotoDespues, "despues");
    }

    // Actualizar el registro con los datos y las URLs de imagen (nuevas o existentes)
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

// Eliminar un registro fotográfico
export const eliminarRegistroFotografico = async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si el registro existe
    const { data: registro, error: fetchError } = await supabase
      .from("registro_fotografico")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !registro) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    // Eliminar el registro
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



//////////////////////////////////////////////////////////////////////////

// Nueva lógica para registrar actividades con logs y validaciones
export const registrarActividad = async (req, res) => {
  try {
    // Mostrar el cuerpo recibido para depuración
    console.log("Body recibido:", req.body);

    const {
      sede,
      actividad,
      fechaInicio,
      fechaFinal,
      precio,
      estado,
      responsable,
    } = req.body;

    // Validar campos obligatorios
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

    // Insertar en la tabla registro_actividades
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
      console.error("Error al insertar en Supabase:", insertError);
      return res.status(500).json({ error: insertError.message });
    }

    return res
      .status(200)
      .json({ message: "Actividad registrada exitosamente" });
  } catch (err) {
    console.error("Error general:", err);
    return res
      .status(500)
      .json({ error: err.message || "Error interno del servidor" });
  }
};
// Nueva lógica para obtener historial de actividades
export const obtenerHistorialActividades = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("registro_mantenimiento")
      .select("*");

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Error al obtener el historial de actividades" });
  }
};

//metodo put
export const actualizarActividad = async (req, res) => {
  const { id } = req.params;
  const { estado, precio, fechaInicio, fechaFinal, sede, actividad,responsable } = req.body;

  console.log("ID recibido:", id); // Depura el ID
  console.log("Cuerpo de la solicitud:", req.body); // Depura el cuerpo

  try {
    const { data: activity, error } = await supabase
      .from("registro_mantenimiento")
      .select("*")
      .eq("id", id)
      .single();

    console.log("Resultado de la consulta:", { activity, error }); // Depura la consulta

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

/**
 * Elimina una actividad de la tabla registro_mantenimiento según su ID.

 */
export const eliminarActividad = async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si la actividad existe antes de eliminar
    const { data: actividad, error: fetchError } = await supabase
      .from("registro_mantenimiento")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !actividad) {
      return res.status(404).json({ error: "Actividad no encontrada" });
    }

    // Eliminar la actividad
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

// Helper para generar código aleatorio
// Formato: MT-(TIPO_ACTIVO_CORTO)-(NOMBRE_ACTIVO_CORTO)-(RANDOM)
function generarCodigoActivo(tipoActivo, nombreActivo) {
    const prefix = "MT";
    const tipoPart = tipoActivo ? tipoActivo.toUpperCase().replace(/\s/g, '').substring(0, 3) : "GEN";
    const nombrePart = nombreActivo ? nombreActivo.toUpperCase().replace(/\s/g, '').substring(0, 3) : "ACC";
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${tipoPart}-${nombrePart}-${randomPart}`;
}

// Obtener Tipos de Activos desde la tabla 'tipos_activos'
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

// Registrar un nuevo activo de inventario (manual desde formulario)
export const registrarInventario = async (req, res) => {
    const {
        nombre_activo,
        tipo_activo, // Este será el 'nombre_tipo' del Excel/tabla 'tipos_activos'
        sede,
        clasificacion_ubicacion,
        estado_activo,
        frecuencia_mantenimiento,
        responsable_gestion
    } = req.body;

    try {
        // Validación: Asegurarse de que el tipo_activo exista en la tabla 'tipos_activos'
        const { data: tipoExistente, error: tipoError } = await supabase
            .from('tipos_activos')
            .select('codigo_tipo')
            .eq('nombre_tipo', tipo_activo)
            .single();

        if (tipoError || !tipoExistente) {
            return res.status(400).json({ error: `El tipo de activo '${tipo_activo}' no es válido o no existe en la base de datos de tipos.` });
        }

        // Generar el código aleatorio utilizando el código corto del tipo de activo
        const codigo_activo = generarCodigoActivo(tipoExistente.codigo_tipo, nombre_activo);

        const { error: insertError } = await supabase
            .from("inventario_mantenimiento")
            .insert([
                {
                    codigo_activo,
                    nombre_activo,
                    tipo_activo, // Aquí guardamos el nombre_tipo completo
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

// Obtener todo el inventario de mantenimiento (para el módulo Hoja de Vida y tabla en Inventario)
export const obtenerInventario = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("inventario_mantenimiento")
            .select("*")
            .order('created_at', { ascending: false }); // Ordenar por fecha de creación, los más recientes primero

        if (error) throw error;

        res.status(200).json(data);
    } catch (err) {
        console.error("Error en obtenerInventario:", err);
        res.status(500).json({ error: "Error al obtener el inventario" });
    }
};

// Actualizar un activo de inventario
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
        // Opcional: Re-validar que el tipo_activo siga existiendo
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

// Eliminar un activo de inventario
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

// Cargar Excel con datos de inventario y tipos de activos
export const cargarExcelInventario = async (req, res) => {
    const excelFile = req.file;

    if (!excelFile) {
        return res.status(400).json({ error: "No se encontró el archivo Excel" });
    }

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(excelFile.buffer);

        // --- Procesar Hoja 2: Tipos de Activos ---
        const tiposActivosWorksheet = workbook.getWorksheet(2); // Hoja 2
        const tiposActivosToInsert = [];
        const existingTiposActivos = new Set(); // Para evitar duplicados en la BD y en la inserción
        const { data: currentTipos, error: fetchTiposError } = await supabase.from('tipos_activos').select('codigo_tipo, nombre_tipo');
        if (fetchTiposError) throw fetchTiposError;
        currentTipos.forEach(t => {
            existingTiposActivos.add(t.codigo_tipo);
            existingTiposActivos.add(t.nombre_tipo);
        });

        if (tiposActivosWorksheet) {
            const tiposHeaders = tiposActivosWorksheet.getRow(1).values.map(h => typeof h === 'object' ? h.result : h)?.filter(Boolean).map(h => h.toLowerCase().trim());
            const codigoTipoIndex = tiposHeaders.indexOf("codigo");
            const nombreTipoIndex = tiposHeaders.indexOf("tipo de activo");
            const descripcionTipoIndex = tiposHeaders.indexOf("descripción");

            if (codigoTipoIndex === -1 || nombreTipoIndex === -1) {
                console.warn("Advertencia: La Hoja 2 de tipos de activos no tiene los encabezados 'Código' o 'Tipo de Activo'. Se omitirá la carga de tipos.");
            } else {
                for (let i = 2; i <= tiposActivosWorksheet.rowCount; i++) {
                    const row = tiposActivosWorksheet.getRow(i);
                    const codigo_tipo = row.getCell(codigoTipoIndex + 1).value?.toString().trim();
                    const nombre_tipo = row.getCell(nombreTipoIndex + 1).value?.toString().trim();
                    const descripcion = descripcionTipoIndex !== -1 ? row.getCell(descripcionTipoIndex + 1).value?.toString().trim() : null;

                    if (codigo_tipo && nombre_tipo && !existingTiposActivos.has(codigo_tipo) && !existingTiposActivos.has(nombre_tipo)) {
                        tiposActivosToInsert.push({ codigo_tipo, nombre_tipo, descripcion });
                        existingTiposActivos.add(codigo_tipo);
                        existingTiposActivos.add(nombre_tipo);
                    }
                }

                if (tiposActivosToInsert.length > 0) {
                    const { error: insertTiposError } = await supabase
                        .from("tipos_activos")
                        .insert(tiposActivosToInsert)
                        .select(); // Para obtener los IDs generados si fuera necesario

                    if (insertTiposError) {
                        console.error("Error al insertar tipos de activos desde Excel:", insertTiposError);
                        // No lanzamos error fatal aquí, solo registramos, para que la carga de inventario principal pueda continuar.
                    } else {
                        console.log(`Se insertaron ${tiposActivosToInsert.length} nuevos tipos de activos.`);
                    }
                }
            }
        } else {
            console.warn("Advertencia: No se encontró la Hoja 2 para los tipos de activos. La carga de tipos será omitida.");
        }


       // --- Procesar Hoja 1: Inventario de Mantenimiento ---
        const inventarioWorksheet = workbook.getWorksheet(1); // Hoja 1
        const rowsToInsert = [];

        // Obtener encabezados de la Hoja 1, limpiar, convertir a minúsculas y trim
        const headers = inventarioWorksheet.getRow(1).values
            .map(h => (typeof h === 'object' && h !== null && h.richText) ? h.richText.map(part => part.text).join('') : h) // Manejar richText
            .filter(Boolean) // Eliminar valores nulos/vacíos
            .map(h => h.toString().toLowerCase().trim()); // Convertir a minúsculas y trim
            
        const columnMap = {
            "codigo": "codigo_activo_excel", // Capturamos el código si viene del Excel, no lo usaremos directamente para la BD
            "nombre del activo": "nombre_activo",
            "tipo de activo": "tipo_activo",
            "sede": "sede",
            "clasificacion por ubicacion": "clasificacion_ubicacion",
            "estado del activo": "estado_activo",
            "frecuencia de mantenimiento": "frecuencia_mantenimiento", // <--- CORRECCIÓN: "de" y sin tilde
            "responsable de la gestion": "responsable_gestion" // <--- CORRECCIÓN: así es como viene en tu Excel
        };

        const requiredHeaders = Object.keys(columnMap).filter(key => key !== "codigo"); // El código no es obligatorio para la lógica de importación, se genera.

        const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
        if (missingHeaders.length > 0) {
            return res.status(400).json({ error: `Faltan los siguientes encabezados en la Hoja 1 del Excel: ${missingHeaders.join(", ")}. Por favor, asegúrate de que los encabezados coincidan exactamente (sin tildes, en minúsculas).` });
        }


        // Obtener los tipos de activos actuales para validación antes de insertar
        // Usamos los tipos que ya existen MÁS los que se pudieron insertar de la Hoja 2
        const { data: allCurrentTipos, error: fetchAllTiposError } = await supabase.from('tipos_activos').select('nombre_tipo, codigo_tipo');
        if (fetchAllTiposError) throw fetchAllTiposError;
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
                const header = headers[j]; // Encabezado en minúsculas y trim
                const dbColumnName = columnMap[header]; // Nombre de columna de la BD

                if (dbColumnName) {
                    const cellValue = getCellValue(j);
                    rowData[dbColumnName] = cellValue;
                    if (cellValue !== null && cellValue !== "") {
                        isEmptyRow = false;
                    }
                }
            }

            if (!isEmptyRow) {
                // Validar que el tipo de activo de la fila exista en los tipos conocidos
                if (!validTiposActivos.has(rowData.tipo_activo)) {
                    console.warn(`Advertencia: Tipo de activo no válido en la fila ${i} de Hoja 1: '${rowData.tipo_activo}'. Se omitirá esta fila.`);
                    continue; // Saltar esta fila
                }

                // Generar código de activo si no viene o si no queremos usar el del Excel
                // Siempre generaremos el código con nuestra lógica para asegurar consistencia
                const tipoCorto = tipoCodigoMap.get(rowData.tipo_activo);
                if (tipoCorto) {
                    rowData.codigo_activo = generarCodigoActivo(tipoCorto, rowData.nombre_activo);
                } else {
                    rowData.codigo_activo = generarCodigoActivo("GEN", rowData.nombre_activo); // Fallback si no se encuentra el código corto
                }

                // Eliminar el código_activo_excel si se capturó para no insertarlo en la BD principal
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
            // Capturar error de duplicado de código_activo y dar un mensaje más amigable
            if (insertError.code === '23505' && insertError.details?.includes('codigo_activo')) {
                return res.status(409).json({ error: "Error: Se intentaron insertar códigos de activo duplicados. Por favor, revisa tu archivo Excel o los registros existentes." });
            }
            return res.status(500).json({ error: insertError.message });
        }

        res.status(200).json({ message: `Se insertaron ${rowsToInsert.length} registros de inventario desde el Excel.` });

    } catch (error) {
        console.error("Error al procesar el archivo Excel:", error);
        res.status(500).json({ error: error.message || "Error al procesar el archivo Excel." });
    }
};

