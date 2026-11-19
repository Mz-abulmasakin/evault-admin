
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
    request?.customer_name ??
    request?.full_name ??
    request?.user_full_name ??
    request?.customer?.full_name ??
    request?.user?.full_name ??
    "Customer"
  );
}

function getCustomerEmail(request) {
  return (
    request?.customer_email ??
    request?.email ??
    request?.user_email ??
    request?.customer?.email ??
    request?.user?.email ??
    "No email supplied"
  );
}

function getCustomerPhone(request) {
  return (
    request?.customer_phone ??
    request?.phone_number ??
    request?.phone ??
    request?.customer?.phone_number ??
    request?.user?.phone_number ??
    "No phone number supplied"
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

function formatLabel(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function parseDetails(value) {
  if (!value) return {};

  if (typeof value === "object") {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value.length ? `${value.length} item(s)` : "None";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
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

function DetailField({ label, value, wide = false }) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    typeof value === "object"
  ) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border border-slate-100 bg-slate-50 p-3 ${
        wide ? "sm:col-span-2" : ""
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold text-[#142747]">
        {formatValue(value)}
      </p>
    </div>
  );
}

function DocumentLink({ document }) {
  const url = document?.downloadUrl || document?.download_url;
  const name = getDocumentName(document);

  if (!url) {
    return (
      <span className="text-[10px] font-semibold text-slate-400">
        Download link unavailable
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 rounded-lg bg-[#edf3ff] px-3 py-2 text-[10px] font-bold text-[#2a5fd3] hover:bg-blue-100"
      onClick={(event) => event.stopPropagation()}
      download={name}
    >
      View / Download
    </a>
  );
}

function GenericDetails({ details }) {
  const excludedKeys = new Set([
    "personnel",
    "proposedNames",
    "proposed_names",
    "officeAddress",
    "office_address",
    "businessNature",
    "business_nature",
    "shareCapital",
    "share_capital",
  ]);

  const entries = Object.entries(details || {}).filter(
    ([key, value]) =>
      !excludedKeys.has(key) &&
      value !== null &&
      value !== undefined &&
      value !== "" &&
      ![
        "storage_path",
        "storage_bucket",
        "password",
        "token",
      ].includes(key.toLowerCase())
  );

  if (!entries.length) return null;

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-extrabold text-[#142747]">
          Additional Application Information
        </h3>
        <p className="mt-1 text-[10px] text-slate-400">
          Other information submitted with this application.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map(([key, value]) => {
          if (typeof value === "object") {
            return (
              <div
                key={key}
                className="rounded-xl border border-slate-100 p-3 sm:col-span-2"
              >
                <p className="text-[10px] font-bold uppercase text-slate-400">
                  {formatLabel(key)}
                </p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs text-slate-700">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </div>
            );
          }

          return (
            <DetailField
              key={key}
              label={formatLabel(key)}
              value={value}
            />
          );
        })}
      </div>
    </section>
  );
}

function PersonnelDocuments({ documents, personnelIndex }) {
  const related = documents.filter((document) => {
    const metadata = document?.metadata || {};

    const index =
      metadata.personnelIndex ??
      metadata.personnel_index;

    return Number(index) === Number(personnelIndex);
  });

  if (!related.length) {
    return (
      <p className="mt-3 text-[10px] text-slate-400">
        No personnel documents were linked to this record.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {related.map((document, index) => (
        <div
          key={document.id || index}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 p-3"
        >
          <div className="min-w-0">
            <p className="break-words text-xs font-semibold text-slate-700">
              {formatLabel(document.document_type || "Personnel document")}
            </p>
            <p className="mt-1 break-all text-[10px] text-slate-400">
              {getDocumentName(document)}
            </p>
          </div>
          <DocumentLink document={document} />
        </div>
      ))}
    </div>
  );
}

function PersonnelSection({ personnel, documents }) {
  if (!Array.isArray(personnel) || personnel.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-extrabold text-[#142747]">
          Directors / Personnel
        </h3>
        <p className="mt-1 text-[10px] text-slate-400">
          {personnel.length} personnel member(s) supplied.
        </p>
      </div>

      <div className="space-y-3">
        {personnel.map((person, index) => (
          <div
            key={`${person?.nin || person?.fullName || "person"}-${index}`}
            className="rounded-xl border border-slate-200 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-extrabold text-[#2a5fd3]">
                Personnel {index + 1}
              </p>
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">
                {person?.role || "Personnel"}
              </span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailField
                label="Full Name"
                value={person?.fullName ?? person?.full_name}
              />
              <DetailField
                label="Role"
                value={person?.role}
              />
              <DetailField
                label="NIN"
                value={person?.nin}
                wide
              />
            </div>

            <PersonnelDocuments
              documents={documents}
              personnelIndex={index}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function ApplicationDetails({ request, documents }) {
  const details = parseDetails(request?.details);
  const proposedNames =
    details.proposedNames ??
    details.proposed_names;

  const personnel =
    details.personnel ??
    details.directors ??
    details.trustees ??
    [];

  const hasCacFields =
    proposedNames ||
    details.officeAddress ||
    details.office_address ||
    details.businessNature ||
    details.business_nature ||
    details.shareCapital ||
    details.share_capital;

  const detailEntries = Object.keys(details).length > 0;

  if (!detailEntries) {
    return (
      <div className="rounded-xl bg-amber-50 p-4">
        <p className="text-xs font-bold text-amber-800">
          No application details were returned by the server.
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-amber-700">
          The request record does not contain a readable details object.
          Check the backend request-details response if this is unexpected.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {hasCacFields && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-extrabold text-[#142747]">
              Business / Registration Information
            </h3>
            <p className="mt-1 text-[10px] text-slate-400">
              Information supplied in the application form.
            </p>
          </div>

          {Array.isArray(proposedNames) && (
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="text-[10px] font-bold uppercase text-slate-400">
                Proposed Business Names
              </p>
              <div className="mt-2 space-y-2">
                {proposedNames.map((name, index) => (
                  <p
                    key={`${name}-${index}`}
                    className="rounded-lg bg-slate-50 p-3 text-sm font-semibold text-[#142747]"
                  >
                    {index + 1}. {formatValue(name)}
                  </p>
                ))}
              </div>
            </div>
          )}

          {typeof proposedNames === "string" && (
            <DetailField
              label="Proposed Business Name"
              value={proposedNames}
              wide
            />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField
              label="Office Address"
              value={details.officeAddress ?? details.office_address}
              wide
            />
            <DetailField
              label="Business Nature"
              value={details.businessNature ?? details.business_nature}
              wide
            />
            <DetailField
              label="Share Capital"
              value={details.shareCapital ?? details.share_capital}
            />
          </div>
        </section>
      )}

      <PersonnelSection
        personnel={personnel}
        documents={documents}
      />

      <GenericDetails details={details} />
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
  const [rejectionReason, setRejectionReason] = useState("");
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
        throw new Error(
          payload.message || "Unable to load request details."
        );
      }

      const request = extractRequest(payload);

      setSelectedRequest(request);

      const currentStatus = String(
        request?.status || "PENDING"
      ).toUpperCase();

      setNextStatus(
        currentStatus === "UNDER_REVIEW"
          ? "PROCESSING"
          : "UNDER_REVIEW"
      );
    } catch (err) {
      setError(
        err.message || "Unable to load service request details."
      );
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
        throw new Error(
          payload.message || "Unable to load service requests."
        );
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
      setError(
        "This request does not have a usable request identifier."
      );
      return;
    }

    setSelectedId(identifier);
    setSelectedRequest(request);

    await loadDetails(identifier);
  }

  async function updateStatus(event) {
    event.preventDefault();

    if (!selectedId || !nextStatus) return;

    if (nextStatus === "REJECTED" && !rejectionReason.trim()) {
      setError("Enter a reason before rejecting this application.");
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.patch(
        `/admin/services/requests/${encodeURIComponent(selectedId)}/status`,
        {
          status: nextStatus,
          rejectionReason:
            nextStatus === "REJECTED"
              ? rejectionReason.trim()
              : undefined,
        }
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message || "Unable to update service status."
        );
      }

      setMessage("Service request status updated successfully.");
      setRejectionReason("");

      await loadDetails(selectedId);
      await loadRequests();
    } catch (err) {
      setError(
        err.message || "Unable to update service request status."
      );
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
          response.data.message ||
            "Unable to upload completed documents."
        );
      }

      setMessage(
        "Completed documents uploaded. The request has been refreshed."
      );

      setUploadFiles([]);

      await loadDetails(selectedId);
      await loadRequests();
    } catch (err) {
      setError(
        err.message || "Unable to upload completed documents."
      );
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
        let serverMessage =
          "Unable to download the request documents.";

        try {
          const payload = await response.json();
          serverMessage = payload.message || serverMessage;
        } catch {
          // The server may return a non-JSON error.
        }

        throw new Error(serverMessage);
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error("The server returned an empty ZIP file.");
      }

      const objectUrl = window.URL.createObjectURL(blob);

      const disposition =
        response.headers.get("content-disposition") || "";

      const filenameMatch = disposition.match(
        /filename\*?=(?:UTF-8''|")?([^";]+)/i
      );

      const filename = filenameMatch?.[1]
        ? decodeURIComponent(
            filenameMatch[1].replace(/"/g, "")
          )
        : `${getReference(selectedRequest)}-documents.zip`;

      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 1000);

      setMessage("Request documents downloaded successfully.");
    } catch (err) {
      setError(
        err.message || "Unable to download request documents."
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <ProtectedLayout>
      <main className="min-h-full space-y-6 bg-[#f6f8fc] pb-10">
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

        <section className="grid items-start gap-5 xl:grid-cols-[1.05fr_0.95fr]">
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
                <div className="text-3xl text-slate-300">⌕</div>
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
                  <div className="text-3xl text-slate-300">⌕</div>
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
                    <DetailField
                      label="Service Type"
                      value={getServiceType(selectedRequest)}
                    />

                    <DetailField
                      label="Entity Type"
                      value={
                        selectedRequest?.entity_type ??
                        selectedRequest?.entityType
                      }
                    />

                    <DetailField
                      label="Submitted"
                      value={formatDate(
                        selectedRequest?.submitted_at ||
                          selectedRequest?.created_at ||
                          selectedRequest?.createdAt
                      )}
                    />

                    <DetailField
                      label="Last Updated"
                      value={formatDate(selectedRequest?.updated_at)}
                    />

                    <DetailField
                      label="Completed At"
                      value={formatDate(selectedRequest?.completed_at)}
                    />

                    <DetailField
                      label="Payment Status"
                      value={selectedRequest?.payment_status}
                    />

                    <DetailField
                      label="Amount"
                      value={
                        selectedRequest?.amount !== null &&
                        selectedRequest?.amount !== undefined
                          ? `${selectedRequest.currency || "NGN"} ${Number(
                              selectedRequest.amount
                            ).toLocaleString("en-NG")}`
                          : null
                      }
                    />
                  </div>

                  <div className="rounded-xl border border-slate-100 p-4">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Customer Information
                    </p>

                    <p className="mt-2 text-sm font-extrabold text-[#142747]">
                      {getCustomerName(selectedRequest)}
                    </p>

                    <p className="mt-2 break-all text-xs text-slate-500">
                      {getCustomerEmail(selectedRequest)}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {getCustomerPhone(selectedRequest)}
                    </p>

                    {selectedRequest?.customer_username && (
                      <p className="mt-1 text-xs text-slate-500">
                        Username: {selectedRequest.customer_username}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <ApplicationDetails
                      request={selectedRequest}
                      documents={selectedDocuments}
                    />
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-[#142747]">
                          Application Documents
                        </h3>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {selectedDocuments.length} document(s) recorded
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={downloadRequestZip}
                        disabled={
                          actionLoading || selectedDocuments.length === 0
                        }
                        className="rounded-xl border border-[#dce7ff] bg-[#f4f7ff] px-3 py-2.5 text-[10px] font-bold text-[#2a5fd3] transition hover:bg-[#eaf0ff] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading ? "Please wait..." : "Download ZIP"}
                      </button>
                    </div>

                    {selectedDocuments.length === 0 ? (
                      <p className="mt-4 rounded-xl bg-slate-50 px-4 py-5 text-center text-xs text-slate-400">
                        No documents are attached to this request.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {selectedDocuments.map((document, index) => (
                          <div
                            key={document.id || index}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
                          >
                            <div className="min-w-0">
                              <p className="break-words text-xs font-bold text-slate-700">
                                {getDocumentName(document)}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                {formatLabel(
                                  document.document_type || "Document"
                                )}
                                {" · "}
                                {document.mime_type ||
                                  document.mimeType ||
                                  "File"}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">
                                {document.uploaded_by_admin_id
                                  ? "COMPLETED"
                                  : "SUBMITTED"}
                              </span>
                              <DocumentLink document={document} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

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

                    <select
                      value={nextStatus}
                      onChange={(event) =>
                        setNextStatus(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs outline-none focus:border-[#2a5fd3]"
                    >
                      {STATUS_ACTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    {nextStatus === "REJECTED" && (
                      <textarea
                        value={rejectionReason}
                        onChange={(event) =>
                          setRejectionReason(event.target.value)
                        }
                        placeholder="Enter the reason for rejecting this application..."
                        rows={3}
                        className="w-full rounded-xl border border-slate-200 px-3 py-3 text-xs outline-none focus:border-[#2a5fd3]"
                      />
                    )}

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full rounded-xl bg-[#2a5fd3] px-5 py-3 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {actionLoading ? "Updating..." : "Update Status"}
                    </button>
                  </form>

                  <form
                    onSubmit={uploadCompletedDocuments}
                    className="space-y-3 border-t border-slate-100 pt-5"
                  >
                    <div>
                      <h3 className="text-sm font-extrabold text-[#142747]">
                        Upload Completed Documents
                      </h3>
                      <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                        Attach completed certificates, reports or other
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
                      disabled={
                        actionLoading || uploadFiles.length === 0
                      }
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
