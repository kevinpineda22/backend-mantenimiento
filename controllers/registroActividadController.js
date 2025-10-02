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


// ==========================================================
// 1. ENDPOINT DE ASIGNACIÓN (LÍDER/SST) - TIENE LÓGICA DE CORREO
// ESTA FUNCIÓN DEBE SER LLAMADA POR EL FORMULARIO AsignarTarea.jsx
// ==========================================================
export const registrarTareaAsignada = async (req, res) => {
  // Nota: Cuando se usa Multer, todos los campos no-archivo llegan en req.body.
  const {
    sede,
    actividad,
    fechaInicio,
    fechaFinal, // Usado como Fecha Límite
    precio,
    estado,
    responsable, // Correo del asignado
    observacion,
    creador_email, // Correo del asignador
  } = req.body;

  // Archivos subidos por el Líder/SST
  const fotoAntes = req.files?.fotoAntes?.[0];
  const fotoDespues = req.files?.fotoDespues?.[0];

  if (!sede || !actividad || !fechaInicio || !estado || !responsable || !creador_email) {
    return res.status(400).json({ error: "Faltan campos obligatorios para la asignación." });
  }

  try {
    // Subida de archivos (si el Líder/SST adjuntó algo)
    const urlAntes = fotoAntes ? await subirImagen(fotoAntes, "antes") : null;
    const urlDespues = fotoDespues ? await subirImagen(fotoDespues, "despues") : null;

    // Inserción en la BD
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
        // Nota: El campo 'designado' se deja NULL ya que no es usado por el asignador.
        creador_email: creador_email,
        foto_antes_url: urlAntes,
        foto_despues_url: urlDespues,
      }]);

    if (insertError) throw insertError;

    // ⭐ ENVIAR NOTIFICACIÓN POR CORREO (Trigger de asignación)
    const subject = `🔧 Tarea de Mantenimiento Asignada: ${sede}`;
    const htmlBody = `
            <h2>¡Se te ha asignado una nueva tarea de mantenimiento!</h2>
            <p><strong>Sede:</strong> ${sede}</p>
            <p><strong>Actividad:</strong> ${actividad}</p>
            <p><strong>Fecha Límite:</strong> ${fechaFinal || 'N/A'}</p>
            <p><strong>Observaciones del Asignador:</strong> ${observacion || 'Ninguna'}</p>
            <p><strong>Asignada por:</strong> ${creador_email}</p>
            <p>Por favor, revisa el sistema para comenzar la ejecución.</p>
        `;

    await sendEmail(responsable, subject, htmlBody); // Envía al Email del RESPONSABLE

    return res.status(200).json({ message: "Tarea asignada y notificada exitosamente." });
  } catch (err) {
    console.error("Error en registrarTareaAsignada:", err);
    return res.status(500).json({ error: err.message || "Error interno del servidor al asignar la tarea" });
  }
};


// ==========================================================
// 2. ENDPOINT DE REGISTRO MANUAL/ACTUALIZACIÓN
// ESTA FUNCIÓN DEBE SER LLAMADA POR EL FORMULARIO RegistroActividad.jsx
// ==========================================================
export const registrarActividadCompleta = async (req, res) => {
  const {
    sede,
    actividad,
    fechaInicio,
    fechaFinal,
    precio,
    estado,
    responsable,
    designado, // ⭐ CAPTURAR DESIGNADO
    observacion,
    creador_email, // Capturar si se envía (aunque normalmente no se envía aquí)
  } = req.body;
  const fotoAntes = req.files?.fotoAntes?.[0];
  const fotoDespues = req.files?.fotoDespues?.[0];

  if (!sede || !actividad || !fechaInicio || !estado || !responsable) {
    return res.status(400).json({ error: "Faltan campos obligatorios." });
  }

  try {
    const fechaInicioStr = Array.isArray(fechaInicio) ? fechaInicio[0] : fechaInicio;
    const fechaFinalStr = Array.isArray(fechaFinal) ? fechaFinal[0] : fechaFinal;

    const urlAntes = fotoAntes ? await subirImagen(fotoAntes, "antes") : null;
    const urlDespues = fotoDespues ? await subirImagen(fotoDespues, "despues") : null;

    const { error: insertError } = await supabase
      .from("registro_mantenimiento")
      .insert([
        {
          sede,
          actividad,
          fecha_inicio: fechaInicioStr,
          fecha_final: fechaFinalStr,
          precio: precio ? parseFloat(precio) : null,
          observacion,
          estado,
          responsable,
          designado, // ⭐ GUARDAR DESIGNADO
          creador_email: creador_email, // Guardar si el mantenimiento crea su propia tarea y quiere registrarse como creador
          foto_antes_url: urlAntes,
          foto_despues_url: urlDespues,
        },
      ]);

    if (insertError) {
      console.error("Error al insertar en Supabase (actividad completa):", insertError);
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(200).json({ message: "Actividad y registro fotográfico enviados exitosamente" });
  } catch (err) {
    console.error("Error general en registrarActividadCompleta:", err);
    return res.status(500).json({ error: err.message || "Error interno del servidor" });
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

// ==========================================================
// 3. ENDPOINT DE ACTUALIZACIÓN (TIENE LÓGICA DE CORREO DE FINALIZACIÓN)
// ==========================================================
export const actualizarActividadCompleta = async (req, res) => {
  const { id } = req.params;
  const {
    sede,
    actividad,
    estado,
    precio,
    responsable,
    fechaInicio,
    fechaFinal,
    observacion,
    designado, // ⭐ CAPTURAR DESIGNADO
    notificarFinalizacion,
  } = req.body;
  const fotoAntes = req.files?.fotoAntes?.[0];
  const fotoDespues = req.files?.fotoDespues?.[0];

  if (!sede || !actividad || !fechaInicio || !estado || !responsable) {
    return res.status(400).json({ error: "Faltan campos obligatorios para actualizar." });
  }

  try {
    const fechaInicioStr = Array.isArray(fechaInicio) ? fechaInicio[0] : fechaInicio;
    const fechaFinalStr = Array.isArray(fechaFinal) ? fechaFinal[0] : fechaFinal;

    const { data: registroExistente, error: fetchError } = await supabase
      .from("registro_mantenimiento")
      .select("foto_antes_url, foto_despues_url, creador_email, estado, sede, actividad, responsable")
      .eq("id", id)
      .single();

    if (fetchError || !registroExistente) {
      return res.status(404).json({ error: "Registro de actividad no encontrado" });
    }

    const urlAntes = fotoAntes ? await subirImagen(fotoAntes, "antes") : registroExistente.foto_antes_url;
    const urlDespues = fotoDespues ? await subirImagen(fotoDespues, "despues") : registroExistente.foto_despues_url;

    const nuevoEstado = estado;
    const yaEstabaCompletado = ['completado', 'no_completado'].includes(registroExistente.estado);
    const estaFinalizando = ['completado', 'no_completado'].includes(nuevoEstado) && !yaEstabaCompletado;

    const { error: updateError } = await supabase
      .from("registro_mantenimiento")
      .update({
        sede,
        actividad,
        estado,
        precio: precio ? parseFloat(precio) : null,
        responsable,
        fecha_inicio: fechaInicioStr,
        fecha_final: fechaFinalStr,
        observacion,
        designado, // ⭐ ACTUALIZAR DESIGNADO
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
