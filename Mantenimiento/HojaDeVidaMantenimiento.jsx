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
import autoTable from "jspdf-autotable";
import FilePreviewModal from "../trazabilidad_contabilidad/FilePreviewModal";

// Función para convertir URL a Base64 para el PDF
const getBase64ImageFromURL = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute("crossOrigin", "anonymous");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL("image/png");
      resolve(dataURL);
    };
    img.onerror = (error) => reject(error);
    img.src = url;
  });
};

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
  
  // Estado para el modal de previsualización
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

  const generatePDF = async (row) => {
    setLoading(true);
    try {
      const doc = new jsPDF();
      
      // Intentar obtener la imagen antes de armar la tabla
      let imgData = null;
      if (row.foto_activo) {
        try {
          imgData = await getBase64ImageFromURL(row.foto_activo);
        } catch (e) {
          console.error("Error cargando imagen para PDF:", e);
        }
      }

      // Encabezado
      doc.setFillColor(33, 13, 101); // Color primario
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text("HOJA DE VIDA DEL EQUIPO", 105, 25, { align: "center" });

      // Información General
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Fecha de Generación: ${new Date().toLocaleDateString()}`, 14, 48);

      const tableData = [
          [{ content: '1. IDENTIFICACIÓN DEL EQUIPO', colSpan: 2, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }],
          ['Código Interno', row.codigo_activo],
          ['Nombre del Activo', row.nombre_activo],
          ['Tipo', row.tipo_activo],
          ['Sede', row.sede],
          ['Área / Ubicación', row.clasificacion_ubicacion || row.area_ubicacion || 'N/A'],
          // Fila para la imagen si existe
          ...(imgData ? [['Registro Fotográfico', { content: '', styles: { minCellHeight: 65 } }]] : []),
          ['Marca', row.marca || 'N/A'],
          ['Modelo', row.modelo_referencia || 'N/A'],
          ['Serial', row.serial || 'N/A'],
          ['Estado Actual', row.estado_activo],
          
          [{ content: '2. ESPECIFICACIONES TÉCNICAS', colSpan: 2, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }],
          ['Potencia', row.potencia || 'N/A'],
          ['Tensión / Fase', row.tension_fase || 'N/A'],
          ['Capacidad', row.capacidad || 'N/A'],
          ['Material Principal', row.material_principal || 'N/A'],
          ['Protecciones', row.protecciones_seguridad || 'N/A'],

          [{ content: '3. COMPRA Y GESTIÓN', colSpan: 2, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }],
          ['Fecha Compra', row.fecha_compra || 'N/A'],
          ['Proveedor', row.proveedor || 'N/A'],
          ['Garantía Hasta', row.garantia_hasta || 'N/A'],
          ['Costo', row.costo_compra ? `$ ${Number(row.costo_compra).toLocaleString()}` : 'N/A'],
          ['Responsable', row.responsable_gestion || 'N/A'],

          [{ content: '4. PLAN DE MANTENIMIENTO', colSpan: 2, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }],
          ['Frecuencia', row.frecuencia_mantenimiento || row.frecuencia_preventivo || 'N/A'],
          ['Último Mantenimiento', row.ultimo_mantenimiento || 'N/A'],
          ['Próximo Mantenimiento', row.proximo_mantenimiento || 'N/A'],
          
          [{ content: '5. SEGURIDAD Y RIESGOS', colSpan: 2, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }],
          ['EPP Mínimo', row.epp_minimo || 'N/A'],
          ['Riesgos Críticos', row.riesgos_criticos || 'N/A'],
          ['Limpieza Segura', row.limpieza_segura || 'N/A'],
      ];

      autoTable(doc, {
          startY: 55,
          body: tableData,
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 3, valign: 'middle' },
          columnStyles: { 0: { fontStyle: 'bold', width: 60, fillColor: [250, 250, 250] } },
          didDrawCell: (data) => {
            if (imgData && data.column.index === 1 && data.row.raw[0] === 'Registro Fotográfico') {
                const cellWidth = data.cell.width - data.cell.padding('left') - data.cell.padding('right');
                const cellHeight = data.cell.height - data.cell.padding('top') - data.cell.padding('bottom');
                
                const imgProps = doc.getImageProperties(imgData);
                const ratio = Math.min(cellWidth / imgProps.width, cellHeight / imgProps.height);
                const imgW = imgProps.width * ratio;
                const imgH = imgProps.height * ratio;
                
                const x = data.cell.x + data.cell.padding('left') + (cellWidth - imgW) / 2;
                const y = data.cell.y + data.cell.padding('top') + (cellHeight - imgH) / 2;
                
                doc.addImage(imgData, 'PNG', x, y, imgW, imgH);
            }
          }
      });

      let finalY = doc.lastAutoTable.finalY + 10;

      // Sección de Documentos y Enlaces
      if (row.documento_riesgos) {
          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text("DOCUMENTACIÓN ADJUNTA", 14, finalY);
          doc.setFont(undefined, 'normal');
          doc.setFontSize(10);
          finalY += 8;

          doc.setTextColor(0, 102, 204);
          doc.textWithLink("→ Ver Documento de Riesgos (Abrir en nueva pestaña)", 14, finalY, { url: row.documento_riesgos });
          doc.setTextColor(0, 0, 0);
          finalY += 10;
      }

      const pdfBlob = doc.output('bloburl');
      setPreviewUrl(pdfBlob);
      setIsPreviewOpen(true);
    } catch (err) {
      toast.error("Error al generar el PDF");
      console.error(err);
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
      const sedeMatch = selectedSede ? item.sede === selectedSede : true;
      const estadoMatch = selectedEstado
        ? item.estado_activo === selectedEstado
        : true;
      return (
        globalMatch && sedeMatch && estadoMatch
      );
    });
  }, [
    inventario,
    filterText,
    selectedSede,
    selectedEstado,
  ]);

  // Estadísticas rápidas
  const stats = useMemo(() => {
    return {
      total: inventario.length,
      activos: inventario.filter(i => i.estado_activo === "Activo").length,
      reparacion: inventario.filter(i => i.estado_activo === "En Reparación").length,
      baja: inventario.filter(i => i.estado_activo === "Dado de Baja").length,
    };
  }, [inventario]);

  const SubHeaderComponent = useMemo(() => {
    const handleClear = () => {
      setFilterText("");
      setSelectedSede("");
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
    selectedSede,
    selectedEstado,
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
            className="maint-btn-view-pdf"
        >
          <FaFilePdf /> Ver PDF
        </button>
      ),
      ignoreRowClick: true,
      allowOverflow: true,
      button: true,
      minWidth: "140px"
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
            <div className="maint-ficha-cell">
                <div className="maint-ficha-list">
                    {fichas.map((file, i) => (
                        <div key={i} className="maint-ficha-item">
                            <span 
                                onClick={() => {
                                    setPreviewUrl(file.url);
                                    setIsPreviewOpen(true);
                                }}
                                className="maint-ficha-link"
                                title={file.name}
                            >
                                <FaEye /> {file.name}
                            </span>
                            <button 
                                className="maint-btn-delete-ficha"
                                onClick={() => handleDeleteFicha(row, file.url)}
                                title="Eliminar ficha"
                            >
                                <FaTrashAlt />
                            </button>
                        </div>
                    ))}
                </div>
                <label className="maint-btn-upload-ficha">
                    <FaCloudUploadAlt /> Adjuntar
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
      minWidth: "220px"
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
      <div className="maint-header-section">
        <h2 className="maint-section-title">
          <FaBoxOpen /> Hoja de Vida de Inventario
        </h2>
        <p className="maint-motivational-phrase">
          "Consulta el historial completo de todos los activos de tu inventario."
        </p>
      </div>

      {/* Stats Cards */}
      <div className="maint-stats-grid">
        <div className="maint-stat-card">
          <div className="maint-stat-icon total"><FaBoxOpen /></div>
          <div className="maint-stat-info">
            <span className="maint-stat-value">{stats.total}</span>
            <span className="maint-stat-label">Total Activos</span>
          </div>
        </div>
        <div className="maint-stat-card">
          <div className="maint-stat-icon active"><FaBoxOpen /></div>
          <div className="maint-stat-info">
            <span className="maint-stat-value">{stats.activos}</span>
            <span className="maint-stat-label">Activos</span>
          </div>
        </div>
        <div className="maint-stat-card">
          <div className="maint-stat-icon repair"><FaSpinner /></div>
          <div className="maint-stat-info">
            <span className="maint-stat-value">{stats.reparacion}</span>
            <span className="maint-stat-label">En Reparación</span>
          </div>
        </div>
        <div className="maint-stat-card">
          <div className="maint-stat-icon inactive"><FaTimes /></div>
          <div className="maint-stat-info">
            <span className="maint-stat-value">{stats.baja}</span>
            <span className="maint-stat-label">Dados de Baja</span>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      <div className="maint-table-container">
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

      <FilePreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => {
            setIsPreviewOpen(false);
            setPreviewUrl(null);
        }}
        fileUrl={previewUrl}
      />
    </div>
  );
};

export default HojaDeVidaMantenimiento;
