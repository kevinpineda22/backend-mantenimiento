import supabase from "../supabase/cliente.js";
import sharp from "sharp"; // Importar sharp para la conversión a WebP

// Logica post
export const registrarFoto = async (req, res) => {
  const { sede, observacion, responsable, fecha } = req.body;
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
          observacion,
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
  const { sede, observacion, responsable, fecha } = req.body;

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

    // Actualizar el registro
    const { error: updateError } = await supabase
      .from("registro_fotografico")
      .update({
        sede,
        observacion,
        responsable,
        fecha,
        urlAntes,
        urlDespues,
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
      observacion,
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
      !observacion ||
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
          observacion,
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
  const { estado, precio, observacion, fechaInicio, fechaFinal, sede, actividad,responsable } = req.body;

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
        observacion,
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

