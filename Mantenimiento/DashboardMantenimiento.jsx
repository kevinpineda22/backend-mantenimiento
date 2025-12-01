// src/pages/Mantenimiento/DashboardMantenimiento.jsx

import React, { useEffect, useMemo, useState, useCallback, memo } from "react";
import "./DashboardMantenimiento.css";

// Iconos de React Icons (Fa6)
import {
  FaCircleCheck,
  FaHourglassHalf,
  FaMoneyBillWave,
  FaWrench,
  FaTriangleExclamation,
  FaFilter,
  FaBroom,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
  FaCalendarDays,
  FaWarehouse,
  FaFolderOpen,
} from "react-icons/fa6";
import { useOutletContext } from "react-router-dom";

// Import client and interceptor
import { supabase, supabaseQuery } from "../../supabaseClient";

// Chart.js imports (se mantiene para unificación)
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  Filler,
} from "chart.js";
import { Pie, Line, Bar } from "react-chartjs-2";

// Registro de componentes Chart.js (Necesario)
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  Filler
);

// ====================================================================
// --- CONFIGURACIÓN Y UTILIDADES ---
// ====================================================================

const chartColors = {
  primary: "#3b1a9a",
  primaryLight: "#5c3eb8",
  secondary: "#210d65",
  accent: "#fbc02d",
  success: "#4caf50",
  warning: "#ff9800",
  info: "#2196f3",
  danger: "#e53935",
};

const formatEstadoLabel = (estado = "") =>
  String(estado || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const toDateInput = (d) => {
  const iso = new Date(d).toISOString();
  return iso.slice(0, 10);
};

const startOfCurrentYear = () => {
  const d = new Date();
  d.setMonth(0, 1);
  return d;
};

const calcularPeriodoAnterior = (from, to) => {
  const fechaInicio = new Date(from);
  const fechaFin = new Date(to);
  const diasDiferencia = Math.ceil(
    (fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)
  );

  const anteriorFin = new Date(fechaInicio);
  anteriorFin.setDate(anteriorFin.getDate() - 1);

  const anteriorInicio = new Date(anteriorFin);
  anteriorInicio.setDate(anteriorInicio.getDate() - diasDiferencia);

  return {
    from: toDateInput(anteriorInicio),
    to: toDateInput(anteriorFin),
  };
};

const formatCurrency = (value) => {
  const n = Number(value);
  if (!isFinite(n)) return "-";
  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  });
};

const calcularCambio = (actual, anterior) => {
  if (anterior === null || anterior === undefined || anterior === 0)
    return null;
  return ((actual - anterior) / anterior) * 100;
};

// ====================================================================
// --- SUB-COMPONENTES MEMORIZADOS ---
// Se extraen para evitar re-renders innecesarios.
// ====================================================================

const IndicadorCambio = memo(({ actual, anterior }) => {
  const cambio = calcularCambio(actual, anterior);

  if (cambio === null) return <span style={{ color: "#6B7280" }}>-</span>;

  const esPositivo = cambio > 0;
  const esNeutro = Math.abs(cambio) < 0.1;

  const color = esNeutro
    ? "#6B7280"
    : esPositivo
    ? chartColors.success
    : chartColors.danger;
  const Icon = esNeutro ? FaMinus : esPositivo ? FaArrowUp : FaArrowDown;

  const valorFormateado = Math.abs(cambio).toFixed(1) + "%";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        fontSize: "0.8em",
        color,
      }}
    >
      <Icon />
      <span>{valorFormateado}</span>
    </div>
  );
});
IndicadorCambio.displayName = "IndicadorCambio";

