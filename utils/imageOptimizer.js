import Jimp from "jimp";

/**
 * Optimiza una imagen y la convierte a formato WebP
 * @param {Buffer} imageBuffer - Buffer de la imagen original
 * @param {Object} options - Opciones de optimización
 * @param {number} options.maxWidth - Ancho máximo (default: 1200)
 * @param {number} options.maxHeight - Alto máximo (default: 1200)
 * @param {number} options.quality - Calidad de compresión 0-100 (default: 80)
 * @param {boolean} options.progressive - Usar compresión progresiva (default: true)
 * @param {boolean} options.autoOrient - Auto orientar la imagen (default: true)
 * @returns {Promise<Buffer>} - Buffer de la imagen optimizada en WebP
 */
export async function optimizeImageToWebP(imageBuffer, options = {}) {
  try {
    const {
      maxWidth = 1200,
      maxHeight = 1200,
      quality = 80,
      progressive = true,
      autoOrient = true,
    } = options;

    // Leer la imagen desde el buffer
    const image = await Jimp.read(imageBuffer);

    // Auto orientar si está habilitado
    if (autoOrient) {
      image.exifRotate();
    }

    // Obtener dimensiones originales
    const originalWidth = image.getWidth();
    const originalHeight = image.getHeight();

    // Calcular nuevas dimensiones manteniendo la proporción
    let newWidth = originalWidth;
    let newHeight = originalHeight;

    if (originalWidth > maxWidth || originalHeight > maxHeight) {
      const widthRatio = maxWidth / originalWidth;
      const heightRatio = maxHeight / originalHeight;
      const ratio = Math.min(widthRatio, heightRatio);

      newWidth = Math.round(originalWidth * ratio);
      newHeight = Math.round(originalHeight * ratio);
    }

    // Redimensionar la imagen si es necesario
    if (newWidth !== originalWidth || newHeight !== originalHeight) {
      image.resize(newWidth, newHeight, Jimp.RESIZE_LANCZOS);
    }

    // Aplicar optimizaciones adicionales
    image
      .normalize() // Normalizar colores para mejor compresión
      .quality(quality); // Establecer calidad de compresión

    // Convertir a WebP y obtener el buffer
    const webpBuffer = await image.getBufferAsync("image/webp");

    return webpBuffer;
  } catch (error) {
    console.error("Error al optimizar imagen:", error);
    throw new Error("No se pudo optimizar la imagen");
  }
}

/**
 * Optimiza una imagen manteniendo el formato original
 * @param {Buffer} imageBuffer - Buffer de la imagen original
 * @param {string} mimeType - Tipo MIME de la imagen original
 * @param {Object} options - Opciones de optimización
 * @returns {Promise<Buffer>} - Buffer de la imagen optimizada
 */
export async function optimizeImage(imageBuffer, mimeType, options = {}) {
  try {
    const { maxWidth = 1200, maxHeight = 1200, quality = 85 } = options;

    const image = await Jimp.read(imageBuffer);

    // Calcular nuevas dimensiones
    const originalWidth = image.getWidth();
    const originalHeight = image.getHeight();

    let newWidth = originalWidth;
    let newHeight = originalHeight;

    if (originalWidth > maxWidth || originalHeight > maxHeight) {
      const widthRatio = maxWidth / originalWidth;
      const heightRatio = maxHeight / originalHeight;
      const ratio = Math.min(widthRatio, heightRatio);

      newWidth = Math.round(originalWidth * ratio);
      newHeight = Math.round(originalHeight * ratio);
    }

    // Redimensionar si es necesario
    if (newWidth !== originalWidth || newHeight !== originalHeight) {
      image.resize(newWidth, newHeight, Jimp.RESIZE_LANCZOS);
    }

    // Aplicar optimizaciones
    image.normalize().quality(quality);

    // Determinar el formato de salida basado en el MIME type
    let format;
    switch (mimeType) {
      case "image/jpeg":
      case "image/jpg":
        format = Jimp.MIME_JPEG;
        break;
      case "image/png":
        format = Jimp.MIME_PNG;
        break;
      case "image/webp":
        format = "image/webp";
        break;
      default:
        format = Jimp.MIME_JPEG; // Por defecto JPEG
    }

    const optimizedBuffer = await image.getBufferAsync(format);
    return optimizedBuffer;
  } catch (error) {
    console.error("Error al optimizar imagen:", error);
    throw new Error("No se pudo optimizar la imagen");
  }
}

/**
 * Obtiene información de una imagen
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @returns {Promise<Object>} - Información de la imagen
 */
export async function getImageInfo(imageBuffer) {
  try {
    const image = await Jimp.read(imageBuffer);

    return {
      width: image.getWidth(),
      height: image.getHeight(),
      size: imageBuffer.length,
      sizeKB: Math.round(imageBuffer.length / 1024),
      sizeMB: Math.round((imageBuffer.length / 1024 / 1024) * 100) / 100,
    };
  } catch (error) {
    console.error("Error al obtener información de imagen:", error);
    throw new Error("No se pudo leer la información de la imagen");
  }
}
