import React, { createContext, useContext } from 'react';

const LabelContext = createContext();

export const LabelProvider = ({ children }) => {
  return (
    <LabelContext.Provider value={{ customLabels: {}, loading: false }}>
      {children}
    </LabelContext.Provider>
  );
};

export const useLabels = () => {
  return {
    L: (fieldKey, defaultLabel) => defaultLabel || fieldKey,
    customLabels: {},
    loading: false,
    refreshLabels: () => {}
  };
};

export default LabelContext;
