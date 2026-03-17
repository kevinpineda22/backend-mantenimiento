import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import {
  RESPONSABLES_CONFIG,
  sedes,
  formatDateForInput,
  optimizeImage, 
  validateFile,  
} from "./mantenimientoUtils"; 
import "./RegistroComun.css";

const INITIAL_FORM_DATA = {
  sede: "",
  actividad: "",
  fechaLimite: "", 
  responsableRol: "",
  responsableEmail: "", 
  fechaInicio: formatDateForInput(new Date()),
  estado: "pendiente",
  fotoAntes: [], // ⭐ CAMBIO: Inicializar como array
  fotoDespues: [], // ⭐ CAMBIO: Inicializar como array
  nombreEmpleado: "",
  cedulaEmpleado: "",
  cargoEmpleado: "",
  enviarCorreo: true,
  nombreSolicitante: "",
  sanidad: false,
};

const AsignarTarea = () => {
  const { setLoading, loading } = useOutletContext();
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [fotoAntesPreview, setFotoAntesPreview] = useState([]); // ⭐ CAMBIO: Array de previews
  const [fotoDespuesPreview, setFotoDespuesPreview] = useState([]); // ⭐ CAMBIO: Array de previews
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const apiBaseUrl = "https://backend-mantenimiento.vercel.app/api";
  
  // ✅ NUEVA LISTA: Correos de líderes operativos
  const LIDERES_OPERATIVOS = [
    "lideroperativo1@merkahorrosas.com",
    "lideroperativo2@merkahorrosas.com",
    "lideroperativo3@merkahorrosas.com",
    "lideroperativo4@merkahorrosas.com",
    "lideroperativo5@merkahorrosas.com",
    "lideroperativo6@merkahorrosas.com",
    "lideroperativo7@merkahorrosas.com",
    "juanmerkahorro@gmail.com"
  ];

  // ✅ NUEVA FUNCIÓN: Verificar si el usuario actual es un líder operativo
  const esLiderOperativo = () => {
    return LIDERES_OPERATIVOS.includes(userEmail.toLowerCase());
  };

  useEffect(() => {
    const getUserEmail = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        }
      } catch (error) {
        console.error("Error obteniendo usuario:", error);
        const storedEmail = localStorage.getItem("correo_empleado");
        setUserEmail(storedEmail || "sistema@merka.com.co");
      }
    };
    
    getUserEmail();
  }, []);

  const getFileStateAndSetter = (name) => {
    if (name === "fotoAntes") {
      return { setPreview: setFotoAntesPreview, preview: fotoAntesPreview || [], fieldName: "Foto Antes" };
    }
    if (name === "fotoDespues") {
      return { setPreview: setFotoDespuesPreview, preview: fotoDespuesPreview || [], fieldName: "Foto Después" };
    }
    return { setPreview: () => {}, preview: [], fieldName: "Archivo" };
  };
  
