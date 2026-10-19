import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const SocialPreviewContext = createContext(null);

export const SocialPreviewProvider = ({ children }) => {
  const [platform, setPlatform] = useState(null);
  const [gatePassed, setGatePassed] = useState(false);

  const openPreview = useCallback((nextPlatform) => {
    setGatePassed(true);
    setPlatform(nextPlatform);
  }, []);

  const closePreview = useCallback(() => {
    setPlatform(null);
    setGatePassed(false);
  }, []);

  const acknowledgeGate = useCallback(() => {
    setGatePassed(true);
  }, []);

  const value = useMemo(
    () => ({
      platform,
      isOpen: platform !== null,
      gatePassed,
      openPreview,
      closePreview,
      acknowledgeGate,
    }),
    [platform, gatePassed, openPreview, closePreview, acknowledgeGate],
  );

  return <SocialPreviewContext.Provider value={value}>{children}</SocialPreviewContext.Provider>;
};

export const useSocialPreview = () => {
  const ctx = useContext(SocialPreviewContext);
  if (!ctx) {
    throw new Error('useSocialPreview must be used within SocialPreviewProvider');
  }
  return ctx;
};

export default SocialPreviewContext;
