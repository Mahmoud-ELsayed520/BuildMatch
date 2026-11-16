import React, { createContext, useContext, useState } from 'react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showNotification = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm transition-all duration-300 animate-slide-up bg-white border border-gray-200">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              toast.type === 'error'
                ? 'bg-red-500'
                : toast.type === 'success'
                ? 'bg-green-500'
                : 'bg-blue-500'
            }`}
          />
          <span className="text-gray-800 font-medium">{toast.message}</span>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}
