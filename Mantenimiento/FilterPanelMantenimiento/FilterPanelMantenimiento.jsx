import React from "react";
import {
  FaFilter,
  FaTimes,
  FaSearch,
  FaCalendarAlt,
  FaSort,
  FaList,
  FaCheckCircle,
  FaBuilding,
  FaUser,
  FaUserTie,
} from "react-icons/fa";
import "./FilterPanelMantenimiento.css";

const FilterPanelMantenimiento = ({
  showFilters,
  setShowFilters,
  filters,
  onFilterChange,
  onClearFilters,
  totalRecords,
  config = {},
  customActions = null,
}) => {
  const {
    title = "Filtros",
    showSearch = true,
    showCategory = false,
    showEstado = false, // ✅ Opción para mostrar filtro de estado
    showSede = false, // ✅ NUEVO: Opción para mostrar filtro de sede
    showResponsable = false, // ✅ NUEVO: Opción para mostrar filtro de responsable
    showAsignadoPor = false, // ✅ NUEVO: Opción para mostrar filtro de asignado por
    showSanidad = false, // ✅ NUEVO: Opción para mostrar filtro de sanidad
    showDateRange = false,
    showSingleDate = false,
    showSorting = true,
    showItemsPerPage = true,
    searchPlaceholder = "Buscar...",
    categoryLabel = "Categoría",
    categoryPlaceholder = "Todas las categorías",
    estadoLabel = "Estado",
    estadoPlaceholder = "Todos los estados",
    sedeLabel = "Sede", // ✅ NUEVO
    sedePlaceholder = "Todas las sedes", // ✅ NUEVO
    responsableLabel = "Responsable", // ✅ NUEVO
    responsablePlaceholder = "Todos los responsables", // ✅ NUEVO
    asignadoPorLabel = "Asignada por", // ✅ NUEVO
    asignadoPorPlaceholder = "Todos los asignadores", // ✅ NUEVO
    categories = [],
    estados = [
      { value: "", label: "📋 Todos los estados" },
      { value: "pendiente", label: "⏳ Pendiente" },
      { value: "en_curso", label: "🔄 En Curso" },
      { value: "completado", label: "✅ Completado" },
      { value: "no_completado", label: "❌ No Completado" },
    ],
    sedes = [], // ✅ NUEVO: Lista de sedes
    responsables = [], // ✅ NUEVO: Lista de responsables con conteo
    asignadosPor = [], // ✅ NUEVO: Lista de asignadores con conteo
    sortOptions = [],
    itemsPerPageOptions = [
      { value: 10, label: "10 por página" },
      { value: 25, label: "25 por página" },
      { value: 50, label: "50 por página" },
    ],
  } = config;

  return (
    <div className="fp-container">
      <div className="fp-header">
        <div className="fp-header-left">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="fp-toggle-btn"
          >
            <FaFilter /> {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
          </button>
          <span className="fp-record-count">
            {totalRecords} {totalRecords === 1 ? "registro" : "registros"}
          </span>
        </div>
        <div className="fp-header-right">{customActions}</div>
      </div>

      {showFilters && (
        <div className="fp-filters-panel">
          <div className="fp-filters-header">
            <h3 className="fp-filters-title">
              <FaFilter /> {title}
            </h3>
            <button onClick={onClearFilters} className="fp-clear-btn">
              <FaTimes /> Limpiar Filtros
            </button>
          </div>

          <div className="fp-filters-grid">
            {/* Búsqueda de texto */}
            {showSearch && (
              <div className="fp-filter-group fp-full-width">
                <label className="fp-filter-label">
                  <FaSearch /> Búsqueda
                </label>
                <input
                  type="text"
                  value={filters.search || ""}
                  onChange={(e) => onFilterChange({ search: e.target.value })}
                  placeholder={searchPlaceholder}
                  className="fp-filter-input"
                />
              </div>
            )}

            {/* Filtro por categoría/sede */}
            {showCategory && categories.length > 0 && (
              <div className="fp-filter-group">
                <label className="fp-filter-label">
                  <FaList /> {categoryLabel}
                </label>
                <select
                  value={filters.category || filters.sede || ""}
                  onChange={(e) =>
                    onFilterChange(
                      filters.hasOwnProperty("category")
                        ? { category: e.target.value }
                        : { sede: e.target.value }
                    )
                  }
                  className="fp-filter-select"
                >
                  <option value="">{categoryPlaceholder}</option>
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ✅ Filtro por Estado */}
            {showEstado && estados.length > 0 && (
              <div className="fp-filter-group">
                <label className="fp-filter-label">
                  <FaCheckCircle /> {estadoLabel}
                </label>
                <select
                  value={filters.estado || ""}
                  onChange={(e) => onFilterChange({ estado: e.target.value })}
                  className="fp-filter-select"
                >
                  <option value="">{estadoPlaceholder}</option>
                  {estados.map((est) => (
                    <option key={est.value} value={est.value}>
                      {est.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ✅ NUEVO: Filtro por Sede */}
            {showSede && sedes.length > 0 && (
              <div className="fp-filter-group">
                <label className="fp-filter-label">
                  <FaBuilding /> {sedeLabel}
                </label>
                <select
                  value={filters.sede || ""}
                  onChange={(e) => onFilterChange({ sede: e.target.value })}
                  className="fp-filter-select"
                >
                  <option value="">{sedePlaceholder}</option>
                  {sedes.map((sede) => (
                    <option key={sede} value={sede}>
                      {sede}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ✅ NUEVO: Filtro por Responsable */}
            {showResponsable && responsables.length > 0 && (
              <div className="fp-filter-group">
                <label className="fp-filter-label">
                  <FaUser /> {responsableLabel}
                </label>
                <select
                  value={filters.responsable || ""}
                  onChange={(e) =>
                    onFilterChange({ responsable: e.target.value })
                  }
                  className="fp-filter-select"
                >
                  <option value="">{responsablePlaceholder}</option>
                  {responsables.map((resp) => (
                    <option key={resp.value} value={resp.value}>
                      {resp.label} ({resp.count})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ✅ NUEVO: Filtro por Asignado Por */}
            {showAsignadoPor && asignadosPor.length > 0 && (
              <div className="fp-filter-group">
                <label className="fp-filter-label">
                  <FaUserTie /> {asignadoPorLabel}
                </label>
                <select
                  value={filters.asignadoPor || ""}
                  onChange={(e) =>
                    onFilterChange({ asignadoPor: e.target.value })
                  }
                  className="fp-filter-select"
                >
                  <option value="">{asignadoPorPlaceholder}</option>
                  {asignadosPor.map((asig) => (
                    <option key={asig.value} value={asig.value}>
                      {asig.label} ({asig.count})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ✅ NUEVO: Filtro por Sanidad */}
            {showSanidad && (
              <div className="fp-filter-group">
                <label className="fp-filter-label">
                  <FaCheckCircle /> Sanidad
                </label>
                <select
                  value={filters.sanidad || ""}
                  onChange={(e) => onFilterChange({ sanidad: e.target.value })}
                  className="fp-filter-select"
                >
                  <option value="">Todos</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>
            )}

            {/* Filtro por fecha única */}
            {showSingleDate && (
              <div className="fp-filter-group">
                <label className="fp-filter-label">
                  <FaCalendarAlt /> Fecha
                </label>
                <input
                  type="date"
                  value={filters.fecha || ""}
                  onChange={(e) => onFilterChange({ fecha: e.target.value })}
                  className="fp-filter-input"
                />
              </div>
            )}

            {/* Filtro por rango de fechas */}
            {showDateRange && (
              <>
                <div className="fp-filter-group">
                  <label className="fp-filter-label">
                    <FaCalendarAlt /> Desde
                  </label>
                  <input
                    type="date"
                    value={filters.startDate || ""}
                    onChange={(e) =>
                      onFilterChange({ startDate: e.target.value })
                    }
                    className="fp-filter-input"
                  />
                </div>
                <div className="fp-filter-group">
                  <label className="fp-filter-label">
                    <FaCalendarAlt /> Hasta
                  </label>
                  <input
                    type="date"
                    value={filters.endDate || ""}
                    onChange={(e) =>
                      onFilterChange({ endDate: e.target.value })
                    }
                    className="fp-filter-input"
                  />
                </div>
              </>
            )}

            {/* Ordenamiento */}
            {showSorting && sortOptions.length > 0 && (
              <div className="fp-filter-group">
                <label className="fp-filter-label">
                  <FaSort /> Ordenar por
                </label>
                <select
                  value={filters.sortBy || sortOptions[0]?.value || ""}
                  onChange={(e) => onFilterChange({ sortBy: e.target.value })}
                  className="fp-filter-select"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Items por página */}
            {showItemsPerPage && itemsPerPageOptions.length > 0 && (
              <div className="fp-filter-group">
                <label className="fp-filter-label">
                  <FaList /> Mostrar
                </label>
                <select
                  value={
                    filters.itemsPerPage || itemsPerPageOptions[0]?.value || 10
                  }
                  onChange={(e) =>
                    onFilterChange({ itemsPerPage: parseInt(e.target.value) })
                  }
                  className="fp-filter-select"
                >
                  {itemsPerPageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanelMantenimiento;
