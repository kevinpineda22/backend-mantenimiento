import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaClipboardList,
  FaFileExcel,
  FaUpload,
  FaDownload,
  FaTimes,
  FaBoxOpen,
  FaChevronDown,
  FaChevronUp,
  FaChevronLeft,
  FaChevronRight,
  FaSave,
  FaTools,
  FaHistory,
  FaShieldAlt,
  FaShoppingCart,
  FaIdCard,
  FaSearch,
  FaBan
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./InventarioMantenimiento.css";
import { useOutletContext } from "react-router-dom";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";

// Opciones predefinidas
const sedes = [
  "Copacabana Plaza",
  "Villa Hermosa",
  "Girardota Parque",
  "Girardota llano",
  "Carnes Barbosa",
  "Copacabana Vegas",
  "Copacabana San Juan",
  "Barbosa",
];

const estadosActivo = ["Activo", "Inactivo", "En Reparación", "Dado de Baja"];
const frecuenciasMantenimiento = [
  "Diario",
  "Semanal",
  "Mensual",
  "Trimestral",
  "Semestral",
  "Anual",
  "Según Uso",
  "N/A",
];

const tiposActivosCatalogo = [
  {
    nombre: "INFRAESTRUCTURA",
    descripcion: "Pisos, Techos, Estanterías, Cuartos Fríos",
  },
  {
    nombre: "REFRIGERACION Y RESPALDO",
    descripcion: "Neveras, Congeladores, Cavas, Aires Acondicionados, Generadores",
  },
  {
    nombre: "OPERATIVA",
    descripcion: "Selladoras, Malacate, Carros de Mercado, Basculas, Ventiladores",
  },
  {
    nombre: "SOPORTE Y SEGURIDAD",
    descripcion: "Computadores, Impresoras, Cámaras, Alarmas, Tableros/Redes. Extintores",
  },
  {
    nombre: "VEHICULO Y TRANSPORTE",
    descripcion: "Motos, Carros, Camiones, Moto Carro",
  },
];

// Componente de Sección del Acordeón (Extraído para evitar re-renders)
const AccordionSection = ({ id, title, icon: Icon, children, activeSection, toggleSection }) => (
  <div className={`inv-accordion-item ${activeSection === id ? "active" : ""}`}>
    <div className="inv-accordion-header" onClick={() => toggleSection(id)}>
      <h3 className="inv-accordion-title">
        {Icon && <Icon className="inv-section-icon" />}
        {title}
      </h3>
      <span className="inv-accordion-icon">
        {activeSection === id ? <FaChevronUp /> : <FaChevronDown />}
      </span>
    </div>
    {activeSection === id && <div className="inv-accordion-body">{children}</div>}
  </div>
);

