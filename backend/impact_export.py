"""impact.com ReportExport: schedule job, poll Jobs URI, download result file."""

from __future__ import annotations

import asyncio
import logging
import os
import re
import time
from typing import Any, Dict, Optional, Tuple

import httpx

logger = logging.getLogger(__name__)


def impact_api_base() -> str:
    return os.environ.get("IMPACT_API_BASE", "https://api.impact.com").rstrip("/")


def _absolute_url(path_or_url: str) -> str:
    if path_or_url.startswith("http://") or path_or_url.startswith("https://"):
        return path_or_url
    if not path_or_url.startswith("/"):
        path_or_url = "/" + path_or_url
    return f"{impact_api_base()}{path_or_url}"


def _read_status(payload: Any) -> Optional[str]:
    if not isinstance(payload, dict):
        return None
    for key in ("Status", "JobStatus", "status", "JobState"):
        val = payload.get(key)
        if val is not None and str(val).strip():
            return str(val).strip().upper()
    job = payload.get("Job")
    if isinstance(job, dict):
        return _read_status(job)
    return None


def _result_uri(start: Dict[str, Any], final: Optional[Dict[str, Any]]) -> str:
    for src in (final, start):
        if not src:
            continue
        uri = src.get("ResultUri")
        if uri:
            return uri
    raise ValueError("Impact response missing ResultUri")


async def start_report_export(
    account_sid: str,
    auth_token: str,
    report_handle: str,
    *,
    sub_aid: Optional[str],
    start_date: str,
    end_date: str,
    result_format: str = "JSON",
) -> Dict[str, Any]:
    params: Dict[str, str] = {
        "START_DATE": start_date,
        "END_DATE": end_date,
        "timeRange": "CUSTOM",
        "compareEnabled": "false",
        "PUB_CAMPAIGN_MS": os.environ.get("IMPACT_PUB_CAMPAIGN_MS", "0"),
        "CONV_CURRENCY": os.environ.get("IMPACT_CONV_CURRENCY", "USD"),
        "ResultFormat": result_format,
    }
    if sub_aid and str(sub_aid).strip():
        params["SUBAID"] = str(sub_aid).strip()
    url = f"{impact_api_base()}/Mediapartners/{account_sid}/ReportExport/{report_handle}.json"
    async with httpx.AsyncClient() as client:
        r = await client.get(url, params=params, auth=(account_sid, auth_token), timeout=120.0)
        try:
            r.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.warning("Impact ReportExport failed: %s %s", r.status_code, r.text[:500])
            raise e
        return r.json()


async def poll_job(
    account_sid: str,
    auth_token: str,
    queued_uri: str,
    *,
    interval: float = 2.0,
    max_wait: float = 180.0,
) -> Dict[str, Any]:
    url = _absolute_url(queued_uri)
    deadline = time.monotonic() + max_wait
    async with httpx.AsyncClient() as client:
        while True:
            if time.monotonic() > deadline:
                raise TimeoutError("Timed out waiting for impact.com report job")
            r = await client.get(url, auth=(account_sid, auth_token), timeout=120.0)
            r.raise_for_status()
            data = r.json()
            status = _read_status(data)
            if status in ("COMPLETED", "COMPLETE", "SUCCESS", "DONE"):
                return data
            if status in ("FAILED", "ERROR", "CANCELLED", "CANCELED"):
                raise RuntimeError(f"Impact report job ended with status {status}: {data}")
            await asyncio.sleep(interval)


async def download_result(account_sid: str, auth_token: str, result_uri: str) -> Tuple[bytes, str]:
    url = _absolute_url(result_uri)
    async with httpx.AsyncClient() as client:
        r = await client.get(url, auth=(account_sid, auth_token), timeout=180.0, follow_redirects=True)
        r.raise_for_status()
        content = r.content
        cd = r.headers.get("content-disposition") or ""
    filename = "impact_report.csv"
    m = re.search(r'filename\*?=(?:UTF-8\'\')?["\']?([^"\';\n]+)', cd, re.I)
    if m:
        filename = m.group(1).strip()
    return content, filename


async def export_report(
    account_sid: str,
    auth_token: str,
    report_handle: str,
    *,
    sub_aid: Optional[str],
    start_date: str,
    end_date: str,
    result_format: str = "JSON",
) -> Tuple[bytes, Dict[str, Any]]:
    started = await start_report_export(
        account_sid,
        auth_token,
        report_handle,
        sub_aid=sub_aid,
        start_date=start_date,
        end_date=end_date,
        result_format=result_format,
    )
    queued_uri = started.get("QueuedUri")
    if not queued_uri:
        raise ValueError(f"Unexpected ReportExport response (no QueuedUri): {started}")

    initial_status = started.get("Status")
    final = await poll_job(account_sid, auth_token, queued_uri)
    result_uri = _result_uri(started, final)
    content, filename = await download_result(account_sid, auth_token, result_uri)

    meta = {
        "initial_status": initial_status,
        "final_status": _read_status(final),
        "queued_uri": queued_uri,
        "result_uri": result_uri,
        "download_filename": filename,
        "result_format": result_format,
    }
    return content, meta


async def export_report_csv(
    account_sid: str,
    auth_token: str,
    report_handle: str,
    *,
    sub_aid: Optional[str],
    start_date: str,
    end_date: str,
) -> Tuple[bytes, Dict[str, Any]]:
    """Backwards-compatible wrapper; prefer export_report()."""
    return await export_report(
        account_sid,
        auth_token,
        report_handle,
        sub_aid=sub_aid,
        start_date=start_date,
        end_date=end_date,
        result_format="CSV",
    )
