const readEnvironment = () => {
  const storeId = process.env.SSL_STORE_ID?.trim();
  const storePassword = process.env.SSL_STORE_PASSWORD?.trim();
  const liveMode = process.env.SSL_IS_LIVE?.trim().toLowerCase();

  return {
    storeId,
    storePassword,
    liveMode,
    validMode: liveMode === "true" || liveMode === "false",
  };
};

export const getSSLCommerzConfig = () => {
  const { storeId, storePassword, liveMode, validMode } = readEnvironment();

  if (!storeId || !storePassword || !validMode) {
    throw new Error("SSLCommerz environment configuration is incomplete");
  }

  return { storeId, storePassword, isLive: liveMode === "true" };
};

export const getSSLCommerzConfigStatus = () => {
  const { storeId, storePassword, liveMode, validMode } = readEnvironment();
  return {
    configured: Boolean(storeId && storePassword && validMode),
    mode: validMode ? (liveMode === "true" ? "live" : "sandbox") : null,
  };
};