const InventarioMantenimiento = () => {
  const { setLoading, loading } = useOutletContext();
  const apiBaseUrl = "https://backend-mantenimiento.vercel.app/api"; // Mover aquí arriba para usar en useEffect
  
  // Secciones en orden para el Step Indicator
  const sections = [
    { id: "identificacion", title: "Identificación", icon: FaIdCard },
    { id: "tecnicas", title: "Técnicas", icon: FaTools },
    { id: "compra", title: "Compra", icon: FaShoppingCart },
    { id: "mantenimiento", title: "Mantenimiento", icon: FaHistory },
    { id: "riesgos", title: "Riesgos", icon: FaShieldAlt },
  ];

  // Estado para el acordeón
  const [activeSection, setActiveSection] = useState("identificacion");
  const currentStepIndex = sections.findIndex(s => s.id === activeSection);

  const [formData, setFormData] = useState({
    // Identificación
    nombre_activo: "",
    tipo_activo: "",
    sede: "",
    area_ubicacion: "",
    marca: "",
    modelo_referencia: "",
    serial: "",
    estado_activo: "",
    foto_activo: null,
    
    // Especificaciones Técnicas
    potencia: "",
    tension_fase: "",
    capacidad: "",
    diametro_placa: "",
    placas_disponibles: "",
    material_principal: "",
    protecciones_seguridad: "",

    // Compra, Garantía y Administración
    fecha_compra: "",
    proveedor: "",
    garantia_hasta: "",
    costo_compra: "",
    responsable_gestion: "",
    contacto_responsable: "",
    codigo_qr: "",

    // Mantenimiento Planificado
    frecuencia_preventivo: "",
    ultimo_mantenimiento: new Date().toISOString().split('T')[0], // Default hoy
    proximo_mantenimiento: "",

    // Riesgos Críticos y EPP
    epp_minimo: "",
    riesgos_criticos: "",
    limpieza_segura: "",
    documento_riesgos: null
  });

  const [excelFile, setExcelFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false); 
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // const apiBaseUrl = "https://backend-mantenimiento.vercel.app/api"; // YA DECLARADA ARRIBA

  // Calcular próximo mantenimiento cuando cambia frecuencia o último mantenimiento
  useEffect(() => {
    calculateNextMaintenance();
  }, [formData.frecuencia_preventivo, formData.ultimo_mantenimiento]);

  const calculateNextMaintenance = () => {
    if (!formData.ultimo_mantenimiento || !formData.frecuencia_preventivo) return;

    const lastDate = new Date(formData.ultimo_mantenimiento);
    if (isNaN(lastDate.getTime())) return; // Validar fecha

    let nextDate = new Date(lastDate);

    switch (formData.frecuencia_preventivo) {
      case "Diario": nextDate.setDate(lastDate.getDate() + 1); break;
      case "Semanal": nextDate.setDate(lastDate.getDate() + 7); break;
      case "Mensual": nextDate.setMonth(lastDate.getMonth() + 1); break;
      case "Trimestral": nextDate.setMonth(lastDate.getMonth() + 3); break;
      case "Semestral": nextDate.setMonth(lastDate.getMonth() + 6); break;
      case "Anual": nextDate.setFullYear(lastDate.getFullYear() + 1); break;
      default: return; // Según Uso o N/A no calcula
    }

    setFormData(prev => ({
      ...prev,
      proximo_mantenimiento: nextDate.toISOString().split('T')[0]
    }));
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      // Validación de tamaño (Máximo 4.5MB por restricción de Vercel)
      if (files[0].size > 4.5 * 1024 * 1024) {
        toast.warning("⚠️ El archivo supera los 4.5MB y podría ser rechazado por el servidor.");
      }
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const toggleSection = (section) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const selectedTipoInfo = tiposActivosCatalogo.find(
    (tipo) => tipo.nombre === formData.tipo_activo
  );

  const handleSearch = async () => {
    if (!searchTerm.trim()) return toast.warning("Ingresa un código para buscar");
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/inventario?codigo=${searchTerm.trim()}`);
      if (!res.ok) throw new Error("Error al buscar activo");
      const data = await res.json();
      
      if (data && data.length > 0) {
        const activo = data[0];
        setFormData({
            nombre_activo: activo.nombre_activo || "",
            tipo_activo: activo.tipo_activo || "",
            sede: activo.sede || "",
            area_ubicacion: activo.clasificacion_ubicacion || "",
            marca: activo.marca || "",
            modelo_referencia: activo.modelo_referencia || "",
            serial: activo.serial || "",
            estado_activo: activo.estado_activo || "",
            foto_activo: null, // No podemos pre-cargar el archivo, pero el backend mantendrá la URL anterior si no enviamos nada
            
            potencia: activo.potencia || "",
            tension_fase: activo.tension_fase || "",
            capacidad: activo.capacidad || "",
            diametro_placa: activo.diametro_placa || "",
            placas_disponibles: activo.placas_disponibles || "",
            material_principal: activo.material_principal || "",
            protecciones_seguridad: activo.protecciones_seguridad || "",
            
            fecha_compra: activo.fecha_compra || "",
            proveedor: activo.proveedor || "",
            garantia_hasta: activo.garantia_hasta || "",
            costo_compra: activo.costo_compra || "",
            responsable_gestion: activo.responsable_gestion || "",
            contacto_responsable: activo.contacto_responsable || "",
            codigo_qr: activo.codigo_qr || "",
            
            frecuencia_preventivo: activo.frecuencia_mantenimiento || "",
            ultimo_mantenimiento: activo.ultimo_mantenimiento || "",
            proximo_mantenimiento: activo.proximo_mantenimiento || "",
            
            epp_minimo: activo.epp_minimo || "",
            riesgos_criticos: activo.riesgos_criticos || "",
            limpieza_segura: activo.limpieza_segura || "",
            documento_riesgos: null
        });
        setEditingId(activo.id);
        setIsEditing(true);
        setActiveSection("identificacion");
        toast.success("Activo encontrado. Modo Edición activado.");
      } else {
        toast.info("No se encontró ningún activo con ese código.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al buscar el activo.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setSearchTerm("");
    setFormData({
        nombre_activo: "", tipo_activo: "", sede: "", area_ubicacion: "", marca: "", modelo_referencia: "", serial: "", estado_activo: "", foto_activo: null,
        potencia: "", tension_fase: "", capacidad: "", diametro_placa: "", placas_disponibles: "", material_principal: "", protecciones_seguridad: "",
        fecha_compra: "", proveedor: "", garantia_hasta: "", costo_compra: "", responsable_gestion: "", contacto_responsable: "", codigo_qr: "",
        frecuencia_preventivo: "", ultimo_mantenimiento: new Date().toISOString().split('T')[0], proximo_mantenimiento: "",
        epp_minimo: "", riesgos_criticos: "", limpieza_segura: "", documento_riesgos: null
    });
    toast.info("Edición cancelada. Formulario limpiado.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const dataToSend = new FormData();
    // Agregar todos los campos al FormData
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null && formData[key] !== "") {
        dataToSend.append(key, formData[key]);
      }
    });

    try {
      const url = isEditing ? `${apiBaseUrl}/inventario/${editingId}` : `${apiBaseUrl}/inventario`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        body: dataToSend, // Enviar FormData
      });

      // Manejo específico para error 413 (Archivo muy pesado en Vercel)
      if (res.status === 413) {
        throw new Error("El archivo es demasiado grande (Máx 4.5MB). Por favor comprime la imagen o usa un PDF más liviano.");
      }

      let data;
      const contentType = res.headers.get("content-type");
      
      // Verificar si la respuesta es JSON antes de parsear
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        // Si no es JSON (ej. errores de Vercel en HTML/Texto), leer como texto
        const textResponse = await res.text();
        console.error("Respuesta no-JSON del servidor:", textResponse);
        throw new Error("Error del servidor (No JSON). Revisa la consola o intenta con un archivo más pequeño.");
      }

      if (!res.ok)
        throw new Error(data.error || "Error al registrar el activo.");

      toast.success(isEditing ? "Activo actualizado correctamente" : `Activo registrado: ${data.codigo_activo}`);
      
      // Reset form
      if (!isEditing) {
          setFormData({
            nombre_activo: "", tipo_activo: "", sede: "", area_ubicacion: "", marca: "", modelo_referencia: "", serial: "", estado_activo: "", foto_activo: null,
            potencia: "", tension_fase: "", capacidad: "", diametro_placa: "", placas_disponibles: "", material_principal: "", protecciones_seguridad: "",
            fecha_compra: "", proveedor: "", garantia_hasta: "", costo_compra: "", responsable_gestion: "", contacto_responsable: "", codigo_qr: "",
            frecuencia_preventivo: "", ultimo_mantenimiento: new Date().toISOString().split('T')[0], proximo_mantenimiento: "",
            epp_minimo: "", riesgos_criticos: "", limpieza_segura: "", documento_riesgos: null
          });
          setActiveSection("identificacion"); // Volver al inicio
      }
    } catch (err) {
      toast.error(`Error: ${err.message}`);
      console.error("Error al procesar la solicitud:", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Plantilla");
    const configSheet = workbook.addWorksheet("Config", { state: 'hidden' });

    // Definir encabezados
    const headers = [
      "Nombre del Activo", "Tipo del Activo", "Sede", "Área / Ubicación", "Marca", 
      "Modelo / Referencia", "Serial", "Estado del Activo", "Potencia", "Tensión / Fase", 
      "Capacidad", "Diámetro Placa", "Placas Disponibles", "Material Principal", 
      "Protecciones de Seguridad", "Fecha Compra (AAAA-MM-DD)", "Proveedor", 
      "Garantía Hasta (AAAA-MM-DD)", "Costo Compra", "Responsable Gestión", 
      "Contacto Responsable", "Código QR", "Frecuencia Preventivo", 
      "Último Mantenimiento (AAAA-MM-DD)", "EPP Mínimo", "Riesgos Críticos", "Limpieza Segura"
    ];

    // Configurar columnas y encabezados
    worksheet.columns = headers.map(h => ({ header: h, key: h, width: 25 }));
    
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF210D65' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Preparar opciones en la hoja oculta
    const tiposNombres = tiposActivosCatalogo.map(t => t.nombre).filter(Boolean);
    
    // Escribir opciones en la hoja Config
    tiposNombres.forEach((val, i) => configSheet.getCell(i + 1, 1).value = val);
    sedes.forEach((val, i) => configSheet.getCell(i + 1, 2).value = val);
    estadosActivo.forEach((val, i) => configSheet.getCell(i + 1, 3).value = val);
    frecuenciasMantenimiento.forEach((val, i) => configSheet.getCell(i + 1, 4).value = val);

    // Definir rangos con nombre o referencias directas
    const tiposRange = `Config!$A$1:$A$${tiposNombres.length || 1}`;
    const sedesRange = `Config!$B$1:$B$${sedes.length || 1}`;
    const estadosRange = `Config!$C$1:$C$${estadosActivo.length || 1}`;
    const frecuenciasRange = `Config!$D$1:$D$${frecuenciasMantenimiento.length || 1}`;

    // Aplicar validación a las primeras 100 filas (de la 2 a la 101)
    for (let i = 2; i <= 101; i++) {
      // Tipo del Activo (Columna B)
      worksheet.getCell(`B${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [tiposRange]
      };

      // Sede (Columna C)
      worksheet.getCell(`C${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [sedesRange]
      };

      // Estado del Activo (Columna H)
      worksheet.getCell(`H${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [estadosRange]
      };

      // Frecuencia Preventivo (Columna W)
      worksheet.getCell(`W${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [frecuenciasRange]
      };
    }

    // Generar y descargar el archivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "Plantilla_Inventario_Mantenimiento.xlsx";
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImportFromExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      if (data.length > 0) {
        const firstRow = data[0];
        
        const mapping = {
          "Nombre del Activo": "nombre_activo",
          "Tipo del Activo": "tipo_activo",
          "Sede": "sede",
          "Área / Ubicación": "area_ubicacion",
          "Marca": "marca",
          "Modelo / Referencia": "modelo_referencia",
          "Serial": "serial",
          "Estado del Activo": "estado_activo",
          "Potencia": "potencia",
          "Tensión / Fase": "tension_fase",
          "Placas Disponibles": "placas_disponibles",
          "Material Principal": "material_principal",
          "Protecciones de Seguridad": "protecciones_seguridad",
          "Fecha Compra (AAAA-MM-DD)": "fecha_compra",
          "Proveedor": "proveedor",
          "Garantía Hasta (AAAA-MM-DD)": "garantia_hasta",
          "Costo Compra": "costo_compra",
          "Responsable Gestión": "responsable_gestion",
          "Contacto Responsable": "contacto_responsable",
          "Código QR": "codigo_qr",
          "Frecuencia Preventivo": "frecuencia_preventivo",
          "Último Mantenimiento (AAAA-MM-DD)": "ultimo_mantenimiento",
          "EPP Mínimo": "epp_minimo",
          "Riesgos Críticos": "riesgos_criticos",
          "Limpieza Segura": "limpieza_segura"
        };

        const newFormData = { ...formData };
        Object.keys(mapping).forEach(header => {
          if (firstRow[header] !== undefined) {
            // Convertir fechas de Excel si vienen como números
            let value = firstRow[header];
            if (header.includes("(AAAA-MM-DD)") && typeof value === 'number') {
                const date = new Date((value - 25569) * 86400 * 1000);
                value = date.toISOString().split('T')[0];
            }
            newFormData[mapping[header]] = value;
          }
        });

        setFormData(newFormData);
        toast.success("¡Datos cargados! Revisa los campos y adjunta las fotos/documentos.");
        setActiveSection("identificacion");
      } else {
        toast.error("El archivo Excel está vacío.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleExcelUpload = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      toast.error("Por favor, selecciona un archivo Excel.");
      return;
    }

    setLoading(true);
    const formDataExcel = new FormData();
    formDataExcel.append("excelFile", excelFile);

    try {
      const res = await fetch(`${apiBaseUrl}/inventario/upload-excel`, {
        method: "POST",
        body: formDataExcel,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al cargar el Excel.");
      }

      toast.success(data.message);
      setExcelFile(null);
    } catch (error) {
      toast.error(`Error al cargar Excel: ${error.message}`);
      console.error("Error cargando Excel:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inv-page-container">
      <div className="inv-title-section">
        <h2 className="inv-main-title">
          <FaBoxOpen /> Gestión de Inventario
        </h2>
        <p className="inv-subtitle">
          {isEditing 
            ? "Modo Edición: Actualiza la información del activo seleccionado."
            : "Completa los pasos para registrar un nuevo activo en el sistema."}
        </p>
      </div>

       {/* Sección de Búsqueda para Editar */}
       <div className="inv-search-card" style={{ 
          background: 'rgba(255, 255, 255, 0.05)', 
          padding: '1.5rem', 
          borderRadius: '12px', 
          marginBottom: '2rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
       }}>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaEdit /> ¿Necesitas editar un activo existente?
          </h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ingresa el código del activo (Ej. MT-IF-001)"
              style={{
                flex: 1,
                padding: '10px 15px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                color: '#333'
              }}
            />
            <button 
              onClick={handleSearch}
              type="button"
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#00D4FF',
                color: '#000',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FaSearch /> Buscar
            </button>
            {isEditing && (
              <button 
                onClick={handleCancelEdit}
                type="button"
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #ff4d4d',
                  backgroundColor: 'transparent',
                  color: '#ff4d4d',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <FaBan /> Cancelar Edición
              </button>
            )}
          </div>
       </div>

      {/* Step Indicator */}
      <div className="inv-steps-container">
        {sections.map((section, index) => (
          <div 
            key={section.id} 
            className={`inv-step-item ${activeSection === section.id ? "active" : ""} ${index < currentStepIndex ? "completed" : ""}`}
            onClick={() => setActiveSection(section.id)}
            style={{ cursor: 'pointer' }}
          >
            <div className="inv-step-circle">
              {index < currentStepIndex ? "✓" : index + 1}
            </div>
            <span className="inv-step-label">{section.title}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="inv-accordion-wrapper">
        
        {/* 1. Identificación del equipo */}
        <AccordionSection 
          id="identificacion" 
          title="1. Identificación del Equipo" 
          icon={FaIdCard}
          activeSection={activeSection} 
          toggleSection={toggleSection}
        >
          <div className="inv-form-grid">
            <div className="inv-form-group">
              <label className="inv-label">Nombre del Activo</label>
              <input type="text" name="nombre_activo" value={formData.nombre_activo} onChange={handleChange} className="inv-input"  />
            </div>
            <div className="inv-form-group">
              <label className="inv-label">Tipo del Activo</label>
              <select name="tipo_activo" value={formData.tipo_activo} onChange={handleChange} className="inv-select">
                <option value="" disabled>Selecciona un tipo</option>
                {tiposActivosCatalogo.map((tipo) => (
                  <option key={tipo.nombre} value={tipo.nombre}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
              {selectedTipoInfo && (
                <p className="inv-field-hint">{selectedTipoInfo.descripcion}</p>
              )}
            </div>
            <div className="inv-form-group">
              <label className="inv-label">Sede</label>
              <select name="sede" value={formData.sede} onChange={handleChange} className="inv-select">
                <option value="" disabled>Selecciona una sede</option>
                {sedes.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="inv-form-group">
              <label className="inv-label">Área / Ubicación</label>
              <input type="text" name="area_ubicacion" value={formData.area_ubicacion} onChange={handleChange} className="inv-input" />
            </div>
            <div className="inv-form-group">
              <label className="inv-label">Marca</label>
              <input type="text" name="marca" value={formData.marca} onChange={handleChange} className="inv-input"  />
            </div>
            <div className="inv-form-group">
              <label className="inv-label">Modelo / Referencia</label>
              <input type="text" name="modelo_referencia" value={formData.modelo_referencia} onChange={handleChange} className="inv-input" placeholder="Ej. 4146" />
            </div>
            <div className="inv-form-group">
              <label className="inv-label">Serial</label>
              <input type="text" name="serial" value={formData.serial} onChange={handleChange} className="inv-input" placeholder="N° de serie" />
            </div>
            <div className="inv-form-group">
              <label className="inv-label">Estado del Activo</label>
              <select name="estado_activo" value={formData.estado_activo} onChange={handleChange} className="inv-select">
                <option value="" disabled>Selecciona un estado</option>
                {estadosActivo.map((estado) => <option key={estado} value={estado}>{estado}</option>)}
              </select>
            </div>
            <div className="inv-form-group">
              <label className="inv-label">Registro Fotográfico</label>
              <input type="file" name="foto_activo" accept="image/*" onChange={handleChange} className="inv-input" />
            </div>
            <div className="inv-form-group">
              <label className="inv-label">Código Interno</label>
              <input type="text" value="Generado Automáticamente" disabled className="inv-input disabled" />
            </div>
          </div>
          <div className="inv-navigation-buttons">
            <button type="button" className="inv-btn-next" onClick={() => setActiveSection("tecnicas")}>
              Siguiente <FaChevronRight />
            </button>
          </div>
        </AccordionSection>

        {/* 2. Especificaciones Técnicas */}
        <AccordionSection 
          id="tecnicas" 
          title="2. Especificaciones Técnicas" 
          icon={FaTools}
          activeSection={activeSection} 
          toggleSection={toggleSection}
        >
          <div className="inv-form-grid">
            <div className="inv-form-group"><label className="inv-label">Potencia (kW/HP)</label><input type="text" name="potencia" value={formData.potencia} onChange={handleChange} className="inv-input" placeholder="Ej. 5 HP" /></div>
            <div className="inv-form-group"><label className="inv-label">Tensión (V) / Fase</label><input type="text" name="tension_fase" value={formData.tension_fase} onChange={handleChange} className="inv-input" placeholder="Ej. 220V / Trifásico" /></div>
            <div className="inv-form-group"><label className="inv-label">Capacidad (kg/h)</label><input type="text" name="capacidad" value={formData.capacidad} onChange={handleChange} className="inv-input" placeholder="Ej. 500 kg/h" /></div>
            <div className="inv-form-group"><label className="inv-label">Diámetro de placa (mm)</label><input type="text" name="diametro_placa" value={formData.diametro_placa} onChange={handleChange} className="inv-input" /></div>
            <div className="inv-form-group"><label className="inv-label">Placas disponibles (mm)</label><input type="text" name="placas_disponibles" value={formData.placas_disponibles} onChange={handleChange} className="inv-input" /></div>
            <div className="inv-form-group"><label className="inv-label">Material principal</label><input type="text" name="material_principal" value={formData.material_principal} onChange={handleChange} className="inv-input" placeholder="Ej. Acero Inoxidable" /></div>
            <div className="inv-form-group"><label className="inv-label">Protecciones / Seguridad</label><input type="text" name="protecciones_seguridad" value={formData.protecciones_seguridad} onChange={handleChange} className="inv-input" placeholder="Ej. Parada de emergencia" /></div>
          </div>
          <div className="inv-navigation-buttons">
            <button type="button" className="inv-btn-prev" onClick={() => setActiveSection("identificacion")}>
              <FaChevronLeft /> Anterior
            </button>
            <button type="button" className="inv-btn-next" onClick={() => setActiveSection("compra")}>
              Siguiente <FaChevronRight />
            </button>
          </div>
        </AccordionSection>

        {/* 3. Compra, Garantía y Administración */}
        <AccordionSection 
          id="compra" 
          title="3. Compra, Garantía y Administración" 
          icon={FaShoppingCart}
          activeSection={activeSection} 
          toggleSection={toggleSection}
        >
          <div className="inv-form-grid">
            <div className="inv-form-group"><label className="inv-label">Fecha de Compra</label><input type="date" name="fecha_compra" value={formData.fecha_compra} onChange={handleChange} className="inv-input" /></div>
            <div className="inv-form-group"><label className="inv-label">Proveedor</label><input type="text" name="proveedor" value={formData.proveedor} onChange={handleChange} className="inv-input" /></div>
            <div className="inv-form-group"><label className="inv-label">Garantía Hasta</label><input type="date" name="garantia_hasta" value={formData.garantia_hasta} onChange={handleChange} className="inv-input" /></div>
            <div className="inv-form-group"><label className="inv-label">Costo de Compra (COP)</label><input type="number" name="costo_compra" value={formData.costo_compra} onChange={handleChange} className="inv-input" /></div>
            <div className="inv-form-group"><label className="inv-label">Responsable del Equipo</label><input type="text" name="responsable_gestion" value={formData.responsable_gestion} onChange={handleChange} className="inv-input" /></div>
            <div className="inv-form-group"><label className="inv-label">Contacto Responsable</label><input type="text" name="contacto_responsable" value={formData.contacto_responsable} onChange={handleChange} className="inv-input" /></div>
            <div className="inv-form-group"><label className="inv-label">Código/URL QR (SOP/Registro)</label><input type="text" name="codigo_qr" value={formData.codigo_qr} onChange={handleChange} className="inv-input" /></div>
          </div>
          <div className="inv-navigation-buttons">
            <button type="button" className="inv-btn-prev" onClick={() => setActiveSection("tecnicas")}>
              <FaChevronLeft /> Anterior
            </button>
            <button type="button" className="inv-btn-next" onClick={() => setActiveSection("mantenimiento")}>
              Siguiente <FaChevronRight />
            </button>
          </div>
        </AccordionSection>

        {/* 4. Mantenimiento Planificado */}
        <AccordionSection 
          id="mantenimiento" 
          title="4. Mantenimiento Planificado" 
          icon={FaHistory}
          activeSection={activeSection} 
          toggleSection={toggleSection}
        >
          <div className="inv-form-grid">
            <div className="inv-form-group">
              <label className="inv-label">Frecuencia Preventivo</label>
              <select name="frecuencia_preventivo" value={formData.frecuencia_preventivo} onChange={handleChange} className="inv-select">
                <option value="" disabled>Selecciona una frecuencia</option>
                {frecuenciasMantenimiento.map((frec) => <option key={frec} value={frec}>{frec}</option>)}
              </select>
            </div>
            <div className="inv-form-group">
              <label className="inv-label">Último Mantenimiento</label>
              <input type="date" name="ultimo_mantenimiento" value={formData.ultimo_mantenimiento} onChange={handleChange} className="inv-input" />
            </div>
            <div className="inv-form-group">
              <label className="inv-label">Próximo Mantenimiento (Automático)</label>
              <input type="date" name="proximo_mantenimiento" value={formData.proximo_mantenimiento} readOnly className="inv-input disabled" />
            </div>
          </div>
          <div className="inv-navigation-buttons">
            <button type="button" className="inv-btn-prev" onClick={() => setActiveSection("compra")}>
              <FaChevronLeft /> Anterior
            </button>
            <button type="button" className="inv-btn-next" onClick={() => setActiveSection("riesgos")}>
              Siguiente <FaChevronRight />
            </button>
          </div>
        </AccordionSection>

        {/* 5. Riesgos Críticos y EPP */}
        <AccordionSection 
          id="riesgos" 
          title="5. Riesgos Críticos y EPP" 
          icon={FaShieldAlt}
          activeSection={activeSection} 
          toggleSection={toggleSection}
        >
          <div className="inv-form-grid">
            <div className="inv-form-group full-width">
              <label className="inv-label">EPP Mínimo</label>
              <textarea name="epp_minimo" value={formData.epp_minimo} onChange={handleChange} className="inv-textarea" rows="2" placeholder="Ej. Guantes de acero, gafas de seguridad..."></textarea>
            </div>
            <div className="inv-form-group full-width">
              <label className="inv-label">Riesgos Críticos</label>
              <textarea name="riesgos_criticos" value={formData.riesgos_criticos} onChange={handleChange} className="inv-textarea" rows="2" placeholder="Ej. Atrapamiento, cortes..."></textarea>
            </div>
            <div className="inv-form-group full-width">
              <label className="inv-label">Limpieza Segura (Resumen)</label>
              <textarea name="limpieza_segura" value={formData.limpieza_segura} onChange={handleChange} className="inv-textarea" rows="2" placeholder="Ej. Desconectar antes de limpiar..."></textarea>
            </div>
            <div className="inv-form-group full-width">
              <label className="inv-label">Adjuntar Documento</label>
              <input type="file" name="documento_riesgos" onChange={handleChange} className="inv-input" />
            </div>
          </div>
          <div className="inv-navigation-buttons">
            <button type="button" className="inv-btn-prev" onClick={() => setActiveSection("mantenimiento")}>
              <FaChevronLeft /> Anterior
            </button>
          </div>
          <div className="inv-action-buttons">
             <button type="submit" className="inv-btn-submit" disabled={loading}>
              <FaSave /> {loading ? (isEditing ? "Actualizando..." : "Guardando...") : (isEditing ? "Actualizar Información" : "Finalizar y Guardar Todo")}
            </button>
          </div>
        </AccordionSection>

      </form>

      {/* Carga Masiva / Importación */}
      <div className="inv-upload-card">
        <h3 className="inv-upload-title"><FaFileExcel /> Carga Masiva / Importación</h3>
        <p className="inv-upload-desc">
          Usa esta opción para llenar el formulario automáticamente desde un archivo Excel. 
          Luego podrás adjuntar las fotos y documentos manualmente antes de guardar.
        </p>
        
        <div className="inv-upload-actions">
          <button type="button" className="inv-btn-template" onClick={downloadTemplate}>
            <FaDownload /> Descargar Plantilla
          </button>
          
          <div className="inv-file-input-wrapper">
            <label htmlFor="importExcel" className="inv-btn-import">
              <FaUpload /> Seleccionar Excel para Importar
            </label>
            <input 
              id="importExcel"
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleImportFromExcel} 
              style={{ display: 'none' }} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventarioMantenimiento;