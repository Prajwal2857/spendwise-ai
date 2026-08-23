"use client";

import { useStore } from "@/store/useStore";

const API_BASE = "/api";

async function fetchAPI<T>(
  url: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

export function useApi() {
  const { token } = useStore();

  return {
    get: <T>(url: string) => fetchAPI<T>(url, {}, token),
    post: <T>(url: string, body: unknown) =>
      fetchAPI<T>(url, { method: "POST", body: JSON.stringify(body) }, token),
    put: <T>(url: string, body: unknown) =>
      fetchAPI<T>(url, { method: "PUT", body: JSON.stringify(body) }, token),
    del: <T>(url: string) =>
      fetchAPI<T>(url, { method: "DELETE" }, token),
    upload: <T>(url: string, formData: FormData) => {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return fetch(`${API_BASE}${url}`, {
        method: "POST",
        headers,
        body: formData,
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        return data as T;
      });
    },
  };
}
