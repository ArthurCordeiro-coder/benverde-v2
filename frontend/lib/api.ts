import axios from "axios";
import Cookies from "js-cookie";

const baseURL = process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:8000";

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = Cookies.get("benverde_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
