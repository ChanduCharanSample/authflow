import axios from 'axios';

const configuredBaseUrl = String(import.meta.env.VITE_API_URL || '').trim();
const developmentFallback = import.meta.env.DEV
  ? 'http://localhost:5000/api'
  : '';
const apiBaseUrl = (configuredBaseUrl || developmentFallback).replace(
  /\/+$/,
  ''
);

if (!apiBaseUrl) {
  throw new Error(
    'VITE_API_URL must be set to the deployed API URL (for example https://your-api.onrender.com/api).'
  );
}

const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

/**
 * Turn an Axios error into a friendly message without exposing internals.
 */
export const getErrorMessage = (error) => {
  const response = error?.response;

  if (response?.data?.errors?.length) {
    return response.data.errors[0].message;
  }

  if (response?.data?.message) {
    return response.data.message;
  }

  if (error?.code === 'ECONNABORTED') {
    return 'The request timed out. Please try again.';
  }

  if (!response) {
    return 'Unable to reach the server. Check that the API is running and try again.';
  }

  return 'Something went wrong. Please try again.';
};

export default api;
