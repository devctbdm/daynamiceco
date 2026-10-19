import metaConfig, { isMetaCredentialsConfigured } from "../config/meta.js";

export const getMetaStatus = async (_req, res) => {
  if (!metaConfig.enabled) {
    return res.json({
      success: true,
      connected: false,
      enabled: false,
      message:
        "Meta catalog sync is disabled. Set META_CATALOG_SYNC_ENABLED=true.",
    });
  }

  if (!isMetaCredentialsConfigured()) {
    return res.status(400).json({
      success: false,
      connected: false,
      enabled: true,
      message:
        "Meta catalog credentials are missing or still using placeholders.",
    });
  }

  try {
    const url = new URL(
      `${metaConfig.graphUrl}/${metaConfig.apiVersion}/${metaConfig.catalogId}`,
    );
    url.searchParams.set("fields", "id,name,product_count");
    url.searchParams.set("access_token", metaConfig.accessToken);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(502).json({
        success: false,
        connected: false,
        enabled: true,
        message: data.error?.message || "Meta rejected the catalog connection.",
      });
    }

    return res.json({
      success: true,
      connected: true,
      enabled: true,
      catalog: {
        id: data.id,
        name: data.name || "",
        productCount: data.product_count ?? null,
      },
      message: "Meta catalog connection is working.",
    });
  } catch (error) {
    return res.status(502).json({
      success: false,
      connected: false,
      enabled: true,
      message: error.message || "Could not reach Meta Graph API.",
    });
  }
};
