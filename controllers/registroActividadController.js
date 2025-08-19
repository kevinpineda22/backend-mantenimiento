// backend-mantenimiento/controllers/registroActividadController.js (UNIFICADO)

import supabase from "../supabase/cliente.js";
import sharp from "sharp";

// Función auxiliar para subir y optimizar imágenes
const subirImagen = async (file, carpeta) => {
    if (!file) return null;
    const nombreLimpio = file.originalname
        .replace(/\s/g, "_")
        .replace(/\.[^/.]+$/, ".webp");
    const filePath = `${carpeta}/${Date.now()}_${nombreLimpio}`;
    try {
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
        precio,
        estado,
        responsable,
    } = req.body;
    const fotoAntes = req.files?.fotoAntes?.[0];
    const fotoDespues = req.files?.fotoDespues?.[0];

    try {
        // Subir las imágenes si existen
        const urlAntes = fotoAntes ? await subirImagen(fotoAntes, "antes") : null;
        const urlDespues = fotoDespues ? await subirImagen(fotoDespues, "despues") : null;

        // Insertar el registro de actividad con las URLs de las fotos
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
        precio,
        responsable,
        fechaInicio,
        fechaFinal
    } = req.body;
    const fotoAntes = req.files?.fotoAntes?.[0];
    const fotoDespues = req.files?.fotoDespues?.[0];

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
                precio,
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

        // Nota: La eliminación de archivos de Supabase debe manejarse con cuidado.
        // Por simplicidad, esta función solo elimina el registro de la base de datos.
        // Una lógica más robusta buscaría y eliminaría los archivos asociados del bucket.
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