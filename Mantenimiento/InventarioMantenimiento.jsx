import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaClipboardList,
  FaFileExcel,
  FaUpload,
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
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./InventarioMantenimiento.css";
import { useOutletContext } from "react-router-dom";

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
  const [tiposActivosDisponibles, setTiposActivosDisponibles] = useState([]);
  const [isEditing, setIsEditing] = useState(false); // Para el modo edición (futuro)

  const apiBaseUrl = "https://backend-mantenimiento.vercel.app/api";

  useEffect(() => {
    fetchTiposActivos();
  }, []);

  // Calcular próximo mantenimiento cuando cambia frecuencia o último mantenimiento
  useEffect(() => {
    calculateNextMaintenance();
  }, [formData.frecuencia_preventivo, formData.ultimo_mantenimiento]);

  const fetchTiposActivos = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/inventario/tipos-activos`);
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al obtener tipos de activos.");
      setTiposActivosDisponibles(data);
    } catch (err) {
      toast.error(`Error al cargar tipos de activos: ${err.message}`);
      console.error("Error al cargar tipos de activos:", err);
    }
  };

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
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const toggleSection = (section) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const dataToSend = new FormData();
    // Agregar todos los campos al FormData
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null) {
        dataToSend.append(key, formData[key]);
      }
    });

    try {
      const res = await fetch(`${apiBaseUrl}/inventario`, {
        method: "POST",
        body: dataToSend, // Enviar FormData
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Error al registrar el activo.");

      toast.success(`Activo registrado: ${data.codigo_activo}`);
      
      // Reset form
      setFormData({
        nombre_activo: "", tipo_activo: "", sede: "", area_ubicacion: "", marca: "", modelo_referencia: "", serial: "", estado_activo: "", foto_activo: null,
        potencia: "", tension_fase: "", capacidad: "", diametro_placa: "", placas_disponibles: "", material_principal: "", protecciones_seguridad: "",
        fecha_compra: "", proveedor: "", garantia_hasta: "", costo_compra: "", responsable_gestion: "", contacto_responsable: "", codigo_qr: "",
        frecuencia_preventivo: "", ultimo_mantenimiento: new Date().toISOString().split('T')[0], proximo_mantenimiento: "",
        epp_minimo: "", riesgos_criticos: "", limpieza_segura: "", documento_riesgos: null
      });
      setActiveSection("identificacion"); // Volver al inicio
    } catch (err) {
      toast.error(`Error al registrar: ${err.message}`);
      console.error("Error al registrar activo:", err);
    } finally {
      setLoading(false);
    }
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
      fetchTiposActivos();
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
          Completa los pasos para registrar un nuevo activo en el sistema.
        </p>
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
              <input type="text" name="nombre_activo" value={formData.nombre_activo} onChange={handleChange} required className="inv-input" placeholder="Ej. Molino de Carne" />
            </div>
            <div className="inv-form-group">
              <label className="inv-label">Tipo del Activo</label>
              <select name="tipo_activo" value={formData.tipo_activo} onChange={handleChange} required className="inv-select">
                <option value="" disabled>Selecciona un tipo</option>
                {tiposActivosDisponibles.map((tipo) => (
                  <option key={tipo.codigo_tipo} value={tipo.nombre_tipo}>
                    {tipo.nombre_tipo}
                  </option>
                ))}
              </select>
            </div>
            <div className="inv-form-group">
              <label className="inv-label">Sede</label>
              <select name="sede" value={formData.sede} onChange={handleChange} required className="inv-select">
                <option value="" disabled>Selecciona una sede</option>
                {sedes.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="inv-form-group">
              <label className="inv-label">Área / Ubicación</label>
              <input type="text" name="area_ubicacion" value={formData.area_ubicacion} onChange={handleChange} required className="inv-input" placeholder="Ej. Cocina, Bodega..." />
            </div>
            <div className="inv-form-group">
              <label className="inv-label">Marca</label>
              <input type="text" name="marca" value={formData.marca} onChange={handleChange} className="inv-input" placeholder="Ej. Hobart" />
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
              <select name="estado_activo" value={formData.estado_activo} onChange={handleChange} required className="inv-select">
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
            <div className="inv-form-group"><label className="inv-label">Responsable del Equipo</label><input type="text" name="responsable_gestion" value={formData.responsable_gestion} onChange={handleChange} required className="inv-input" /></div>
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
              <select name="frecuencia_preventivo" value={formData.frecuencia_preventivo} onChange={handleChange} required className="inv-select">
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
              <FaSave /> {loading ? "Guardando..." : "Finalizar y Guardar Todo"}
            </button>
          </div>
        </AccordionSection>

      </form>

      {/* Carga Masiva (Se mantiene igual) */}
      <div className="inv-upload-card">
        <h3 className="inv-upload-title"><FaFileExcel /> Carga Masiva desde Excel</h3>
        <p>Asegúrate de usar la plantilla actualizada con los nuevos campos.</p>
        <form onSubmit={handleExcelUpload}>
          <div className="inv-form-group full-width">
            <label htmlFor="excelFile" className="inv-label">Adjuntar Archivo Excel</label>
            <input type="file" name="excelFile" accept=".xlsx, .xls" onChange={(e) => setExcelFile(e.target.files[0])} className="inv-input" />
            {excelFile && <p className="inv-file-info">Archivo seleccionado: {excelFile.name}</p>}
          </div>
          <button type="submit" className="inv-btn-submit" disabled={loading || !excelFile}>
            <FaUpload /> {loading ? "Cargando..." : "Cargar Excel"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default InventarioMantenimiento;