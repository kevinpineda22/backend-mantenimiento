import React, { useState } from "react";
import Modal from "react-modal";
import Swal from "sweetalert2";
import { XMarkIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { RESPONSABLES_CONFIG } from "../mantenimientoUtils"; // ✅ NUEVO: Importar configuración
import "./RedirigirTareaModal.css";

Modal.setAppElement(document.body);

const RedirigirTareaModal = ({ 
  isOpen, 
  onClose, 
  tarea, 
  userEmail, 
  onRedirectSuccess 
}) => {
  // ✅ NUEVO: Estados para rol y correo específico
  const [rolSeleccionado, setRolSeleccionado] = useState("");
  const [nuevoResponsable, setNuevoResponsable] = useState("");
  const [motivoRedireccion, setMotivoRedireccion] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ NUEVO: Obtener los miembros del rol seleccionado
  const getMiembrosDelRol = () => {
    if (!rolSeleccionado || !RESPONSABLES_CONFIG[rolSeleccionado]) {
      return [];
    }
    return RESPONSABLES_CONFIG[rolSeleccionado].members || [];
  };

  // ✅ MODIFICADO: Handler para cambio de rol
  const handleRolChange = (e) => {
    const nuevoRol = e.target.value;
    setRolSeleccionado(nuevoRol);
    setNuevoResponsable(""); // Resetear correo al cambiar rol

    // Si es un grupo que notifica a todos (como SST), autocompletar el primer correo
    if (nuevoRol && RESPONSABLES_CONFIG[nuevoRol]?.notifyAll) {
      const miembros = RESPONSABLES_CONFIG[nuevoRol].members;
      if (miembros && miembros.length > 0) {
        setNuevoResponsable(miembros[0].email);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!rolSeleccionado || !nuevoResponsable || !motivoRedireccion.trim()) {
      Swal.fire({
        icon: "error",
        title: "Campos incompletos",
        text: "Por favor, selecciona el rol, el responsable y escribe el motivo de la redirección.",
        confirmButtonColor: "#89DC00",
      });
      return;
    }

    // Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(nuevoResponsable)) {
      Swal.fire({
        icon: "error",
        title: "Email inválido",
        text: "Por favor, selecciona un correo electrónico válido.",
        confirmButtonColor: "#89DC00",
      });
      return;
    }

    // ✅ NUEVO: Obtener el nombre del responsable seleccionado
    const miembros = getMiembrosDelRol();
    const responsableSeleccionado = miembros.find(m => m.email === nuevoResponsable);
    const nombreResponsable = responsableSeleccionado?.name || nuevoResponsable;

    // Confirmación antes de redirigir
    const result = await Swal.fire({
      title: "¿Confirmar Redirección?",
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>📋 Tarea:</strong> ${tarea.actividad.substring(0, 100)}...</p>
          <p><strong>📍 Sede:</strong> ${tarea.sede}</p>
          <hr style="margin: 15px 0;">
          <p><strong>👤 De:</strong> ${userEmail}</p>
          <p><strong>🎯 Rol destino:</strong> ${rolSeleccionado}</p>
          <p><strong>👤 Para:</strong> ${nombreResponsable}</p>
          <p style="font-size: 0.9em; color: #666;">(${nuevoResponsable})</p>
          <hr style="margin: 15px 0;">
          <p><strong>💬 Motivo:</strong></p>
          <p style="background: #f0f0f0; padding: 10px; border-radius: 5px;">${motivoRedireccion}</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "✅ Sí, Redirigir",
      cancelButtonText: "❌ Cancelar",
      confirmButtonColor: "#89DC00",
      cancelButtonColor: "#d33",
    });

    if (!result.isConfirmed) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://backend-mantenimiento.vercel.app/api/actividades/redirigir/${tarea.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            responsable_anterior: userEmail,
            nuevo_responsable: nuevoResponsable,
            motivo_redireccion: motivoRedireccion.trim(),
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al redirigir la tarea");

      Swal.fire({
        icon: "success",
        title: "¡Tarea Redirigida!",
        html: `
          <p>La tarea ha sido redirigida exitosamente a:</p>
          <p style="font-size: 18px; font-weight: bold; color: #89DC00;">${nombreResponsable}</p>
          <p style="font-size: 14px; color: #666;">${nuevoResponsable}</p>
          <p style="margin-top: 15px; color: #666;">Se ha enviado una notificación por correo al nuevo responsable.</p>
        `,
        confirmButtonColor: "#89DC00",
      });

      // Limpiar formulario
      setRolSeleccionado("");
      setNuevoResponsable("");
      setMotivoRedireccion("");
      
      // Cerrar modal
      onClose();
      
      // Refrescar la lista de tareas
      if (onRedirectSuccess) {
        onRedirectSuccess();
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message,
        confirmButtonColor: "#89DC00",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setRolSeleccionado("");
    setNuevoResponsable("");
    setMotivoRedireccion("");
    onClose();
  };

  // ✅ NUEVO: Obtener los roles disponibles
  const rolesDisponibles = Object.keys(RESPONSABLES_CONFIG);
  const miembrosDelRol = getMiembrosDelRol();
  const configRol = rolSeleccionado ? RESPONSABLES_CONFIG[rolSeleccionado] : null;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={handleClose}
      contentLabel="Redirigir Tarea"
      className="redir-modal-content"
      overlayClassName="redir-modal-overlay"
      ariaHideApp={false}
    >
      <button 
        className="redir-modal-close-btn" 
        onClick={handleClose}
        disabled={loading}
      >
        <XMarkIcon width={32} height={32} />
      </button>

      <div className="redir-modal-header">
        <ArrowPathIcon className="redir-header-icon" />
        <h2 className="redir-modal-title">Redirigir Tarea</h2>
      </div>

      {tarea && (
        <div className="redir-tarea-info">
          <h3 className="redir-info-title">📋 Información de la Tarea</h3>
          <div className="redir-info-grid">
            <div className="redir-info-item">
              <span className="redir-info-label">Sede:</span>
              <span className="redir-info-value">{tarea.sede}</span>
            </div>
            <div className="redir-info-item">
              <span className="redir-info-label">Estado:</span>
              <span className="redir-info-value">{tarea.estado}</span>
            </div>
            <div className="redir-info-item redir-full-width">
              <span className="redir-info-label">Actividad:</span>
              <span className="redir-info-value">{tarea.actividad}</span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="redir-form">
        {/* ✅ NUEVO: Selector de Rol */}
        <div className="redir-form-group">
          <label htmlFor="rolResponsable" className="redir-form-label">
            🎯 Seleccionar Rol del Nuevo Responsable
          </label>
          <select
            id="rolResponsable"
            value={rolSeleccionado}
            onChange={handleRolChange}
            className="redir-form-select"
            required
            disabled={loading}
          >
            <option value="">-- Selecciona un rol --</option>
            {rolesDisponibles.map((rol) => (
              <option key={rol} value={rol}>
                {rol}
              </option>
            ))}
          </select>
          <small className="redir-form-hint">
            💡 Primero selecciona el área o rol responsable de esta tarea
          </small>
        </div>

        {/* ✅ MODIFICADO: Selector de Correo Específico (solo si hay rol seleccionado) */}
        {rolSeleccionado && (
          <div className="redir-form-group">
            <label htmlFor="nuevoResponsable" className="redir-form-label">
              👤 Responsable Específico
            </label>
            
            {configRol?.notifyAll ? (
              // ✅ Caso especial: Si es un rol que notifica a todos (como SST)
              <div className="redir-notify-all-info">
                <div className="redir-notify-badge">
                  📢 Este rol notifica a <strong>TODOS</strong> los miembros simultáneamente
                </div>
                <select
                  id="nuevoResponsable"
                  value={nuevoResponsable}
                  onChange={(e) => setNuevoResponsable(e.target.value)}
                  className="redir-form-select"
                  required
                  disabled={loading}
                >
                  {miembrosDelRol.map((miembro) => (
                    <option key={miembro.email} value={miembro.email}>
                      {miembro.name} - {miembro.email}
                    </option>
                  ))}
                </select>
                <small className="redir-form-hint">
                  ℹ️ Aunque selecciones uno, <strong>todos los miembros de {rolSeleccionado}</strong> recibirán la notificación
                </small>
              </div>
            ) : miembrosDelRol.length === 1 ? (
              // ✅ Caso: Solo hay un miembro (autocompletar y mostrar info)
              <div className="redir-single-member">
                <input
                  type="text"
                  value={`${miembrosDelRol[0].name} (${miembrosDelRol[0].email})`}
                  className="redir-form-input"
                  disabled
                />
                <input
                  type="hidden"
                  value={miembrosDelRol[0].email}
                  onChange={(e) => setNuevoResponsable(e.target.value)}
                />
                <small className="redir-form-hint">
                  ✅ Único responsable disponible para este rol
                </small>
              </div>
            ) : (
              // ✅ Caso normal: Selector de correos
              <>
                <select
                  id="nuevoResponsable"
                  value={nuevoResponsable}
                  onChange={(e) => setNuevoResponsable(e.target.value)}
                  className="redir-form-select"
                  required
                  disabled={loading}
                >
                  <option value="">-- Selecciona un responsable --</option>
                  {miembrosDelRol.map((miembro) => (
                    <option key={miembro.email} value={miembro.email}>
                      {miembro.name} - {miembro.email}
                    </option>
                  ))}
                </select>
                <small className="redir-form-hint">
                  💡 Selecciona el responsable específico del rol <strong>{rolSeleccionado}</strong>
                </small>
              </>
            )}
          </div>
        )}

        <div className="redir-form-group">
          <label htmlFor="motivoRedireccion" className="redir-form-label">
            💬 Motivo de la Redirección
          </label>
          <textarea
            id="motivoRedireccion"
            value={motivoRedireccion}
            onChange={(e) => setMotivoRedireccion(e.target.value)}
            placeholder="Ej: Esta tarea corresponde a otra área, no es de mi competencia."
            className="redir-form-textarea"
            rows={4}
            required
            disabled={loading}
          />
          <small className="redir-form-hint">
            ⚠️ Este motivo será visible en el historial de la tarea y se enviará al nuevo responsable
          </small>
        </div>

        <div className="redir-modal-buttons">
          <button
            type="submit"
            className="redir-submit-button"
            disabled={loading || !rolSeleccionado || !nuevoResponsable}
          >
            {loading ? (
              <>
                <div className="redir-spinner"></div>
                Redirigiendo...
              </>
            ) : (
              <>
                <ArrowPathIcon className="redir-btn-icon" />
                Redirigir Tarea
              </>
            )}
          </button>
          <button
            type="button"
            className="redir-cancel-button"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </button>
        </div>
      </form>

      <div className="redir-warning-box">
        <p className="redir-warning-text">
          ⚠️ <strong>Importante:</strong> Al redirigir esta tarea, dejarás de ser el responsable. 
          El nuevo responsable recibirá una notificación por correo con todos los detalles.
        </p>
      </div>
    </Modal>
  );
};

export default RedirigirTareaModal;
