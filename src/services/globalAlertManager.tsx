import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { ThemedAlert, AlertButton } from '@/components/themed';

// ------------------------------
// 🔧 Global Alert Types
// ------------------------------
export type CustomAlertOptions = {
  icon?: string;
  iconColor?: string;
};

export type GlobalAlertState = {
  visible: boolean;
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  options?: CustomAlertOptions;
};

// ------------------------------
// 🧱 Global Alert Store
// ------------------------------
let globalAlertState: GlobalAlertState = {
  visible: false,
};

let alertStateListeners: Array<(state: GlobalAlertState) => void> = [];

// ------------------------------
// 🚀 Native Alert (No Override)
// ------------------------------
// Alert.alert() is now using native OS dialogs
// No interception - all alerts use native system dialogs

// ------------------------------
// 🪄 Hook: useGlobalAlert
// ------------------------------
export const useGlobalAlert = () => {
  const [alertState, setAlertState] = useState<GlobalAlertState>(globalAlertState);

  useEffect(() => {
    const listener = (state: GlobalAlertState) => setAlertState({ ...state });
    alertStateListeners.push(listener);

    return () => {
      alertStateListeners = alertStateListeners.filter((l) => l !== listener);
    };
  }, []);

  const handleClose = () => {
    globalAlertState = { visible: false };
    alertStateListeners.forEach((listener) => listener(globalAlertState));
  };

  return { alertState, handleClose };
};

// ------------------------------
// 🧩 Helper: reset / trigger manually (optional)
// ------------------------------
export const showGlobalAlert = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: CustomAlertOptions
) => {
  globalAlertState = {
    visible: true,
    title,
    message,
    buttons: buttons || [{ text: 'OK' }],
    options: options || { icon: 'information-circle', iconColor: '#3b82f6' },
  };
  alertStateListeners.forEach((listener) => listener(globalAlertState));
};

export const hideGlobalAlert = () => {
  globalAlertState = { visible: false };
  alertStateListeners.forEach((listener) => listener(globalAlertState));
};

// ------------------------------
// 🧩 Provider Component
// ------------------------------
export const GlobalAlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { alertState, handleClose } = useGlobalAlert();

  return (
    <>
      {children}
      {alertState.visible && (
        <ThemedAlert
          visible={alertState.visible}
          title={alertState.title}
          message={alertState.message}
          buttons={alertState.buttons || [{ text: 'OK' }]}
          onClose={handleClose}
          icon={alertState.options?.icon}
          iconColor={alertState.options?.iconColor}
        />
      )}
    </>
  );
};

export default GlobalAlertProvider;

