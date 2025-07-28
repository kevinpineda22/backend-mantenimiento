// backend-mantenimiento/controllers/registroFotograficoController.js

import supabase from "../supabase/cliente.js";
import sharp from "sharp";

export const registrarFoto = async (req, res) => {
    const { sede, responsable, fecha } = req.body;
    const fotoAntes = req.files?.fotoAntes?.[0];
    const fotoDespues = req.files?.fotoDespues?.[0];

    try {
        const subirImagen = async (file, carpeta) => {
            const nombreLimpio = file.originalname
                .replace(/\s/g, "_")
                .replace(/\.[^/.]+$/, ".webp");
            const filePath = `${carpeta}/${Date.now()}_${nombreLimpio}`;

            const webpBuffer = await sharp(file.buffer)
                .webp({ quality: 65 })
                .toBuffer();

            const { data, error } = await supabase.storage
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

        const urlAntes = fotoAntes ? await subirImagen(fotoAntes, "antes") : null;
        const urlDespues = fotoDespues
            ? await subirImagen(fotoDespues, "despues")
            : null;

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
        console.error("Error en registrarFoto:", err);
        res.status(500).json({ error: err.message || "Error interno del servidor" });
    }
};

export const obtenerHistorial = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("registro_fotografico")
            .select("*");

        if (error) throw error;

        res.status(200).json(data);
    } catch (err) {
        console.error("Error en obtenerHistorial (fotográfico):", err);
        res.status(500).json({ error: "Error al obtener el historial fotográfico" });
    }
};

export const actualizarRegistroFotografico = async (req, res) => {
    const { id } = req.params;
    const { sede, responsable, fecha } = req.body;
    const fotoAntes = req.files?.fotoAntes?.[0];
    const fotoDespues = req.files?.fotoDespues?.[0];

    try {
        const { data: registro, error: fetchError } = await supabase
            .from("registro_fotografico")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !registro) {
            return res.status(404).json({ error: "Registro no encontrado" });
        }

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

        let urlAntes = registro.foto_antes_url;
        let urlDespues = registro.foto_despues_url;
        if (fotoAntes) {
            urlAntes = await subirImagen(fotoAntes, "antes");
        }
        if (fotoDespues) {
            urlDespues = await subirImagen(fotoDespues, "despues");
        }

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

export const eliminarRegistroFotografico = async (req, res) => {
    const { id } = req.params;

    try {
        const { data: registro, error: fetchError } = await supabase
            .from("registro_fotografico")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !registro) {
            return res.status(404).json({ error: "Registro no encontrado" });
        }

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