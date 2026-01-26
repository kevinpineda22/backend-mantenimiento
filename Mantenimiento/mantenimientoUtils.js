// src/utils/mantenimientoUtils.js

// --- 1. Configuración Centralizada de Responsables y Correos ---
export const RESPONSABLES_CONFIG = {
  Mantenimiento: { 
    isGroup: false, 
    members: [{ name: "Personal de Mantenimiento", email: "mantenimiento@merkahorrosas.com" }] 
  },
  Lideres: { 
    isGroup: true, 
    // ⭐ OPCIÓN 1: Selección individual (mantiene control específico)
    requireSpecific: true,
    members: [
      { name: "Líder 1 - Plaza", email: "lideroperativo1@merkahorrosas.com" },
      { name: "Líder 2 - Villa Hermosa", email: "adminvillahermosa@merkahorrosas.com" },
      { name: "Líder 3 - Girardota Parque", email: "admingirardotaparque@merkahorrosas.com" },
      { name: "Líder 4 - Llano", email: "admingirardotallano@merkahorrosas.com" },
      { name: "Líder 5 - Vegas", email: "adminlasvegas@merkahorrosas.com" },
      { name: "Líder 6 - Barbosa", email: "adminbarbosa@merkahorrosas.com" },
      { name: "Líder 7 - San Juan", email: "adminsanjuan@merkahorrosas.com" },
    /*   { name: "Juan", email: "juanmerkahorro@gmail.com" },
      { name: "Johan", email: "johanmerkahorro777@gmail.com" }, */
    ]
  },
  SST: { 
    isGroup: true, 
    // ⭐ OPCIÓN 2: Asignación múltiple (ambos reciben y cualquiera puede actuar)
    requireSpecific: false,
    notifyAll: true, // 🔑 Esta es la clave
    members: [
      { name: "SST", email: "sistemageneralsst@merkahorrosas.com" },
      { name: "SST", email: "auxiliarsst@merkahorrosas.com" },
    ]
  },
  Suministros: { 
    isGroup: false,
    requiresDotacion: true, // 🔑 Esta propiedad ya existe
    members: [{ name: "Suministros Único", email: "almacen@merkahorrosas.com" }] 
  },
   Sistemas: { 
    isGroup: false, 
    members: [{ name: "Personal de Sistemas", email: "sistemas@merkahorrosas.com" }] 
  },
};

// --- 2. Listado de Sedes ---
export const sedes = [
    "Copacabana Plaza",
    "Villa Hermosa",
    "Girardota Parque",
    "Girardota llano",
    "Carnes Barbosa",
    "Copacabana Vegas",
    "Copacabana San Juan",
    "Barbosa",
];

// --- 3. Funciones de Formato ---
export const formatNumberWithDots = (value) => {
  if (value === null || value === undefined) return "";
  const num =
    typeof value === "number" ? value.toString() : String(value).replace(/\D/g, "");
  if (!num) return "";
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

export const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toISOString().split("T")[0];
};

// --- 4. Funciones de Archivo (Necesarias para ambos formularios) ---

export const validateFile = (file, fieldName) => {
    const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/bmp",
        "image/tiff",
    ];
    if (!file) return true;
    if (!allowedTypes.includes(file.type)) {
        // En un entorno real, usarías Swal o toast aquí
        console.error(`El archivo seleccionado para ${fieldName} debe ser una imagen o PDF válido.`);
        return false;
    }
    return true;
};

// Placeholder para la función compleja de optimización
export const optimizeImage = (file, maxWidth = 800, quality = 0.8) => {
    return new Promise((resolve, reject) => {
        if (file.type === "application/pdf") {
            resolve({ file: file, originalSize: file.size, optimizedSize: file.size });
            return;
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        img.onerror = () => { reject(new Error("Error al cargar la imagen")); };
        img.onload = () => {
            try {
                let { width, height } = img;
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) { reject(new Error("Error al crear la imagen optimizada")); return; }
                    const optimizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), { type: "image/webp", });
                    resolve({ 
                        file: optimizedFile, 
                        originalSize: file.size, 
                        optimizedSize: blob.size,
                    });
                }, "image/webp", quality);
            } catch (error) { reject(error); }
        };
        img.src = URL.createObjectURL(file);
    });
};