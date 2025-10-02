// backend-mantenimiento/controllers/registroActividadController.js (ACTUALIZADO)

import supabase from "../supabase/cliente.js";
import sharp from "sharp"; 
import { sendEmail } from "../emailService.js"; // ⭐ IMPORTAR SERVICIO EXISTENTE

// Función auxiliar para subir y optimizar imágenes
const subirImagen = async (file, carpeta) => {
  if (!file) return null;
  const nombreLimpio = file.originalname.replace(/\s/g, "_");
  const filePath = `${carpeta}/${Date.now()}_${nombreLimpio}`;

  try {
    // Subir el archivo directamente con su tipo original
    const { error } = await supabase.storage
      .from("registro-fotos")
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });
    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from("registro-fotos")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Error al subir imagen:", err);
    throw new Error("Error al subir imagen: " + err.message);
  }
};

// ⭐ NUEVO: ENDPOINT PARA LA ASIGNACIÓN DE TAREAS (LÍDER/SST)
export const registrarTareaAsignada = async (req, res) => {
    const {
        sede,
        actividad,
        fechaInicio,
        fechaFinal,
        precio,
        estado,
        responsable, // Correo del asignado
        observacion, 
        creadorEmail, // Correo de la persona que usa el formulario (Líder/SST)
    } = req.body;
    
    if (!sede || !actividad || !fechaInicio || !estado || !responsable || !creadorEmail) {
        return res.status(400).json({ error: "Faltan campos obligatorios para la asignación." });
    }

    try {
        // 1. Guardar en la BD
        const { error: insertError } = await supabase
            .from("registro_mantenimiento")
            .insert([{
                sede,
                actividad,
                fecha_inicio: fechaInicio,
                fecha_final: fechaFinal,
                precio: precio ? parseFloat(precio) : null,
                observacion, 
                estado,
                responsable, 
                creador_email: creadorEmail, 
            }]);

        if (insertError) throw insertError;

        // 2. Enviar Notificación por Correo
        const subject = `🔧 Tarea de Mantenimiento Asignada: ${sede}`;
        const htmlBody = `
            <h2>¡Se te ha asignado una nueva tarea de mantenimiento!</h2>
            <p><strong>Sede:</strong> ${sede}</p>
            <p><strong>Actividad:</strong> ${actividad}</p>
            <p><strong>Fecha Estimada:</strong> ${fechaInicio} - ${fechaFinal || 'N/A'}</p>
            <p><strong>Observaciones:</strong> ${observacion || 'Ninguna'}</p>
            <p><strong>Asignada por:</strong> ${creadorEmail}</p>
            <p>Por favor, regístrate y sube la "Foto Antes" de inmediato.</p>
        `;
        
        await sendEmail(responsable, subject, htmlBody); // Usando tu emailService

        return res.status(200).json({ message: "Tarea asignada y notificada exitosamente." });
    } catch (err) {
        console.error("Error en registrarTareaAsignada:", err);
        return res.status(500).json({ error: err.message || "Error interno del servidor al asignar la tarea" });
    }
};

export const registrarActividadCompleta = async (req, res) => {
  const {
    sede,
    actividad,
    fechaInicio,
    fechaFinal,
    precio, // Ahora es opcional
    estado,
    responsable,
    observacion, // ⭐ Agregado: Campo Observación
  } = req.body;
  const fotoAntes = req.files?.fotoAntes?.[0];
  const fotoDespues = req.files?.fotoDespues?.[0]; // Validación de campos obligatorios

  if (!sede || !actividad || !fechaInicio || !estado || !responsable) {
    return res
      .status(400)
      .json({
        error:
          "Faltan campos obligatorios: sede, actividad, fechaInicio, estado, y responsable.",
      });
  }

  try {
    const urlAntes = fotoAntes ? await subirImagen(fotoAntes, "antes") : null;
    const urlDespues = fotoDespues
      ? await subirImagen(fotoDespues, "despues")
      : null;

    const { error: insertError } = await supabase
      .from("registro_mantenimiento")
      .insert([
        {
          sede,
          actividad,
          fecha_inicio: fechaInicio,
          fecha_final: fechaFinal,
          precio: precio ? parseFloat(precio) : null, // El precio ahora puede ser null
          observacion, // ⭐ Se guarda la observación
          estado,
          responsable,
          foto_antes_url: urlAntes,
          foto_despues_url: urlDespues,
        },
      ]);

    if (insertError) {
      console.error(
        "Error al insertar en Supabase (actividad completa):",
        insertError
      );
      return res.status(500).json({ error: insertError.message });
    }

    return res
      .status(200)
      .json({
        message: "Actividad y registro fotográfico enviados exitosamente",
      });
  } catch (err) {
    console.error("Error general en registrarActividadCompleta:", err);
    return res
      .status(500)
      .json({ error: err.message || "Error interno del servidor" });
  }
};

export const obtenerHistorialCompleto = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("registro_mantenimiento")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error("Error en obtenerHistorialCompleto:", err);
    res.status(500).json({ error: "Error al obtener el historial completo" });
  }
};

