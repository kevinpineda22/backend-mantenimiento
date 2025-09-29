// backend-mantenimiento/controllers/registroActividadController.js (ACTUALIZADO CON OPTIMIZACIÓN)

import supabase from "../supabase/cliente.js";
import sharp from "sharp"; 

// Función auxiliar para subir y optimizar imágenes
const subirImagen = async (file, carpeta) => {
    if (!file) return null;
    
    // Manejar PDFs o archivos que no son imágenes (subida directa)
    if (file.mimetype.includes("pdf")) {
        const nombreLimpio = file.originalname.replace(/\s/g, "_");
        const filePath = `${carpeta}/${Date.now()}_${nombreLimpio}`;
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
    }
    
    // ⭐ OPTIMIZACIÓN: Redimensionar y convertir a WebP para imágenes (JPEG/PNG)
    const nombreLimpio = file.originalname
        .replace(/\s/g, "_")
        .replace(/\.[^/.]+$/, ".webp"); // Cambia extensión a .webp
    const filePath = `${carpeta}/${Date.now()}_${nombreLimpio}`;

    try {
        // Redimensiona y optimiza a WebP con calidad 65 y un ancho máximo de 800px.
        // Esto es ideal para las miniaturas del historial y para cargar rápido en móvil.
        const webpBuffer = await sharp(file.buffer)
            .resize({ width: 800, fit: 'inside', withoutEnlargement: true }) 
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
        console.error("Error al subir imagen (WebP):", err);
        throw new Error("Error al subir y optimizar imagen: " + err.message);
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
        return res.status(400).json({
            error: "Faltan campos obligatorios: sede, actividad, fechaInicio, estado, y responsable.",
        });
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

        return res.status(200).json({
            message: "Actividad y registro fotográfico enviados exitosamente",
        });
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
    } = req.body;
    const fotoAntes = req.files?.fotoAntes?.[0];
    const fotoDespues = req.files?.fotoDespues?.[0];

    // Validación de campos obligatorios
    if (!sede || !actividad || !fechaInicio || !estado || !responsable) {
        return res.status(400).json({
            error: "Faltan campos obligatorios: sede, actividad, fechaInicio, estado, y responsable.",
        });
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

        const urlAntes = fotoAntes
            ? await subirImagen(fotoAntes, "antes")
            : registroExistente.foto_antes_url;
        const urlDespues = fotoDespues
            ? await subirImagen(fotoDespues, "despues")
            : registroExistente.foto_despues_url;

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

// Elimina una imagen del historial y actualiza el registro en la base de datos
export const eliminarImagenHistorial = async (req, res) => {
    const { id } = req.params; // id del registro
    const { tipo } = req.body; // 'antes' o 'despues'

    if (!id || !tipo || !["antes", "despues"].includes(tipo)) {
        return res.status(400).json({ 
            error: "Faltan datos o tipo inválido ('antes' o 'despues')" 
        });
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

        const urlImagen = tipo === "antes" ? registro.foto_antes_url : registro.foto_despues_url;
        if (!urlImagen) {
            return res.status(400).json({ error: "No hay imagen para eliminar" });
        }

        // Extrae la ruta del archivo en el bucket desde la URL pública
        const pathMatch = urlImagen.match(/registro-fotos\/(.+)$/);
        if (!pathMatch) {
            return res.status(400).json({ 
                error: "No se pudo extraer la ruta de la imagen" 
            });
        }
        const filePath = pathMatch[1];

        // Elimina la imagen del bucket
        const { error: deleteError } = await supabase.storage
            .from("registro-fotos")
            .remove([filePath]);
        if (deleteError) {
            return res.status(500).json({ 
                error: "Error al eliminar la imagen del storage" 
            });
        }

        // Actualiza el registro en la base de datos
        const updateField = tipo === "antes" 
            ? { foto_antes_url: null } 
            : { foto_despues_url: null };
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