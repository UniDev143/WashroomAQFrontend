const stripTrailingSlash = (value) => value.replace(/\/$/, '');

const DEFAULT_BACKEND_URL = 'http://localhost:5001';

const rawApiUrl = import.meta.env.VITE_API_URL || DEFAULT_BACKEND_URL;
const rawSocketUrl = import.meta.env.VITE_SOCKET_URL || rawApiUrl;

export const API_BASE_URL = stripTrailingSlash(rawApiUrl);
export const SOCKET_URL = stripTrailingSlash(rawSocketUrl);
