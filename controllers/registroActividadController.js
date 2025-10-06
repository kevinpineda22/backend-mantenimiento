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
    // ⭐ Convertir fechas de array a string si es necesario
    const fechaInicioStr = Array.isArray(fechaInicio) ? fechaInicio[0] : fechaInicio;
    const fechaFinalStr = Array.isArray(fechaFinal) ? fechaFinal[0] : fechaFinal;

    // Subida de archivos (si el Líder/SST adjuntó algo)
    const urlAntes = fotoAntes ? await subirImagen(fotoAntes, "antes") : null;
    const urlDespues = fotoDespues ? await subirImagen(fotoDespues, "despues") : null;

    // Inserción en la BD
    const { error: insertError } = await supabase
      .from("registro_mantenimiento")
      .insert([{
        sede,
        actividad,
        fecha_inicio: fechaInicioStr, // ⭐ Usar fecha corregida
        fecha_final: fechaFinalStr, // ⭐ Usar fecha corregida
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
    const subject = `🔧 Nueva Tarea de Mantenimiento - ${sede}`;
    const htmlBody = `
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nueva Tarea de Mantenimiento</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      
      <div style="background-color: #210d65; padding: 25px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">🛠️ Nueva Tarea Asignada</h1>
        <p style="color: #f0f0f0; margin: 8px 0 0 0; font-size: 14px;">Sistema de Mantenimiento</p>
      </div>
      
      <div style="padding: 30px;">
        <div style="border-left: 4px solid #210d65; padding: 15px; margin-bottom: 25px; background-color: #f8f8f8;">
          <h2 style="color: #333333; margin: 0 0 10px 0; font-size: 18px;">¡Tienes una nueva asignación!</h2>
          <p style="color: #666; margin: 0; line-height: 1.6;">Por favor, revisa los detalles a continuación y gestiona la tarea a la brevedad.</p>
        </div>
        
        <div style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 6px; padding: 20px; margin: 20px 0;">
          
          <div style="padding: 10px 0; border-bottom: 1px dashed #eeeeee;">
            <span style="display: block; color: #888; font-size: 12px; font-weight: bold; margin-bottom: 4px;">📍 SEDE</span>
            <p style="margin: 0; font-size: 16px; font-weight: bold; color: #333;">${sede}</p>
          </div>
          
          <div style="padding: 10px 0; border-bottom: 1px dashed #eeeeee;">
            <span style="display: block; color: #888; font-size: 12px; font-weight: bold; margin-bottom: 4px;">📝 ACTIVIDAD / HALLAZGO</span>
            <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.5;">${actividad}</p>
          </div>
          
          <div style="padding: 10px 0; border-bottom: 1px dashed #eeeeee;">
            <span style="display: block; color: #888; font-size: 12px; font-weight: bold; margin-bottom: 4px;">📅 FECHA LÍMITE</span>
            <p style="margin: 0; font-size: 15px; font-weight: bold; color: ${fechaFinalStr ? '#d35400' : '#666'};">${fechaFinalStr || 'No especificada'}</p>
          </div>
          
          <div style="padding: 10px 0;">
            <span style="display: block; color: #888; font-size: 12px; font-weight: bold; margin-bottom: 4px;">👤 ASIGNADO POR</span>
            <p style="margin: 0; font-size: 15px; color: #333;">${creador_email}</p>
          </div>

        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://merkahorro.com/login" target="_blank" style="background-color: #210d65; color: white; padding: 12px 25px; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 15px; text-decoration: none; box-shadow: 0 4px 10px rgba(33, 13, 101, 0.2); transition: background-color 0.3s ease;">
            👉 Acceder y Revisar Tarea
          </a>
        </div>
        
        <div style="background-color: #fffde7; border: 1px solid #ffe082; border-radius: 6px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #795548; font-size: 14px; line-height: 1.8;">
            <strong>ℹ️ Recordatorio:</strong><br>
            Al finalizar, no olvides **actualizar el estado** a "Completado" y **subir la Foto Después** en el sistema.
          </p>
        </div>
      </div>
      
      <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-top: 1px solid #e0e0e0;">
        <p style="margin: 0; color: #888; font-size: 11px;">Este es un mensaje automático. Por favor, no responder directamente.</p>
      </div>
    </div>
  </body>
  </html>`;
    await sendEmail(responsable, subject, htmlBody); // Envía al Email del RESPONSABLE

    return res.status(200).json({ message: "Tarea asignada y notificada exitosamente." });
  } catch (err) {
    console.error("Error en registrarTareaAsignada:", err);
    return res.status(500).json({ error: err.message || "Error interno del servidor al asignar la tarea" });
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

    // ⭐ LÓGICA DE NOTIFICACIÓN DE FINALIZACIÓN MEJORADA
    // Condición: Solo envía si el frontend manda el flag Y si el estado no estaba ya finalizado en la BD.
    if (notificarFinalizacion === "true" && estaFinalizando && registroExistente.creador_email) {
      try {
        const colorPrincipal = nuevoEstado === 'completado' ? '#28a745' : '#dc3545'; // Verde o Rojo
        const estadoTextoFull = nuevoEstado === 'completado' ? '✅ TAREA COMPLETADA' : '❌ TAREA NO COMPLETADA';
        const subject = `${estadoTextoFull}: Tarea en ${registroExistente.sede}`;

        const htmlBody = `
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${estadoTextoFull}</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
              
                            <div style="background-color: ${colorPrincipal}; padding: 25px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">${estadoTextoFull}</h1>
                <p style="color: #f0f0f0; margin: 8px 0 0 0; font-size: 14px;">Tarea en ${registroExistente.sede}</p>
              </div>
              
                            <div style="padding: 30px;">
                <div style="border-left: 4px solid #210d65; padding: 15px; margin-bottom: 25px; background-color: #f8f8f8;">
                  <h2 style="color: #333333; margin: 0 0 10px 0; font-size: 18px;">Actualización de Estado</h2>
                  <p style="color: #666; margin: 0; line-height: 1.6;">La tarea que asignaste ha sido **finalizada** por el responsable.</p>
                </div>
                
                                <div style="border: 1px solid #e0e0e0; border-radius: 6px; padding: 20px; margin: 20px 0;">
                  <h3 style="color: #210d65; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Resumen de Ejecución</h3>
                  
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
                    <tr>
                      <td style="padding: 10px 0;">
                        <span style="display: block; color: #888; font-size: 12px; font-weight: bold; margin-bottom: 4px;">📍 SEDE</span>
                        <p style="margin: 0; font-size: 15px; font-weight: bold; color: #333;">${registroExistente.sede}</p>
                      </td>
                      <td style="padding: 10px 0;">
                        <span style="display: block; color: #888; font-size: 12px; font-weight: bold; margin-bottom: 4px;">📅 FINALIZADO EL</span>
                        <p style="margin: 0; font-size: 15px; font-weight: bold; color: #333;">${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2" style="padding: 10px 0;">
                        <span style="display: block; color: #888; font-size: 12px; font-weight: bold; margin-bottom: 4px;">👤 EJECUTADO POR</span>
                        <p style="margin: 0; font-size: 15px; color: #333;">${registroExistente.responsable}</p>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2" style="padding: 10px 0; border-top: 1px dashed #eeeeee; margin-top: 15px; padding-top: 15px;">
                        <span style="display: block; color: #888; font-size: 12px; font-weight: bold; margin-bottom: 4px;">🔧 ACTIVIDAD</span>
                        <p style="margin: 0; font-size: 14px; color: #333; line-height: 1.5;">${registroExistente.actividad}</p>
                      </td>
                    </tr>
                  </table>
                </div>
                
                                ${observacion ? `
                <div style="margin-top: 25px;">
                  <span style="display: inline-block; background-color: #210d65; color: white; padding: 5px 15px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-bottom: 15px;">📝 OBSERVACIONES / SEGUIMIENTO</span>
                  <div style="background-color: #f8f8f8; border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px;">
                    <p style="margin: 0; font-size: 14px; color: #333; line-height: 1.7; white-space: pre-wrap; word-wrap: break-word;">${observacion}</p>
                  </div>
                </div>
                ` : ''}

                                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://merkahorro.com/login" target="_blank" style="background-color: #210d65; color: white; padding: 12px 25px; border-radius: 4px; display: inline-block; font-weight: bold; font-size: 15px; text-decoration: none; box-shadow: 0 4px 10px rgba(33, 13, 101, 0.2); transition: background-color 0.3s ease;">
                    🔎 Ver Fotos (Antes/Después)
                  </a>
                </div>
              </div>
              
                            <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-top: 1px solid #e0e0e0;">
                <p style="margin: 0; color: #888; font-size: 11px;">Sistema de Gestión de Mantenimiento</p>
              </div>
            </div>
          </body>
          </html>
        `;

        await sendEmail(registroExistente.creador_email, subject, htmlBody);
        console.log(`📧 Notificación de finalización enviada a: ${registroExistente.creador_email}`);
      } catch (emailError) {
        console.error("❌ Error al enviar notificación de finalización:", emailError);
        // No fallar la actualización si el email falla
      }
    } res.json({ message: "Actividad actualizada correctamente" });
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

// ⭐ Asegúrate de que esta función exista al final del archivo:
export const obtenerHistorialPorCreador = async (req, res) => {
  const { creadorEmail } = req.query;

  if (!creadorEmail) {
    return res.status(400).json({ error: "El correo del creador es requerido para el filtro." });
  }

  try {
    const { data, error } = await supabase
      .from("registro_mantenimiento")
      .select("*")
      .eq("creador_email", creadorEmail)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error("Error en obtenerHistorialPorCreador:", err);
    res.status(500).json({ error: "Error al obtener el historial filtrado" });
  }
};

// ⭐ NUEVO ENDPOINT: Obtener historial filtrado por responsable (tareas asignadas A MÍ)
export const obtenerHistorialPorResponsable = async (req, res) => {
  const { responsableEmail } = req.query;

  if (!responsableEmail) {
    return res.status(400).json({ error: "El correo del responsable es requerido para el filtro." });
  }

  try {
    const { data, error } = await supabase
      .from("registro_mantenimiento")
      .select("*")
      .eq("responsable", responsableEmail)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error("Error en obtenerHistorialPorResponsable:", err);
    res.status(500).json({ error: "Error al obtener el historial filtrado por responsable" });
  }
};