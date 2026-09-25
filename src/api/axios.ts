import axios from "axios";
import { storage } from "../utils/storage";

const getApiBaseUrl = (): string => {
  const environment = import.meta as unknown as {
    env?: {
      VITE_API_BASE_URL?: string;
    };
  };

  if (environment.env?.VITE_API_BASE_URL) {
    return environment.env.VITE_API_BASE_URL;
  }

  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:5000/api";
  }

  return "https://finance-manager-backend-qmw1.onrender.com/api";
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = storage.getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const axiosError = error as {
      response?: {
        status?: number;
      };
    };

    if (axiosError.response?.status === 401) {
      storage.removeToken();
    }

    return Promise.reject(error);
  }
);

export default api;