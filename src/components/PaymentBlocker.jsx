import React from 'react';

const PaymentBlocker = () => {
  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.iconContainer}>
          <svg style={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#e74c3c"/>
            <circle cx="12" cy="12" r="10" stroke="#e74c3c" strokeWidth="2" fill="none"/>
            <line x1="4" y1="4" x2="20" y2="20" stroke="#e74c3c" strokeWidth="2.5"/>
          </svg>
        </div>

        <h1 style={styles.title}>⚠️ Sistema Suspendido</h1>
        
        <div style={styles.messageBox}>
          <p style={styles.message}>
            Se le informó con anticipación que el <strong>último día para realizar el pago</strong> era 
            el <strong style={styles.dateHighlight}>6 de marzo de 2026</strong> para poder seguir 
            utilizando el sistema durante todo el mes de marzo.
          </p>
          <p style={styles.message}>
            Hasta que no se realice el pago correspondiente, <strong style={styles.warningText}>
            no será posible acceder a ninguna función del sistema</strong>.
          </p>
        </div>

        <div style={styles.paymentSection}>
          <h2 style={styles.paymentTitle}>💳 Datos para realizar el pago</h2>
          
          <div style={styles.paymentDetails}>
            <div style={styles.paymentRow}>
              <span style={styles.label}>CLABE:</span>
              <span style={styles.value}>012 180 01524597016 0</span>
            </div>
            <div style={styles.paymentRow}>
              <span style={styles.label}>Tarjeta:</span>
              <span style={styles.value}>4152 3139 9715 0821</span>
            </div>
            <div style={styles.paymentRow}>
              <span style={styles.label}>Titular:</span>
              <span style={styles.value}>Erick Pinzón Huerta</span>
            </div>
            <div style={styles.paymentRow}>
              <span style={styles.label}>Banco:</span>
              <span style={styles.value}>BBVA México</span>
            </div>
          </div>
        </div>

        <p style={styles.footerMessage}>
          Una vez realizado el pago, comuníquese al <strong style={{ color: '#ffffff' }}>427 163 5691</strong> para reactivar el sistema.
        </p>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999999,
    padding: '20px',
    boxSizing: 'border-box',
    overflow: 'auto',
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '550px',
    width: '100%',
    textAlign: 'center',
    border: '2px solid #e74c3c',
    boxShadow: '0 0 40px rgba(231, 76, 60, 0.3)',
  },
  iconContainer: {
    marginBottom: '20px',
  },
  icon: {
    width: '64px',
    height: '64px',
  },
  title: {
    color: '#e74c3c',
    fontSize: '28px',
    fontWeight: '700',
    margin: '0 0 24px 0',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  messageBox: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '24px',
    border: '1px solid rgba(231, 76, 60, 0.3)',
  },
  message: {
    color: '#e0e0e0',
    fontSize: '15px',
    lineHeight: '1.6',
    margin: '0 0 12px 0',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  dateHighlight: {
    color: '#f39c12',
    fontSize: '16px',
  },
  warningText: {
    color: '#e74c3c',
  },
  paymentSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '24px',
  },
  paymentTitle: {
    color: '#f39c12',
    fontSize: '18px',
    fontWeight: '600',
    margin: '0 0 16px 0',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  paymentDetails: {
    textAlign: 'left',
  },
  paymentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  label: {
    color: '#a0a0a0',
    fontSize: '14px',
    fontWeight: '600',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  value: {
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '500',
    fontFamily: "'Courier New', monospace",
    letterSpacing: '0.5px',
  },
  footerMessage: {
    color: '#a0a0a0',
    fontSize: '13px',
    margin: '0',
    fontStyle: 'italic',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
};

export default PaymentBlocker;