const KPIs = memo(({ kpis, kpisAnterior }) => (
  <div className="dsh-mnt-kpis">
    {/* Total Registros */}
    <div className="dsh-mnt-kpi-card is-primary">
      <FaWrench className="dsh-mnt-kpi-icon primary" />
      <div>
        <div className="dsh-mnt-kpi-label">Total Registros</div>
        <div className="dsh-mnt-kpi-value">{kpis.totalRegistros}</div>
        {kpisAnterior && (
          <IndicadorCambio
            actual={kpis.totalRegistros}
            anterior={kpisAnterior.totalRegistros}
          />
        )}
      </div>
    </div>

    {/* % Cumplimiento */}
    <div className="dsh-mnt-kpi-card is-success">
      <FaCircleCheck className="dsh-mnt-kpi-icon success" />
      <div>
        <div className="dsh-mnt-kpi-label">% Cumplimiento</div>
        <div className="dsh-mnt-kpi-value">
          {(kpis.cumplimiento || 0).toFixed(1)}%
        </div>
        {kpisAnterior && (
          <IndicadorCambio
            actual={kpis.cumplimiento}
            anterior={kpisAnterior.cumplimiento}
          />
        )}
      </div>
    </div>

    {/* MTTR (días) */}
    <div className="dsh-mnt-kpi-card is-info">
      <FaHourglassHalf className="dsh-mnt-kpi-icon info" />
      <div>
        <div className="dsh-mnt-kpi-label">MTTR (días)</div>
        <div className="dsh-mnt-kpi-value">{(kpis.mttr || 0).toFixed(1)}</div>
        {kpisAnterior && (
          <IndicadorCambio actual={kpis.mttr} anterior={kpisAnterior.mttr} />
        )}
      </div>
    </div>

    {/* Costo Promedio */}
    <div className="dsh-mnt-kpi-card is-accent">
      <FaMoneyBillWave className="dsh-mnt-kpi-icon accent" />
      <div>
        <div className="dsh-mnt-kpi-label">Costo Promedio</div>
        <div className="dsh-mnt-kpi-value">
          {formatCurrency(kpis.costoPromedio)}
        </div>
        {kpisAnterior && (
          <IndicadorCambio
            actual={kpis.costoPromedio}
            anterior={kpisAnterior.costoPromedio}
          />
        )}
      </div>
    </div>

    {/* Total Invertido */}
    <div className="dsh-mnt-kpi-card is-warning">
      <FaMoneyBillWave className="dsh-mnt-kpi-icon warning" />
      <div>
        <div className="dsh-mnt-kpi-label">Total Invertido</div>
        <div className="dsh-mnt-kpi-value">
          {formatCurrency(kpis.totalPrecio)}
        </div>
        {kpisAnterior && (
          <IndicadorCambio
            actual={kpis.totalPrecio}
            anterior={kpisAnterior.totalPrecio}
          />
        )}
      </div>
    </div>

    {/* Tickets Abiertos */}
    <div className="dsh-mnt-kpi-card is-danger">
      <FaTriangleExclamation className="dsh-mnt-kpi-icon danger" />
      <div>
        <div className="dsh-mnt-kpi-label">Tickets Abiertos</div>
        <div className="dsh-mnt-kpi-value">{kpis.abiertos}</div>
        {kpisAnterior && (
          <IndicadorCambio
            actual={kpis.abiertos}
            anterior={kpisAnterior.abiertos}
          />
        )}
      </div>
    </div>
  </div>
));
KPIs.displayName = "KPIs";

