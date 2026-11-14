import { apiGet, apiPost } from "../../../shared/api/client";

export async function createReport({ runId, filters, items, narrative, csrfToken }) {
  return apiPost(
    "/staff/reports",
    { runId, format: "IMAGE", filters, items, narrative },
    { headers: { "X-CSRF-Token": csrfToken } },
  );
}

export async function fetchReport(reportId) {
  return apiGet(`/staff/reports/${reportId}`);
}
