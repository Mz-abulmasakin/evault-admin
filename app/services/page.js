"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProtectedLayout from "../../components/ProtectedLayout";
import api from "../../lib/api";
import { getAdminToken } from "../../lib/auth";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://evault-backend-lm13.onrender.com/api/v1"
).replace(/\/+$/, "");

const SERVICE_TYPES = ["ALL", "CAC", "TIN", "SCUML"];

const STATUS_FILTERS = [
  "ALL",
  "PENDING",
  "SUBMITTED",
  "UNDER_REVIEW",
  "PROCESSING",
  "COMPLETED",
  "REJECTED",
];

const STATUS_ACTIONS = [
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "PROCESSING", label: "Processing" },
  { value: "REJECTED", label: "Rejected" },
];

function unwrapData(payload) {
  if (!payload || typeof payload !== "object") return {};
  return payload.data ?? payload;
}

function extractRequests(payload) {
  const data = unwrapData(payload);

  if (Array.isArray(data)) return data;

  const rows =
    data.requests ??
    data.serviceRequests ??
    data.service_requests ??
    data.items ??
    data.rows ??
    data.results ??
    data.data;

  return Array.isArray(rows) ? rows : [];
}

function extractRequest(payload) {
  const data = unwrapData(payload);

  return (
    data.request ??
    data.serviceRequest ??
    data.service_request ??
    data
  );
}

function getIdentifier(request) {
  if (!request) return "";

  return String(
    request.request_id ??
    request.requestId ??
    request.id ??
    request.reference ??
    ""
  );
}

function getServiceType(request) {
  return String(
    request?.service_type ??
    request?.serviceType ??
    request?.type ??
    "SERVICE"
  ).toUpperCase();
}

function getCustomerName(request) {
  return (
    request?.full_name ??
    request?.customer_name ??
    request?.user_full_name ??
    request?.customer?.full_name ??
    request?.user?.full_name ??
    "Customer"
  );
}

function getReference(request) {
  return (
    request?.reference ??
    request?.request_reference ??
    request?.request_id ??
    request?.id ??
    "—"
  );
}

function getDocuments(request) {
  const documents =
    request?.documents ??
    request?.service_documents ??
    request?.attachments ??
    [];

  return Array.isArray(documents) ? documents : [];
}

