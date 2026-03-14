import { Routes, Route } from 'react-router-dom';
import { createContext, useContext } from 'react';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/ToastContainer';
import Dashboard from './pages/Dashboard';
import NuevaFactura from './pages/NuevaFactura';
import Facturas from './pages/Facturas';
import Clientes from './pages/Clientes';
import Configuracion from './pages/Configuracion';
import { useToast } from './hooks/useToast';

export const ToastContext = createContext(null);
export const useAppToast = () => useContext(ToastContext);

function App() {
  const { toasts, addToast } = useToast();

  return (
    <ToastContext.Provider value={addToast}>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/nueva-factura" element={<NuevaFactura />} />
            <Route path="/facturas" element={<Facturas />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/configuracion" element={<Configuracion />} />
          </Routes>
        </main>
        <ToastContainer toasts={toasts} />
      </div>
    </ToastContext.Provider>
  );
}

export default App;
