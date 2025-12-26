import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { supabase } from "../../supabaseClient"; // ⭐ IMPORTAR SUPABASE
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
import "./HistorialActividadesPage.css"; // ⭐ Usar el mismo CSS
import EmployeeModal from "./EmployeeModal"; // Import the new component
import FilterPanelMantenimiento from "./FilterPanelMantenimiento/FilterPanelMantenimiento";

const HistorialTareas = () => {
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
  const [userEmail, setUserEmail] = useState(""); // ⭐ EMAIL DEL USUARIO ACTUAL
  
  // ⭐ ESTADOS PARA LOS FLUJOS AVANZADOS
  const [newFotoDespuesUploaded, setNewFotoDespuesUploaded] = useState(false);
  const [isSeguimientoOpen, setIsSeguimientoOpen] = useState(false);
  const [seguimientoText, setSeguimientoText] = useState("");
  const [selectedRowForSeguimiento, setSelectedRowForSeguimiento] = useState(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false); // State for the employee modal
  const [selectedEmployee, setSelectedEmployee] = useState(null); // State to store employee data
  const [selectedDotacion, setSelectedDotacion] = useState(null);

  const apiBaseUrl = "https://backend-mantenimiento.vercel.app/api";

  // ⭐ OBTENER EMAIL DEL USUARIO AUTENTICADO
  useEffect(() => {
    const getUserEmail = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        }
      } catch (error) {
        console.error("Error obteniendo usuario:", error);
        // Fallback al localStorage si falla Supabase
        const storedEmail = localStorage.getItem("correo_empleado");
        setUserEmail(storedEmail || "sistema@merka.com.co");
      }
    };
    
    getUserEmail();
  }, []);

  // --- Funciones de Visualización y Datos ---
  const openImageViewer = (url) => {
    setCurrentImageUrl(url);
    setIsViewerOpen(true);
  };

  const closeImageViewer = () => {
    setIsViewerOpen(false);
    setCurrentImageUrl("");
  };

  // ⭐ FUNCIÓN MODIFICADA: Carga historial filtrado por creador
  const fetchHistorial = async () => {
    if (!userEmail) {
      setError("Error: No se encontró el correo del usuario para filtrar el historial.");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/historial-por-creador?creadorEmail=${userEmail}`);
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al obtener el historial de tareas asignadas");
      setHistorial(data);
    } catch (err) {
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
      fetchHistorial();
    }
  }, [userEmail]);

  // --- Lógica de Edición: Manejo de cambios (MISMA LÓGICA) ---
  const handleEditChange = async (e) => {
    const { name, value, files } = e.target;
    if (name === "precio") {
      const numericValue = value.replace(/\D/g, "");
      setEditData((prev) => ({ ...prev, [name]: numericValue }));
    } else if (files && files[0]) {
      const fieldName = name === "fotoAntes" ? "Foto Antes" : "Foto Después";
      
      // Remover lógica de fotoDespues ya que no se puede editar
      if (name === "fotoDespues") {
        return; // No permitir cambios en foto después
      }
      
      if (!validateFile(files[0], fieldName)) { 
        if (name === "fotoAntes") setEditFotoAntesPreview(null);
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
        } else {
          const originalSize = (result.originalSize / 1024 / 1024).toFixed(2);
          const optimizedSize = (result.optimizedSize / 1024 / 1024).toFixed(2);
          const reduction = (((result.originalSize - result.optimizedSize) / result.originalSize) * 100).toFixed(1);

          Swal.fire({
            icon: "success",
            title: "¡Imagen Optimizada!",
            html: `<p><strong>${fieldName}</strong> ha sido optimizada:</p><ul style="text-align: left; list-style: none; padding: 0;"><li>📦 Tamaño: ${originalSize}MB → ${optimizedSize}MB</li><li>📉 Reducción: ${reduction}%</li><li>🖼️ Formato: WebP</li></ul>`,
            timer: 3000,
            timerProgressBar: true,
            confirmButtonColor: "#89DC00",
            showConfirmButton: false,
          });

          setEditData((prev) => ({ ...prev, [name]: result.file }));
          const fileUrl = URL.createObjectURL(result.file);
          if (name === "fotoAntes") setEditFotoAntesPreview(fileUrl);
        }
      } catch (error) {
        console.error("Error al optimizar la imagen:", error);
        const file = files[0];
        setEditData((prev) => ({ ...prev, [name]: file }));
        const fileUrl = URL.createObjectURL(file);
        if (name === "fotoAntes") setEditFotoAntesPreview(fileUrl);
      } finally {
        setIsOptimizingImage(false);
      }
    } else {
      setEditData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // --- Lógica de Edición: Clic en editar (MISMA LÓGICA) ---
  const handleEditClick = (row) => {
    setEditData({
      ...row,
      designado: row.designado || "",
      responsable: row.responsable || "",
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

  // --- Lógica de Edición: Enviar edición (MODIFICADA) ---
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    // Remover lógica de completación automática por foto después
    // ya que el creador no puede subir esa foto

    if (
      !editData.sede || !editData.actividad || !editData.fechaInicio || !editData.estado || !editData.responsable
    ) {
      Swal.fire({ 
        icon: "error", 
        title: "Campos incompletos", 
        text: "Por favor, completa todos los campos obligatorios.", 
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
      designado: editData.designado,
      notificarFinalizacion: "false", // Siempre false desde historial
      observacion: editData.observacion || '',
    };

    const formPayload = new FormData();
    Object.entries(dataToSend).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formPayload.append(key, value);
      }
    });

    // Solo permitir subir fotoAntes, nunca fotoDespues
    if (editData.fotoAntes instanceof File) formPayload.append("fotoAntes", editData.fotoAntes);

    try {
      const response = await fetch(`${apiBaseUrl}/actividades/full/${editData.id}`, { method: "PUT", body: formPayload, });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al actualizar la tarea");

      Swal.fire({
        icon: "success",
        title: "¡Éxito!",
        text: "Tarea actualizada correctamente.",
        confirmButtonText: "Aceptar", 
        confirmButtonColor: "#89DC00",
      });
      setIsEditing(false);
      fetchHistorial();
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
  
  // --- Lógica de Seguimiento (MISMA LÓGICA) ---
  const handleSeguimientoClick = (row) => {
    setSelectedRowForSeguimiento(row);
    setSeguimientoText(""); // ⭐ Limpiar para nueva entrada
    setIsSeguimientoOpen(true);
  };

  // ⭐ FUNCIÓN COMPLETAMENTE CORREGIDA: Misma lógica mejorada
  const parseSeguimiento = (observacionText) => {
    if (!observacionText) return [];

    console.log("📝 Texto completo de observación:", observacionText);

    // ⭐ NUEVA LÓGICA: Buscar todas las ocurrencias del patrón de header
    const headerPattern = /--- Seguimiento por: (.*?) \((.*?)\) ---/g;
    const entries = [];
    let match;

    // Encontrar todos los headers y sus posiciones
    const headers = [];
    while ((match = headerPattern.exec(observacionText)) !== null) {
      headers.push({
        fullMatch: match[0],
        autor: match[1].trim(),
        fecha: match[2].trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length
      });
    }

    console.log("🔍 Headers encontrados:", headers);

    // Si no hay headers, todo es contenido sin formato
    if (headers.length === 0) {
      return [{
        autor: 'Usuario no identificado',
        fecha: 'Fecha no registrada',
        contenido: observacionText.trim()
      }];
    }

    // Procesar cada entrada basándose en las posiciones de los headers
    for (let i = 0; i < headers.length; i++) {
      const currentHeader = headers[i];
      
      // El contenido va ANTES del header actual
      const contentStart = i === 0 ? 0 : headers[i - 1].endIndex;
      const contentEnd = currentHeader.startIndex;
      
      const contenido = observacionText
        .substring(contentStart, contentEnd)
        .replace(/^\n+|\n+$/g, '') // Limpiar saltos de línea al inicio y final
        .trim();

      if (contenido.length > 0) {
        entries.push({
          autor: currentHeader.autor,
          fecha: currentHeader.fecha,
          contenido: contenido
        });
      }
    }

    // ⭐ PROCESAR LA ÚLTIMA ENTRADA (después del último header)
    const lastHeader = headers[headers.length - 1];
    const lastContent = observacionText
      .substring(lastHeader.endIndex)
      .replace(/^\n+|\n+$/g, '')
      .trim();

    if (lastContent.length > 0) {
      // Esta es la entrada más reciente, buscar si tiene su propio header al final
      const lastContentMatch = lastContent.match(/^(.*?)\n\n--- Seguimiento por: (.*?) \((.*?)\) ---$/s);
      
      if (lastContentMatch) {
        entries.push({
          autor: lastContentMatch[2].trim(),
          fecha: lastContentMatch[3].trim(),
          contenido: lastContentMatch[1].trim()
        });
      } else {
        // Si no tiene header al final, usar el header anterior pero es contenido sin formato
        entries.push({
          autor: 'Entrada sin formato',
          fecha: 'Fecha no registrada',  
          contenido: lastContent
        });
      }
    }

    console.log("📋 Entradas procesadas:", entries);
    return entries;
  };

  const handleSeguimientoSubmit = async () => {
    if (!selectedRowForSeguimiento || seguimientoText.trim() === "") return;

    // ⭐ FORMATO CORREGIDO: Contenido ANTES del header  
    const existingSeguimiento = selectedRowForSeguimiento.observacion || "";
    const newEntry = `${seguimientoText.trim()}\n\n--- Seguimiento por: ${userEmail} (${new Date().toLocaleString('es-ES')}) ---`;
    
    console.log("🔍 Nueva entrada a agregar:", newEntry);
    
    const updatedSeguimiento = existingSeguimiento ? `${existingSeguimiento}\n\n${newEntry}` : newEntry;

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

      const response = await fetch(`${apiBaseUrl}/actividades/full/${selectedRowForSeguimiento.id}`, { method: "PUT", body: formPayload });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al guardar el seguimiento");

      Swal.fire({ 
        icon: "success", 
        title: "¡Seguimiento guardado!", 
        text: "El seguimiento ha sido actualizado correctamente con tu información de usuario.", 
        confirmButtonText: "Aceptar", 
        confirmButtonColor: "#89DC00", 
      });

      setIsSeguimientoOpen(false);
      setSeguimientoText("");
      setSelectedRowForSeguimiento(null);
      fetchHistorial();
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: err.message, confirmButtonText: "Aceptar", confirmButtonColor: "#89DC00", });
    } finally {
      setLoading(false);
    }
  };
  
  // --- Lógica de Eliminación (MISMA LÓGICA) ---
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
          fetchHistorial();
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

  const handleDeleteClick = (row) => {
    Swal.fire({
      title: "¿Estás seguro?",
      text: "Esta acción eliminará la tarea y los registros fotográficos asociados de forma permanente.",
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
            `${apiBaseUrl}/actividades/full/${row.id}`,
            {
              method: "DELETE",
            }
          );
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error || "Error al eliminar el registro");

          Swal.fire({
            icon: "success",
            title: "Eliminado",
            text: data.message || "Registro eliminado correctamente",
            confirmButtonText: "Aceptar",
            confirmButtonColor: "#89DC00",
          });
          setHistorial((prev) => prev.filter((item) => item.id !== row.id));
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

  // --- Helper function to format estado values (MISMA LÓGICA) ---
  const formatEstado = (estado) => {
    const estadoMap = { pendiente: "Pendiente", en_curso: "En Curso", completado: "Completado", no_completado: "No Completado", };
    return estadoMap[estado] || estado;
  };

  // --- Definición de Columnas (CORREGIDA) ---
  const columnas = useMemo(
    () => [
      { 
        name: "Inicio", 
        selector: (row) => formatDateForInput(row.fecha_inicio), 
        sortable: true, 
        width: "100px" // ✅ CAMBIO: usar width en lugar de maxWidth
      },
      { 
        name: "Sede", 
        selector: (row) => row.sede, 
        sortable: true, 
        width: "160px", // ✅ CAMBIO
        wrap: true 
      },
      { 
        name: "Actividad", 
        selector: (row) => row.actividad, 
        sortable: true, 
        width: "180px", // ✅ CAMBIO: usar width en lugar de minWidth
        wrap: true 
      },
      { 
        name: "Asignado a", 
        selector: (row) => row.responsable || "-", 
        sortable: true, 
        width: "200px", // ✅ CAMBIO
        wrap: true 
      },
      { 
        name: "Designado", 
        selector: (row) => row.designado || "-", 
        sortable: true, 
        width: "120px", // ✅ CAMBIO
        wrap: true 
      },
      { 
        name: "Estado", 
        selector: (row) => row.estado, 
        sortable: true, 
        width: "130px", // ✅ CAMBIO
        cell: (row) => (
          <span className={`maint-historial__status-chip maint-historial__status-${row.estado}`}>
            {formatEstado(row.estado)}
          </span>
        )
      },
      { 
        name: "Seguimiento",
        cell: (row) => (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}> {/* ✅ CAMBIO: justifyContent en lugar de prop center */}
            <button 
              onClick={() => handleSeguimientoClick(row)} 
              className="maint-historial__action-btn" 
              title="Ver/Agregar seguimiento"
            >
              <FaCommentDots className="maint-historial__comment-icon" />
            </button>
            {row.observacion && (
              <span style={{ fontSize: "0.8em", color: "#10B981", fontWeight: "500" }}>✓</span>
            )}
          </div>
        ),
        width: "100px", // ✅ CAMBIO
        // ✅ REMOVIDO: center: true
      },
      {
        name: "Empleado",
        cell: (row) => {
          const hasDotacionData = row.nombre_empleado || row.cedula_empleado || row.cargo_empleado;
          return hasDotacionData ? (
            <button
              onClick={() => handleEmployeeClick(row)}
              className="maint-historial__action-btn"
              title={row.responsableRol === "Suministros" ? "Ver información de dotación" : "Ver información del empleado"}
            >
              {row.responsableRol === "Suministros" ? "Ver Dotación" : "Ver Empleado"}
            </button>
          ) : null;
        },
        width: "150px", // ✅ CAMBIO
        // ✅ REMOVIDO: center: true
      },
      {
        name: "Foto Antes",
        cell: (row) =>
          row.foto_antes_url ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              {row.foto_antes_url.endsWith(".pdf") ? (
                <a href={row.foto_antes_url} target="_blank" rel="noreferrer" className="maint-preview-link">
                  Ver PDF
                </a>
              ) : (
                <button onClick={() => openImageViewer(row.foto_antes_url)} className="maint-historial__action-btn" title="Ver imagen">
                  <img src={row.foto_antes_url} alt="Antes" className="maint-historial__thumbnail" loading="lazy" />
                </button>
              )}
              <button onClick={() => handleDeleteImage(row, "antes")} className="maint-delete-image-btn" title="Eliminar imagen">
                Eliminar
              </button>
            </div>
          ) : (
            <span>Sin archivo</span>
          ),
        width: "120px", // ✅ CAMBIO
        // ✅ REMOVIDO: center: true
      },
      {
        name: "Foto Después",
        cell: (row) =>
          row.foto_despues_url ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              {row.foto_despues_url.endsWith(".pdf") ? (
                <a href={row.foto_despues_url} target="_blank" rel="noreferrer" className="maint-preview-link">
                  Ver PDF
                </a>
              ) : (
                <button onClick={() => openImageViewer(row.foto_despues_url)} className="maint-historial__action-btn" title="Ver imagen">
                  <img src={row.foto_despues_url} alt="Después" className="maint-historial__thumbnail" loading="lazy" />
                </button>
              )}
              <button onClick={() => handleDeleteImage(row, "despues")} className="maint-delete-image-btn" title="Eliminar imagen">
                Eliminar
              </button>
            </div>
          ) : (
            <span>Sin archivo</span>
          ),
        width: "120px", // ✅ CAMBIO
        // ✅ REMOVIDO: center: true
      },
      {
        name: "Acciones",
        cell: (row) => (
          <div className="maint-historial__actions-container">
            <button onClick={() => handleEditClick(row)} className="maint-historial__action-btn" title="Editar">
              <PencilIcon className="maint-historial__edit-icon icon" />
            </button>
            <button onClick={() => handleDeleteClick(row)} className="maint-historial__action-btn" title="Eliminar">
              <TrashIcon className="maint-historial__delete-icon icon" />
            </button>
          </div>
        ),
        ignoreRowClick: true,
        width: "120px", // ✅ CAMBIO
        // ✅ REMOVIDO: allowOverflow: true, button: true
      },
    ],
    []
  );

  const customStyles = {
    headRow: { style: { backgroundColor: 'var(--maint-color-primary-dark)', color: 'var(--maint-color-text-light)', fontWeight: '700', fontSize: '1rem', }, },
    headCells: { style: { padding: '12px 8px', borderRight: '1px solid rgba(255, 255, 255, 0.1)', whiteSpace: 'normal', }, },
    cells: { style: { padding: '10px 8px', borderRight: '1px solid var(--maint-color-border-light)', borderBottom: '1px solid var(--maint-color-border-light)', fontSize: '0.9rem', lineHeight: '1.4', whiteSpace: 'normal', wordBreak: 'break-word', }, },
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
      title: "Filtros de Tareas Asignadas",
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
      <h2 className="maint-section-title">📋 Mis Tareas Asignadas</h2>
      
      {/* ⭐ MOSTRAR EMAIL DEL USUARIO PARA INDICAR EL FILTRO */}
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
          📧 Mostrando tareas asignadas por: <strong>{userEmail}</strong>
        </div>
      )}
      
      {error && <div className="error-message" style={{ color: 'red', marginBottom: '20px' }}>{error}</div>}
      
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
        <button className="maint-image-viewer-close-btn" onClick={closeImageViewer}>
          <FaTimes />
        </button>
        {currentImageUrl && (
          <img src={currentImageUrl} alt="Vista ampliada" className="maint-image-viewer-image" style={{ cursor: "default" }} />
        )}
      </Modal>

      {/* Employee Modal */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onRequestClose={closeEmployeeModal}
        employee={selectedEmployee}
        dotacion={selectedDotacion}
      />

      {/* Edit Modal (MISMA ESTRUCTURA) */}
      {isEditing && editData && (
        <Modal
          isOpen={isEditing}
          onRequestClose={() => setIsEditing(false)}
          contentLabel="Editar Tarea"
          className="maint-edit-modal-content historial-edit"
          overlayClassName="maint-edit-modal-overlay"
          ariaHideApp={false}
        >
          <button className="maint-modal-close-btn" onClick={() => setIsEditing(false)}>
            <XMarkIcon width={32} height={32} />
          </button>
          <h2>✏️ Editar Tarea Asignada</h2>

          <form onSubmit={handleEditSubmit} className="maint-form-card">
            {/* ...existing code... (misma estructura del modal de edición) */}
            <div className="maint-historial__edit-grid">
              
              <div className="maint-historial__column">
                <div className="maint-form-group">
                  <label htmlFor="sede" className="maint-form-label">Sede</label>
                  <select name="sede" value={editData.sede || ""} onChange={handleEditChange} required className="maint-form-select">
                      <option value="" disabled>Selecciona una sede</option>
                      {sedes.map((s, idx) => (<option key={idx} value={s}>{s}</option>))}
                  </select>
                </div>
                <div className="maint-form-group">
                  <label htmlFor="estado" className="maint-form-label">Estado</label>
                  <select name="estado" value={editData.estado || ""} onChange={handleEditChange} required className="maint-form-select">
                    <option value="pendiente">Pendiente</option>
                    <option value="en_curso">En Curso</option>
                    <option value="completado">Completado</option>
                    <option value="no_completado">No Completado</option>
                  </select>
                </div>
                <div className="maint-form-group">
                  <label htmlFor="responsable" className="maint-form-label">Asignado a (Correo)</label>
                  <input type="text" name="responsable" value={editData.responsable || ""} onChange={handleEditChange} required className="maint-form-input" />
                </div>
                <div className="maint-form-group">
                  <label htmlFor="designado" className="maint-form-label">Designado</label>
                  <input type="text" name="designado" value={editData.designado || ""} onChange={handleEditChange} className="maint-form-input" />
                </div>
                <div className="maint-form-group">
                  <label htmlFor="precio" className="maint-form-label">Costo</label>
                  <input type="text" name="precio" value={formatNumberWithDots(editData.precio)} onChange={handleEditChange} autoComplete="off" className="maint-form-input" />
                </div>
              </div>

              <div className="maint-historial__column">
                <div className="maint-form-group">
                  <label htmlFor="fechaInicio" className="maint-form-label">Fecha de Inicio</label>
                  <input type="date" name="fechaInicio" value={editData.fechaInicio || ""} onChange={handleEditChange} required className="maint-form-input" />
                </div>
                <div className="maint-form-group">
                  <label htmlFor="fechaFinal" className="maint-form-label">Fecha Final</label>
                  <input type="date" name="fechaFinal" value={editData.fechaFinal || ""} onChange={handleEditChange} className="maint-form-input" />
                </div>
                <div className="maint-form-group maint-historial__full-width">
                  <label htmlFor="actividad" className="maint-form-label">Actividad</label>
                  <textarea name="actividad" value={editData.actividad || ""} onChange={handleEditChange} required className="maint-form-textarea" rows={6} />
                </div>
              </div>

              <div className="maint-historial__photo-section">
                <div className="maint-form-group maint-historial__photo-preview">
                  <label className="maint-form-label">Foto Antes:</label>
                  <input type="file" name="fotoAntes" accept="image/*,.pdf" onChange={handleEditChange} className="maint-form-input" disabled={isOptimizingImage} />
                  <div className="maint-historial__image-wrapper">
                        {(editData.foto_antes_url || editFotoAntesPreview) && (
                            editData.foto_antes_url?.endsWith(".pdf") || editFotoAntesPreview?.endsWith(".pdf") ? (
                                <a href={editFotoAntesPreview || editData.foto_antes_url} target="_blank" rel="noreferrer" className="maint-historial__preview-link" > Ver PDF </a>
                            ) : (
                                <img src={editFotoAntesPreview || editData.foto_antes_url} alt="Antes" className="maint-thumbnail" style={{ marginTop: "8px" }} />
                            )
                        )}
                    </div>
                </div>
                <div className="maint-form-group maint-historial__photo-preview">
                  <label className="maint-form-label">Foto Después: <span style={{fontSize: '0.8em', color: '#6B7280', fontStyle: 'italic'}}>(Solo visualización - debe ser subida por el asignado)</span></label>
                  {/* Remover input file para fotoDespues */}
                  <div className="maint-historial__image-wrapper">
                        {(editData.foto_despues_url || editFotoDespuesPreview) ? (
                            editData.foto_despues_url?.endsWith(".pdf") || editFotoDespuesPreview?.endsWith(".pdf") ? (
                                <a href={editFotoDespuesPreview || editData.foto_despues_url} target="_blank" rel="noreferrer" className="maint-historial__preview-link" > Ver PDF </a>
                            ) : (
                                <img src={editFotoDespuesPreview || editData.foto_despues_url} alt="Después" className="maint-thumbnail" style={{ marginTop: "8px" }} />
                            )
                        ) : (
                          <div style={{
                            padding: '20px',
                            backgroundColor: '#F3F4F6',
                            border: '2px dashed #D1D5DB',
                            borderRadius: '8px',
                            textAlign: 'center',
                            color: '#6B7280',
                            fontSize: '0.9em'
                          }}>
                            📷 Foto pendiente por subir<br/>
                            <small>La persona asignada debe cargar esta imagen</small>
                          </div>
                        )}
                    </div>
                </div>
              </div>
            </div>

            <div className="maint-modal-buttons">
              <button type="submit" className="maint-submit-button" disabled={loading}>
                Guardar Cambios
              </button>
              <button type="button" className="maint-cancel-button" onClick={() => setIsEditing(false)} disabled={loading}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de Seguimiento (MEJORADO) - usar la misma estructura que HistorialActividadesPage */}
      <Modal
        isOpen={isSeguimientoOpen}
        onRequestClose={() => setIsSeguimientoOpen(false)}
        contentLabel="Seguimiento de Tarea"
        className="maint-edit-modal-content historial-seguimiento"
        overlayClassName="maint-edit-modal-overlay"
        ariaHideApp={false}
      >
        <button className="maint-modal-close-btn" onClick={() => setIsSeguimientoOpen(false)}>
          <XMarkIcon width={32} height={32} />
        </button>
        <h2 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FaCommentDots className="maint-historial__comment-icon" />
          Seguimiento de Tarea
        </h2>
        
        {selectedRowForSeguimiento && (
            <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#F8FAFC", borderRadius: "8px" }}>
                <h4 style={{ margin: "0 0 8px 0", fontSize: "1em" }}>
                    📍 {selectedRowForSeguimiento.sede} - {selectedRowForSeguimiento.actividad}
                </h4>
                <p style={{ margin: "0", fontSize: "0.9em", color: "#6B7280" }}>
                    Asignado a: <strong>{selectedRowForSeguimiento.responsable}</strong>
                    {selectedRowForSeguimiento.designado && (<> | Designado: <strong>{selectedRowForSeguimiento.designado}</strong></>)}
                </p>
            </div>
        )}

        {/* ⭐ SECCIÓN DE HISTORIAL DE SEGUIMIENTO QUE FALTABA */}
        <div className="maint-seguimiento__historial">
          <label className="maint-form-label" style={{ marginBottom: '10px', display: 'block', fontSize: '1.1em', fontWeight: 'bold' }}>
            📋 Historial de Seguimiento:
          </label>
          {selectedRowForSeguimiento && parseSeguimiento(selectedRowForSeguimiento.observacion).length > 0 ? (
            <div className="maint-seguimiento__entries">
              {parseSeguimiento(selectedRowForSeguimiento.observacion)
                .reverse() // Mostrar el más reciente primero
                .map((entry, index) => (
                  <div 
                    key={index} 
                    className={`maint-seguimiento__entry ${entry.autor === 'Usuario no identificado' ? 'sin-formato' : ''}`}
                  >
                    <div className="maint-seguimiento__header">
                      <span className="maint-seguimiento__autor">
                        👤 {entry.autor}
                      </span>
                      <span className="maint-seguimiento__fecha">
                        🕒 {entry.fecha}
                      </span>
                    </div>
                    <p className="maint-seguimiento__contenido">{entry.contenido}</p>
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
        <hr style={{ margin: '20px 0', borderColor: '#E5E7EB' }}/>

        {/* Sección para NUEVA Entrada de Seguimiento */}
        {userEmail && (
          <div style={{ 
            marginBottom: "15px", 
            padding: "10px", 
            backgroundColor: "#E0F2FE", 
            borderRadius: "6px",
            borderLeft: "4px solid #0891B2"
          }}>
            <div style={{ fontSize: "0.9em", fontWeight: "600", color: "#0F766E" }}>
              👤 Seguimiento registrado por: <strong>{userEmail}</strong>
            </div>
          </div>
        )}

        <div className="maint-form-group maint-historial__full-width">
          <label className="maint-form-label">📝 Seguimiento de la tarea:</label>
          <textarea 
            value={seguimientoText} 
            onChange={(e) => setSeguimientoText(e.target.value)} 
            placeholder="Escribe aquí el seguimiento, notas, observaciones o actualizaciones sobre esta tarea..." 
            className="maint-form-textarea" 
            rows={6} 
            style={{ minHeight: "120px" }} 
          />
          <div style={{ fontSize: "0.8em", color: "#6B7280", marginTop: "4px" }}>
            💡 Tu email ({userEmail}) se agregará automáticamente al seguimiento con la fecha y hora actual.
          </div>
        </div>

        <div className="maint-modal-buttons">
          <button type="button" onClick={handleSeguimientoSubmit} className="maint-submit-button" disabled={loading}>
            💾 Guardar Seguimiento
          </button>
          <button type="button" className="maint-cancel-button" onClick={() => setIsSeguimientoOpen(false)} disabled={loading}>
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default HistorialTareas;