function getDocumentName(document) {
  return (
    document?.file_name ??
    document?.fileName ??
    document?.document_name ??
    document?.name ??
    "Document"
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatStatus(value) {
  return String(value || "PENDING")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function StatusBadge({ status }) {
  const value = String(status || "PENDING").toUpperCase();

  const styles = {
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
    SUBMITTED: "border-amber-200 bg-amber-50 text-amber-700",
    UNDER_REVIEW: "border-purple-200 bg-purple-50 text-purple-700",
    PROCESSING: "border-blue-200 bg-blue-50 text-blue-700",
    COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    REJECTED: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-bold ${
        styles[value] || "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {formatStatus(value)}
    </span>
  );
}

function SectionHeading({ title, subtitle }) {
  return (
    <div>
      <h2 className="text-base font-extrabold text-[#142747]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default function ServicesPage() {
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [nextStatus, setNextStatus] = useState("UNDER_REVIEW");
  const [uploadFiles, setUploadFiles] = useState([]);

  const selectedDocuments = useMemo(
    () => getDocuments(selectedRequest),
    [selectedRequest]
  );

  const loadDetails = useCallback(async (identifier) => {
    if (!identifier) return;

    setDetailLoading(true);
    setError("");

    try {
      const response = await api.get(
        `/admin/services/requests/${encodeURIComponent(identifier)}`
      );

      const payload = response.data;

      if (payload?.success === false) {
        throw new Error(payload.message || "Unable to load request details.");
      }

      const request = extractRequest(payload);

      setSelectedRequest(request);
      setNextStatus(
        String(request?.status || "UNDER_REVIEW").toUpperCase() ===
          "UNDER_REVIEW"
          ? "PROCESSING"
          : "UNDER_REVIEW"
      );
    } catch (err) {
      setError(err.message || "Unable to load service request details.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "100",
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (serviceFilter !== "ALL") {
        params.set("serviceType", serviceFilter);
      }

      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }

      const response = await api.get(
        `/admin/services/requests?${params.toString()}`
      );

      const payload = response.data;

      if (payload?.success === false) {
        throw new Error(payload.message || "Unable to load service requests.");
      }

      const rows = extractRequests(payload);

      setRequests(rows);

      if (selectedId) {
        const stillVisible = rows.some(
          (item) => getIdentifier(item) === selectedId
        );

        if (!stillVisible) {
          setSelectedId("");
          setSelectedRequest(null);
        }
      }
    } catch (err) {
      setError(err.message || "Unable to load service requests.");
    } finally {
      setLoading(false);
    }
  }, [search, serviceFilter, statusFilter, selectedId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function openRequest(request) {
    const identifier = getIdentifier(request);

    if (!identifier) {
      setError("This request does not have a usable request identifier.");
      return;
    }

    setSelectedId(identifier);
    setSelectedRequest(request);

    await loadDetails(identifier);
  }

  async function updateStatus(event) {
    event.preventDefault();

    if (!selectedId || !nextStatus) return;

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.patch(
        `/admin/services/requests/${encodeURIComponent(selectedId)}/status`,
        { status: nextStatus }
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message || "Unable to update service status."
        );
      }

      setMessage("Service request status updated successfully.");

      await loadDetails(selectedId);
      await loadRequests();
    } catch (err) {
      setError(err.message || "Unable to update service request status.");
    } finally {
      setActionLoading(false);
    }
  }

  async function uploadCompletedDocuments(event) {
    event.preventDefault();

    if (!selectedId) {
      setError("Select a service request first.");
      return;
    }

    if (!uploadFiles.length) {
      setError("Select at least one document to upload.");
      return;
    }

    const formData = new FormData();

    uploadFiles.forEach((file) => {
      formData.append("documents", file);
    });

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post(
        `/admin/services/requests/${encodeURIComponent(selectedId)}/documents`,
        formData
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message || "Unable to upload completed documents."
        );
      }

      setMessage(
        "Completed documents uploaded. The request has been refreshed."
      );

      setUploadFiles([]);

      await loadDetails(selectedId);
      await loadRequests();
    } catch (err) {
      setError(err.message || "Unable to upload completed documents.");
    } finally {
      setActionLoading(false);
    }
  }

  async function downloadRequestZip() {
    if (!selectedId) return;

    const token = getAdminToken();

    if (!token) {
      setError("Your admin session has expired. Please log in again.");
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/services/requests/${encodeURIComponent(
          selectedId
        )}/download-zip`,
        {
          method: "GET",
          headers: {
            Accept: "application/zip, application/json",
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        let serverMessage = "Unable to download the request documents.";

        try {
          const payload = await response.json();
          serverMessage = payload.message || serverMessage;
        } catch {
          // The server may return a non-JSON error.
        }

        throw new Error(serverMessage);
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      const disposition = response.headers.get("content-disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);

      const filename =
        filenameMatch?.[1] ||
        `${getReference(selectedRequest)}-documents.zip`;

      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(objectUrl);

      setMessage("Request documents downloaded successfully.");
    } catch (err) {
      setError(err.message || "Unable to download request documents.");
    } finally {
      setActionLoading(false);
    }
  }

  const displayedDocuments = selectedDocuments;

  return (
    <ProtectedLayout>
      <main className="min-h-full space-y-6 bg-[#f6f8fc] pb-10">
        {/* PAGE HEADER */}
        <section className="rounded-[24px] bg-gradient-to-br from-[#142e59] via-[#1d478f] to-[#2a5fd3] px-6 py-7 text-white shadow-sm sm:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200">
                eVault Administration
              </p>

              <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
                Services
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-100">
                Review CAC, TIN and SCUML applications, manage request
                statuses and provide completed customer documents.
              </p>
            </div>

            <button
              type="button"
              onClick={loadRequests}
              disabled={loading}
              className="rounded-xl bg-white px-5 py-3 text-xs font-extrabold text-[#2457b8] transition hover:bg-blue-50 disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh Requests"}
            </button>
          </div>
        </section>

        {/* FEEDBACK */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {/* SERVICE TYPE FILTER */}
        <section className="rounded-2xl border border-[#e7edf7] bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {SERVICE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setServiceFilter(type)}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                  serviceFilter === type
                    ? "bg-[#2a5fd3] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {type === "ALL" ? "All Services" : type}
              </button>
            ))}
          </div>
        </section>

        {/* SEARCH AND STATUS FILTER */}
        <section className="grid gap-3 rounded-2xl border border-[#e7edf7] bg-white p-4 shadow-sm sm:grid-cols-[1fr_220px_auto]">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") loadRequests();
            }}
            placeholder="Search reference, customer or service..."
            className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#2a5fd3] focus:ring-2 focus:ring-blue-100"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#2a5fd3]"
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status === "ALL" ? "All Statuses" : formatStatus(status)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            className="rounded-xl bg-[#142e59] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#1d478f] disabled:opacity-60"
          >
            Apply Filters
          </button>
        </section>

        {/* REQUEST LIST AND DETAILS */}
        <section className="grid items-start gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          {/* REQUEST LIST */}
          <div className="overflow-hidden rounded-2xl border border-[#e7edf7] bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <SectionHeading
                title={`Service Requests (${requests.length})`}
                subtitle="Select an application to view its details and documents."
              />
            </div>

            {loading ? (
              <div className="space-y-3 p-5">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-20 animate-pulse rounded-xl bg-slate-100"
                  />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <div className="text-3xl text-slate-300">▣</div>
                <p className="mt-3 text-sm font-bold text-slate-600">
                  No service requests found
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Try changing the service type, status or search term.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {requests.map((request, index) => {
                  const identifier = getIdentifier(request);
                  const active = identifier === selectedId;

                  return (
                    <button
                      key={identifier || index}
                      type="button"
                      onClick={() => openRequest(request)}
                      className={`block w-full px-5 py-4 text-left transition hover:bg-blue-50/60 ${
                        active ? "bg-blue-50" : "bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-lg bg-[#edf3ff] px-2.5 py-1 text-[10px] font-extrabold text-[#2a5fd3]">
                              {getServiceType(request)}
                            </span>

                            <span className="truncate text-xs font-extrabold text-[#142747]">
                              {getReference(request)}
                            </span>
                          </div>

                          <p className="mt-2 truncate text-sm font-bold text-slate-800">
                            {getCustomerName(request)}
                          </p>

                          <p className="mt-1 text-[10px] text-slate-400">
                            {formatDate(
                              request.created_at || request.createdAt
                            )}
                          </p>
                        </div>

                        <StatusBadge status={request.status} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* REQUEST DETAILS */}
          <div className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-[#e7edf7] bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <SectionHeading
                  title="Application Details"
                  subtitle="Review the selected customer's service request."
                />
              </div>

              {!selectedId ? (
                <div className="px-5 py-14 text-center">
                  <div className="text-3xl text-slate-300">▤</div>
                  <p className="mt-3 text-sm font-bold text-slate-600">
                    No application selected
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Select a request from the list to see its details.
                  </p>
                </div>
              ) : detailLoading ? (
                <div className="space-y-3 p-5">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-slate-100" />
                  <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ) : (
                <div className="space-y-5 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Request Reference
                      </p>
                      <p className="mt-1 break-all text-sm font-extrabold text-[#2a5fd3]">
                        {getReference(selectedRequest)}
                      </p>
                    </div>

                    <StatusBadge status={selectedRequest?.status} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Service Type
                      </p>
                      <p className="mt-2 text-sm font-extrabold text-[#142747]">
                        {getServiceType(selectedRequest)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Submitted
                      </p>
                      <p className="mt-2 text-xs font-bold text-[#142747]">
                        {formatDate(
                          selectedRequest?.created_at ||
                          selectedRequest?.createdAt
                        )}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Customer
                      </p>
                      <p className="mt-2 text-sm font-extrabold text-[#142747]">
                        {getCustomerName(selectedRequest)}
                      </p>
                      <p className="mt-1 break-all text-xs text-slate-500">
                        {selectedRequest?.email ||
                          selectedRequest?.user_email ||
                          selectedRequest?.customer?.email ||
                          "No email supplied"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedRequest?.phone_number ||
                          selectedRequest?.phone ||
                          selectedRequest?.customer?.phone_number ||
                          ""}
                      </p>
                    </div>
                  </div>

                  {(selectedRequest?.business_name ||
                    selectedRequest?.company_name ||
                    selectedRequest?.entity_name) && (
                    <div className="rounded-xl border border-slate-100 p-4">
                      <p className="text-[10px] font-bold uppercase text-slate-400">
                        Business / Entity
                      </p>
                      <p className="mt-2 text-sm font-bold text-[#142747]">
                        {selectedRequest.business_name ||
                          selectedRequest.company_name ||
                          selectedRequest.entity_name}
                      </p>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-[#142747]">
                          Submitted Documents
                        </h3>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {displayedDocuments.length} document(s) recorded
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={downloadRequestZip}
                        disabled={
                          actionLoading || displayedDocuments.length === 0
                        }
                        className="rounded-xl border border-[#dce7ff] bg-[#f4f7ff] px-3 py-2.5 text-[10px] font-bold text-[#2a5fd3] transition hover:bg-[#eaf0ff] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Download ZIP
                      </button>
                    </div>

                    {displayedDocuments.length === 0 ? (
                      <p className="mt-4 rounded-xl bg-slate-50 px-4 py-5 text-center text-xs text-slate-400">
                        No documents are attached to this request.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {displayedDocuments.map((document, index) => (
                          <div
                            key={document.id || index}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-slate-700">
                                {getDocumentName(document)}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                {document.mime_type ||
                                  document.mimeType ||
                                  "Document"}
                              </p>
                            </div>

                            <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">
                              {document.uploaded_by_admin_id
                                ? "COMPLETED"
                                : "SUBMITTED"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* STATUS UPDATE */}
                  <form
                    onSubmit={updateStatus}
                    className="space-y-3 border-t border-slate-100 pt-5"
                  >
                    <div>
                      <h3 className="text-sm font-extrabold text-[#142747]">
                        Update Application Status
                      </h3>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Change the current processing stage.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select
                        value={nextStatus}
                        onChange={(event) =>
                          setNextStatus(event.target.value)
                        }
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs outline-none focus:border-[#2a5fd3]"
                      >
                        {STATUS_ACTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>

                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="rounded-xl bg-[#2a5fd3] px-5 py-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        {actionLoading ? "Updating..." : "Update Status"}
                      </button>
                    </div>
                  </form>

                  {/* COMPLETED DOCUMENT UPLOAD */}
                  <form
                    onSubmit={uploadCompletedDocuments}
                    className="space-y-3 border-t border-slate-100 pt-5"
                  >
                    <div>
                      <h3 className="text-sm font-extrabold text-[#142747]">
                        Upload Completed Documents
                      </h3>
                      <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                        Attach the completed certificates, reports or other
                        customer documents. Uploading these files completes
                        the request through the backend workflow.
                      </p>
                    </div>

                    <input
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(event) =>
                        setUploadFiles(
                          Array.from(event.target.files || [])
                        )
                      }
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#eaf0ff] file:px-3 file:py-2 file:text-[10px] file:font-bold file:text-[#2a5fd3]"
                    />

                    {uploadFiles.length > 0 && (
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="mb-2 text-[10px] font-bold text-slate-500">
                          Selected files
                        </p>
                        {uploadFiles.map((file, index) => (
                          <p
                            key={`${file.name}-${index}`}
                            className="truncate py-1 text-[10px] text-slate-600"
                          >
                            {file.name}
                          </p>
                        ))}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={actionLoading || uploadFiles.length === 0}
                      className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {actionLoading
                        ? "Please wait..."
                        : "Upload Documents and Complete Request"}
                    </button>
                  </form>
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
    </ProtectedLayout>
  );
}