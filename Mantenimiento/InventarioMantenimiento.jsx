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
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./RegistroComun.css";
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
const clasificacionesUbicacion = [
  "Zona de Ventas",
  "Bodega",
  "Oficina",
  "Exterior",
  "Cocina",
  "Cuarto Frío",
  "Área de Empaque",
  "Salón de Eventos",
  "Otros",
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
const responsablesGestion = [
  "Juan Pérez",
  "María López",
  "Carlos Ruiz",
  "Ana Gómez",
  "Equipo de Mantenimiento",
  "Proveedor Externo",
];

const InventarioMantenimiento = () => {
  const { setLoading, loading } = useOutletContext();
  const [formData, setFormData] = useState({
    nombre_activo: "",
    tipo_activo: "",
    sede: "",
    clasificacion_ubicacion: "",
    estado_activo: "",
    frecuencia_mantenimiento: "",
    responsable_gestion: "",
  });
  const [editData, setEditData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [tiposActivosDisponibles, setTiposActivosDisponibles] = useState([]);

  const apiBaseUrl = "https://backend-mantenimiento.vercel.app/api";

  useEffect(() => {
    fetchTiposActivos();
  }, []);

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

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "excelFile") {
      setExcelFile(files[0]);
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/inventario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Error al registrar el activo.");

      toast.success(`Activo registrado: ${data.codigo_activo}`);
      setFormData({
        nombre_activo: "",
        tipo_activo: "",
        sede: "",
        clasificacion_ubicacion: "",
        estado_activo: "",
        frecuencia_mantenimiento: "",
        responsable_gestion: "",
      });
    } catch (err) {
      toast.error(`Error al registrar: ${err.message}`);
      console.error("Error al registrar activo:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/inventario/${editData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Error al actualizar el activo.");

      toast.success("Activo actualizado correctamente.");
      setIsEditing(false);
    } catch (err) {
      toast.error(`Error al actualizar: ${err.message}`);
      console.error("Error al actualizar activo:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (row) => {
    Swal.fire({
      title: "¿Estás seguro?",
      text: `Esta acción eliminará el activo "${row.nombre_activo}" (${row.codigo_activo}) de forma permanente.`,
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
          const res = await fetch(`${apiBaseUrl}/inventario/${row.id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (!res.ok)
            throw new Error(data.error || "Error al eliminar el activo.");

          toast.success("Activo eliminado correctamente.");
        } catch (err) {
          toast.error(`Error al eliminar: ${err.message}`);
          console.error("Error al eliminar activo:", err);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleExcelUpload = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      toast.error("Por favor, selecciona un archivo Excel.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("excelFile", excelFile);

    try {
      const res = await fetch(`${apiBaseUrl}/inventario/upload-excel`, {
        method: "POST",
        body: formData,
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
    <div className="maint-page-container">
      <h2 className="maint-section-title">
        <FaBoxOpen /> Gestión de Inventario de Mantenimiento
      </h2>
      <p className="maint-motivational-phrase">
        "Desde aquí puedes registrar nuevos activos y realizar cargas masivas."
      </p>
      <div className="maint-form-card">
        <h3>
          <FaClipboardList /> Registrar Nuevo Activo
        </h3>
        <form onSubmit={handleSubmit} className="maint-form-card">
          <div className="maint-form-grid">
            <div className="maint-form-group">
              <label htmlFor="nombre_activo" className="maint-form-label">
                Nombre del Activo
              </label>
              <input
                type="text"
                name="nombre_activo"
                value={formData.nombre_activo}
                onChange={handleChange}
                required
                className="maint-form-input"
              />
            </div>
            <div className="maint-form-group">
              <label htmlFor="tipo_activo" className="maint-form-label">
                Tipo de Activo
              </label>
              <select
                name="tipo_activo"
                value={formData.tipo_activo}
                onChange={handleChange}
                required
                className="maint-form-select"
              >
                <option value="" disabled>
                  Selecciona un tipo
                </option>
                {tiposActivosDisponibles.map((tipo) => (
                  <option key={tipo.codigo_tipo} value={tipo.nombre_tipo}>
                    {tipo.nombre_tipo}
                  </option>
                ))}
              </select>
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
                {sedes.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="maint-form-group">
              <label
                htmlFor="clasificacion_ubicacion"
                className="maint-form-label"
              >
                Clasificación por Ubicación
              </label>
              <select
                name="clasificacion_ubicacion"
                value={formData.clasificacion_ubicacion}
                onChange={handleChange}
                required
                className="maint-form-select"
              >
                <option value="" disabled>
                  Selecciona una ubicación
                </option>
                {clasificacionesUbicacion.map((clasif) => (
                  <option key={clasif} value={clasif}>
                    {clasif}
                  </option>
                ))}
              </select>
            </div>
            <div className="maint-form-group">
              <label htmlFor="estado_activo" className="maint-form-label">
                Estado del Activo
              </label>
              <select
                name="estado_activo"
                value={formData.estado_activo}
                onChange={handleChange}
                required
                className="maint-form-select"
              >
                <option value="" disabled>
                  Selecciona un estado
                </option>
                {estadosActivo.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>
            <div className="maint-form-group">
              <label
                htmlFor="frecuencia_mantenimiento"
                className="maint-form-label"
              >
                Frecuencia de Mantenimiento
              </label>
              <select
                name="frecuencia_mantenimiento"
                value={formData.frecuencia_mantenimiento}
                onChange={handleChange}
                required
                className="maint-form-select"
              >
                <option value="" disabled>
                  Selecciona una frecuencia
                </option>
                {frecuenciasMantenimiento.map((frec) => (
                  <option key={frec} value={frec}>
                    {frec}
                  </option>
                ))}
              </select>
            </div>
            <div className="maint-form-group maint-form-group-full-width">
              <label htmlFor="responsable_gestion" className="maint-form-label">
                Responsable de la Gestión
              </label>
              <input
                type="text"
                name="responsable_gestion"
                value={formData.responsable_gestion}
                onChange={handleChange}
                required
                className="maint-form-input"
              />
            </div>
          </div>
          <button type="submit" className="maint-btn-submit" disabled={loading}>
            <FaPlus /> {loading ? "Registrando..." : "Registrar Activo"}
          </button>
        </form>
      </div>
      <div className="maint-form-card">
        <h3>
          <FaFileExcel /> Carga Masiva desde Excel
        </h3>
        <p>
          Asegúrate de que la Hoja 1 contenga los datos de los activos de
          mantenimiento (encabezados exactos: 'código', 'nombre del activo',
          'tipo de activo', 'sede', 'clasificación por ubicación', 'estado del
          activo', 'frecuencia de mantenimiento', 'responsable de gestión
          interno/externo').
        </p>
        <form onSubmit={handleExcelUpload} className="maint-form-card">
          <div className="maint-form-group maint-form-group-full-width">
            <label htmlFor="excelFile" className="maint-form-label">
              Adjuntar Archivo Excel
            </label>
            <input
              type="file"
              name="excelFile"
              accept=".xlsx, .xls"
              onChange={handleChange}
            />
            {excelFile && (
              <p className="inv-file-name">
                Archivo seleccionado: {excelFile.name}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="maint-btn-submit"
            disabled={loading || !excelFile}
          >
            <FaUpload /> {loading ? "Cargando..." : "Cargar Excel"}
          </button>
        </form>
      </div>
      {isEditing && editData && (
        <div className="maint-modal-overlay">
          <div className="maint-modal-content">
            <button
              className="maint-modal-close-btn"
              onClick={() => setIsEditing(false)}
            >
              <FaTimes width={32} height={32} />
            </button>
            <h2>Editar Activo: {editData.codigo_activo}</h2>
            <form onSubmit={handleEditSubmit} className="maint-form-card">
              <div className="maint-form-grid">
                <div className="maint-form-group">
                  <label htmlFor="nombre_activo" className="maint-form-label">
                    Nombre del Activo
                  </label>
                  <input
                    type="text"
                    name="nombre_activo"
                    value={editData.nombre_activo || ""}
                    onChange={handleEditChange}
                    required
                    className="maint-form-input"
                  />
                </div>
                <div className="maint-form-group">
                  <label htmlFor="tipo_activo" className="maint-form-label">
                    Tipo de Activo
                  </label>
                  <select
                    name="tipo_activo"
                    value={editData.tipo_activo || ""}
                    onChange={handleEditChange}
                    required
                    className="maint-form-select"
                  >
                    {tiposActivosDisponibles.map((tipo) => (
                      <option key={tipo.codigo_tipo} value={tipo.nombre_tipo}>
                        {tipo.nombre_tipo}
                      </option>
                    ))}
                  </select>
                </div>
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
                    {sedes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="maint-form-group">
                  <label
                    htmlFor="clasificacion_ubicacion"
                    className="maint-form-label"
                  >
                    Clasificación por Ubicación
                  </label>
                  <select
                    name="clasificacion_ubicacion"
                    value={editData.clasificacion_ubicacion || ""}
                    onChange={handleEditChange}
                    required
                    className="maint-form-select"
                  >
                    {clasificacionesUbicacion.map((clasif) => (
                      <option key={clasif} value={clasif}>
                        {clasif}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="maint-form-group">
                  <label htmlFor="estado_activo" className="maint-form-label">
                    Estado del Activo
                  </label>
                  <select
                    name="estado_activo"
                    value={editData.estado_activo || ""}
                    onChange={handleEditChange}
                    required
                    className="maint-form-select"
                  >
                    {estadosActivo.map((estado) => (
                      <option key={estado} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="maint-form-group">
                  <label
                    htmlFor="frecuencia_mantenimiento"
                    className="maint-form-label"
                  >
                    Frecuencia de Mantenimiento
                  </label>
                  <select
                    name="frecuencia_mantenimiento"
                    value={editData.frecuencia_mantenimiento || ""}
                    onChange={handleEditChange}
                    required
                    className="maint-form-select"
                  >
                    {frecuenciasMantenimiento.map((frec) => (
                      <option key={frec} value={frec}>
                        {frec}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="maint-form-group maint-form-group-full-width">
                  <label
                    htmlFor="responsable_gestion"
                    className="maint-form-label"
                  >
                    Responsable de la Gestión
                  </label>
                  <input
                    type="text"
                    name="responsable_gestion"
                    value={editData.responsable_gestion || ""}
                    onChange={handleEditChange}
                    required
                    className="maint-form-input"
                  />
                </div>
              </div>
              <div className="maint-modal-buttons">
                <button
                  type="submit"
                  className="maint-submit-button"
                  disabled={loading}
                >
                  <FaEdit /> {loading ? "Guardando..." : "Guardar Cambios"}
                </button>
                <button
                  type="button"
                  className="maint-cancel-button"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                >
                  <FaTimes /> Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventarioMantenimiento;
