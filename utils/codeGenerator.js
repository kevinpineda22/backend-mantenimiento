// backend-mantenimiento/utils/codeGenerator.js

import supabase from "../supabase/cliente.js";

/**
 * Genera un código de activo en el formato MT-TIPO_CORTO-### y actualiza el consecutivo.
 * @param {string} tipoNombreCompleto El nombre completo del tipo de activo (ej. "Operativa").
 * @param {string} nombreActivo El nombre del activo para la parte corta del código.
 * @returns {Promise<string>} El código de activo generado.
 * @throws {Error} Si no se puede obtener o actualizar el consecutivo.
 */
async function generarCodigoActivo(tipoNombreCompleto, nombreActivo) {
    const prefix = "MT";
    const tipoPartDefault = "GEN"; // Valor por defecto si tipoNombreCompleto es inválido o no encontrado

    // 1. Obtener el código corto del tipo y el último consecutivo
    // Usamos el nombre completo para buscar el tipo
    const { data: tipoData, error: tipoError } = await supabase
        .from('tipos_activos')
        .select('codigo_tipo, ultimo_consecutivo')
        .eq('nombre_tipo', tipoNombreCompleto)
        .single();

    let tipoPart = tipoPartDefault;
    let nuevoConsecutivo = 1; // Inicia en 1 si es el primer activo de ese tipo o si hay un error

    if (tipoError) {
        console.error(`Error (generarCodigoActivo): No se pudo obtener el código de tipo o consecutivo para '${tipoNombreCompleto}':`, tipoError.message);
        // Fallback: usar "GEN" y un consecutivo temporal para no bloquear (pero habrá duplicados)
        // En un sistema real, aquí podríamos lanzar un error para forzar al usuario a corregir el tipo.
        // Dado que el código ya no es UNIQUE en DB, esto evitará un fallo total.
        const nombrePartFallback = nombreActivo ? nombreActivo.toUpperCase().replace(/\s/g, '').substring(0, 3) : "ACC";
        const randomFallback = Math.random().toString(36).substring(2, 5).toUpperCase(); // Pequeño random
        return `${prefix}-${tipoPartDefault}-${nombrePartFallback}-${randomFallback}`;
    } else if (tipoData) {
        tipoPart = tipoData.codigo_tipo; // Usamos el código corto real de la base de datos
        nuevoConsecutivo = tipoData.ultimo_consecutivo + 1;
    }

    // Formatear el consecutivo a 3 dígitos con ceros iniciales
    const consecutivoPart = String(nuevoConsecutivo).padStart(3, '0');

    // 2. Actualizar el ultimo_consecutivo en la tabla tipos_activos
    // Es CRÍTICO que este UPDATE se haga. Si falla, el próximo activo generará el mismo código.
    const { error: updateError } = await supabase
        .from('tipos_activos')
        .update({ ultimo_consecutivo: nuevoConsecutivo })
        .eq('codigo_tipo', tipoPart); // Usamos codigo_tipo para el update

    if (updateError) {
        console.error(`Error (generarCodigoActivo): Fallo al actualizar el consecutivo para el tipo '${tipoPart}':`, updateError.message);
        // Este error es serio, ya que la secuencia de códigos se romperá.
        // Lo relanzamos para que la operación de registro falle y el usuario sepa que hay un problema.
        throw new Error(`Fallo al actualizar el consecutivo para el tipo ${tipoNombreCompleto}: ${updateError.message}`);
    }

    // El formato de código final
    return `${prefix}-${tipoPart}-${consecutivoPart}`;
}

export { generarCodigoActivo };