const Filtros = memo(
  ({
    from,
    to,
    sede,
    estadoFiltro,
    sedesOpts,
    setFrom,
    setTo,
    setSede,
    setEstadoFiltro,
    loadData,
  }) => (
    <div className="dsh-mnt-filter-panel">
      <h3 className="dsh-mnt-panel-title">
        <FaFilter /> Filtros de Datos
        <span
          style={{ fontSize: "0.8em", color: "#666", fontWeight: "normal" }}
        >
          (Rango por defecto: Año Actual)
        </span>
      </h3>

      <div className="dsh-mnt-filter-group">
        <div className="dsh-mnt-filter-item">
          <label className="dsh-mnt-label">
            <FaCalendarDays /> Desde
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="dsh-mnt-input"
          />
        </div>
        <div className="dsh-mnt-filter-item">
          <label className="dsh-mnt-label">
            <FaCalendarDays /> Hasta
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="dsh-mnt-input"
          />
        </div>
        <div className="dsh-mnt-filter-item">
          <label className="dsh-mnt-label">
            <FaWarehouse /> Sede
          </label>
          <select
            value={sede}
            onChange={(e) => setSede(e.target.value)}
            className="dsh-mnt-input"
          >
            <option value="">Todas las sedes</option>
            {sedesOpts.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="dsh-mnt-filter-item">
          <label className="dsh-mnt-label">
            <FaCircleCheck /> Estado
          </label>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="dsh-mnt-input"
          >
            <option value="">Todos</option>
            <option value="completado">Completado</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_curso">En Curso</option>
            <option value="no_completado">No Completado</option>
          </select>
        </div>

        <div className="dsh-mnt-filter-actions">
          <button
            className="dsh-mnt-btn dsh-mnt-btn-primary"
            onClick={loadData}
          >
            <FaFilter /> Aplicar filtros
          </button>
          <button
            className="dsh-mnt-btn dsh-mnt-btn-secondary"
            onClick={() => {
              // Revertir a valores por defecto (Año Actual)
              setSede("");
              setEstadoFiltro("");
              setFrom(toDateInput(startOfCurrentYear()));
              setTo(toDateInput(new Date()));
            }}
          >
            <FaBroom /> Limpiar
          </button>
        </div>
      </div>
    </div>
  )
);
Filtros.displayName = "Filtros";

// ====================================================================
// --- COMPONENTE PRINCIPAL ---
// ====================================================================

const DashboardMantenimiento = () => {
  const { setLoading, loading } = useOutletContext();

  // --- Estados para Filtros ---
  const [from, setFrom] = useState(toDateInput(startOfCurrentYear()));
  const [to, setTo] = useState(toDateInput(new Date()));
  const [sede, setSede] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");

  const [sedesOpts, setSedesOpts] = useState([]);

  // --- Estados para Datos y KPIs ---
  const [data, setData] = useState([]);
  const [kpis, setKpis] = useState({
    totalRegistros: 0,
    completados: 0,
    pendientes: 0,
    abiertos: 0,
    totalPrecio: 0,
    costoPromedio: 0,
    cumplimiento: 0,
    mttr: 0,
  });
  const [kpisAnterior, setKpisAnterior] = useState(null);
  const [porEstado, setPorEstado] = useState({});
  const [err, setErr] = useState("");

  // ✅ NUEVO: Estados para usuario y superadmin
  const [userEmail, setUserEmail] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // ✅ NUEVO: Lista de superadmins (misma que en HistorialActividadesPage)
  const SUPER_ADMINS = [
    "juanmerkahorro@gmail.com",
    "desarrollo@merkahorrosas.com",
  ];

  // ✅ NUEVO: useEffect para obtener el email del usuario
  useEffect(() => {
    const getUserEmail = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email) {
          const email = session.user.email.toLowerCase();
          setUserEmail(email);
          
          const esAdmin = SUPER_ADMINS.map(e => e.toLowerCase()).includes(email);
          setIsSuperAdmin(esAdmin);
          
          if (esAdmin) {
            console.log(`🔑 Dashboard - Usuario ${email} identificado como SUPERADMIN`);
          }
        }
      } catch (error) {
        console.error("Error obteniendo usuario:", error);
        setUserEmail("");
        setIsSuperAdmin(false);
      }
    };
    getUserEmail();
  }, []);

  // --- Lógica de Carga y Cálculo (Optimizada) ---

  const calcularKPIs = useCallback((registros) => {
    const estadoStats = {};
    const sedeStats = new Set();

    let precioSum = 0;
    let completados = 0;
    let abiertos = 0;
    let totalDiasCierre = 0;
    let ordenesConCierre = 0;

    for (const r of registros) {
      const estadoKey = String(r.estado || "").toLowerCase() || "sin_estado";
      const precio = Number(r.precio || 0);

      estadoStats[estadoKey] = (estadoStats[estadoKey] || 0) + 1;

      if (Number.isFinite(precio)) precioSum += precio;
      if (estadoKey === "completado") completados += 1;
      if (estadoKey !== "completado") abiertos += 1; // Simplificado: abierto es cualquier cosa que no sea completado.

      if (r.sede) sedeStats.add(r.sede);

      if (r.fecha_inicio && r.fecha_final) {
        const inicio = new Date(r.fecha_inicio);
        const fin = new Date(r.fecha_final);
        if (
          !Number.isNaN(inicio.getTime()) &&
          !Number.isNaN(fin.getTime()) &&
          fin >= inicio
        ) {
          totalDiasCierre += (fin - inicio) / (1000 * 60 * 60 * 24);
          ordenesConCierre += 1;
        }
      }
    }

    // Nota: pendiente/en_curso ya no se usan como KPI separado
    const totalRegistros = registros.length;
    const costoPromedio = totalRegistros ? precioSum / totalRegistros : 0;
    const cumplimiento = totalRegistros
      ? (completados / totalRegistros) * 100
      : 0;
    const mttr = ordenesConCierre ? totalDiasCierre / ordenesConCierre : 0;

    return {
      stats: estadoStats,
      opts: { sedes: Array.from(sedeStats).sort() },
      kpis: {
        totalRegistros,
        completados,
        pendientes: estadoStats["pendiente"] || 0, // Mantener para el KPI aunque la lógica de "abiertos" lo englobe.
        abiertos,
        totalPrecio: precioSum,
        costoPromedio,
        cumplimiento,
        mttr,
      },
    };
  }, []);

  const loadPeriodoAnterior = useCallback(
    async (currentKpisResult) => {
      const { from: prevFrom, to: prevTo } = calcularPeriodoAnterior(from, to);

      try {
        const queryFn = () => {
          let query = supabase
            .from("registro_mantenimiento")
            .select(
              "sede, actividad, precio, estado, fecha_inicio, fecha_final"
            );

          query = query
            .gte("fecha_inicio", prevFrom)
            .lte("fecha_inicio", prevTo);

          if (sede) query = query.eq("sede", sede);
          if (estadoFiltro) query = query.eq("estado", estadoFiltro);

          return query;
        };

        const { data: resData, error } = await supabaseQuery(queryFn);

        if (!error && resData) {
          const { kpis: prevKpis } = calcularKPIs(resData);
          setKpisAnterior(prevKpis);
        } else {
          setKpisAnterior(null);
        }
      } catch (e) {
        setKpisAnterior(null);
      }
    },
    [from, to, sede, estadoFiltro, calcularKPIs]
  );

  const loadData = useCallback(async () => {
    // ✅ CAMBIO: No cargar datos hasta tener el email del usuario
    if (!userEmail) {
      console.log("⏳ Esperando email del usuario...");
      return;
    }

    setLoading(true);
    setErr("");
    try {
      const queryFn = () => {
        let query = supabase
          .from("registro_mantenimiento")
          .select("*")
          .order("fecha_inicio", { ascending: false });

        if (from && to) {
          query = query.gte("fecha_inicio", from).lte("fecha_inicio", to);
        }

        if (sede) query = query.eq("sede", sede);
        if (estadoFiltro) query = query.eq("estado", estadoFiltro);

        return query;
      };

      const { data: resData, error } = await supabaseQuery(queryFn);

      if (error) throw new Error(error.message);

      // ✅ NUEVO: Filtrar datos según el usuario
      let filteredData;
      
      if (isSuperAdmin) {
        // 🔑 SUPERADMIN: Ver TODOS los registros
        console.log(`🔓 Dashboard - Mostrando TODOS los registros (${resData.length}) para superadmin ${userEmail}`);
        filteredData = resData || [];
      } else {
        // 👤 USUARIO NORMAL: Ver solo registros donde es creador o responsable
        filteredData = (resData || []).filter(task => {
          return task.creador_email === userEmail || task.responsable === userEmail;
        });
        console.log(`🔒 Dashboard - Mostrando ${filteredData.length} de ${resData.length} registros filtrados para ${userEmail}`);
      }

      setData(filteredData);

      const { stats, opts, kpis: currentKpis } = calcularKPIs(filteredData);
      setKpis(currentKpis);
      setPorEstado(stats);
      setSedesOpts(opts.sedes);

      await loadPeriodoAnterior(currentKpis);
    } catch (error) {
      setErr(`Error de conexión o datos: ${error.message}`);
      setData([]);
      setKpis({
        totalRegistros: 0,
        completados: 0,
        pendientes: 0,
        abiertos: 0,
        totalPrecio: 0,
        costoPromedio: 0,
        cumplimiento: 0,
        mttr: 0,
      });
      setKpisAnterior(null);
    } finally {
      setLoading(false);
    }
  }, [
    from,
    to,
    sede,
    estadoFiltro,
    setLoading,
    calcularKPIs,
    loadPeriodoAnterior,
    userEmail, // ✅ NUEVO: Agregar userEmail como dependencia
    isSuperAdmin // ✅ NUEVO: Agregar isSuperAdmin como dependencia
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ====================================================================
  // --- DATOS DE GRÁFICOS (useMemo) --- (Se unifica la lógica de Chart.js)
  // ====================================================================

  const {
    pieData,
    lineDataMemo,
    stackedBarData,
    topActividadesData,
    sedesCostoData,
  } = useMemo(() => {
    const getStatusColor = (estado) => {
      switch (estado) {
        case "completado":
          return chartColors.success;
        case "pendiente":
          return chartColors.warning;
        case "en_curso":
          return chartColors.info;
        case "no_completado":
          return chartColors.danger;
        default:
          return chartColors.primary;
      }
    };

    // 1. Registros por Estado (Pie Chart)
    const estados = Object.keys(porEstado || {});
    const cantidades = Object.values(porEstado || {});
    const pieData = {
      labels: estados.map((estado) => formatEstadoLabel(estado)),
      datasets: [
        {
          data: cantidades,
          backgroundColor: estados.map((estado) => getStatusColor(estado)),
          borderColor: estados.map((estado) => getStatusColor(estado)),
          borderWidth: 2,
        },
      ],
    };

    // 2. Mantenimientos por Mes (Line/Bar)
    const monthlyData = new Map();
    const sedesMap = new Map();
    const topActTotals = new Map();

    for (const r of data) {
      const date = r?.fecha_inicio ? new Date(r.fecha_inicio) : null;
      const precio = Number(r.precio || 0);

      if (!date || Number.isNaN(date.getTime())) continue;

      // Line/Bar Data
      const keyString = date.toLocaleDateString("es-CO", {
        month: "short",
        year: "numeric",
      });
      const key = keyString; // Usamos string como clave para la ordenación
      if (!monthlyData.has(key))
        monthlyData.set(key, { cantidad: 0, totalCosto: 0, date: date });
      const entry = monthlyData.get(key);
      entry.cantidad += 1;
      if (Number.isFinite(precio)) entry.totalCosto += precio;

      // Costo por Sede Data
      const sedeKey = r.sede || "Sin Sede";
      if (!Number.isFinite(precio) || precio <= 0) continue;
      sedesMap.set(sedeKey, (sedesMap.get(sedeKey) || 0) + precio);

      // Top Actividades Data
      const actividadKey = r.actividad || "Sin Actividad";
      topActTotals.set(
        actividadKey,
        (topActTotals.get(actividadKey) || 0) + precio
      );
    }

    // Ordenar los datos mensuales
    const sortedEntries = Array.from(monthlyData.entries()).sort(
      ([, a], [, b]) => a.date - b.date
    );

    const lineDataMemo = {
      labels: sortedEntries.map(([key]) => key),
      datasets: [
        {
          label: "Órdenes",
          data: sortedEntries.map(([, value]) => value.cantidad),
          borderColor: chartColors.primary,
          backgroundColor: chartColors.primary + "20",
          tension: 0.4,
          fill: true,
          yAxisID: "y",
        },
        {
          label: "Costo Total",
          data: sortedEntries.map(([, value]) => value.totalCosto),
          borderColor: chartColors.accent,
          backgroundColor: chartColors.accent + "40",
          type: "bar",
          yAxisID: "y1",
        },
      ],
    };

    // 3. Registros por Mes y Estado (Stacked Bar) - Requiere un re-pass sobre la data o re-estructurar
    const stackedMonthlyData = new Map();
    for (const r of data) {
      const date = r?.fecha_inicio ? new Date(r.fecha_inicio) : null;
      if (!date || Number.isNaN(date.getTime())) continue;

      const keyString = date.toLocaleDateString("es-CO", {
        month: "short",
        year: "numeric",
      });
      const estadoKey = String(r.estado || "").toLowerCase() || "sin_estado";

      if (!stackedMonthlyData.has(keyString))
        stackedMonthlyData.set(keyString, {});
      const entry = stackedMonthlyData.get(keyString);
      entry[estadoKey] = (entry[estadoKey] || 0) + 1;
    }
    const sortedStackedLabels = Array.from(stackedMonthlyData.keys()).sort(
      (a, b) => new Date(a) - new Date(b)
    );
    const allEstados = Array.from(
      new Set(
        Array.from(stackedMonthlyData.values()).flatMap((entry) =>
          Object.keys(entry)
        )
      )
    );
    const stackedBarData = {
      labels: sortedStackedLabels,
      datasets: allEstados.map((estado) => ({
        label: formatEstadoLabel(estado),
        data: sortedStackedLabels.map(
          (month) => stackedMonthlyData.get(month)?.[estado] || 0
        ),
        backgroundColor: getStatusColor(estado),
        borderColor: getStatusColor(estado),
        borderWidth: 1,
      })),
    };

    // 4. Top 10 Actividades por Costo (Horizontal Bar)
    const sortedTopAct = Array.from(topActTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const topActividadesData = {
      labels: sortedTopAct.map(([actividad]) => actividad),
      datasets: [
        {
          label: "Costo Total",
          data: sortedTopAct.map(([, value]) => value),
          backgroundColor: chartColors.primary,
          borderColor: chartColors.primaryLight,
          borderWidth: 1,
        },
      ],
    };

    // 5. Costo por Sede (Pie/Doughnut)
    const sortedSedes = Array.from(sedesMap.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    const sedesCostoData = {
      labels: sortedSedes.map(([sede]) => sede),
      datasets: [
        {
          label: "Costo por Sede",
          data: sortedSedes.map(([, value]) => value),
          backgroundColor: [
            chartColors.primary,
            chartColors.accent,
            chartColors.info,
            chartColors.success,
            chartColors.warning,
            chartColors.danger,
            chartColors.secondary,
          ],
          borderWidth: 2,
        },
      ],
    };

    return {
      pieData,
      lineDataMemo,
      stackedBarData,
      topActividadesData,
      sedesCostoData,
    };
  }, [data, porEstado]);

  // ====================================================================
  // --- OPCIONES DE GRÁFICOS CHART.JS (Limpias y Unificadas) ---
  // ====================================================================

  const defaultChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { font: { size: 12 } } },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#fff",
        bodyColor: "#fff",
        borderColor: chartColors.primary,
        borderWidth: 1,
      },
    },
  };

  const pieOptions = useMemo(
    () => ({
      ...defaultChartOptions,
      plugins: {
        ...defaultChartOptions.plugins,
        tooltip: {
          ...defaultChartOptions.plugins.tooltip,
          callbacks: {
            label: (context) => {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.raw / total) * 100).toFixed(1);
              return `${context.label}: ${context.raw} (${percentage}%)`;
            },
          },
        },
      },
    }),
    [defaultChartOptions]
  ); // Dependencia del defaultChartOptions

  const lineOptions = useMemo(
    () => ({
      ...defaultChartOptions,
      scales: {
        y: {
          type: "linear",
          display: true,
          position: "left",
          title: { display: true, text: "Cantidad de Órdenes" },
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          title: { display: true, text: "Costo Total (COP)" },
          grid: { drawOnChartArea: false },
          ticks: { callback: (value) => formatCurrency(value) }, // Formato de moneda en el eje
        },
        x: { title: { display: true, text: "Mes" } },
      },
      plugins: {
        ...defaultChartOptions.plugins,
        tooltip: {
          ...defaultChartOptions.plugins.tooltip,
          callbacks: {
            label: (context) => {
              if (context.datasetIndex === 1)
                return `${context.dataset.label}: ${formatCurrency(
                  context.raw
                )}`;
              return `${context.dataset.label}: ${context.raw}`;
            },
          },
        },
      },
    }),
    [defaultChartOptions]
  );

  const barOptionsHorizontal = useMemo(
    () => ({
      ...defaultChartOptions,
      indexAxis: "y",
      scales: {
        x: {
          title: { display: true, text: "Costo (COP)" },
          ticks: { callback: (value) => formatCurrency(value) },
        },
        y: { title: { display: true, text: "Actividad" } },
      },
      plugins: {
        ...defaultChartOptions.plugins,
        tooltip: {
          ...defaultChartOptions.plugins.tooltip,
          callbacks: {
            label: (context) =>
              `${context.dataset.label}: ${formatCurrency(context.raw)}`,
          },
        },
      },
    }),
    [defaultChartOptions]
  );

  const stackedOptions = useMemo(
    () => ({
      ...defaultChartOptions,
      scales: {
        x: { stacked: true, title: { display: true, text: "Mes" } },
        y: {
          stacked: true,
          title: { display: true, text: "Cantidad de Registros" },
        },
      },
    }),
    [defaultChartOptions]
  );

  // --- Renderización Principal ---
  return (
    <div className="dsh-mnt-container">
      <div className="dsh-mnt-header">
        <h2 className="dsh-mnt-title">Dashboard de Mantenimiento</h2>
        <p className="dsh-mnt-subtitle">
          Análisis completo de los registros de mantenimiento (Filtrado por:{" "}
          {from} a {to}).
        </p>
      </div>

      {/* ✅ NUEVO: Badge de superadmin (igual que en HistorialActividadesPage) */}
      {isSuperAdmin && (
        <div style={{
          marginBottom: '15px',
          padding: '12px',
          backgroundColor: '#FFF3CD',
          borderRadius: '8px',
          border: '2px solid #FFC107',
          textAlign: 'center'
        }}>
          <strong style={{ color: '#856404', fontSize: '16px' }}>
            🔑 MODO SUPERADMIN ACTIVADO
          </strong>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#856404' }}>
            Visualizando <strong>TODOS</strong> los registros del sistema ({data.length} tareas)
          </p>
        </div>
      )}

      <Filtros
        from={from}
        to={to}
        sede={sede}
        estadoFiltro={estadoFiltro}
        sedesOpts={sedesOpts}
        setFrom={setFrom}
        setTo={setTo}
        setSede={setSede}
        setEstadoFiltro={setEstadoFiltro}
        loadData={loadData}
      />

      {loading && <p className="dsh-mnt-status-msg">Cargando datos...</p>}
      {err && <p className="dsh-mnt-error-msg">Error: {err}</p>}

      {/* Se muestran KPIs si hay data o si el error/loading terminó */}
      {(!loading || data.length > 0) && (
        <KPIs kpis={kpis} kpisAnterior={kpisAnterior} />
      )}

      {/* Mensaje cuando no hay datos */}
      {!loading && !err && data.length === 0 && (
        <div className="dsh-mnt-no-data-msg">
          <FaTriangleExclamation style={{ marginRight: "8px" }} />
          <strong>No se encontraron registros</strong>
          <br />
          {/* ✅ MODIFICADO: Mensaje más claro según el tipo de usuario */}
          {isSuperAdmin 
            ? "No hay registros de mantenimiento en el sistema para el período seleccionado."
            : "No tienes registros de mantenimiento asignados o creados por ti en el período seleccionado."
          }
          <br />
          Intenta ajustar las fechas o filtros.
        </div>
      )}

      {/* Gráficos - Solo si hay datos */}
      {data.length > 0 && (
        <div className="dsh-mnt-charts-grid">
          {/* Gráfico 1: Registros por Estado (Pie) */}
          <div className="dsh-mnt-chart-card">
            <h3 className="dsh-mnt-chart-title">Registros por Estado</h3>
            <div className="dsh-mnt-chart-container">
              {pieData.labels.length > 0 ? (
                <Pie data={pieData} options={pieOptions} />
              ) : (
                <div className="dsh-mnt-chart-empty">
                  Sin datos para mostrar
                </div>
              )}
            </div>
          </div>

          {/* Gráfico 2: Costo por Sede (Doughnut) */}
          <div className="dsh-mnt-chart-card">
            <h3 className="dsh-mnt-chart-title">Costo por Sede (Inversión)</h3>
            <div className="dsh-mnt-chart-container">
              {sedesCostoData.labels.length > 0 ? (
                <Pie
                  data={sedesCostoData}
                  options={{ ...pieOptions, cutout: "70%" }}
                /> // Usamos Doughnut
              ) : (
                <div className="dsh-mnt-chart-empty">
                  Sin datos para mostrar
                </div>
              )}
            </div>
          </div>

          {/* Gráfico 3: Mantenimientos y Costo por Mes (Line/Bar Mixto) */}
          <div className="dsh-mnt-chart-card dsh-mnt-chart-card-full">
            <h3 className="dsh-mnt-chart-title">
              Tendencia: Órdenes y Costo Total Mensual
            </h3>
            <div className="dsh-mnt-chart-container">
              {lineDataMemo.labels.length > 0 ? (
                <Line data={lineDataMemo} options={lineOptions} />
              ) : (
                <div className="dsh-mnt-chart-empty">
                  Sin datos para mostrar
                </div>
              )}
            </div>
          </div>

          {/* Gráfico 4: Registros por Mes y Estado (Stacked Bar) */}
          <div className="dsh-mnt-chart-card dsh-mnt-chart-card-full">
            <h3 className="dsh-mnt-chart-title">
              Distribución de Registros por Mes y Estado
            </h3>
            <div className="dsh-mnt-chart-container">
              {stackedBarData.labels.length > 0 ? (
                <Bar data={stackedBarData} options={stackedOptions} />
              ) : (
                <div className="dsh-mnt-chart-empty">
                  Sin datos para mostrar
                </div>
              )}
            </div>
          </div>

          {/* Gráfico 5: Top 10 Actividades por Costo (Horizontal Bar) */}
          <div className="dsh-mnt-chart-card dsh-mnt-chart-card-full">
            <h3 className="dsh-mnt-chart-title">
              Top 10 Actividades más Costosas 💸
            </h3>
            <div className="dsh-mnt-chart-container">
              {topActividadesData.labels.length > 0 ? (
                <Bar data={topActividadesData} options={barOptionsHorizontal} />
              ) : (
                <div className="dsh-mnt-chart-empty">
                  Sin datos para mostrar
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardMantenimiento;
