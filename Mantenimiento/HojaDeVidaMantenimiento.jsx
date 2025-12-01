import React, { useState, useEffect, useMemo } from "react";
import DataTable from "react-data-table-component";
import {
  FaBoxOpen,
  FaSearch,
  FaSpinner,
  FaDownload,
  FaTimes,
  FaFilter,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./RegistroComun.css";
import * as XLSX from "xlsx";
import { useOutletContext } from "react-router-dom";

// Opciones predefinidas
const sedes = [
  "",
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
  "",
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
const estadosActivo = [
  "",
  "Activo",
  "Inactivo",
  "En Reparación",
  "Dado de Baja",
];

const HojaDeVidaMantenimiento = () => {
  const { setLoading, loading } = useOutletContext();
  const [inventario, setInventario] = useState([]);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState("");
  const [selectedTipo, setSelectedTipo] = useState("");
  const [selectedSede, setSelectedSede] = useState("");
  const [selectedUbicacion, setSelectedUbicacion] = useState("");
  const [selectedEstado, setSelectedEstado] = useState("");
  const [tiposActivosDisponibles, setTiposActivosDisponibles] = useState([]);

  const apiBaseUrl = "https://backend-mantenimiento.vercel.app/api";

  useEffect(() => {
    fetchInventario();
    fetchTiposActivos();
  }, []);

  const fetchTiposActivos = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/inventario/tipos-activos`);
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al obtener tipos de activos.");
      setTiposActivosDisponibles([
        { codigo_tipo: "", nombre_tipo: "" },
        ...data,
      ]);
    } catch (err) {
      toast.error(
        `Error al cargar tipos de activos para filtros: ${err.message}`
      );
      console.error("Error al cargar tipos de activos para filtros:", err);
    }
  };

  const fetchInventario = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/inventario`);
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al obtener la hoja de vida.");
      setInventario(data);
      setError(null);
    } catch (err) {
      toast.error(`Error al cargar la hoja de vida: ${err.message}`);
      console.error("Error al cargar la hoja de vida:", err);
      setInventario([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return inventario.filter((item) => {
      const globalMatch = Object.values(item).some(
        (value) =>
          value &&
          value.toString().toLowerCase().includes(filterText.toLowerCase())
      );
      const typeMatch = selectedTipo ? item.tipo_activo === selectedTipo : true;
      const sedeMatch = selectedSede ? item.sede === selectedSede : true;
      const ubicacionMatch = selectedUbicacion
        ? item.clasificacion_ubicacion === selectedUbicacion
        : true;
      const estadoMatch = selectedEstado
        ? item.estado_activo === selectedEstado
        : true;
      return (
        globalMatch && typeMatch && sedeMatch && ubicacionMatch && estadoMatch
      );
    });
  }, [
    inventario,
    filterText,
    selectedTipo,
    selectedSede,
    selectedUbicacion,
    selectedEstado,
  ]);

  const SubHeaderComponent = useMemo(() => {
    const handleClear = () => {
      setFilterText("");
      setSelectedTipo("");
      setSelectedSede("");
      setSelectedUbicacion("");
      setSelectedEstado("");
    };

    const handleExport = () => {
      if (filteredItems.length === 0) {
        toast.warn("No hay datos para exportar.");
        return;
      }
      const dataToExport = filteredItems.map((item) => ({
        Código: item.codigo_activo,
        Nombre: item.nombre_activo,
        Tipo: item.tipo_activo,
        Sede: item.sede,
        Ubicación: item.clasificacion_ubicacion,
        Estado: item.estado_activo,
        "Frecuencia Mant.": item.frecuencia_mantenimiento,
        Responsable: item.responsable_gestion,
        "Fecha Creación": new Date(item.created_at).toLocaleDateString(),
      }));
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "HojaDeVidaMantenimiento");
      XLSX.writeFile(wb, "HojaDeVidaMantenimiento.xlsx");
      toast.success("Datos exportados a Excel correctamente.");
    };

    return (
      <div className="maint-table-toolbar">
        <div className="maint-search-filter-group">
          <div className="maint-search-input-container">
            <input
              id="search"
              type="text"
              placeholder="Buscar en la tabla..."
              aria-label="Search Input"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="maint-table-search-input"
            />
            {filterText && (
              <button
                className="maint-clear-search-button"
                onClick={handleClear}
                title="Limpiar búsqueda"
              >
                <FaTimes />
              </button>
            )}
          </div>
          <div className="maint-filter-select-container">
            <FaFilter className="maint-filter-icon" />
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="maint-table-filter-select"
            >
              {tiposActivosDisponibles.map((tipo) => (
                <option
                  key={tipo.codigo_tipo || "all"}
                  value={tipo.nombre_tipo}
                >
                  {tipo.nombre_tipo || "Todos los Tipos"}
                </option>
              ))}
            </select>
          </div>
          <div className="maint-filter-select-container">
            <FaFilter className="maint-filter-icon" />
            <select
              value={selectedSede}
              onChange={(e) => setSelectedSede(e.target.value)}
              className="maint-table-filter-select"
            >
              {sedes.map((sede) => (
                <option key={sede || "all"} value={sede}>
                  {sede || "Todas las Sedes"}
                </option>
              ))}
            </select>
          </div>
          <div className="maint-filter-select-container">
            <FaFilter className="maint-filter-icon" />
            <select
              value={selectedUbicacion}
              onChange={(e) => setSelectedUbicacion(e.target.value)}
              className="maint-table-filter-select"
            >
              {clasificacionesUbicacion.map((ubicacion) => (
                <option key={ubicacion || "all"} value={ubicacion}>
                  {ubicacion || "Todas las Ubicaciones"}
                </option>
              ))}
            </select>
          </div>
          <div className="maint-filter-select-container">
            <FaFilter className="maint-filter-icon" />
            <select
              value={selectedEstado}
              onChange={(e) => setSelectedEstado(e.target.value)}
              className="maint-table-filter-select"
            >
              {estadosActivo.map((estado) => (
                <option key={estado || "all"} value={estado}>
                  {estado || "Todos los Estados"}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          className="maint-export-button"
          onClick={handleExport}
          title="Exportar a Excel"
        >
          <FaDownload /> Exportar
        </button>
      </div>
    );
  }, [
    filterText,
    filteredItems,
    selectedTipo,
    selectedSede,
    selectedUbicacion,
    selectedEstado,
    tiposActivosDisponibles,
  ]);

  const columnas = [
    {
      name: "Código",
      selector: (row) => row.codigo_activo,
      sortable: true,
      wrap: true,
      minWidth: "120px",
    },
    {
      name: "Nombre",
      selector: (row) => row.nombre_activo,
      sortable: true,
      wrap: true,
      minWidth: "150px",
    },
    {
      name: "Tipo",
      selector: (row) => row.tipo_activo,
      sortable: true,
      wrap: true,
      minWidth: "100px",
    },
    {
      name: "Sede",
      selector: (row) => row.sede,
      sortable: true,
      wrap: true,
      minWidth: "120px",
    },
    {
      name: "Ubicación",
      selector: (row) => row.clasificacion_ubicacion,
      sortable: true,
      wrap: true,
      minWidth: "150px",
    },
    {
      name: "Estado",
      selector: (row) => row.estado_activo,
      sortable: true,
      minWidth: "100px",
    },
    {
      name: "Frecuencia Mant.",
      selector: (row) => row.frecuencia_mantenimiento,
      sortable: true,
      wrap: true,
      minWidth: "150px",
    },
    {
      name: "Responsable",
      selector: (row) => row.responsable_gestion,
      sortable: true,
      wrap: true,
      minWidth: "150px",
    },
    {
      name: "Fecha Creación",
      selector: (row) => new Date(row.created_at).toLocaleDateString(),
      sortable: true,
      minWidth: "120px",
    },
  ];

  const customStyles = {
    headRow: {
      style: {
        backgroundColor: "var(--maint-color-primary-dark)",
        color: "var(--maint-color-text-light)",
        fontWeight: "700",
        borderBottom: "1px solid #ccc",
        fontSize: "1rem",
      },
    },
    headCells: {
      style: {
        padding: "10px",
        verticalAlign: "middle",
        borderRight: "1px solid #ddd",
      },
    },
    cells: {
      style: {
        padding: "8px",
        verticalAlign: "middle",
        whiteSpace: "normal",
        wordBreak: "break-word",
        fontSize: "0.9rem",
        lineHeight: "1.4",
        borderRight: "1px solid #eee",
        borderBottom: "1px solid #f0f0f0",
      },
    },
  };

  return (
    <div className="maint-page-container">
      <h2 className="maint-section-title">
        <FaBoxOpen /> Hoja de Vida de Inventario de Mantenimiento
      </h2>
      <p className="maint-motivational-phrase">
        "Consulta el historial completo de todos los activos de tu inventario.
        Utiliza los filtros para una búsqueda más específica."
      </p>
      {error && <div className="error-message">{error}</div>}
      <div className="maint-form-card" style={{ overflowX: "auto" }}>
        <DataTable
          columns={columnas}
          data={filteredItems}
          customStyles={customStyles}
          pagination
          highlightOnHover
          responsive
          noDataComponent="No hay registros por mostrar"
          progressPending={loading}
          progressComponent={<div className="loading-spinner"></div>}
          subHeader
          subHeaderComponent={SubHeaderComponent}
          subHeaderAlign="right"
        />
      </div>
    </div>
  );
};

export default HojaDeVidaMantenimiento;
