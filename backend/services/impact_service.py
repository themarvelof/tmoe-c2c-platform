from __future__ import annotations

import os
from typing import Any, Dict, List

import httpx


def _impact_base() -> str:
    return os.environ.get("IMPACT_API_BASE", "https://api.impact.com").rstrip("/")


def _impact_sid() -> str:
    return (os.environ.get("IMPACT_ACCOUNT_SID") or "").strip()


def _impact_token() -> str:
    return (os.environ.get("IMPACT_AUTH_TOKEN") or "").strip()


def _normalize_key(value: str) -> str:
    return str(value).strip().lower().replace(" ", "_").replace("-", "_")


def _to_float(value: Any) -> float:
    if value in (None, ""):
        return 0.0
    try:
        return float(str(value).replace(",", "").replace("$", ""))
    except ValueError:
        return 0.0


def _to_int(value: Any) -> int:
    return int(round(_to_float(value)))


def _records(payload: Any) -> List[Dict[str, Any]]:
    if isinstance(payload, dict):
        for key in ("Records", "records", "Rows", "rows", "Data", "data"):
            val = payload.get(key)
            if isinstance(val, list):
                return [r for r in val if isinstance(r, dict)]
    if isinstance(payload, list):
        return [r for r in payload if isinstance(r, dict)]
    return []


def _pick_value(row: Dict[str, Any], *keys: str) -> Any:
    normalized = {_normalize_key(k): v for k, v in row.items()}
    for key in keys:
        if key in normalized:
            return normalized[key]
    return None


async def _call_report(report_handle: str, start_date: str, end_date: str) -> List[Dict[str, Any]]:
    sid = _impact_sid()
    token = _impact_token()
    if not sid or not token:
        raise ValueError("Impact API credentials are missing")

    url = f"{_impact_base()}/Mediapartners/{sid}/Reports/{report_handle}"
    params = {
        "START_DATE": start_date,
        "END_DATE": end_date,
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(
            url,
            params=params,
            auth=(sid, token),
            headers={"Accept": "application/json"},
            timeout=90.0,
        )
        response.raise_for_status()
        return _records(response.json())


async def get_program_report(start_date: str, end_date: str) -> List[Dict[str, Any]]:
    rows = await _call_report("partner_performance_by_program", start_date, end_date)
    out: List[Dict[str, Any]] = []
    for row in rows:
        campaign = _pick_value(row, "campaign", "program", "program_name", "advertiser", "partner")
        if not campaign:
            continue
        out.append(
            {
                "campaign": str(campaign),
                "clicks": _to_int(_pick_value(row, "clicks")),
                "actions": _to_int(_pick_value(row, "actions", "conversions")),
                "revenue": round(
                    _to_float(
                        _pick_value(
                            row,
                            "sale_amount",
                            "revenue",
                            "total_revenue",
                            "total_earnings",
                        )
                    ),
                    2,
                ),
            }
        )
    return out


async def get_daily_report(start_date: str, end_date: str) -> List[Dict[str, Any]]:
    rows = await _call_report("partner_performance_by_day", start_date, end_date)
    out: List[Dict[str, Any]] = []
    for row in rows:
        date = _pick_value(row, "date", "day", "action_date", "report_date")
        if not date:
            continue
        out.append(
            {
                "date": str(date)[:10],
                "clicks": _to_int(_pick_value(row, "clicks")),
                "actions": _to_int(_pick_value(row, "actions", "conversions")),
                "revenue": round(
                    _to_float(
                        _pick_value(
                            row,
                            "sale_amount",
                            "revenue",
                            "total_revenue",
                            "total_earnings",
                        )
                    ),
                    2,
                ),
                "impressions": _to_int(_pick_value(row, "impressions", "imps")),
            }
        )
    return out
