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
  const {
    sede,
    actividad,
    fechaInicio,
    fechaFinal,
    precio,
    estado,
    responsable, // ⭐ Este puede contener múltiples emails separados por ";"
    observacion,
    creador_email,
  } = req.body;

  const fotoAntes = req.files?.fotoAntes?.[0];
  const fotoDespues = req.files?.fotoDespues?.[0];

  if (!sede || !actividad || !fechaInicio || !estado || !responsable || !creador_email) {
    return res.status(400).json({ error: "Faltan campos obligatorios para la asignación." });
  }

  try {
    const fechaInicioStr = Array.isArray(fechaInicio) ? fechaInicio[0] : fechaInicio;
    const fechaFinalStr = Array.isArray(fechaFinal) ? fechaFinal[0] : fechaFinal;

    const urlAntes = fotoAntes ? await subirImagen(fotoAntes, "antes") : null;
    const urlDespues = fotoDespues ? await subirImagen(fotoDespues, "despues") : null;

    // ⭐ NUEVA LÓGICA: Manejo de múltiples responsables
    const responsables = responsable.includes(';') 
      ? responsable.split(';').map(email => email.trim()) 
      : [responsable];

    console.log(`📧 Responsables procesados:`, responsables);
    console.log(`📧 ¿Es tarea grupal?:`, responsables.length > 1);

    // Insertar en BD con el primer responsable como principal
    const responsablePrincipal = responsables[0];
    const responsablesGrupo = responsables.length > 1 ? responsable : null; // String completo con ';'

    console.log(`📧 Responsable principal:`, responsablePrincipal);
    console.log(`📧 Campo responsables_grupo:`, responsablesGrupo);

    const { error: insertError } = await supabase
      .from("registro_mantenimiento")
      .insert([{
        sede,
        actividad,
        fecha_inicio: fechaInicioStr,
        fecha_final: fechaFinalStr,
        precio: precio ? parseFloat(precio) : null,
        observacion,
        estado,
        responsable: responsablePrincipal,
        responsables_grupo: responsablesGrupo, // ⭐ CAMPO CLAVE PARA TAREAS GRUPALES
        creador_email: creador_email,
        foto_antes_url: urlAntes,
        foto_despues_url: urlDespues,
      }]);

    if (insertError) {
      console.error("❌ Error al insertar:", insertError);
      throw insertError;
    }

    console.log(`✅ Tarea guardada exitosamente ${responsables.length > 1 ? 'como GRUPAL' : 'como INDIVIDUAL'}`);

    // ⭐ ENVIAR NOTIFICACIÓN A TODOS LOS RESPONSABLES
    const subject = `🔧 Nueva Tarea de Mantenimiento - ${sede}`;
    
    // ⭐ PLANTILLA HTML PROFESIONAL BASE
    const createHtmlBody = (isGroupTask = false) => `
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #210d65, #3d1a9e); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">🔧 Nueva Tarea ${isGroupTask ? 'Grupal ' : ''}Asignada</h1>
            <p style="color: #e8e3ff; margin: 10px 0 0 0; font-size: 16px;">Sistema de Mantenimiento</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <div style="background-color: #f8f9ff; border-left: 4px solid #210d65; padding: 20px; margin-bottom: 20px;">
              <h2 style="color: #210d65; margin: 0 0 15px 0; font-size: 20px;">¡Se te ha asignado una nueva tarea${isGroupTask ? ' en equipo' : ''}!</h2>
              <p style="color: #666; margin: 0; line-height: 1.6;">Has recibido una nueva asignación de mantenimiento que requiere tu atención${isGroupTask ? ' junto con tu equipo de trabajo' : ''}.</p>
            </div>
            
            <!-- Details Card -->
            <div style="background-color: #ffffff; border: 2px solid #e8e3ff; border-radius: 8px; padding: 25px; margin: 20px 0;">
              <div style="margin-bottom: 15px;">
                <span style="display: inline-block; background-color: #210d65; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 8px;">📍 UBICACIÓN</span>
                <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #333;">${sede}</p>
              </div>
              
              <div style="margin-bottom: 15px;">
                <span style="display: inline-block; background-color: #210d65; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 8px;">🔧 ACTIVIDAD</span>
                <p style="margin: 5px 0; font-size: 16px; color: #333; line-height: 1.5;">${actividad}</p>
              </div>
              
              <div style="margin-bottom: 15px;">
                <span style="display: inline-block; background-color: #210d65; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 8px;">📅 FECHA LÍMITE</span>
                <p style="margin: 5px 0; font-size: 16px; font-weight: bold; color: ${fechaFinalStr ? '#e74c3c' : '#666'};">${fechaFinalStr || 'No especificada'}</p>
              </div>
              
              ${observacion ? `
              <div style="margin-bottom: 15px;">
                <span style="display: inline-block; background-color: #210d65; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 8px;">📝 OBSERVACIONES</span>
                <div style="background-color: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 3px solid #210d65; margin-top: 8px;">
                  <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.6; white-space: pre-wrap;">${observacion}</p>
                </div>
              </div>
              ` : ''}
              
              <div style="margin-bottom: 0;">
                <span style="display: inline-block; background-color: #210d65; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 8px;">👤 ASIGNADO POR</span>
                <p style="margin: 5px 0; font-size: 16px; color: #333;">${creador_email}</p>
              </div>
            </div>
            
            ${isGroupTask ? `
            <!-- Team Assignment Card -->
            <div style="background: linear-gradient(135deg, #e3f2fd, #f3e5f5); border: 2px solid #81c784; border-radius: 12px; padding: 25px; margin: 25px 0; position: relative;">
              <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background-color: #4caf50; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px;">👥</div>
              <h3 style="color: #2e7d32; margin: 20px 0 15px 0; font-size: 18px; font-weight: bold; text-align: center;">Tarea Asignada al Equipo</h3>
              <div style="background-color: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <p style="margin: 0 0 15px 0; color: #2e7d32; font-size: 14px; font-weight: bold;">👥 Miembros del equipo:</p>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 15px;">
                  ${responsables.map(email => `
                    <span style="background-color: #e8f5e8; color: #2e7d32; padding: 6px 12px; border-radius: 15px; font-size: 12px; font-weight: bold; border: 1px solid #81c784;">${email}</span>
                  `).join('')}
                </div>
                <div style="background-color: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; border-radius: 8px;">
                  <p style="margin: 0; color: #ef6c00; font-size: 13px; line-height: 1.6;">
                    <strong>🤝 Coordinación del equipo:</strong><br>
                    • Cualquier miembro puede ejecutar esta tarea<br>
                    • Coordinen entre ustedes para evitar duplicación<br>
                    • El primero que inicie debe notificar al grupo
                  </p>
                </div>
              </div>
            </div>
            ` : ''}
            
            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://merkahorro.com/login" target="_blank" style="background: linear-gradient(135deg, #210d65, #3d1a9e); color: white; padding: 15px 30px; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; text-decoration: none; box-shadow: 0 4px 12px rgba(33, 13, 101, 0.3); transition: all 0.3s ease;">⚡ Acceder al Sistema</a>
            </div>
            
            <!-- Instructions -->
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.8;">
                <strong>📋 Pasos a seguir:</strong><br><br>
                🔑 <strong>1.</strong> Accede al sistema haciendo clic en el botón<br>
                🔍 <strong>2.</strong> Revisa todos los detalles de la asignación<br>
                📷 <strong>3.</strong> Toma la "Foto Antes" de iniciar la tarea<br>
                🔧 <strong>4.</strong> Ejecuta la actividad de mantenimiento<br>
                📸 <strong>5.</strong> Sube la "Foto Después" al completar<br>
                ✅ <strong>6.</strong> Actualiza el estado a "Finalizado"
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9ff; padding: 20px; text-align: center; border-top: 1px solid #e8e3ff;">
            <p style="margin: 0; color: #666; font-size: 12px;">Sistema de Gestión de Mantenimiento</p>
            <p style="margin: 5px 0 0 0; color: #210d65; font-size: 12px; font-weight: bold;">Responde a este correo para cualquier consulta</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // ⭐ LÓGICA DE NOTIFICACIÓN MÚLTIPLE
    if (responsables.length > 1) {
      // Email grupal con diseño especial
      const htmlBodyGrupo = createHtmlBody(true);
      
      // Enviar a todos los responsables
      const emailPromises = responsables.map(email => 
        sendEmail(email, subject, htmlBodyGrupo)
      );
      
      await Promise.all(emailPromises);
      console.log(`📧 Notificación grupal enviada a ${responsables.length} responsables: ${responsables.join(', ')}`);
    } else {
      // Envío individual con diseño estándar
      const htmlBodyIndividual = createHtmlBody(false);
      
      await sendEmail(responsablePrincipal, subject, htmlBodyIndividual);
      console.log(`📧 Notificación individual enviada a: ${responsablePrincipal}`);
    }

    return res.status(200).json({ 
      message: responsables.length > 1 
        ? `Tarea asignada y notificada a ${responsables.length} responsables exitosamente.`
        : "Tarea asignada y notificada exitosamente."
    });
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
        const estadoTexto = nuevoEstado === 'completado' ? '✅ COMPLETADA' : '❌ NO COMPLETADA';
        const subject = `${estadoTexto}: Tarea en ${registroExistente.sede}`;
        
        const htmlBody = `
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #210d65, ${nuevoEstado === 'completado' ? '#210d65' : '#dc3545'}); padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">${estadoTexto}</h1>
                <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Tarea Finalizada</p>
              </div>
              
              
              <!-- Content -->
              <div style="padding: 30px;">
                <div style="background-color: #f8f9ff; border-left: 4px solid #210d65; padding: 20px; margin-bottom: 25px;">
                  <h2 style="color: #210d65; margin: 0 0 10px 0; font-size: 18px;">Resumen de la Tarea</h2>
                  <p style="color: #666; margin: 0; line-height: 1.6;">La tarea que asignaste ha sido finalizada. Aquí tienes los detalles:</p>
                </div>
                
                <!-- Task Details -->
                <div style="background-color: #ffffff; border: 2px solid #e8e3ff; border-radius: 8px; padding: 25px; margin: 20px 0;">
                  <div style="display: grid; gap: 15px;">
                    <div>
                      <span style="display: inline-block; background-color: #210d65; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 8px;">📍 SEDE</span>
                      <p style="margin: 5px 0; font-size: 16px; font-weight: bold; color: #333;">${registroExistente.sede}</p>
                    </div>
                    
                    <div>
                      <span style="display: inline-block; background-color: #210d65; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 8px;">🔧 HALLAZGO</span>
                      <p style="margin: 5px 0; font-size: 16px; color: #333; line-height: 1.5;">${registroExistente.actividad}</p>
                    </div>
                    
                    <div>
                      <span style="display: inline-block; background-color: #210d65; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 8px;">👤 EJECUTADO POR</span>
                      <p style="margin: 5px 0; font-size: 16px; color: #333;">${registroExistente.responsable}</p>
                    </div>
                    
                    <div>
                      <span style="display: inline-block; background-color: #210d65; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 8px;">📅 FINALIZADO EL</span>
                      <p style="margin: 5px 0; font-size: 16px; font-weight: bold; color: #333;">${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    
                    ${observacion ? `
                    <div style="margin-top: 20px;">
                      
                      <div style="background: linear-gradient(135deg, #f8f9ff, #ffffff); border: 2px solid #e8e3ff; border-radius: 12px; padding: 20px; margin-top: 10px; position: relative; box-shadow: 0 2px 8px rgba(33, 13, 101, 0.1);">
                        <!-- Decorative icon -->
                        <div style="position: absolute; top: -8px; left: 20px; background-color: #210d65; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px;">📝</div>
                        <div style="margin-top: 15px;">
                            <div style="background-color: white; padding: 18px; border-radius: 8px; border-left: 4px solid #210d65; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
                            <p style="margin: 0; font-size: 15px; color: #333; line-height: 1.7; white-space: pre-wrap; word-wrap: break-word;">${observacion}</p>
                          </div>
                          <div style="margin-top: 12px; text-align: right;">
                            <small style="color: #666; font-style: italic; font-size: 12px;">Registrado por: ${registroExistente.responsable}</small>
                          </div>
                        </div>
                      </div>
                    </div>
                    ` : ''}
                  </div>
                </div>
                
                <!-- Action Section -->
                <div style="background: linear-gradient(135deg, #e8f5e8, #f0fbf0); border: 2px solid #c3e6c3; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; position: relative;">
                  <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background-color: #28a745; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px;">📊</div>
                  <h3 style="color: #155724; margin: 20px 0 15px 0; font-size: 18px; font-weight: bold;">Próximos Pasos</h3>
                  <div style="text-align: left; max-width: 400px; margin: 0 auto;">
                    <p style="margin: 8px 0; color: #155724; font-size: 14px; line-height: 1.6;">
                      ✓ <strong>Accede al sistema</strong> haciendo clic en "Ver en el Sistema"<br>
                      ✓ <strong>Revisa las fotos</strong> "Antes" y "Después" de la tarea<br>
                      ✓ <strong>Verifica los detalles</strong> de la ejecución completa<br>
                      ✓ <strong>Valida el seguimiento</strong> y observaciones finales
                    </p>
                  </div>
                </div>
                
                <!-- System Button -->
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://merkahorro.com/login" target="_blank" style="background: linear-gradient(135deg, #210d65, #3d1a9e); color: white; padding: 15px 30px; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; text-decoration: none; box-shadow: 0 4px 12px rgba(33, 13, 101, 0.3); transition: all 0.3s ease;">📋 Ver en el Sistema</a>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background-color: #f8f9ff; padding: 20px; text-align: center; border-top: 1px solid #e8e3ff;">
                <p style="margin: 0; color: #666; font-size: 12px;">Sistema de Gestión de Mantenimiento</p>
                <p style="margin: 5px 0 0 0; color: #210d65; font-size: 12px; font-weight: bold;">Gracias por usar nuestro sistema</p>
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
    }    res.json({ message: "Actividad actualizada correctamente" });
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
    console.log(`🔍 Buscando tareas para: ${responsableEmail}`);

    // ⭐ BÚSQUEDA MEJORADA: Buscar tanto en responsable como en responsables_grupo
    const { data, error } = await supabase
      .from("registro_mantenimiento")
      .select("*")
      .or(`responsable.eq.${responsableEmail},responsables_grupo.like.%${responsableEmail}%`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    console.log(`📋 Tareas encontradas para ${responsableEmail}:`, data.length);
    
    // ⭐ LOG PARA DEBUG: Mostrar qué tareas son grupales
    const tareasGrupales = data.filter(tarea => tarea.responsables_grupo);
    console.log(`👥 Tareas grupales encontradas:`, tareasGrupales.length);
    
    if (tareasGrupales.length > 0) {
      tareasGrupales.forEach(tarea => {
        console.log(`   - ID ${tarea.id}: ${tarea.sede} - responsables_grupo: "${tarea.responsables_grupo}"`);
      });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Error en obtenerHistorialPorResponsable:", err);
    res.status(500).json({ error: "Error al obtener el historial filtrado por responsable" });
  }
};