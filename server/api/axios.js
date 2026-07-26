import axios from "axios";

const LOCAL_API = "http://localhost:5000";
const PROD_API = import.meta.env.VITE_API_URL;

// If running Vite locally use localhost backend,
// otherwise use the deployed backend.
const baseURL =
  window.location.hostname === "localhost"
    ? LOCAL_API
    : PROD_API;

const API = axios.create({
  baseURL,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;