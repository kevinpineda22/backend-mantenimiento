import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTasks, FaSpinner, FaUserTie, FaArrowLeft, FaPlus, FaClipboardList } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { supabase } from "../../supabaseClient";
import { Link, Outlet, useLocation } from "react-router-dom";
import "./AdministradorMantenimiento.css"; // Reutilizar estilos
import { getAssetUrl } from "../../config/storage";

const LiderSST = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  // Correos autorizados para ver el historial completo
  const SST_ADMINS = [
    "sistemageneralsst@merkahorrosas.com",
    "auxiliarsst@merkahorrosas.com",
    "juanmerkahorro@gmail.com",
    "johanmerkahorro777@gmail.com",
    "aprendizsst@merkahorrosas.com"
  ];

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    fetchUser();
  }, []);

  // Verificar si el usuario es SST Admin
  const isSSTAdmin = useMemo(() => {
    return user?.email && SST_ADMINS.includes(user.email.toLowerCase());
  }, [user]);

  // Sidebar para Líder/SST (CON OPCIÓN DE HISTORIAL COMPLETO PARA SST ADMINS)
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
          <h2 className="adm-maint-sidebar-title">Panel Actividades</h2>
        </div>
      </div>
      <nav className="adm-maint-sidebar-nav">
        <Link
          to="asignar_tarea"
          className={`adm-maint-nav-button ${
            location.pathname.endsWith("/asignar_tarea") ||
            location.pathname.endsWith("/lider-sst")
              ? "adm-maint-nav-button-active"
              : ""
          }`}
        >
          <FaPlus className="adm-maint-nav-icon" /> Asignar Tarea
        </Link>
        <Link
          to="mis_tareas_asignadas"
          className={`adm-maint-nav-button ${
            location.pathname.endsWith("/mis_tareas_asignadas")
              ? "adm-maint-nav-button-active"
              : ""
          }`}
        >
          <FaUserTie className="adm-maint-nav-icon" /> Mis Tareas Asignadas
        </Link>
        <Link
          to="tareas_recibidas"
          className={`adm-maint-nav-button ${
            location.pathname.endsWith("/tareas_recibidas")
              ? "adm-maint-nav-button-active"
              : ""
          }`}
        >
          <FaTasks className="adm-maint-nav-icon" /> Tareas Que Me Asignaron
        </Link>
        
        {/* 🔒 SOLO VISIBLE PARA SST ADMINS */}
        {isSSTAdmin && (
          <Link
            to="historial_completo"
            className={`adm-maint-nav-button ${
              location.pathname.endsWith("/historial_completo")
                ? "adm-maint-nav-button-active"
                : ""
            }`}
            style={{ 
              borderLeft: "4px solid #4caf50",
              backgroundColor: location.pathname.endsWith("/historial_completo") 
                ? "rgba(76, 175, 80, 0.1)" 
                : "transparent"
            }}
          >
            <FaClipboardList className="adm-maint-nav-icon" /> Historial Completo SST
          </Link>
        )}
      </nav>
    </motion.div>
  ), [location.pathname, isSSTAdmin]);

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
          Panel de Actividades
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

export default LiderSST;
