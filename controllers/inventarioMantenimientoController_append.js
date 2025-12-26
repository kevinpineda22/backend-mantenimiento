
export const subirFichaTecnica = async (req, res) => {
  const { id } = req.params; // id será el codigo_activo
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No se ha proporcionado ningún archivo." });
  }

  try {
    // 1. Subir archivo a Storage
    const url = await subirImagen(file, "inventario/fichas");
    if (!url) throw new Error("Error al subir el archivo a Storage.");

    // 2. Obtener el registro actual para actualizar el array
    const { data: currentData, error: fetchError } = await supabase
      .from("inventario_mantenimiento")
      .select("fichas_tecnicas")
      .eq("codigo_activo", id)
      .single();

    if (fetchError) throw fetchError;

    // Asegurarse de que sea un array
    let currentFichas = currentData.fichas_tecnicas;
    if (typeof currentFichas === 'string') {
        try {
            currentFichas = JSON.parse(currentFichas);
        } catch (e) {
            currentFichas = [];
        }
    }
    if (!Array.isArray(currentFichas)) currentFichas = [];

    const newFicha = { name: file.originalname, url, date: new Date().toISOString() };
    const updatedFichas = [...currentFichas, newFicha];

    // 3. Actualizar base de datos
    const { error: updateError } = await supabase
      .from("inventario_mantenimiento")
      .update({ fichas_tecnicas: updatedFichas })
      .eq("codigo_activo", id);

    if (updateError) throw updateError;

    res.status(200).json({ message: "Ficha técnica subida correctamente", fichas_tecnicas: updatedFichas });
  } catch (error) {
    console.error("Error al subir ficha técnica:", error);
    res.status(500).json({ error: error.message });
  }
};

export const eliminarFichaTecnica = async (req, res) => {
  const { id } = req.params; // codigo_activo
  const { fileUrl } = req.body;

  try {
    // 1. Obtener registro actual
    const { data: currentData, error: fetchError } = await supabase
      .from("inventario_mantenimiento")
      .select("fichas_tecnicas")
      .eq("codigo_activo", id)
      .single();

    if (fetchError) throw fetchError;

    let currentFichas = currentData.fichas_tecnicas;
    if (typeof currentFichas === 'string') {
        try {
            currentFichas = JSON.parse(currentFichas);
        } catch (e) {
            currentFichas = [];
        }
    }
    if (!Array.isArray(currentFichas)) currentFichas = [];

    const updatedFichas = currentFichas.filter(f => f.url !== fileUrl);

    // 2. Actualizar base de datos
    const { error: updateError } = await supabase
      .from("inventario_mantenimiento")
      .update({ fichas_tecnicas: updatedFichas })
      .eq("codigo_activo", id);

    if (updateError) throw updateError;

    res.status(200).json({ message: "Ficha técnica eliminada", fichas_tecnicas: updatedFichas });
  } catch (error) {
    console.error("Error al eliminar ficha técnica:", error);
    res.status(500).json({ error: error.message });
  }
};
