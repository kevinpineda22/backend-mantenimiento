// backend-mantenimiento/controllers/registroActividadController.js

import supabase from "../supabase/cliente.js";

export const registrarActividad = async (req, res) => {
    try {
        const {
            sede,
            actividad,
            fechaInicio,
            fechaFinal,
            precio,
            estado,
            responsable,
        } = req.body;

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
            console.error("Error al insertar en Supabase (actividad):", insertError);
            return res.status(500).json({ error: insertError.message });
        }

        return res
            .status(200)
            .json({ message: "Actividad registrada exitosamente" });
    } catch (err) {
        console.error("Error general en registrarActividad:", err);
        return res
            .status(500)
            .json({ error: err.message || "Error interno del servidor" });
    }
};

export const obtenerHistorialActividades = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("registro_mantenimiento")
            .select("*");

        if (error) throw error;

        res.status(200).json(data);
    } catch (err) {
        console.error("Error en obtenerHistorialActividades:", err);
        res
            .status(500)
            .json({ error: "Error al obtener el historial de actividades" });
    }
};

export const actualizarActividad = async (req, res) => {
    const { id } = req.params;
    const { estado, precio, fechaInicio, fechaFinal, sede, actividad, responsable } = req.body;

    try {
        const { data: activity, error } = await supabase
            .from("registro_mantenimiento")
            .select("*")
            .eq("id", id)
            .single();

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

export const eliminarActividad = async (req, res) => {
    const { id } = req.params;

    try {
        const { data: actividad, error: fetchError } = await supabase
            .from("registro_mantenimiento")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !actividad) {
            return res.status(404).json({ error: "Actividad no encontrada" });
        }

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