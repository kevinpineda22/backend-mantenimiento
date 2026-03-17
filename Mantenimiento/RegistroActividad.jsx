import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import Swal from "sweetalert2";
import {
  RESPONSABLES_CONFIG,
  formatNumberWithDots,
  sedes,
  optimizeImage,
  validateFile,
  formatDateForInput,
} from "./mantenimientoUtils";
import "./RegistroComun.css";

const INITIAL_FORM_DATA = {
  sede: "",
  actividad: "",
  fechaInicio: "",
  fechaFinal: "",
  precio: "",
  estado: "pendiente",
  responsableRol: "",
  responsableEmail: "",
  designado: "",
  fotoAntes: [], // ⭐ CAMBIO: Array vacío
  fotoDespues: [], // ⭐ CAMBIO: Array vacío
  enviarCorreo: true, 
  sanidad: false, 
  observacion: "", 
};

const RegistroActividad = () => {
  const { setLoading, loading } = useOutletContext();
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [fotoAntesPreview, setFotoAntesPreview] = useState([]); // ⭐ CAMBIO: Array previews
  const [fotoDespuesPreview, setFotoDespuesPreview] = useState([]); // ⭐ CAMBIO: Array previews
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const apiBaseUrl = "https://backend-mantenimiento.vercel.app/api";

  // ⭐ OBTENER EMAIL DEL USUARIO AUTENTICADO
  useEffect(() => {
    const getUserEmail = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        }
      } catch (error) {
        console.error("Error obteniendo usuario:", error);
        setUserEmail("sistema@merka.com.co"); // Fallback
      }
    };

    getUserEmail();
  }, []);

  // Helper para determinar qué estado y setter usar para las fotos
  const getFileStateAndSetter = (name) => {
    if (name === "fotoAntes") {
      return { setPreview: setFotoAntesPreview, preview: fotoAntesPreview, fieldName: "Fotos Antes" };
    }
    if (name === "fotoDespues") {
      return { setPreview: setFotoDespuesPreview, preview: fotoDespuesPreview, fieldName: "Fotos Después" };
    }
  };

  const handleFileChange = async (e) => {
    const { name, files } = e.target;
    if (files && files.length > 0) {
      const { setPreview, preview, fieldName } = getFileStateAndSetter(name);
      const currentFiles = formData[name] || []; // asegurar array
      const filesArray = Array.from(files);

      if (currentFiles.length + filesArray.length > 6) {
        Swal.fire({
          icon: "error",
          title: "Límite Excedido",
          text: "Solo puedes subir un mÃ¡ximo de 6 imágenes por campo.",
          confirmButtonColor: "#89DC00",
        });
        return;
      }

      setIsOptimizingImage(true);
      const newFiles = [];
      const newPreviews = [];

      for (const file of filesArray) {
        if (!validateFile(file, fieldName)) continue;

        try {
          // Optimizar cada imagen
          const result = await optimizeImage(file);
          const finalFile = result.file || result; // manejar si retorna objeto o archivo
          
          newFiles.push(finalFile);
          newPreviews.push(URL.createObjectURL(finalFile));
        } catch (error) {
          console.error(`Error al optimizar la imagen ${name}:`, error);
          // Fallback al original si falla optimización
          newFiles.push(file);
          newPreviews.push(URL.createObjectURL(file));
        }
      }
      
      if (newFiles.length > 0) {
        // Actualizar estado agregando nuevas imágenes
        setFormData((prev) => ({ 
          ...prev, 
          [name]: [...(prev[name] || []), ...newFiles] 
        }));
        
        // Actualizar previews
        setPreview((prev) => [...(prev || []), ...newPreviews]);
        
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

  // FunciÃ³n para eliminar imagen individual de la selección
  const handleRemoveImage = (name, index) => {
    const { setPreview, preview } = getFileStateAndSetter(name);
    // Obtener array actual de archivos del estado
    const currentFiles = formData[name];

    // Filtrar fuera el índice eliminado
    const newFiles = currentFiles.filter((_, i) => i !== index);
    const newPreviews = preview.filter((_, i) => i !== index);

    // Actualizar estado
    setFormData((prev) => ({ ...prev, [name]: newFiles }));
    setPreview(newPreviews);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "precio") {
      const numericValue = value.replace(/\D/g, "");
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
    } else if (files && files.length > 0) {
      handleFileChange(e);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // ⭐ LÓGICA CORREGIDA: Igual que AsignarTarea.jsx
  const handleRolChange = (e) => {
    const rol = e.target.value;
    const config = RESPONSABLES_CONFIG[rol];

    setFormData((prev) => ({
      ...prev,
      responsableRol: rol,
      // ⭐ LÓGICA MEJORADA: Para grupos con notifyAll, seleccionar todos los emails
      responsableEmail: config?.notifyAll
        ? config.members.map((m) => m.email).join(";") // 🔑 Múltiples emails separados por ;
        : config?.isGroup
        ? ""
        : config?.members[0]?.email || "",
    }));
  };

  // ⭐ NUEVA FUNCIÓN: Controla la validación y confirmación del estado final
  const handleEstadoChange = (e) => {
    const nuevoEstado = e.target.value;

    if (nuevoEstado === "completado" || nuevoEstado === "no_completado") {
      if (!formData.fotoDespues || formData.fotoDespues.length === 0) {
        Swal.fire({
          icon: "warning",
          title: "Falta Evidencia",
          text: "Debes adjuntar al menos una 'Foto Después' o documento final antes de marcar la actividad como completada.",
          confirmButtonColor: "#89DC00",
        });
        // Si falta la foto, no actualizamos el estado en el formulario.
        return;
      }

      Swal.fire({
        title: "¿Finalizar Actividad?",
        text: `¿Estás seguro de que la actividad está ${nuevoEstado.toUpperCase()}? Se notificará al que asignó la actividad.`,
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#89DC00",
        cancelButtonColor: "#d33",
        confirmButtonText: "Sí, finalizar y notificar",
        cancelButtonText: "Cancelar",
      }).then((result) => {
        if (result.isConfirmed) {
          // Si confirma, actualiza el estado y permite el envío con el flag
          setFormData((prev) => ({
            ...prev,
            estado: nuevoEstado,
          }));
        } else {
          // Si cancela, vuelve al estado anterior
          setFormData((prev) => ({ ...prev, estado: prev.estado }));
        }
      });
    } else {
      // Para estados normales (pendiente, en_curso), actualiza directamente
      setFormData((prev) => ({ ...prev, estado: nuevoEstado }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const responsableFinal = formData.responsableEmail;

    if (!responsableFinal) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Debes seleccionar un responsable.",
        confirmButtonColor: "#89DC00",
      });
      setLoading(false);
      return;
    }

    // ⭐ VALIDACIÓN ADICIONAL: VERIFICAR QUE TENGAMOS EMAIL DEL CREADOR
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

    // ⭐ Es una validación redundante, pero de seguridad:
    const isCompleting =
      formData.estado === "completado" || formData.estado === "no_completado";
    if (isCompleting && (!formData.fotoDespues || formData.fotoDespues.length === 0)) {
      Swal.fire({
        icon: "warning",
        title: "Falta Evidencia",
        text: "Debes adjuntar al menos una 'Foto Después' antes de completar.",
        confirmButtonColor: "#89DC00",
      });
      setLoading(false);
      return;
    }

    const formPayload = new FormData();
    
    // Añadir campos de texto
    formPayload.append("sede", formData.sede);
    formPayload.append("actividad", formData.actividad);
    formPayload.append("fechaInicio", formData.fechaInicio);
    if(formData.fechaFinal) formPayload.append("fechaFinal", formData.fechaFinal);
    if(formData.precio) formPayload.append("precio", formData.precio);
    formPayload.append("estado", formData.estado);
    formPayload.append("responsable", responsableFinal);
    if(formData.designado) formPayload.append("designado", formData.designado);
    formPayload.append("creador_email", userEmail);
    if(formData.observacion) formPayload.append("observacion", formData.observacion);
    formPayload.append("enviarCorreo", formData.enviarCorreo);
    formPayload.append("sanidad", formData.sanidad);

    // Añadir archivos (pueden ser múltiples)
    if (formData.fotoAntes && formData.fotoAntes.length > 0) {
      formData.fotoAntes.forEach((file) => {
        formPayload.append("fotoAntes", file);
      });
    }

    if (formData.fotoDespues && formData.fotoDespues.length > 0) {
      formData.fotoDespues.forEach((file) => {
        formPayload.append("fotoDespues", file);
      });
    }

    try {
      // ⭐ USAR EL ENDPOINT DE ASIGNAR TAREA
      const response = await fetch(`${apiBaseUrl}/tareas/asignar`, {
        method: "POST",
        body: formPayload,
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al registrar la actividad");

      Swal.fire({
        icon: "success",
        title: "¡Registro Exitoso!",
        text: formData.enviarCorreo
          ? `Actividad registrada y responsable notificado por correo.`
          : `Actividad registrada. No se ha enviado notificación por correo.`,
        confirmButtonText: "Aceptar",
        confirmButtonColor: "#89DC00",
      }).then(() => {
        setFormData(INITIAL_FORM_DATA);
        setFotoAntesPreview([]);
        setFotoDespuesPreview([]);
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message,
        confirmButtonText: "Aceptar",
        confirmButtonColor: "#89DC00",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="maint-page-container">
      <h2 className="maint-section-title">
        Registro de Actividad y Fotográfico
      </h2>

      {/* ⭐ MOSTRAR EMAIL DEL USUARIO ACTUAL (OPCIONAL, PARA DEBUG) */}
      {userEmail && (
        <div
          style={{
            marginBottom: "15px",
            padding: "10px",
            backgroundColor: "#f8f9fa",
            borderRadius: "5px",
            fontSize: "0.9em",
            color: "#6c757d",
          }}
        >
          📧 Asignando como: <strong>{userEmail}</strong>
        </div>
      )}

      <form onSubmit={handleSubmit} className="maint-form-card">
        <div className="maint-form-grid">
          <div className="maint-form-group">
            <label htmlFor="fechaInicio" className="maint-form-label">
              Fecha de Inicio
            </label>
            <input
              type="date"
              name="fechaInicio"
              value={formData.fechaInicio}
              onChange={handleChange}
              required
              className="maint-form-input"
            />
          </div>

          <div className="maint-form-group">
            <label htmlFor="fechaFinal" className="maint-form-label">
              Fecha Final
            </label>
            <input
              type="date"
              name="fechaFinal"
              value={formData.fechaFinal}
              onChange={handleChange}
              className="maint-form-input"
            />
          </div>

          <div className="maint-form-group">
            <label htmlFor="sede" className="maint-form-label">
              Sede
            </label>
            <select
              name="sede"
              value={formData.sede}
              onChange={handleChange}
              required
              className="maint-form-select"
            >
              <option value="" disabled>
                Selecciona una sede
              </option>
              {sedes.map((s, idx) => (
                <option key={idx} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="maint-form-group">
            <label htmlFor="precio" className="maint-form-label">
              Precio (opcional)
            </label>
            <input
              type="text"
              name="precio"
              value={formatNumberWithDots(formData.precio)}
              onChange={handleChange}
              autoComplete="off"
              className="maint-form-input"
            />
          </div>

          {/* ⭐ USO DE handleEstadoChange */}
          <div className="maint-form-group">
            <label htmlFor="estado" className="maint-form-label">
              Estado
            </label>
            <select
              name="estado"
              value={formData.estado}
              onChange={handleEstadoChange}
              required
              className="maint-form-select"
            >
              <option value="pendiente">Pendiente</option>
              <option value="en_curso">En Curso</option>
              <option value="completado">Completado</option>
              <option value="no_completado">No Completado</option>
            </select>
          </div>

          {/* Selector de Responsable (Rol y Email) */}
          <div className="maint-form-group">
            <label htmlFor="responsableRol" className="maint-form-label">
              Responsable (Rol)
            </label>
            <select
              name="responsableRol"
              value={formData.responsableRol}
              onChange={handleRolChange}
              required
              className="maint-form-select"
            >
              <option value="" disabled>
                Selecciona el Rol
              </option>
              {Object.keys(RESPONSABLES_CONFIG).map((rol) => (
                <option key={rol} value={rol}>
                  {rol}
                </option>
              ))}
            </select>
          </div>

          {/* Campo de Correo Específico - ACTUALIZADO */}
          {formData.responsableRol && (
            <div
              className={`maint-form-group ${
                RESPONSABLES_CONFIG[formData.responsableRol].isGroup
                  ? "maint-form-group-full-width"
                  : ""
              }`}
            >
              <label htmlFor="responsableEmail" className="maint-form-label">
                {RESPONSABLES_CONFIG[formData.responsableRol].notifyAll
                  ? "Grupo Completo (Todos serán notificados)"
                  : RESPONSABLES_CONFIG[formData.responsableRol].isGroup
                  ? "Responsable Específico (Correo)"
                  : "Correo de Responsable"}
              </label>

              {RESPONSABLES_CONFIG[formData.responsableRol].notifyAll ? (
                // ⭐ VISTA ESPECIAL: Mostrar todos los miembros que serán notificados
                <div className="maint-form-group-notify-all">
                  <div
                    style={{
                      padding: "10px",
                      backgroundColor: "#E3F2FD",
                      borderRadius: "6px",
                      border: "1px solid #1976D2",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        fontWeight: "600",
                        color: "#1976D2",
                      }}
                    >
                      📧 Se notificará a todo el equipo:
                    </p>
                    {RESPONSABLES_CONFIG[formData.responsableRol].members.map(
                      (member, idx) => (
                        <div
                          key={member.email}
                          style={{
                            fontSize: "0.9em",
                            margin: "4px 0",
                            padding: "4px 8px",
                            backgroundColor: "white",
                            borderRadius: "4px",
                          }}
                        >
                          • {member.name} ({member.email})
                        </div>
                      )
                    )}
                    <p
                      style={{
                        margin: "8px 0 0 0",
                        fontSize: "0.8em",
                        color: "#666",
                        fontStyle: "italic",
                      }}
                    >
                      💡 Cualquier miembro del equipo puede ejecutar esta tarea
                    </p>
                  </div>
                  <input
                    type="hidden"
                    name="responsableEmail"
                    value={formData.responsableEmail}
                  />
                </div>
              ) : (
                // ⭐ VISTA NORMAL: Selector individual
                <select
                  name="responsableEmail"
                  value={formData.responsableEmail}
                  onChange={handleChange}
                  required={
                    RESPONSABLES_CONFIG[formData.responsableRol].isGroup
                  }
                  disabled={
                    !RESPONSABLES_CONFIG[formData.responsableRol].isGroup
                  }
                  className="maint-form-select"
                >
                  {RESPONSABLES_CONFIG[formData.responsableRol].isGroup && (
                    <option value="" disabled>
                      Selecciona el correo
                    </option>
                  )}
                  {RESPONSABLES_CONFIG[formData.responsableRol].members.map(
                    (member) => (
                      <option key={member.email} value={member.email}>
                        {member.name} ({member.email})
                      </option>
                    )
                  )}
                </select>
              )}

              {!RESPONSABLES_CONFIG[formData.responsableRol].isGroup &&
                formData.responsableEmail && (
                  <p
                    className="maint-form-input-info"
                    style={{ marginTop: "4px", fontSize: "0.9em" }}
                  >
                    {formData.responsableEmail}
                  </p>
                )}
            </div>
          )}

          <div className="maint-form-group">
            <label htmlFor="designado" className="maint-form-label">
              Designado
            </label>
            <input
              type="text"
              name="designado"
              value={formData.designado}
              onChange={handleChange}
              className="maint-form-input"
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div className="maint-form-group maint-form-group-full-width">
            <label htmlFor="actividad" className="maint-form-label">
              Hallazgo
            </label>
            <textarea
              name="actividad"
              value={formData.actividad}
              onChange={handleChange}
              placeholder="Describe la actividad aquí"
              required
              className="maint-form-textarea"
            />
          </div>

          {/* Fotos */}
          <div className="maint-form-group">
            <label className="maint-form-label">Foto Antes (Máx 6):</label>
            <input
              type="file"
              name="fotoAntes"
              accept="image/*,.pdf"
              onChange={handleChange}
              className="maint-form-input"
              disabled={isOptimizingImage}
              multiple // ⭐ PERMITIR MÚLTIPLES ARCHIVOS
            />
            {/* GRID PREVIEW FOTO ANTES */}
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
              {fotoAntesPreview && fotoAntesPreview.map((url, index) => (
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

            {isOptimizingImage && (
              <p
                style={{
                  color: "#3b1a9a",
                  fontSize: "0.9rem",
                  fontStyle: "italic",
                }}
              >
                🔄 Procesando imágenes...
              </p>
            )}
          </div>

          <div className="maint-form-group">
            <label className="maint-form-label">Foto Después (Máx 6):</label>
            <input
              type="file"
              name="fotoDespues"
              accept="image/*,.pdf"
              onChange={handleChange}
              className="maint-form-input"
              disabled={isOptimizingImage}
              multiple // ⭐ PERMITIR MÚLTIPLES ARCHIVOS
            />
             {/* GRID PREVIEW FOTO DESPUÉS */}
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
              {fotoDespuesPreview && fotoDespuesPreview.map((url, index) => (
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
            
            {isOptimizingImage && (
              <p
                style={{
                  color: "#3b1a9a",
                  fontSize: "0.9rem",
                  fontStyle: "italic",
                }}
              >
                🔄 Procesando imágenes...
              </p>
            )}
          </div>

          {/* ⭐ NUEVA CASILLA DE VERIFICACIÓN */}
          <div className="maint-form-group maint-form-group-checkbox">
            <label className="maint-form-label">
              <input
                type="checkbox"
                name="enviarCorreo"
                checked={formData.enviarCorreo}
                onChange={(e) =>
                  setFormData({ ...formData, enviarCorreo: e.target.checked })
                }
                style={{ marginRight: "8px", verticalAlign: "middle" }}
              />
              Enviar Correo de Notificación
            </label>
          </div>

          {/* ⭐ NUEVA CASILLA DE VERIFICACIÓN SANIDAD */}
          <div className="maint-form-group maint-form-group-checkbox">
            <label className="maint-form-label">
              <input
                type="checkbox"
                name="sanidad"
                checked={formData.sanidad}
                onChange={(e) =>
                  setFormData({ ...formData, sanidad: e.target.checked })
                }
                style={{ marginRight: "8px", verticalAlign: "middle" }}
              />
              ¿Es registro de Sanidad?
            </label>
          </div>
          {/* --------------------------------------------------- */}
        </div>{" "}
        {/* ⭐ CERRAR EL DIV DEL .maint-form-grid */}
        <button type="submit" className="maint-btn-submit" disabled={loading}>
          {loading ? "Registrando..." : "Registrar Actividad"}
        </button>
      </form>
    </div>
  );
};

export default RegistroActividad;
