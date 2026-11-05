
import {
  getAdminToken,
  removeAdminToken,
} from "./auth";

// =========================================================
// EVAULT BACKEND CONFIGURATION
// =========================================================

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://evault-backend-lm13.onrender.com/api/v1"
).replace(/\/+$/, "");

// =========================================================
// HTTP REQUEST HANDLER
// =========================================================

async function request(method, path, body, options = {}) {
  const token = getAdminToken();

  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const isFormData =
    typeof FormData !== "undefined" &&
    body instanceof FormData;

  if (body !== undefined && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  let response;

  try {
    response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        method,
        headers,

        body:
          body === undefined
            ? undefined
            : isFormData
              ? body
              : JSON.stringify(body),

        cache: "no-store",
        signal: options.signal,
      }
    );
  } catch (cause) {
    const error = new Error(
      "Unable to connect to the eVault Render backend. Please check your internet connection and backend availability."
    );

    error.cause = cause;
    throw error;
  }

  // =======================================================
  // READ SERVER RESPONSE
  // =======================================================

  const contentType =
    response.headers.get("content-type") || "";

  let payload = {};

  if (contentType.includes("application/json")) {
    try {
      payload = await response.json();
    } catch {
      payload = {
        message: "Invalid JSON response from server.",
      };
    }
  } else {
    const text = await response.text();

    payload = text
      ? { message: text }
      : {};
  }

  const result = {
    data: payload,
    status: response.status,
    headers: response.headers,
  };

  // =======================================================
  // HANDLE HTTP ERRORS
  // =======================================================

  if (!response.ok) {
    if (
      response.status === 401 &&
      token
    ) {
      removeAdminToken();
    }

    const error = new Error(
      payload?.message ||
      `Request failed (${response.status}).`
    );

    error.response = result;

    throw error;
  }

  return result;
}

// =========================================================
// API METHODS
// =========================================================

const api = {
  get(path, options) {
    return request(
      "GET",
      path,
      undefined,
      options
    );
  },

  post(path, body, options) {
    return request(
      "POST",
      path,
      body,
      options
    );
  },

  patch(path, body, options) {
    return request(
      "PATCH",
      path,
      body,
      options
    );
  },

  put(path, body, options) {
    return request(
      "PUT",
      path,
      body,
      options
    );
  },

  delete(path, options) {
    return request(
      "DELETE",
      path,
      undefined,
      options
    );
  },
};

export default api;