export const actualizarActividadCompleta = async (req, res) => {
  const { id } = req.params;
  const {
    sede,
    actividad,
    estado,
    precio, // Ahora es opcional
    responsable,
    fechaInicio,
    fechaFinal,
    observacion, // ⭐ Agregado: Campo Observación
    notificarFinalizacion, // ⭐ Flag para notificación
  } = req.body;
  const fotoAntes = req.files?.fotoAntes?.[0];
  const fotoDespues = req.files?.fotoDespues?.[0]; // Validación de campos obligatorios

  if (!sede || !actividad || !fechaInicio || !estado || !responsable) {
    return res
      .status(400)
      .json({
        error:
          "Faltan campos obligatorios: sede, actividad, fechaInicio, estado, y responsable.",
      });
  }

  try {
    const { data: registroExistente, error: fetchError } = await supabase
      .from("registro_mantenimiento")
      // ⭐ SELECCIONAR creador_email y estado actual para la lógica de notificación
      .select("foto_antes_url, foto_despues_url, creador_email, estado, sede, actividad, responsable")
      .eq("id", id)
      .single();

    if (fetchError || !registroExistente) {
      return res
        .status(404)
        .json({ error: "Registro de actividad no encontrado" });
    }

    const urlAntes = fotoAntes
      ? await subirImagen(fotoAntes, "antes")
      : registroExistente.foto_antes_url;
    const urlDespues = fotoDespues
      ? await subirImagen(fotoDespues, "despues")
      : registroExistente.foto_despues_url;

    // Lógica para determinar si la actividad está siendo finalizada por primera vez
    const nuevoEstado = estado;
    const yaEstabaCompletado = ['completado', 'no_completado'].includes(registroExistente.estado);
    const estaFinalizando = ['completado', 'no_completado'].includes(nuevoEstado) && !yaEstabaCompletado;

    const { error: updateError } = await supabase
      .from("registro_mantenimiento")
      .update({
        sede,
        actividad,
        estado,
        precio: precio ? parseFloat(precio) : null, // El precio ahora puede ser null
        responsable,
        fecha_inicio: fechaInicio,
        fecha_final: fechaFinal,
        observacion, // ⭐ Se actualiza la observación
        foto_antes_url: urlAntes,
        foto_despues_url: urlDespues,
      })
      .eq("id", id);

    if (updateError) {
      throw updateError;
    }
    
    // ⭐ LÓGICA DE NOTIFICACIÓN DE FINALIZACIÓN
    if (notificarFinalizacion === "true" && estaFinalizando && registroExistente.creador_email) {
        const subject = `✅ Tarea FINALIZADA: ${registroExistente.sede}`;
        const htmlBody = `
            <h2>La tarea que asignaste ha sido finalizada por: ${registroExistente.responsable}.</h2>
            <p><strong>Estado:</strong> ${nuevoEstado === 'completado' ? 'Completada' : 'No Completada'}</p>
            <p><strong>Sede:</strong> ${registroExistente.sede}</p>
            <p><strong>Actividad:</strong> ${registroExistente.actividad}</p>
            <p>Revisa el historial para ver la "Foto Después" y la Observación final.</p>
        `;
        await sendEmail(registroExistente.creador_email, subject, htmlBody);
    }

    res.json({ message: "Actividad actualizada correctamente" });
  } catch (error) {
    console.error("Error en actualizarActividadCompleta:", error);
    res.status(500).json({ error: "Error al actualizar la actividad" });
  }
};

export const eliminarActividadCompleta = async (req, res) => {
  const { id } = req.params;

  try {
    const { data: registro, error: fetchError } = await supabase
      .from("registro_mantenimiento")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !registro) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    const { error: deleteError } = await supabase
      .from("registro_mantenimiento")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    res.json({ message: "Registro eliminado correctamente" });
  } catch (error) {
    console.error("Error en eliminarActividadCompleta:", error);
    res.status(500).json({ error: "Error al eliminar el registro" });
  }
};

// Elimina una imagen del historial y actualiza el registro en la base de datos
export const eliminarImagenHistorial = async (req, res) => {
  const { id } = req.params; // id del registro
  const { tipo } = req.body; // 'antes' o 'despues'

  if (!id || !tipo || !["antes", "despues"].includes(tipo)) {
    return res
      .status(400)
      .json({ error: "Faltan datos o tipo inválido ('antes' o 'despues')" });
  }

  try {
    // Obtiene la URL actual de la imagen
    const { data: registro, error: fetchError } = await supabase
      .from("registro_mantenimiento")
      .select(tipo === "antes" ? "foto_antes_url" : "foto_despues_url")
      .eq("id", id)
      .single();

    if (fetchError || !registro) {
      return res.status(404).json({ error: "Registro no encontrado" });
    }

    const urlImagen =
      tipo === "antes" ? registro.foto_antes_url : registro.foto_despues_url;
    if (!urlImagen) {
      return res.status(400).json({ error: "No hay imagen para eliminar" });
    } // Extrae la ruta del archivo en el bucket desde la URL pública

    const pathMatch = urlImagen.match(/registro-fotos\/(.+)$/);
    if (!pathMatch) {
      return res
        .status(400)
        .json({ error: "No se pudo extraer la ruta de la imagen" });
    }
    const filePath = pathMatch[1]; // Elimina la imagen del bucket

    const { error: deleteError } = await supabase.storage
      .from("registro-fotos")
      .remove([filePath]);
    if (deleteError) {
      return res
        .status(500)
        .json({ error: "Error al eliminar la imagen del storage" });
    } // Actualiza el registro en la base de datos

    const updateField =
      tipo === "antes" ? { foto_antes_url: null } : { foto_despues_url: null };
    const { error: updateError } = await supabase
      .from("registro_mantenimiento")
      .update(updateField)
      .eq("id", id);
    if (updateError) {
      return res.status(500).json({ error: "Error al actualizar el registro" });
    }

    return res.json({ message: "Imagen eliminada correctamente" });
  } catch (error) {
    console.error("Error en eliminarImagenHistorial:", error);
    res.status(500).json({ error: "Error al eliminar la imagen" });
  }
};
