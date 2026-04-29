const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const getApiUrl = (path: string) => `${API_URL}${path}`;

export const fetchWithAuth = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  const response = await fetch(getApiUrl(path), {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    return response;
  }

  // Robust error handling for non-JSON responses
  const contentType = response.headers.get('content-type');
  if (!response.ok && (!contentType || !contentType.includes('application/json'))) {
    const text = await response.text();
    throw new Error(text || `Error ${response.status}: ${response.statusText}`);
  }

  return response;
};
