import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import Swal from "sweetalert2";
import DataTable from "react-data-table-component";
import Modal from "react-modal";
import { XMarkIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { FaTimes, FaCommentDots } from "react-icons/fa";
import {
  formatNumberWithDots,
  sedes,
  optimizeImage,
  validateFile,
  formatDateForInput,
} from "./mantenimientoUtils";
import "./RegistroComun.css";
import "./HistorialActividadesPage.css";
import EmployeeModal from "./EmployeeModal"; // Import the new component
import FilterPanelMantenimiento from "./FilterPanelMantenimiento/FilterPanelMantenimiento";

const TareasRecibidas = () => {
  const { setLoading, loading } = useOutletContext();
  const [historial, setHistorial] = useState([]);
  const [error, setError] = useState(null);

  // Estados para filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    fecha: "",
    sede: "",
    estado: "",
    responsable: "", // ✅ NUEVO
    asignadoPor: "", // ✅ NUEVO
    sortBy: "fecha",
    sortOrder: "desc",
  });
  const [editData, setEditData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFotoAntesPreview, setEditFotoAntesPreview] = useState(null);
  const [editFotoDespuesPreview, setEditFotoDespuesPreview] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState("");
  const [isOptimizingImage, setIsOptimizingImage] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Estados para seguimiento
  const [newFotoDespuesUploaded, setNewFotoDespuesUploaded] = useState(false);
  const [isSeguimientoOpen, setIsSeguimientoOpen] = useState(false);
  const [seguimientoText, setSeguimientoText] = useState("");
  const [selectedRowForSeguimiento, setSelectedRowForSeguimiento] =
    useState(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false); // State for the employee modal
  const [selectedEmployee, setSelectedEmployee] = useState(null); // State to store employee data
  const [selectedDotacion, setSelectedDotacion] = useState(null);

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
        setUserEmail("sistema@merka.com.co");
      }
    };

    getUserEmail();
  }, []);

  // ⭐ FUNCIÓN CORREGIDA: Buscar correctamente las tareas grupales
  const fetchTareasRecibidas = async () => {
    if (!userEmail) {
      setError(
        "Error: No se encontró el correo del usuario para filtrar las tareas."
      );
      return;
    }

    setLoading(true);
    try {
      // ⭐ PASO 1: Obtener tareas donde soy responsable directo
      const response = await fetch(
        `${apiBaseUrl}/historial-por-responsable?responsableEmail=${userEmail}`
      );
      const data = await response.json();

      if (!response.ok)
        throw new Error(data.error || "Error al obtener las tareas asignadas");

      let todasLasTareas = data || [];

      // ⭐ PASO 2: Obtener TODAS las tareas para buscar las grupales
      const responseCompleto = await fetch(`${apiBaseUrl}/historial-completo`);
      const dataCompleto = await responseCompleto.json();

      if (responseCompleto.ok && Array.isArray(dataCompleto)) {
        // ⭐ LÓGICA CORREGIDA: Buscar tareas grupales
        const tareasGrupales = dataCompleto.filter((tarea) => {
          // Verificar si tiene campo responsables_grupo
          if (!tarea.responsables_grupo) {
            return false;
          }

          // Verificar si mi email está incluido en el campo responsables_grupo
          const esGrupal = tarea.responsables_grupo.includes(userEmail);

          // Verificar que no esté ya en las tareas directas
          const yaExiste = todasLasTareas.some(
            (existing) => existing.id === tarea.id
          );

          const incluir = esGrupal && !yaExiste;

          return incluir;
        });

        if (tareasGrupales.length > 0) {
        }

        // Combinar ambas listas
        todasLasTareas = [...todasLasTareas, ...tareasGrupales];
      } else {
        console.warn(
          "❌ No se pudieron cargar todas las tareas para búsqueda grupal"
        );
      }

      setHistorial(todasLasTareas);
    } catch (err) {
      console.error("❌ Error en fetchTareasRecibidas:", err);
      setError(err.message);
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

  useEffect(() => {
    if (userEmail) {
      fetchTareasRecibidas();
    }
  }, [userEmail]);

  // --- Funciones de visualización y datos ---
  const openImageViewer = (url) => {
    setCurrentImageUrl(url);
    setIsViewerOpen(true);
  };

  const closeImageViewer = () => {
    setIsViewerOpen(false);
    setCurrentImageUrl("");
  };

  // --- Lógica de Edición: Manejo de cambios
  const handleEditChange = async (e) => {
    const { name, value, files } = e.target;
    if (name === "precio") {
      const numericValue = value.replace(/\D/g, "");
      setEditData((prev) => ({ ...prev, [name]: numericValue }));
    } else if (files && files[0]) {
      const fieldName = name === "fotoAntes" ? "Foto Antes" : "Foto Después";

      if (name === "fotoDespues") {
        setNewFotoDespuesUploaded(true);
      }

      if (!validateFile(files[0], fieldName)) {
        if (name === "fotoAntes") setEditFotoAntesPreview(null);
        if (name === "fotoDespues") setEditFotoDespuesPreview(null);
        return;
      }

      try {
        const file = files[0];
        setIsOptimizingImage(true);

        const result = await optimizeImage(file);

        if (result === file) {
          setEditData((prev) => ({ ...prev, [name]: file }));
          const fileUrl = URL.createObjectURL(file);
          if (name === "fotoAntes") setEditFotoAntesPreview(fileUrl);
          if (name === "fotoDespues") setEditFotoDespuesPreview(fileUrl);
        } else {
          // Mostrar información de optimización (se mantiene para la consola/UX)
          const originalSize = (result.originalSize / 1024 / 1024).toFixed(2);
          const optimizedSize = (result.optimizedSize / 1024 / 1024).toFixed(2);
          const reduction = (
            ((result.originalSize - result.optimizedSize) /
              result.originalSize) *
            100
          ).toFixed(1);

          Swal.fire({
            icon: "success",
            title: "¡Imagen Optimizada!",
            html: `
              <p><strong>${fieldName}</strong> ha sido optimizada exitosamente:</p>
              <ul style="text-align: left; list-style: none; padding: 0;">
                <li>📦 Tamaño: ${originalSize}MB → ${optimizedSize}MB</li>
                <li>📉 Reducción: ${reduction}%</li>
                <li>🖼️ Formato: WebP</li>
              </ul>
            `,
            timer: 3000,
            timerProgressBar: true,
            confirmButtonColor: "#89DC00",
            showConfirmButton: false,
          });

          setEditData((prev) => ({ ...prev, [name]: result.file }));
          const fileUrl = URL.createObjectURL(result.file);
          if (name === "fotoAntes") setEditFotoAntesPreview(fileUrl);
          if (name === "fotoDespues") setEditFotoDespuesPreview(fileUrl);
        }
      } catch (error) {
        console.error("Error al optimizar la imagen:", error);
        const file = files[0];
        setEditData((prev) => ({ ...prev, [name]: file }));
        const fileUrl = URL.createObjectURL(file);
        if (name === "fotoAntes") setEditFotoAntesPreview(fileUrl);
        if (name === "fotoDespues") setEditFotoDespuesPreview(fileUrl);
      } finally {
        setIsOptimizingImage(false);
      }
    } else {
      setEditData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // --- Lógica de Edición: Clic en editar
  const handleEditClick = (row) => {
    setEditData({
      ...row,
      designado: row.designado || "",
      responsable: row.responsable || "",
      nombre_solicitante: row.nombre_solicitante || "", // ✅ NUEVO: Cargar nombre_solicitante
      fechaInicio: formatDateForInput(row.fecha_inicio),
      fechaFinal: formatDateForInput(row.fecha_final),
      fotoAntes: null,
      fotoDespues: null,
    });
    setEditFotoAntesPreview(row.foto_antes_url || null);
    setEditFotoDespuesPreview(row.foto_despues_url || null);
    setIsEditing(true);
    setNewFotoDespuesUploaded(false);
  };

  // --- Lógica de Edición: Enviar edición (ACTUALIZADO para incluir nombre_solicitante)
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    const shouldTriggerCompletion =
      newFotoDespuesUploaded &&
      editData.estado !== "completado" &&
      editData.estado !== "no_completado";

    if (shouldTriggerCompletion) {
      const result = await Swal.fire({
        title: "¿Finalizar Tarea?",
        text: "Ha subido la 'Foto Después'. ¿Desea marcar esta tarea como COMPLETADA y notificar al creador?",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, Completar y Notificar",
        cancelButtonColor: "#3085d6",
        confirmButtonColor: "#89DC00",
      });

      if (result.isConfirmed) {
        editData.estado = "completado";
        editData.notificarFinalizacion = "true";
      } else {
        editData.notificarFinalizacion = "false";
      }
    } else {
      editData.notificarFinalizacion = "false";
    }

    if (
      !editData.sede ||
      !editData.actividad ||
      !editData.fechaInicio ||
      !editData.estado ||
      !editData.responsable
    ) {
      Swal.fire({
        icon: "error",
        title: "Campos incompletos",
        text: "Por favor, completa todos los campos obligatorios: Sede, Actividad, Fecha de Inicio, Estado y Responsable.",
        confirmButtonText: "Aceptar",
        confirmButtonColor: "#89DC00",
      });
      setLoading(false);
      return;
    }

    setLoading(true);

    const dataToSend = {
      sede: editData.sede,
      actividad: editData.actividad,
      estado: editData.estado,
      precio: editData.precio ? parseInt(editData.precio, 10) : null,
      responsable: editData.responsable,
      fechaInicio: editData.fechaInicio,
      fechaFinal: editData.fechaFinal,
      designado: editData.designado || "",
      nombre_solicitante: editData.nombre_solicitante || "", // ✅ NUEVO: Incluir nombre_solicitante
      notificarFinalizacion: editData.notificarFinalizacion,
      observacion: editData.observacion || "",
    };

    const formPayload = new FormData();
    Object.entries(dataToSend).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formPayload.append(key, value);
      }
    });

    if (editData.fotoAntes instanceof File)
      formPayload.append("fotoAntes", editData.fotoAntes);
    if (editData.fotoDespues instanceof File)
      formPayload.append("fotoDespues", editData.fotoDespues);

    try {
      const response = await fetch(
        `${apiBaseUrl}/actividades/full/${editData.id}`,
        { method: "PUT", body: formPayload }
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al actualizar la actividad");

      Swal.fire({
        icon: "success",
        title: "¡Éxito!",
        text:
          editData.notificarFinalizacion === "true"
            ? "Tarea completada y creador notificado."
            : "Tarea actualizada correctamente.",
        confirmButtonText: "Aceptar",
        confirmButtonColor: "#89DC00",
      });
      setIsEditing(false);
      fetchTareasRecibidas();
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
      setNewFotoDespuesUploaded(false);
    }
  };

  // --- Lógica de Seguimiento (MODIFICADA para incluir email del usuario)
  const handleSeguimientoClick = (row) => {
    setSelectedRowForSeguimiento(row);
    setSeguimientoText("");
    setIsSeguimientoOpen(true);
  };

  const parseSeguimiento = (observacionText) => {
    // ...existing code... (misma lógica que HistorialActividades)
    if (!observacionText) return [];

    const headerPattern = /--- Seguimiento por: (.*?) \((.*?)\) ---/g;
    const entries = [];
    let match;

    const headers = [];
    while ((match = headerPattern.exec(observacionText)) !== null) {
      headers.push({
        fullMatch: match[0],
        autor: match[1].trim(),
        fecha: match[2].trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }

    if (headers.length === 0) {
      return [
        {
          autor: "Usuario no identificado",
          fecha: "Fecha no registrada",
          contenido: observacionText.trim(),
        },
      ];
    }

    for (let i = 0; i < headers.length; i++) {
      const currentHeader = headers[i];
      const contentStart = i === 0 ? 0 : headers[i - 1].endIndex;
      const contentEnd = currentHeader.startIndex;

      const contenido = observacionText
        .substring(contentStart, contentEnd)
        .replace(/^\n+|\n+$/g, "")
        .trim();

      if (contenido.length > 0) {
        entries.push({
          autor: currentHeader.autor,
          fecha: currentHeader.fecha,
          contenido: contenido,
        });
      }
    }

    const lastHeader = headers[headers.length - 1];
    const lastContent = observacionText
      .substring(lastHeader.endIndex)
      .replace(/^\n+|\n+$/g, "")
      .trim();

    if (lastContent.length > 0) {
      const lastContentMatch = lastContent.match(
        /^(.*?)\n\n--- Seguimiento por: (.*?) \((.*?)\) ---$/s
      );

      if (lastContentMatch) {
        entries.push({
          autor: lastContentMatch[2].trim(),
          fecha: lastContentMatch[3].trim(),
          contenido: lastContentMatch[1].trim(),
        });
      } else {
        entries.push({
          autor: "Entrada sin formato",
          fecha: "Fecha no registrada",
          contenido: lastContent,
        });
      }
    }

    return entries;
  };

  const handleSeguimientoSubmit = async () => {
    if (!selectedRowForSeguimiento || seguimientoText.trim() === "") return;

    const existingSeguimiento = selectedRowForSeguimiento.observacion || "";
    const newEntry = `${seguimientoText.trim()}\n\n--- Seguimiento por: ${userEmail} (${new Date().toLocaleString(
      "es-ES"
    )}) ---`;
    const updatedSeguimiento = existingSeguimiento
      ? `${existingSeguimiento}\n\n${newEntry}`
      : newEntry;

    setLoading(true);
    try {
      const payloadData = {
        sede: selectedRowForSeguimiento.sede,
        actividad: selectedRowForSeguimiento.actividad,
        estado: selectedRowForSeguimiento.estado,
        precio: selectedRowForSeguimiento.precio,
        responsable: selectedRowForSeguimiento.responsable,
        fechaInicio: formatDateForInput(selectedRowForSeguimiento.fecha_inicio),
        fechaFinal: formatDateForInput(selectedRowForSeguimiento.fecha_final),
        designado: selectedRowForSeguimiento.designado || "",
        observacion: updatedSeguimiento,
        notificarFinalizacion: "false",
      };

      const formPayload = new FormData();
      Object.entries(payloadData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formPayload.append(key, value);
        }
      });

      const response = await fetch(
        `${apiBaseUrl}/actividades/full/${selectedRowForSeguimiento.id}`,
        {
          method: "PUT",
          body: formPayload,
        }
      );

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al guardar el seguimiento");

      Swal.fire({
        icon: "success",
        title: "¡Seguimiento guardado!",
        text: "El seguimiento ha sido actualizado correctamente.",
        confirmButtonText: "Aceptar",
        confirmButtonColor: "#89DC00",
      });

      setIsSeguimientoOpen(false);
      setSeguimientoText("");
      setSelectedRowForSeguimiento(null);
      fetchTareasRecibidas();
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

  const formatEstado = (estado) => {
    const estadoMap = {
      pendiente: "Pendiente",
      en_curso: "En Curso",
      completado: "Completado",
      no_completado: "No Completado",
    };
    return estadoMap[estado] || estado;
  };

  // ⭐ NUEVA FUNCIÓN: Eliminar imagen individual
  const handleDeleteImage = (row, tipo) => {
    Swal.fire({
      title: "¿Eliminar imagen?",
      text: `¿Seguro que quieres eliminar la imagen de "${
        tipo === "antes" ? "Foto Antes" : "Foto Después"
      }"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        try {
          const response = await fetch(
            `${apiBaseUrl}/actividades/full/${row.id}/eliminar-imagen`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tipo }),
            }
          );
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error || "Error al eliminar la imagen");

          Swal.fire({
            icon: "success",
            title: "Imagen eliminada",
            text: data.message || "Imagen eliminada correctamente",
            confirmButtonText: "Aceptar",
            confirmButtonColor: "#89DC00",
          });
          fetchTareasRecibidas();
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
      }
    });
  };

  // ⭐ NUEVO: Función para determinar el tipo de asignación
  const getAssignmentType = (row) => {
    if (row.responsable === userEmail) return { label: "👤 Directa", color: "#E3F2FD", text: "#1565C0", border: "#90CAF9" };
    if (row.responsables_grupo && row.responsables_grupo.includes(userEmail)) return { label: "👥 Grupal", color: "#E8F5E9", text: "#2E7D32", border: "#A5D6A7" };
    return { label: "🏢 Supervisión Sede", color: "#FFF3E0", text: "#EF6C00", border: "#FFCC80" };
  };

  // ⭐ COLUMNAS ACTUALIZADAS: Con columna de Solicitante
  const columnas = useMemo(
    () => [
      {
        name: "Tipo", // ✅ NUEVA COLUMNA VISUAL
        selector: (row) => {
            const type = getAssignmentType(row);
            return type.label;
        },
        cell: (row) => {
            const type = getAssignmentType(row);
            return (
                <span style={{
                    backgroundColor: type.color,
                    color: type.text,
                    border: `1px solid ${type.border}`,
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    whiteSpace: "nowrap"
                }}>
                    {type.label}
                </span>
            );
        },
        sortable: true,
        maxWidth: "140px",
        center: true
      },
      {
        name: "Inicio",
        selector: (row) => formatDateForInput(row.fecha_inicio),
        sortable: true,
        maxWidth: "100px",
      },
      {
        name: "Sede",
        selector: (row) => row.sede,
        sortable: true,
        maxWidth: "160px",
        wrap: true,
      },
      {
        name: "Actividad",
        selector: (row) => row.actividad,
        sortable: true,
        minWidth: "180px",
        wrap: true,
      },
      {
        name: "Asignada por",
        selector: (row) => row.creador_email || "Sistema",
        sortable: true,
        maxWidth: "200px",
        wrap: true,
      },
      {
        name: "Solicitante", // ✅ NUEVA COLUMNA
        selector: (row) => row.nombre_solicitante || "-",
        sortable: true,
        maxWidth: "180px",
        wrap: true,
      },
      {
        name: "Designado",
        selector: (row) => row.designado || "-",
        sortable: true,
        maxWidth: "120px",
        wrap: true,
      },
      {
        name: "Estado",
        selector: (row) => row.estado,
        sortable: true,
        maxWidth: "130px",
        cell: (row) => (
          <span
            className={`maint-historial__status-chip maint-historial__status-${row.estado}`}
          >
            {formatEstado(row.estado)}
          </span>
        ),
      },
      {
        name: "Seguimiento",
        cell: (row) => (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => handleSeguimientoClick(row)}
              className="maint-historial__action-btn"
              title="Ver/Agregar seguimiento"
            >
              <FaCommentDots className="maint-historial__comment-icon" />
            </button>
            {row.observacion && (
              <span
                style={{
                  fontSize: "0.8em",
                  color: "#10B981",
                  fontWeight: "500",
                }}
              >
                ✓
              </span>
            )}
          </div>
        ),
        maxWidth: "100px",
        center: true,
      },
      {
        name: "Empleado",
        cell: (row) => {
          const hasDotacionData =
            row.nombre_empleado || row.cedula_empleado || row.cargo_empleado;
          return hasDotacionData ? (
            <button
              onClick={() => handleEmployeeClick(row)}
              className="maint-historial__action-btn"
              title={
                row.responsableRol === "Suministros"
                  ? "Ver información de dotación"
                  : "Ver información del empleado"
              }
            >
              {row.responsableRol === "Suministros"
                ? "Ver Dotación"
                : "Ver Empleado"}
            </button>
          ) : null;
        },
        maxWidth: "150px",
        center: true,
      },
      {
        name: "Foto Antes",
        cell: (row) =>
          row.foto_antes_url ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {row.foto_antes_url.endsWith(".pdf") ? (
                <a
                  href={row.foto_antes_url}
                  target="_blank"
                  rel="noreferrer"
                  className="maint-preview-link"
                >
                  Ver PDF
                </a>
              ) : (
                <button
                  onClick={() => openImageViewer(row.foto_antes_url)}
                  className="maint-historial__action-btn"
                  title="Ver imagen"
                >
                  <img
                    src={row.foto_antes_url}
                    alt="Antes"
                    className="maint-historial__thumbnail"
                    loading="lazy"
                  />
                </button>
              )}
              {/* ⭐ BOTÓN DE ELIMINAR DEBAJO DE LA FOTO ANTES */}
              <button
                onClick={() => handleDeleteImage(row, "antes")}
                className="maint-delete-image-btn"
                title="Eliminar foto antes"
              >
                Eliminar
              </button>
            </div>
          ) : (
            <span>Sin archivo</span>
          ),
        maxWidth: "120px",
        center: true,
      },
      {
        name: "Foto Después",
        cell: (row) =>
          row.foto_despues_url ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {row.foto_despues_url.endsWith(".pdf") ? (
                <a
                  href={row.foto_despues_url}
                  target="_blank"
                  rel="noreferrer"
                  className="maint-preview-link"
                >
                  Ver PDF
                </a>
              ) : (
                <button
                  onClick={() => openImageViewer(row.foto_despues_url)}
                  className="maint-historial__action-btn"
                  title="Ver imagen"
                >
                  <img
                    src={row.foto_despues_url}
                    alt="Después"
                    className="maint-historial__thumbnail"
                    loading="lazy"
                  />
                </button>
              )}
              <button
                onClick={() => handleDeleteImage(row, "despues")}
                className="maint-delete-image-btn"
                title="Eliminar imagen"
              >
                Eliminar
              </button>
            </div>
          ) : (
            <span>Sin archivo</span>
          ),
        maxWidth: "120px",
        center: true,
      },
      {
        name: "Acciones",
        cell: (row) => (
          <div className="maint-historial__actions-container">
            <button
              onClick={() => handleEditClick(row)}
              className="maint-historial__action-btn"
              title="Editar/Completar"
            >
              <PencilIcon className="maint-historial__edit-icon icon" />
            </button>
          </div>
        ),
        ignoreRowClick: true,
        allowOverflow: true,
        button: true,
        maxWidth: "100px",
      },
    ],
    [userEmail]
  );

  const customStyles = {
    headRow: {
      style: {
        backgroundColor: "var(--maint-color-primary-dark)",
        color: "var(--maint-color-text-light)",
        fontWeight: "700",
        fontSize: "1rem",
      },
    },
    headCells: {
      style: {
        padding: "12px 8px",
        borderRight: "1px solid rgba(255, 255, 255, 0.1)",
        whiteSpace: "normal",
      },
    },
    cells: {
      style: {
        padding: "10px 8px",
        borderRight: "1px solid var(--maint-color-border-light)",
        borderBottom: "1px solid var(--maint-color-border-light)",
        fontSize: "0.9rem",
        lineHeight: "1.4",
        whiteSpace: "normal",
        wordBreak: "break-word",
      },
    },
  };

  const handleEmployeeClick = (row) => {
    // Replace this with actual employee data fetching logic
    const employeeData = {
      name: row.responsable, // Example: Use the 'responsable' field as the employee name
      email: row.responsable, // Example: Use the 'responsable' field as the employee email
      // Add more employee details here, fetch from API if needed
    };
    setSelectedEmployee(employeeData);
    setSelectedDotacion({
      nombreEmpleado: row.nombre_empleado,
      cedulaEmpleado: row.cedula_empleado,
      cargoEmpleado: row.cargo_empleado,
    });
    setIsEmployeeModalOpen(true);
  };

  const closeEmployeeModal = () => {
    setIsEmployeeModalOpen(false);
    setSelectedEmployee(null);
    setSelectedDotacion(null);
  };

  const filterConfig = useMemo(() => {
    // Calcular responsables únicos y conteo
    const responsablesMap = historial.reduce((acc, item) => {
      const resp = item.responsable || "Sin responsable";
      acc[resp] = (acc[resp] || 0) + 1;
      return acc;
    }, {});
    const responsablesList = Object.entries(responsablesMap)
      .map(([email, count]) => ({
        value: email,
        label: email,
        count: count,
      }))
      .sort((a, b) => b.count - a.count);

    // Calcular creadores únicos (asignado por) y conteo
    const creadoresMap = historial.reduce((acc, item) => {
      const creador = item.creador_email || "Sistema";
      acc[creador] = (acc[creador] || 0) + 1;
      return acc;
    }, {});
    const creadoresList = Object.entries(creadoresMap)
      .map(([email, count]) => ({
        value: email,
        label: email,
        count: count,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      title: "Filtros de Tareas Recibidas",
      showSearch: true,
      searchPlaceholder: "Buscar por actividad, responsable o designado...",
      showCategory: false,
      showSede: true,
      sedeLabel: "Filtrar por Sede",
      sedePlaceholder: "Todas las sedes",
      sedes: sedes,
      showEstado: true,
      estadoLabel: "Filtrar por Estado",
      estadoPlaceholder: "Todos los estados",
      estados: [
        { value: "", label: "📋 Todos los estados" },
        { value: "pendiente", label: "⏳ Pendiente" },
        { value: "en_curso", label: "🔄 En Curso" },
        { value: "completado", label: "✅ Completado" },
        { value: "no_completado", label: "❌ No Completado" },
      ],
      showResponsable: true, // ✅ NUEVO
      responsableLabel: "Filtrar por Responsable",
      responsablePlaceholder: "Todos los responsables",
      responsables: responsablesList,
      showAsignadoPor: true, // ✅ NUEVO
      asignadoPorLabel: "Filtrar por Asignador",
      asignadoPorPlaceholder: "Todos los asignadores",
      asignadosPor: creadoresList,
      showDateRange: false,
      showSingleDate: true,
      dateLabel: "Filtrar por Fecha",
      datePlaceholder: "Seleccionar fecha",
      showSorting: true,
      sortLabel: "Ordenar por",
      sortPlaceholder: "Seleccionar orden",
      sortOptions: [
        { value: "fecha", label: "Fecha" },
        { value: "estado", label: "Estado" },
        { value: "sede", label: "Sede" },
      ],
      showItemsPerPage: false,
    };
  }, [historial]);

  const handleFilterChange = useCallback((filterUpdates) => {
    setFilters((prev) => ({ ...prev, ...filterUpdates }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      search: "",
      fecha: "",
      sede: "",
      estado: "",
      responsable: "", // ✅ NUEVO
      asignadoPor: "", // ✅ NUEVO
      sortBy: "fecha",
      sortOrder: "desc",
    });
  }, []);

  const filteredData = useMemo(() => {
    let filtered = [...historial];

    // Filtro por texto de búsqueda
    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.actividad?.toLowerCase().includes(term) ||
          item.responsable?.toLowerCase().includes(term) ||
          item.designado?.toLowerCase().includes(term)
      );
    }

    // Filtro por sede
    if (filters.sede) {
      filtered = filtered.filter((item) => item.sede === filters.sede);
    }

    // Filtro por estado
    if (filters.estado) {
      filtered = filtered.filter((item) => item.estado === filters.estado);
    }

    // ✅ Filtro por responsable
    if (filters.responsable) {
      filtered = filtered.filter(
        (item) =>
          (item.responsable || "Sin responsable") === filters.responsable
      );
    }

    // ✅ Filtro por asignado por
    if (filters.asignadoPor) {
      filtered = filtered.filter(
        (item) => (item.creador_email || "Sistema") === filters.asignadoPor
      );
    }

    // Filtro por fecha
    if (filters.fecha) {
      filtered = filtered.filter((item) => {
        if (!item.fecha_inicio) return false;
        const itemDate = new Date(item.fecha_inicio)
          .toISOString()
          .split("T")[0];
        return itemDate === filters.fecha;
      });
    }

    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (filters.sortBy) {
        case "fecha":
          aValue = new Date(a.fecha_inicio || 0);
          bValue = new Date(b.fecha_inicio || 0);
          break;
        case "estado":
          aValue = a.estado || "";
          bValue = b.estado || "";
          break;
        case "sede":
          aValue = a.sede || "";
          bValue = b.sede || "";
          break;
        default:
          aValue = a[filters.sortBy] || "";
          bValue = b[filters.sortBy] || "";
      }

      if (filters.sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [historial, filters]);

  return (
    <div className="maint-form-container">
      <h2 className="maint-section-title">📨 Tareas Que Me Asignaron</h2>

      {userEmail && (
        <div
          style={{
            marginBottom: "15px",
            padding: "10px",
            backgroundColor: "#FFF3CD",
            borderRadius: "5px",
            fontSize: "0.9em",
            color: "#856404",
            borderLeft: "4px solid #FFC107",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          <span>📨 Mostrando tareas para: <strong>{userEmail}</strong></span>
          <div style={{ display: "flex", gap: "10px", fontSize: "0.85em" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "10px", height: "10px", backgroundColor: "#E3F2FD", border: "1px solid #90CAF9", borderRadius: "50%" }}></span>
                Directa
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "10px", height: "10px", backgroundColor: "#E8F5E9", border: "1px solid #A5D6A7", borderRadius: "50%" }}></span>
                Grupal
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "10px", height: "10px", backgroundColor: "#FFF3E0", border: "1px solid #FFCC80", borderRadius: "50%" }}></span>
                Supervisión Sede
            </span>
          </div>
        </div>
      )}

      {error && (
        <div
          className="error-message"
          style={{ color: "red", marginBottom: "20px" }}
        >
          {error}
        </div>
      )}

      <FilterPanelMantenimiento
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        totalRecords={filteredData.length}
        config={filterConfig}
      />

      <div className="maint-historial__datatable-wrapper">
        <DataTable
          columns={columnas}
          data={filteredData}
          customStyles={customStyles}
          pagination
          paginationRowsPerPageOptions={[10, 25, 50]}
          highlightOnHover
          responsive
          noDataComponent="No se encontraron tareas con los filtros aplicados"
          progressPending={loading}
        />
      </div>

      {/* Image Viewer Modal */}
      <Modal
        isOpen={isViewerOpen}
        onRequestClose={closeImageViewer}
        contentLabel="Visor de Imagen"
        className="maint-image-viewer-modal-content"
        overlayClassName="maint-modal-overlay"
        ariaHideApp={false}
      >
        <button
          className="maint-image-viewer-close-btn"
          onClick={closeImageViewer}
        >
          <FaTimes />
        </button>
        {currentImageUrl && (
          <img
            src={currentImageUrl}
            alt="Vista ampliada"
            className="maint-image-viewer-image"
            style={{ cursor: "default" }}
          />
        )}
      </Modal>

      {/* Employee Modal */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onRequestClose={closeEmployeeModal}
        employee={selectedEmployee}
        dotacion={selectedDotacion}
      />

      {/* Edit Modal */}
      {isEditing && editData && (
        <Modal
          isOpen={isEditing}
          onRequestClose={() => setIsEditing(false)}
          contentLabel="Editar Actividad"
          className="maint-edit-modal-content historial-edit"
          overlayClassName="maint-edit-modal-overlay"
          ariaHideApp={false}
        >
          <button
            className="maint-modal-close-btn"
            onClick={() => setIsEditing(false)}
          >
            <XMarkIcon width={32} height={32} />
          </button>
          <h2>Editar Actividad</h2>

          <form onSubmit={handleEditSubmit} className="maint-form-card">
            <div className="maint-historial__edit-grid">
              {/* COLUMNA 1: Datos Principales */}
              <div className="maint-historial__column">
                <div className="maint-form-group">
                  <label htmlFor="sede" className="maint-form-label">
                    Sede
                  </label>
                  <select
                    name="sede"
                    value={editData.sede || ""}
                    onChange={handleEditChange}
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
                  <label htmlFor="estado" className="maint-form-label">
                    Estado
                  </label>
                  <select
                    name="estado"
                    value={editData.estado || ""}
                    onChange={handleEditChange}
                    required
                    className="maint-form-select"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_curso">En Curso</option>
                    <option value="completado">Completado</option>
                    <option value="no_completado">No Completado</option>
                  </select>
                </div>
                <div className="maint-form-group">
                  <label htmlFor="responsable" className="maint-form-label">
                    Responsable (Correo)
                  </label>
                  <input
                    type="text"
                    name="responsable"
                    value={editData.responsable || ""}
                    onChange={handleEditChange}
                    required
                    className="maint-form-input"
                  />
                </div>
                <div className="maint-form-group">
                  <label htmlFor="designado" className="maint-form-label">
                    Designado
                  </label>
                  <input
                    type="text"
                    name="designado"
                    value={editData.designado || ""}
                    onChange={handleEditChange}
                    className="maint-form-input"
                  />
                </div>
                {/* ✅ NUEVO CAMPO: Nombre del Solicitante */}
                <div className="maint-form-group">
                  <label
                    htmlFor="nombre_solicitante"
                    className="maint-form-label"
                  >
                    👤 Nombre del Solicitante
                  </label>
                  <input
                    type="text"
                    name="nombre_solicitante"
                    value={editData.nombre_solicitante || ""}
                    onChange={handleEditChange}
                    placeholder="Ej: María García López"
                    className="maint-form-input"
                    style={{
                      borderColor: editData.nombre_solicitante
                        ? "#2196F3"
                        : undefined,
                      backgroundColor: editData.nombre_solicitante
                        ? "#F0F8FF"
                        : undefined,
                    }}
                  />
                  <small
                    style={{
                      display: "block",
                      marginTop: "4px",
                      fontSize: "0.8em",
                      color: "#666",
                      fontStyle: "italic",
                    }}
                  >
                    💡 Nombre de quien solicitó esta tarea
                  </small>
                </div>
                <div className="maint-form-group">
                  <label htmlFor="precio" className="maint-form-label">
                    Costo
                  </label>
                  <input
                    type="text"
                    name="precio"
                    value={formatNumberWithDots(editData.precio)}
                    onChange={handleEditChange}
                    autoComplete="off"
                    className="maint-form-input"
                  />
                </div>
              </div>

              {/* COLUMNA 2: Fechas y Textarea de Actividad */}
              <div className="maint-historial__column">
                <div className="maint-form-group">
                  <label htmlFor="fechaInicio" className="maint-form-label">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    name="fechaInicio"
                    value={editData.fechaInicio || ""}
                    onChange={handleEditChange}
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
                    value={editData.fechaFinal || ""}
                    onChange={handleEditChange}
                    className="maint-form-input"
                  />
                </div>
                <div className="maint-form-group maint-historial__full-width">
                  <label htmlFor="actividad" className="maint-form-label">
                    Actividad
                  </label>
                  <textarea
                    name="actividad"
                    value={editData.actividad || ""}
                    onChange={handleEditChange}
                    required
                    className="maint-form-textarea"
                    rows={6}
                  />
                </div>
              </div>

              {/* Fila 3: Archivos (2 Columnas) */}
              <div className="maint-historial__photo-section">
                <div className="maint-form-group maint-historial__photo-preview">
                  <label className="maint-form-label">Foto Antes:</label>
                  <input
                    type="file"
                    name="fotoAntes"
                    accept="image/*,.pdf"
                    onChange={handleEditChange}
                    className="maint-form-input"
                    disabled={isOptimizingImage}
                  />
                  <div className="maint-historial__image-wrapper">
                    {(editData.foto_antes_url || editFotoAntesPreview) &&
                      (editData.foto_antes_url?.endsWith(".pdf") ||
                      editFotoAntesPreview?.endsWith(".pdf") ? (
                        <a
                          href={editFotoAntesPreview || editData.foto_antes_url}
                          target="_blank"
                          rel="noreferrer"
                          className="maint-historial__preview-link"
                        >
                          {" "}
                          Ver PDF{" "}
                        </a>
                      ) : (
                        <img
                          src={editFotoAntesPreview || editData.foto_antes_url}
                          alt="Antes"
                          className="maint-thumbnail"
                          style={{ marginTop: "8px" }}
                        />
                      ))}
                  </div>
                </div>
                <div className="maint-form-group maint-historial__photo-preview">
                  <label className="maint-form-label">Foto Después:</label>
                  <input
                    type="file"
                    name="fotoDespues"
                    accept="image/*,.pdf"
                    onChange={handleEditChange}
                    className="maint-form-input"
                    disabled={isOptimizingImage}
                  />
                  {/* ⭐ MOSTRAR INDICADOR DE NUEVA FOTO CARGADA */}
                  {newFotoDespuesUploaded && (
                    <p
                      style={{
                        color: "#4caf50",
                        fontSize: "0.9rem",
                        fontStyle: "italic",
                      }}
                    >
                      ✅ Nueva foto cargada - Se activará notificación al
                      guardar
                    </p>
                  )}
                  <div className="maint-historial__image-wrapper">
                    {(editData.foto_despues_url || editFotoDespuesPreview) &&
                      (editData.foto_despues_url?.endsWith(".pdf") ||
                      editFotoDespuesPreview?.endsWith(".pdf") ? (
                        <a
                          href={
                            editFotoDespuesPreview || editData.foto_despues_url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="maint-historial__preview-link"
                        >
                          {" "}
                          Ver PDF{" "}
                        </a>
                      ) : (
                        <img
                          src={
                            editFotoDespuesPreview || editData.foto_despues_url
                          }
                          alt="Después"
                          className="maint-thumbnail"
                          style={{ marginTop: "8px" }}
                        />
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="maint-modal-buttons">
              <button
                type="submit"
                className="maint-submit-button"
                disabled={loading}
              >
                Guardar Cambios
              </button>
              <button
                type="button"
                className="maint-cancel-button"
                onClick={() => setIsEditing(false)}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de Seguimiento (CON EMAIL DEL USUARIO) */}
      <Modal
        isOpen={isSeguimientoOpen}
        onRequestClose={() => setIsSeguimientoOpen(false)}
        contentLabel="Seguimiento de Tarea"
        className="maint-edit-modal-content"
        overlayClassName="maint-edit-modal-overlay"
        ariaHideApp={false}
      >
        <button
          className="maint-modal-close-btn"
          onClick={() => setIsSeguimientoOpen(false)}
        >
          <XMarkIcon width={32} height={32} />
        </button>
        <h2 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FaCommentDots className="maint-historial__comment-icon" />
          Seguimiento de Tarea
        </h2>

        {selectedRowForSeguimiento && (
          <div
            style={{
              marginBottom: "20px",
              padding: "15px",
              backgroundColor: "#F8FAFC",
              borderRadius: "8px",
            }}
          >
            <h4 style={{ margin: "0 0 8px 0", fontSize: "1em" }}>
              📍 {selectedRowForSeguimiento.sede} -{" "}
              {selectedRowForSeguimiento.actividad}
            </h4>
            <p style={{ margin: "0", fontSize: "0.9em", color: "#6B7280" }}>
              Asignada por:{" "}
              <strong>{selectedRowForSeguimiento.creador_email}</strong>
              {selectedRowForSeguimiento.designado && (
                <>
                  {" "}
                  | Designado:{" "}
                  <strong>{selectedRowForSeguimiento.designado}</strong>
                </>
              )}
            </p>
          </div>
        )}

        {/* ⭐ AGREGAR SECCIÓN DE HISTORIAL PARSEADO */}
        <div className="maint-seguimiento__historial">
          <label
            className="maint-form-label"
            style={{
              marginBottom: "10px",
              display: "block",
              fontSize: "1.1em",
              fontWeight: "bold",
            }}
          >
            📋 Historial de Seguimiento:
          </label>
          {selectedRowForSeguimiento &&
          parseSeguimiento(selectedRowForSeguimiento.observacion).length > 0 ? (
            <div className="maint-seguimiento__entries">
              {parseSeguimiento(selectedRowForSeguimiento.observacion)
                .reverse()
                .map((entry, index) => (
                  <div
                    key={index}
                    className={`maint-seguimiento__entry ${
                      entry.autor === "Usuario no identificado"
                        ? "sin-formato"
                        : ""
                    }`}
                  >
                    <div className="maint-seguimiento__header">
                      <span className="maint-seguimiento__autor">
                        👤 {entry.autor}
                      </span>
                      <span className="maint-seguimiento__fecha">
                        🕒 {entry.fecha}
                      </span>
                    </div>
                    <p className="maint-seguimiento__contenido">
                      {entry.contenido}
                    </p>
                  </div>
                ))}
            </div>
          ) : (
            <div className="maint-seguimiento__empty">
              <p>📝 No hay registros de seguimiento anteriores.</p>
            </div>
          )}
        </div>

        {/* Separador */}
        <hr style={{ margin: "20px 0", borderColor: "#E5E7EB" }} />

        {/* ⭐ MOSTRAR EMAIL DEL USUARIO QUE HARÁ EL SEGUIMIENTO */}
        {userEmail && (
          <div
            style={{
              marginBottom: "15px",
              padding: "10px",
              backgroundColor: "#E0F2FE",
              borderRadius: "6px",
              borderLeft: "4px solid #0891B2",
            }}
          >
            <div
              style={{ fontSize: "0.9em", fontWeight: "600", color: "#0F766E" }}
            >
              👤 Nuevo seguimiento por: <strong>{userEmail}</strong>
            </div>
          </div>
        )}

        <div className="maint-form-group maint-historial__full-width">
          <label className="maint-form-label">
            ✍️ <strong>Agregar Nuevo Seguimiento:</strong>
          </label>
          <textarea
            value={seguimientoText}
            onChange={(e) => setSeguimientoText(e.target.value)}
            placeholder="Escribe aquí tu nueva entrada de seguimiento, notas o actualizaciones..."
            className="maint-form-textarea"
            rows={4}
            style={{ minHeight: "100px", resize: "vertical" }}
          />
          <div className="maint-historial__seguimiento-hint">
            💡 Este seguimiento será agregado al historial con tu email (
            {userEmail}) y la fecha y hora actuales.
          </div>
        </div>

        <div className="maint-modal-buttons" style={{ marginTop: "20px" }}>
          <button
            type="button"
            onClick={handleSeguimientoSubmit}
            className="maint-submit-button"
            disabled={loading || seguimientoText.trim() === ""}
          >
            💾 Guardar Nuevo Seguimiento
          </button>
          <button
            type="button"
            className="maint-cancel-button"
            onClick={() => setIsSeguimientoOpen(false)}
            disabled={loading}
          >
            Cerrar
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default TareasRecibidas;
