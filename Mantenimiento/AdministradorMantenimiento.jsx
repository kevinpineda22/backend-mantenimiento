import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTasks, FaSpinner, FaBoxOpen, FaFileAlt, FaBuilding, FaArrowLeft, FaHistory } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { supabase } from "../../supabaseClient";
import { Link, Outlet, useLocation } from "react-router-dom";
import "./AdministradorMantenimiento.css";
import { getAssetUrl } from "../../config/storage";

const AdministradorMantenimiento = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    fetchUser();
  }, []);

  // Memoize the sidebar to prevent it from re-rendering
  const MemoizedSidebar = useMemo(() => (
    <motion.div
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5 }}
      className="adm-maint-sidebar"
    >
      <div className="adm-maint-sidebar-header">
        <Link to="/acceso" className="adm-maint-back-button" title="Volver a Acceso">
          <FaArrowLeft />
        </Link>
        <div className="adm-maint-header-content">
          <img
            src={getAssetUrl("mkicono.webp")}
            alt="Logo de la Empresa"
            className="adm-maint-sidebar-logo"
          />
          <h2 className="adm-maint-sidebar-title">Panel Mantenimiento</h2>
        </div>
      </div>
      <nav className="adm-maint-sidebar-nav">
        <Link
          to="registro_actividad"
          className={`adm-maint-nav-button ${
            location.pathname.endsWith("/registro_actividad") ||
            location.pathname.endsWith("/mantenimiento")
              ? "adm-maint-nav-button-active"
              : ""
          }`}
        >
          <FaTasks className="adm-maint-nav-icon" /> Registro de Actividad
        </Link>
        <Link
          to="historial_actividades"
          className={`adm-maint-nav-button ${
            location.pathname.endsWith("/historial_actividades")
              ? "adm-maint-nav-button-active"
              : ""
          }`}
        >
          <FaHistory className="adm-maint-nav-icon" /> Historial de Actividades
        </Link>
        <Link
          to="inventario"
          className={`adm-maint-nav-button ${
            location.pathname.endsWith("/inventario")
              ? "adm-maint-nav-button-active"
              : ""
          }`}
        >
          <FaBoxOpen className="adm-maint-nav-icon" /> Inventario
        </Link>
        <Link
          to="hoja_de_vida"
          className={`adm-maint-nav-button ${
            location.pathname.endsWith("/hoja_de_vida")
              ? "adm-maint-nav-button-active"
              : ""
          }`}
        >
          <FaFileAlt className="adm-maint-nav-icon" /> Hoja de Vida
        </Link>
        <Link
          to="dashboard"
          className={`adm-maint-nav-button ${
            location.pathname.endsWith("/dashboard")
              ? "adm-maint-nav-button-active"
              : ""
          }`}
        >
          <FaBuilding className="adm-maint-nav-icon" /> Tabla de Control
        </Link>
      </nav>
    </motion.div>
  ), [location.pathname]);

  return (
    <div className="adm-maint-panel-container">
      <ToastContainer position="top-center" autoClose={4000} />
      {MemoizedSidebar}
      <div className="adm-maint-content-area">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="adm-maint-main-title"
        >
          Administrador de Mantenimiento
        </motion.h1>
        <AnimatePresence mode="wait">
          <Outlet context={{ setLoading, loading }} />
        </AnimatePresence>
        {loading && (
          <div className="adm-maint-loading-overlay">
            <FaSpinner className="adm-maint-spinner" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdministradorMantenimiento;