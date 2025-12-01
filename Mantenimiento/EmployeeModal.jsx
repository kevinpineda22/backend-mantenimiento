import React from 'react';
import Modal from 'react-modal';
import { XMarkIcon } from "@heroicons/react/24/outline";

const EmployeeModal = ({ isOpen, onRequestClose, employee, dotacion }) => {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Empleado Información"
      className="maint-edit-modal-content employee-modal"
      overlayClassName="maint-edit-modal-overlay"
      ariaHideApp={false}
    >
      <button className="maint-modal-close-btn" onClick={onRequestClose}>
        <XMarkIcon width={32} height={32} />
      </button>
      <h2 style={{ borderBottom: '1px solid #ccc', paddingBottom: '10px', marginBottom: '20px' }}>Información Empleado</h2>
      {dotacion && (
        <div>
          <h3>Información Dotación</h3>
          <p><strong>Nombre:</strong> {dotacion.nombreEmpleado}</p>
          <p><strong>Cédula:</strong> {dotacion.cedulaEmpleado}</p>
          <p><strong>Cargo:</strong> {dotacion.cargoEmpleado}</p>
        </div>
      )}
      {!employee && !dotacion && (
        <p>No employee or dotación information available.</p>
      )}
    </Modal>
  );
};

export default EmployeeModal;
