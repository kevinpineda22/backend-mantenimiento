// backend-mantenimiento/controllers/registroActividadController.js (ACTUALIZADO)

import supabase from "../supabase/cliente.js";
import sharp from "sharp"; // Mantenemos la importación de sharp por si es útil en el futuro, pero no se usa en esta lógica

// Función auxiliar para subir y optimizar imágenes
const subirImagen = async (file, carpeta) => {
    if (!file) return null;
    const nombreLimpio = file.originalname
        .replace(/\s/g, "_");
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

export const registrarActividadCompleta = async (req, res) => {
    const {
        sede,
        actividad,
        fechaInicio,
        fechaFinal,
        precio, // Ahora es opcional
        estado,
        responsable,
    } = req.body;
    const fotoAntes = req.files?.fotoAntes?.[0];
    const fotoDespues = req.files?.fotoDespues?.[0];

    // Validación de campos obligatorios
    if (!sede || !actividad || !fechaInicio || !estado || !responsable) {
        return res.status(400).json({ error: "Faltan campos obligatorios: sede, actividad, fechaInicio, estado, y responsable." });
    }

    try {
        const urlAntes = fotoAntes ? await subirImagen(fotoAntes, "antes") : null;
        const urlDespues = fotoDespues ? await subirImagen(fotoDespues, "despues") : null;

        const { error: insertError } = await supabase
            .from("registro_mantenimiento")
            .insert([
                {
                    sede,
                    actividad,
                    fecha_inicio: fechaInicio,
                    fecha_final: fechaFinal,
                    precio: precio ? parseFloat(precio) : null, // El precio ahora puede ser null
                    estado,
                    responsable,
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
            .order('created_at', { ascending: false });

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
        fechaFinal
    } = req.body;
    const fotoAntes = req.files?.fotoAntes?.[0];
    const fotoDespues = req.files?.fotoDespues?.[0];

    // Validación de campos obligatorios
    if (!sede || !actividad || !fechaInicio || !estado || !responsable) {
        return res.status(400).json({ error: "Faltan campos obligatorios: sede, actividad, fechaInicio, estado, y responsable." });
    }

    try {
        const { data: registroExistente, error: fetchError } = await supabase
            .from("registro_mantenimiento")
            .select("foto_antes_url, foto_despues_url")
            .eq("id", id)
            .single();

        if (fetchError || !registroExistente) {
            return res.status(404).json({ error: "Registro de actividad no encontrado" });
        }

        const urlAntes = fotoAntes ? await subirImagen(fotoAntes, "antes") : registroExistente.foto_antes_url;
        const urlDespues = fotoDespues ? await subirImagen(fotoDespues, "despues") : registroExistente.foto_despues_url;

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
                foto_antes_url: urlAntes,
                foto_despues_url: urlDespues,
            })
            .eq("id", id);

        if (updateError) {
            throw updateError;
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