import React, { useState, useEffect, useMemo } from "react";
import DataTable from "react-data-table-component";
import {
  FaBoxOpen,
  FaSearch,
  FaSpinner,
  FaDownload,
  FaTimes,
  FaFilter,
  FaFilePdf,
  FaCloudUploadAlt,
  FaTrashAlt,
  FaEye
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./RegistroComun.css";
import * as XLSX from "xlsx";
import { useOutletContext } from "react-router-dom";
import { StyleSheetManager } from "styled-components";
import isPropValid from "@emotion/is-prop-valid";
import jsPDF from "jspdf";
import "jspdf-autotable";

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

  const handleUploadFicha = async (e, row) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
        toast.error("Solo se permiten archivos PDF.");
        return;
    }

    const formData = new FormData();
    formData.append("ficha", file);

    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/inventario/${row.codigo_activo}/ficha-tecnica`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al subir");
      
      toast.success("Ficha técnica subida correctamente");
      fetchInventario(); // Recargar datos para mostrar el nuevo archivo
    } catch (err) {
      toast.error(`Error al subir ficha: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteFicha = async (row, fileUrl) => {
    if (!window.confirm("¿Estás seguro de eliminar esta ficha técnica?")) return;

    setLoading(true);
    try {
        const res = await fetch(`${apiBaseUrl}/inventario/${row.codigo_activo}/ficha-tecnica`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileUrl })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al eliminar");

        toast.success("Ficha técnica eliminada");
        fetchInventario();
    } catch (err) {
        toast.error(`Error al eliminar ficha: ${err.message}`);
    } finally {
        setLoading(false);
    }
  };

  const generatePDF = (row) => {
    const doc = new jsPDF();
    const logoUrl = "https://i.imgur.com/YOUR_LOGO.png"; // Reemplazar con logo real si existe

    // Encabezado
    doc.setFillColor(33, 13, 101); // Color primario
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("HOJA DE VIDA DEL EQUIPO", 105, 25, { align: "center" });

    // Información General
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Fecha de Generación: ${new Date().toLocaleDateString()}`, 14, 48);

    const tableData = [
        [{ content: 'IDENTIFICACIÓN DEL EQUIPO', colSpan: 2, styles: { fillColor: [200, 200, 200], fontStyle: 'bold', halign: 'center' } }],
        ['Código Interno', row.codigo_activo],
        ['Nombre del Activo', row.nombre_activo],
        ['Tipo', row.tipo_activo],
        ['Sede', row.sede],
        ['Ubicación', row.clasificacion_ubicacion || 'N/A'],
        ['Marca', row.marca || 'N/A'],
        ['Modelo', row.modelo_referencia || 'N/A'],
        ['Serial', row.serial || 'N/A'],
        ['Estado', row.estado_activo],
        
        [{ content: 'ESPECIFICACIONES TÉCNICAS', colSpan: 2, styles: { fillColor: [200, 200, 200], fontStyle: 'bold', halign: 'center' } }],
        ['Potencia', row.potencia || 'N/A'],
        ['Tensión / Fase', row.tension_fase || 'N/A'],
        ['Capacidad', row.capacidad || 'N/A'],
        ['Material Principal', row.material_principal || 'N/A'],
        ['Protecciones', row.protecciones_seguridad || 'N/A'],

        [{ content: 'COMPRA Y GARANTÍA', colSpan: 2, styles: { fillColor: [200, 200, 200], fontStyle: 'bold', halign: 'center' } }],
        ['Fecha Compra', row.fecha_compra || 'N/A'],
        ['Proveedor', row.proveedor || 'N/A'],
        ['Garantía Hasta', row.garantia_hasta || 'N/A'],
        ['Costo', row.costo_compra ? `$ ${row.costo_compra}` : 'N/A'],
        ['Responsable', row.responsable_gestion || 'N/A'],

        [{ content: 'MANTENIMIENTO', colSpan: 2, styles: { fillColor: [200, 200, 200], fontStyle: 'bold', halign: 'center' } }],
        ['Frecuencia', row.frecuencia_mantenimiento || 'N/A'],
        ['Último Mantenimiento', row.ultimo_mantenimiento || 'N/A'],
        ['Próximo Mantenimiento', row.proximo_mantenimiento || 'N/A'],
        
        [{ content: 'RIESGOS Y EPP', colSpan: 2, styles: { fillColor: [200, 200, 200], fontStyle: 'bold', halign: 'center' } }],
        ['EPP Mínimo', row.epp_minimo || 'N/A'],
        ['Riesgos Críticos', row.riesgos_criticos || 'N/A'],
        ['Limpieza Segura', row.limpieza_segura || 'N/A'],
    ];

    doc.autoTable({
        startY: 55,
        head: [['Campo', 'Detalle']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [33, 13, 101], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
    });

    // Foto si existe
    if (row.foto_activo) {
        try {
            // Nota: Para agregar imágenes en jsPDF, idealmente deben ser base64 o estar en el mismo dominio para evitar CORS.
            // Aquí solo ponemos el link si no podemos renderizarla directamente sin proxy.
            doc.addPage();
            doc.text("Registro Fotográfico", 14, 20);
            doc.textWithLink("Ver Foto Online", 14, 30, { url: row.foto_activo });
        } catch (e) {
            console.error("Error agregando imagen al PDF", e);
        }
    }

    doc.save(`HojaVida_${row.codigo_activo}.pdf`);
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
      minWidth: "100px",
    },
    {
      name: "Nombre",
      selector: (row) => row.nombre_activo,
      sortable: true,
      wrap: true,
      minWidth: "150px",
    },
    {
      name: "Sede",
      selector: (row) => row.sede,
      sortable: true,
      wrap: true,
      minWidth: "120px",
    },
    {
      name: "Hoja de Vida",
      cell: (row) => (
        <button 
            onClick={() => generatePDF(row)} 
            className="btn-action-pdf"
            style={{
                backgroundColor: '#d32f2f', 
                color: 'white', 
                border: 'none', 
                padding: '5px 10px', 
                borderRadius: '4px', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
            }}
        >
          <FaFilePdf /> Descargar PDF
        </button>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
      minWidth: "160px"
    },
    {
      name: "Ficha Técnica",
      cell: (row) => {
        // Parsear fichas si vienen como string o asegurar array
        let fichas = [];
        try {
            fichas = typeof row.fichas_tecnicas === 'string' ? JSON.parse(row.fichas_tecnicas) : row.fichas_tecnicas;
        } catch(e) {}
        if (!Array.isArray(fichas)) fichas = [];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '5px 0' }}>
                {fichas.map((file, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.85rem' }}>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', textDecoration: 'none', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                            <FaEye /> {file.name}
                        </a>
                        <FaTrashAlt 
                            style={{ color: '#d32f2f', cursor: 'pointer' }} 
                            onClick={() => handleDeleteFicha(row, file.url)}
                            title="Eliminar ficha"
                        />
                    </div>
                ))}
                <label style={{ 
                    cursor: 'pointer', 
                    color: '#388e3c', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '5px', 
                    fontWeight: 'bold',
                    marginTop: '5px'
                }}>
                    <FaCloudUploadAlt size={16} /> Adjuntar PDF
                    <input 
                        type="file" 
                        accept="application/pdf" 
                        style={{ display: 'none' }} 
                        onChange={(e) => handleUploadFicha(e, row)} 
                    />
                </label>
            </div>
        );
      },
      minWidth: "250px"
    }
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
        <StyleSheetManager
          shouldForwardProp={(prop) =>
            prop !== "minWidth" && prop !== "align" && isPropValid(prop)
          }
        >
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
          />
        </StyleSheetManager>
      </div>
    </div>
  );
};

export default HojaDeVidaMantenimiento;
