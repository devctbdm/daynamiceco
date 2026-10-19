export function parseUserAgent(ua) {
  const result = { browser: 'Unknown', os: 'Unknown', device: 'Desktop' };

  if (!ua) return result;

  // Browser
  if (ua.includes('Edg')) result.browser = 'Edge';
  else if (ua.includes('Chrome')) result.browser = 'Chrome';
  else if (ua.includes('Firefox')) result.browser = 'Firefox';
  else if (ua.includes('Safari')) result.browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR')) result.browser = 'Opera';

  // OS
  if (ua.includes('Windows NT')) result.os = 'Windows';
  else if (ua.includes('Mac OS X')) result.os = 'macOS';
  else if (ua.includes('Linux')) result.os = 'Linux';
  else if (ua.includes('Android')) result.os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) result.os = 'iOS';

  // Device
  if (ua.includes('iPhone')) result.device = 'iPhone';
  else if (ua.includes('iPad')) result.device = 'iPad';
  else if (ua.includes('Android')) result.device = 'Mobile';
  else if (ua.includes('Mobile')) result.device = 'Mobile';

  return result;
}
