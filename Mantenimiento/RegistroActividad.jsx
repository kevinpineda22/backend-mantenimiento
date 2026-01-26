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
  fotoAntes: null,
  fotoDespues: null,
  enviarCorreo: true, // ⭐ NUEVO: Estado para la casilla de verificación
  sanidad: false, // ⭐ NUEVO: Estado para sanidad
  observacion: "", // ⭐ NUEVO: Agregar campo de observación
};

const RegistroActividad = () => {
  const { setLoading, loading } = useOutletContext();
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [fotoAntesPreview, setFotoAntesPreview] = useState(null);
  const [fotoDespuesPreview, setFotoDespuesPreview] = useState(null);
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [userEmail, setUserEmail] = useState(""); // ⭐ NUEVO ESTADO PARA EMAIL DEL USUARIO

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
      return { setPreview: setFotoAntesPreview, fieldName: "Foto Antes" };
    }
    if (name === "fotoDespues") {
      return { setPreview: setFotoDespuesPreview, fieldName: "Foto Después" };
    }
    return { setPreview: () => {}, fieldName: "Archivo" };
  };

  const handleFileChange = async (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      const { setPreview, fieldName } = getFileStateAndSetter(name);

      if (!validateFile(files[0], fieldName)) {
        setPreview(null);
        return;
      }

      try {
        const file = files[0];
        setIsOptimizingImage(true);
        const result = await optimizeImage(file);

        const finalFile = result.file || result;
        const fileUrl = URL.createObjectURL(finalFile);

        setFormData((prev) => ({ ...prev, [name]: finalFile }));
        setPreview(fileUrl);

        if (result.originalSize && result.optimizedSize) {
          Swal.fire({
            icon: "success",
            title: "¡Imagen Optimizada!",
            text: `Tamaño reducido a ${(
              result.optimizedSize /
              1024 /
              1024
            ).toFixed(2)}MB.`,
            timer: 3000,
            timerProgressBar: true,
            confirmButtonColor: "#89DC00",
            showConfirmButton: false,
          });
        }
      } catch (error) {
        console.error("Error al optimizar la imagen:", error);
        const file = files[0];
        setFormData((prev) => ({ ...prev, [name]: file }));
        setPreview(URL.createObjectURL(file));
      } finally {
        setIsOptimizingImage(false);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "precio") {
      const numericValue = value.replace(/\D/g, "");
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
    } else if (files && files[0]) {
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
      if (!formData.fotoDespues) {
        Swal.fire({
          icon: "warning",
          title: "Falta Evidencia",
          text: "Debes adjuntar la 'Foto Después' o documento final antes de marcar la actividad como completada.",
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
    if (isCompleting && !formData.fotoDespues) {
      Swal.fire({
        icon: "warning",
        title: "Falta Evidencia",
        text: "Debes adjuntar la 'Foto Después' antes de completar.",
        confirmButtonColor: "#89DC00",
      });
      setLoading(false);
      return;
    }

    const dataToSend = {
      ...formData,
      responsable: responsableFinal,
      precio: formData.precio ? parseInt(formData.precio, 10) : null,
      designado: formData.designado, // ⭐ Incluir el campo designado
      // ⭐ USAR EMAIL REAL DEL USUARIO AUTENTICADO
      creador_email: userEmail,
      // ⭐ MAPEAR fechaFinal para que coincida con AsignarTarea
      fechaFinal: formData.fechaFinal,
      observacion: formData.observacion || "", // Agregar observación si existe
      enviarCorreo: formData.enviarCorreo, // ⭐ Incluir valor de la casilla
    };

    const formPayload = new FormData();
    Object.entries(dataToSend).forEach(([key, value]) => {
      if (
        value !== null &&
        key !== "responsableRol" &&
        key !== "responsableEmail"
      ) {
        formPayload.append(key, value);
      }
    });

    // ⭐ AGREGAR LOGS PARA DEBUG

    // Mostrar todos los datos del FormData

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
        setFotoAntesPreview(null);
        setFotoDespuesPreview(null);
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
            <label className="maint-form-label">Foto Antes:</label>
            <input
              type="file"
              name="fotoAntes"
              accept="image/*,.pdf"
              onChange={handleChange}
              className="maint-form-input"
              disabled={isOptimizingImage}
            />
            {isOptimizingImage && (
              <p
                style={{
                  color: "#3b1a9a",
                  fontSize: "0.9rem",
                  fontStyle: "italic",
                }}
              >
                🔄 Optimizando imagen a WebP...
              </p>
            )}
            {fotoAntesPreview &&
              (fotoAntesPreview.endsWith(".pdf") ? (
                <a
                  href={fotoAntesPreview}
                  target="_blank"
                  rel="noreferrer"
                  className="maint-preview-link"
                >
                  {" "}
                  Ver PDF{" "}
                </a>
              ) : (
                <img
                  src={fotoAntesPreview}
                  alt="Vista previa de foto Antes"
                  className="maint-thumbnail"
                />
              ))}
          </div>

          <div className="maint-form-group">
            <label className="maint-form-label">Foto Después:</label>
            <input
              type="file"
              name="fotoDespues"
              accept="image/*,.pdf"
              onChange={handleChange}
              className="maint-form-input"
              disabled={isOptimizingImage}
            />
            {isOptimizingImage && (
              <p
                style={{
                  color: "#3b1a9a",
                  fontSize: "0.9rem",
                  fontStyle: "italic",
                }}
              >
                🔄 Optimizando imagen a WebP...
              </p>
            )}
            {fotoDespuesPreview &&
              (fotoDespuesPreview.endsWith(".pdf") ? (
                <a
                  href={fotoDespuesPreview}
                  target="_blank"
                  rel="noreferrer"
                  className="maint-preview-link"
                >
                  {" "}
                  Ver PDF{" "}
                </a>
              ) : (
                <img
                  src={fotoDespuesPreview}
                  alt="Vista previa de foto Después"
                  className="maint-thumbnail"
                />
              ))}
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