const handleFileChange = async (e) => {
    const { name, files } = e.target;
    if (files && files.length > 0) {
      const { setPreview, preview, fieldName } = getFileStateAndSetter(name);
      
      // Aseguramos que sea array
      const currentFiles = Array.isArray(formData[name]) ? formData[name] : [];
      const filesArray = Array.from(files);

      if (currentFiles.length + filesArray.length > 6) {
        Swal.fire({
          icon: "error",
          title: "Límite Excedido",
          text: "Solo se permiten máximo 6 imágenes por campo.",
          confirmButtonColor: "#89DC00",
        });
        return;
      }

      setIsOptimizingImage(true);
      const newFiles = [];
      const newPreviews = [];

      // Procesar imágenes secuencialmente para optimizar
      for (const file of filesArray) {
        if (!validateFile(file, fieldName)) continue;

        try {
          const result = await optimizeImage(file);
          const finalFile = result.file || result;
          newFiles.push(finalFile);
          newPreviews.push(URL.createObjectURL(finalFile));
        } catch (error) {
          console.error(`Error al optimizar la imagen ${name}:`, error);
          newFiles.push(file);
          newPreviews.push(URL.createObjectURL(file));
        }
      }

      if (newFiles.length > 0) {
        setFormData((prev) => ({ ...prev, [name]: [...currentFiles, ...newFiles] }));
        setPreview([...preview, ...newPreviews]);
        
        Swal.fire({
            icon: "success",
            title: "Imágenes Añadidas",
            text: `Se añadieron ${newFiles.length} imágenes.`,
            timer: 2000,
            showConfirmButton: false,
        });
      }
      
      setIsOptimizingImage(false);
    }
  };

  // ⭐ NUEVA FUNCIÓN: Eliminar imagen individual de la selección
  const handleRemoveImage = (name, index) => {
    const { setPreview, preview } = getFileStateAndSetter(name);
    const currentFiles = formData[name];

    const newFiles = currentFiles.filter((_, i) => i !== index);
    const newPreviews = preview.filter((_, i) => i !== index);

    setFormData((prev) => ({ ...prev, [name]: newFiles }));
    setPreview(newPreviews);
  };

  const handleChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    
    if (name === "precio") {
      const numericValue = value.replace(/\D/g, "");
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
    } else if (files && files.length > 0) {
      handleFileChange(e);
    } else if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleRolChange = (e) => {
    const rol = e.target.value;
    const config = RESPONSABLES_CONFIG[rol];
    
    setFormData((prev) => ({
      ...prev,
      responsableRol: rol,
      responsableEmail: config?.notifyAll 
        ? config.members.map(m => m.email).join(";") 
        : config?.isGroup 
          ? ""
          : config?.members[0]?.email || "",
      nombreEmpleado: "",
      cedulaEmpleado: "",
      cargoEmpleado: "",
      // ✅ CAMBIO: NO limpiar nombreSolicitante aquí, ya que es para el líder que inició sesión
      // nombreSolicitante: "", // ❌ REMOVIDO
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const responsableFinal = formData.responsableEmail;

    if (!responsableFinal) {
      Swal.fire({
        icon: "error",
        title: "Responsable Incompleto",
        text: "Por favor, selecciona un Rol y un Responsable Específico.",
        confirmButtonColor: "#89DC00",
      });
      setLoading(false);
      return;
    }

    if (formData.responsableRol === "Suministros") {
      if (!formData.nombreEmpleado || !formData.cedulaEmpleado || !formData.cargoEmpleado) {
        Swal.fire({
          icon: "error",
          title: "Campos de Dotación Incompletos",
          text: "Para solicitudes de dotación, debes completar: Nombre del empleado, Cédula y Cargo.",
          confirmButtonColor: "#89DC00",
        });
        setLoading(false);
        return;
      }
    }

    // ✅ CAMBIO: Validar nombre del solicitante SOLO si el usuario actual es un líder operativo
    if (esLiderOperativo()) {
      if (!formData.nombreSolicitante || formData.nombreSolicitante.trim() === "") {
        Swal.fire({
          icon: "error",
          title: "Falta Nombre del Solicitante",
          text: "Como líder operativo, debes ingresar el nombre de quien solicita la tarea.",
          confirmButtonColor: "#89DC00",
        });
        setLoading(false);
        return;
      }
    }

    if (!userEmail) {
      Swal.fire({
        icon: "error",
        title: "Error de autenticación",
        text: "No se pudo obtener el email del usuario. Inténtalo de nuevo.",
        confirmButtonColor: "#89DC00",
      });
      setLoading(false);
      return;
    }

    const today = formatDateForInput(new Date());
    if (formData.fechaLimite < today) {
      Swal.fire({
        icon: "warning",
        title: "Fecha Inválida",
        text: "La fecha límite debe ser hoy o una fecha futura para asignar la tarea.",
        confirmButtonColor: "#89DC00",
      });
      setLoading(false);
      return;
    }

    const dataToSend = {
      ...formData,
      responsable: responsableFinal, 
      creador_email: userEmail,
      fechaFinal: formData.fechaLimite, 
      nombre_empleado: formData.nombreEmpleado,
      cedula_empleado: formData.cedulaEmpleado,
      cargo_empleado: formData.cargoEmpleado,
      nombre_solicitante: formData.nombreSolicitante,
      enviarCorreo: formData.enviarCorreo,
      sanidad: formData.sanidad,
    };

    const formPayload = new FormData();
    Object.entries(dataToSend).forEach(([key, value]) => {
      if (value === null || value === undefined || key === 'responsableRol' || key === 'responsableEmail' || key === 'fechaLimite') return;

      if (key === 'fotoAntes' || key === 'fotoDespues') {
        if (Array.isArray(value)) {
          value.forEach((file) => formPayload.append(key, file));
        }
      } else {
        formPayload.append(key, value);
      }
    });

    formPayload.append('fechaFinal', formData.fechaLimite); 

    try {
      const response = await fetch(`${apiBaseUrl}/tareas/asignar`, {
        method: "POST",
        body: formPayload,
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al asignar la actividad");

      Swal.fire({
        icon: "success",
        title: "¡Tarea Asignada!",
        text: `La tarea fue asignada a ${responsableFinal} con éxito. ${formData.enviarCorreo ? 'Se ha enviado una notificación por correo.' : 'No se enviará notificación por correo.'}`,
        confirmButtonText: "Aceptar",
        confirmButtonColor: "#89DC00",
      }).then(() => {
        setFormData(INITIAL_FORM_DATA);
        setFotoAntesPreview(null);
        setFotoDespuesPreview(null);
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message,
        confirmButtonColor: "#89DC00",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="maint-form-container">
      <h2 className="maint-section-title">Asignación de Tareas</h2>
      <p className="maint-motivational-phrase">
        "Define y documenta las tareas que requieren atención inmediata."
      </p>

      {userEmail && (
        <div style={{ 
          marginBottom: '15px', 
          padding: '10px', 
          backgroundColor: '#E0F7FA', 
          borderRadius: '5px',
          fontSize: '0.9em',
          color: '#00695C',
          borderLeft: '4px solid #00ACC1'
        }}>
          👤 Asignando tarea como: <strong>{userEmail}</strong>
          {/* ✅ NUEVO: Mostrar badge si es líder operativo */}
          {esLiderOperativo() && (
            <span style={{
              marginLeft: '10px',
              padding: '4px 8px',
              backgroundColor: '#FFB74D',
              color: '#fff',
              borderRadius: '4px',
              fontSize: '0.85em',
              fontWeight: 'bold'
            }}>
              🎯 LÍDER OPERATIVO
            </span>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="maint-form-card">
        <div className="maint-form-grid">
          
          <div className="maint-form-group">
            <label htmlFor="sede" className="maint-form-label">Sede</label>
            <select name="sede" value={formData.sede} onChange={handleChange} required className="maint-form-select">
              <option value="" disabled>Selecciona una sede</option>
              {sedes.map((s, idx) => (<option key={idx} value={s}>{s}</option>))}
            </select>
          </div>

          <div className="maint-form-group">
            <label htmlFor="fechaInicio" className="maint-form-label">Fecha de Inicio</label>
            <input type="date" name="fechaInicio" value={formData.fechaInicio} onChange={handleChange} required className="maint-form-input" />
          </div>

          <div className="maint-form-group">
            <label htmlFor="fechaLimite" className="maint-form-label">Fecha Límite de Ejecución</label>
            <input type="date" name="fechaLimite" value={formData.fechaLimite} onChange={handleChange} required className="maint-form-input" />
          </div>

          <div className="maint-form-group">
            <label htmlFor="estado" className="maint-form-label">Estado</label>
            <select name="estado" value={formData.estado} onChange={handleChange} required className="maint-form-select">
              <option value="pendiente">Pendiente</option>
              <option value="en Curso">En Curso</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div className="maint-form-group">
            <label htmlFor="responsableRol" className="maint-form-label">Asignar a (Rol)</label>
            <select name="responsableRol" value={formData.responsableRol} onChange={handleRolChange} required className="maint-form-select">
              <option value="" disabled>Selecciona el Rol</option>
              {Object.keys(RESPONSABLES_CONFIG).map((rol) => (
                <option key={rol} value={rol}>{rol}</option>
              ))}
            </select>
          </div>

          {formData.responsableRol && (
            <div className={`maint-form-group ${RESPONSABLES_CONFIG[formData.responsableRol].isGroup ? '' : 'maint-form-group-info'}`}>
              <label htmlFor="responsableEmail" className="maint-form-label">
                {RESPONSABLES_CONFIG[formData.responsableRol].notifyAll 
                  ? 'Grupo Completo (Todos serán notificados)' 
                  : RESPONSABLES_CONFIG[formData.responsableRol].isGroup 
                    ? 'Responsable Específico (Correo)' 
                    : 'Correo de Responsable'}
              </label>
              
              {RESPONSABLES_CONFIG[formData.responsableRol].notifyAll ? (
                <div className="maint-form-group-notify-all">
                  <div style={{ 
                    padding: '10px', 
                    backgroundColor: '#E3F2FD', 
                    borderRadius: '6px',
                    border: '1px solid #1976D2'
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#1976D2' }}>
                      📧 Se notificará a todo el equipo:
                    </p>
                    {RESPONSABLES_CONFIG[formData.responsableRol].members.map((member) => (
                      <div key={member.email} style={{ 
                        fontSize: '0.9em', 
                        margin: '4px 0',
                        padding: '4px 8px',
                        backgroundColor: 'white',
                        borderRadius: '4px'
                      }}>
                        • {member.name} ({member.email})
                      </div>
                    ))}
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.8em', color: '#666', fontStyle: 'italic' }}>
                      💡 Cualquier miembro del equipo puede ejecutar esta tarea
                    </p>
                  </div>
                  <input type="hidden" name="responsableEmail" value={formData.responsableEmail} />
                </div>
              ) : (
                <select 
                  name="responsableEmail" 
                  value={formData.responsableEmail} 
                  onChange={handleChange} 
                  required={RESPONSABLES_CONFIG[formData.responsableRol].isGroup} 
                  disabled={!RESPONSABLES_CONFIG[formData.responsableRol].isGroup} 
                  className="maint-form-select"
                >
                  {RESPONSABLES_CONFIG[formData.responsableRol].isGroup && <option value="" disabled>Selecciona el correo</option>}
                  {RESPONSABLES_CONFIG[formData.responsableRol].members.map(member => (
                    <option key={member.email} value={member.email}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>
              )}
              
              {!RESPONSABLES_CONFIG[formData.responsableRol].isGroup && formData.responsableEmail && (
                <p className="maint-form-input-info" style={{marginTop: '4px', fontSize: '0.9em'}}>
                  {formData.responsableEmail}
                </p>
              )}
            </div>
          )}
          
          {/* CAMPOS DE DOTACIÓN (sin cambios) */}
          {formData.responsableRol === "Suministros" && RESPONSABLES_CONFIG.Suministros.requiresDotacion && (
            <>
              <div className="maint-form-group maint-form-group-full-width" style={{ 
                gridColumn: '1 / -1',
                backgroundColor: '#FFF8E1', 
                padding: '15px', 
                borderRadius: '8px',
                border: '2px solid #FFB74D',
                marginBottom: '20px'
              }}>
                <h3 style={{ 
                  color: '#E65100', 
                  margin: '0 0 15px 0', 
                  fontSize: '1.1em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  👔 Información para Solicitud de Dotación
                </h3>
                <p style={{ 
                  margin: '0', 
                  fontSize: '0.9em', 
                  color: '#BF360C',
                  fontStyle: 'italic'
                }}>
                  Complete los siguientes datos del empleado que requiere la dotación:
                </p>
              </div>

              <div className="maint-form-group">
                <label htmlFor="nombreEmpleado" className="maint-form-label">
                  <span style={{ color: '#E65100', fontWeight: 'bold' }}>*</span> Nombre Completo del Empleado
                </label>
                <input 
                  type="text" 
                  name="nombreEmpleado" 
                  value={formData.nombreEmpleado} 
                  onChange={handleChange} 
                  placeholder="Ej: Juan Carlos Pérez"
                  required className="maint-form-input" 
                />
              </div>

              <div className="maint-form-group">
                <label htmlFor="cedulaEmpleado" className="maint-form-label">
                  <span style={{ color: '#E65100', fontWeight: 'bold' }}>*</span> Cédula del Empleado
                </label>
                <input 
                  type="text" 
                  name="cedulaEmpleado" 
                  value={formData.cedulaEmpleado} 
                  onChange={handleChange} 
                  placeholder="Ej: 12345678"
                  required 
                  className="maint-form-input" 
                />
              </div>

              <div className="maint-form-group">
                <label htmlFor="cargoEmpleado" className="maint-form-label">
                  <span style={{ color: '#E65100', fontWeight: 'bold' }}>*</span> Cargo del Empleado
                </label>
                <input 
                  type="text" 
                  name="cargoEmpleado" 
                  value={formData.cargoEmpleado} 
                  onChange={handleChange} 
                  placeholder="Ej: Cajero, Auxiliar de Carnes, etc."
                  required 
                  className="maint-form-input" 
                />
              </div>
            </>
          )}

          {/* ✅ CAMBIO: Mostrar campo SOLO si el usuario actual es un líder operativo */}
          {esLiderOperativo() && (
            <div className="maint-form-group maint-form-group-full-width" style={{ 
              gridColumn: '1 / -1',
              backgroundColor: '#E3F2FD', 
              padding: '15px', 
              borderRadius: '8px',
              border: '2px solid #2196F3',
              marginBottom: '20px'
            }}>
              <h3 style={{ 
                color: '#1565C0', 
                margin: '0 0 15px 0', 
                fontSize: '1.1em',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                👤 Información del Solicitante
              </h3>
              <p style={{ 
                margin: '0 0 15px 0', 
                fontSize: '0.9em', 
                color: '#0D47A1',
                fontStyle: 'italic'
              }}>
                Como líder operativo, ingresa el nombre de la persona que está solicitando esta tarea:
              </p>
              
              <div className="maint-form-group">
                <label htmlFor="nombreSolicitante" className="maint-form-label">
                  <span style={{ color: '#1565C0', fontWeight: 'bold' }}>*</span> Nombre del Solicitante
                </label>
                <input 
                  type="text" 
                  id="nombreSolicitante"
                  name="nombreSolicitante" 
                  value={formData.nombreSolicitante} 
                  onChange={handleChange} 
                  placeholder="Ej: Pepito Perez"
                  required 
                  className="maint-form-input"
                  style={{
                    borderColor: '#2196F3',
                    backgroundColor: '#FAFAFA'
                  }}
                />
              </div>
            </div>
          )}

          {/* CAMPO DE ACTIVIDAD (sin cambios) */}
          <div className="maint-form-group maint-form-group-full-width">
            <label htmlFor="actividad" className="maint-form-label">
              {formData.responsableRol === "Suministros" ? "Elementos de Dotación Solicitados" : "Hallazgo"}
            </label>
            <textarea 
              name="actividad" 
              value={formData.actividad} 
              onChange={handleChange} 
              placeholder={
                formData.responsableRol === "Suministros" 
                  ? "Describe los elementos de dotación necesarios (uniforme, zapatos, implementos de seguridad, etc.)"
                  : "Describe la Actividad aqui"
              }
              required 
              className="maint-form-textarea" 
            />
          </div>

          {/* FOTOS (sin cambios) */}
          <div className="maint-form-group">
            <label className="maint-form-label">Foto Antes (Evidencia inicial - Opcional, Máx 6):</label>
            <input 
              type="file" 
              name="fotoAntes" 
              accept="image/*,.pdf" 
              onChange={handleChange} 
              className="maint-form-input" 
              disabled={isOptimizingImage} 
              multiple 
            />
            
            {/* GRID PREVIEW FOTO ANTES */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
              {fotoAntesPreview.map((url, index) => (
                <div key={index} style={{ position: 'relative', width: '100px', height: '100px', border: '1px solid #ccc', borderRadius: '4px' }}>
                  {url.endsWith(".pdf") ? (
                     <a href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', textDecoration: 'none', color: '#333', fontSize: '12px' }}>
                       PDF
                     </a>
                  ) : (
                    <img src={url} alt={`Preview ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage('fotoAntes', index)}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      backgroundColor: '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {isOptimizingImage && formData.fotoAntes && (
              <p style={{ color: "#3b1a9a", fontSize: "0.9rem", fontStyle: "italic" }}>
                🔄 Procesando imágenes...
              </p>
            )}
          </div>
          
          <div className="maint-form-group">
            <label className="maint-form-label">Foto Después (Evidencia final - Opcional, Máx 6):</label>
            <input 
              type="file" 
              name="fotoDespues" 
              accept="image/*,.pdf" 
              onChange={handleChange} 
              className="maint-form-input" 
              disabled={isOptimizingImage} 
              multiple 
            />
            
             {/* GRID PREVIEW FOTO DESPUÉS */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
              {fotoDespuesPreview.map((url, index) => (
                <div key={index} style={{ position: 'relative', width: '100px', height: '100px', border: '1px solid #ccc', borderRadius: '4px' }}>
                  {url.endsWith(".pdf") ? (
                     <a href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', textDecoration: 'none', color: '#333', fontSize: '12px' }}>
                       PDF
                     </a>
                  ) : (
                    <img src={url} alt={`Preview ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage('fotoDespues', index)}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      backgroundColor: '#ff4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {isOptimizingImage && formData.fotoDespues && (
              <p style={{ color: "#3b1a9a", fontSize: "0.9rem", fontStyle: "italic" }}>
                🔄 Procesando imágenes...
              </p>
            )}
          </div>

          {/* CHECKBOX ENVIAR CORREO (sin cambios) */}
          <div className="maint-form-group maint-form-group-checkbox">
            <label className="maint-form-label">
              <input
                type="checkbox"
                name="enviarCorreo"
                checked={formData.enviarCorreo}
                onChange={handleChange}
                style={{ marginRight: '8px', verticalAlign: 'middle' }}
              />
              Enviar Correo de Notificación
            </label>
          </div>
  {/* CHECKBOX SANIDAD */}
          <div className="maint-form-group maint-form-group-checkbox">
            <label className="maint-form-label">
              <input
                type="checkbox"
                name="sanidad"
                checked={formData.sanidad}
                onChange={handleChange}
                style={{ marginRight: '8px', verticalAlign: 'middle' }}
              />
              ¿Es registro de Sanidad?
            </label>
          </div>

        
        </div>

        <button type="submit" className="maint-btn-submit" disabled={loading}>
          {loading ? "Asignando Tarea..." : 
           formData.responsableRol === "Suministros" ? "Enviar Solicitud de Dotación" : "Asignar Tarea"}
        </button>
      </form>
    </div>
  );
};

export default AsignarTarea;