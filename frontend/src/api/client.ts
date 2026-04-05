import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Подставляем JWT токен в каждый запрос
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Обрабатываем 401 — токен истёк
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const refresh = localStorage.getItem("refresh_token");
        const { data } = await axios.post(
          process.env.NEXT_PUBLIC_API_URL + "/api/auth/refresh/",
          { refresh },
        );
        localStorage.setItem("access_token", data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        if (window.location.pathname !== "/admin/login") {
          window.location.href = "/admin/login";
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
