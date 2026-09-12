import axios from "axios";

// In local dev, "/api" is proxied to the backend by Vite (see vite.config.ts). A static
// Vercel deployment has no such proxy, so VITE_API_BASE_URL must point at the deployed
// backend's own URL (e.g. https://your-backend.onrender.com/api) — set it in the Vercel
// project's Environment Variables.
const baseURL = import.meta.env.VITE_API_BASE_URL || "/api";

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
