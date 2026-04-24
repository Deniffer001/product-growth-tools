#!/usr/bin/env python3
"""
@input JSON payload on stdin plus a provider command argument
@output machine-readable JSON payload for Google Ads provider reads
@pos Python official SDK bridge for service-account Google Ads access
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path
from typing import Any

from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException
from google.protobuf.json_format import MessageToDict


def emit_success(data: Any) -> None:
    print(json.dumps({"ok": True, "data": data}))


def emit_error(code: str, message: str, hint: str | None = None) -> None:
    error: dict[str, Any] = {
        "ok": False,
        "error": {
            "code": code,
            "message": message,
        },
    }
    if hint:
        error["error"]["hint"] = hint
    print(json.dumps(error))


def read_payload() -> dict[str, Any]:
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            raise ValueError("Missing provider payload.")
        return json.loads(raw)
    except Exception as error:  # noqa: BLE001
        emit_error("invalid_input", f"Invalid provider payload: {error}")
        raise SystemExit(1) from error


def ensure_command() -> str:
    if len(sys.argv) < 2:
        emit_error("invalid_input", "Missing provider command.")
        raise SystemExit(1)
    return sys.argv[1]


def build_client(payload: dict[str, Any]) -> tuple[GoogleAdsClient, str | None]:
    developer_token = payload.get("developerToken")
    if not developer_token:
        emit_error(
            "invalid_input",
            "Missing Google Ads developer token.",
            "Set GOOGLE_ADS_DEVELOPER_TOKEN before running the CLI.",
        )
        raise SystemExit(1)

    credentials_file = payload.get("credentialsFile")
    credentials_json = payload.get("credentialsJson")
    temp_path: str | None = None

    if not credentials_file and credentials_json:
        temp_file = tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".json",
            prefix="google-ads-service-account-",
            delete=False,
        )
        temp_file.write(credentials_json)
        temp_file.flush()
        temp_file.close()
        credentials_file = temp_file.name
        temp_path = temp_file.name

    if not credentials_file:
        emit_error(
            "invalid_input",
            "Missing Google Ads service account credentials.",
            "Provide GOOGLE_ADS_JSON_KEY_FILE_PATH, GOOGLE_APPLICATION_CREDENTIALS, or GOOGLE_ADS_SERVICE_ACCOUNT_JSON.",
        )
        raise SystemExit(1)

    if not Path(credentials_file).exists():
        emit_error(
            "invalid_input",
            f"Credentials file not found: {credentials_file}",
        )
        raise SystemExit(1)

    config: dict[str, Any] = {
        "developer_token": developer_token,
        "json_key_file_path": credentials_file,
        "use_proto_plus": True,
    }

    login_customer_id = payload.get("loginCustomerId")
    if login_customer_id:
        config["login_customer_id"] = login_customer_id

    linked_customer_id = payload.get("linkedCustomerId")
    if linked_customer_id:
        config["linked_customer_id"] = linked_customer_id

    return GoogleAdsClient.load_from_dict(config), temp_path


def normalize_row(row: Any) -> dict[str, Any]:
    proto_message = getattr(row, "_pb", row)
    return MessageToDict(
        proto_message,
        always_print_fields_with_no_presence=False,
        preserving_proto_field_name=True,
        use_integers_for_enums=False,
    )


def resolve_error_name(error_code: Any) -> str:
    proto_message = getattr(error_code, "_pb", error_code)
    if hasattr(proto_message, "WhichOneof"):
        return proto_message.WhichOneof("error_code") or ""
    return ""


def resolve_error_message(error: GoogleAdsException) -> str:
    if error.failure and error.failure.errors:
        first_error = error.failure.errors[0]
        if getattr(first_error, "message", None):
            return str(first_error.message)

    if getattr(error, "details", None):
        return str(error.details)

    return str(error)


def list_accessible_customers(client: GoogleAdsClient) -> None:
    customer_service = client.get_service("CustomerService")
    response = customer_service.list_accessible_customers()
    emit_success({"resourceNames": list(response.resource_names)})


def run_gaql(client: GoogleAdsClient, payload: dict[str, Any]) -> None:
    customer_id = payload.get("customerId")
    query = payload.get("query")

    if not customer_id:
        emit_error("invalid_input", "Missing Google Ads customer ID.")
        raise SystemExit(1)

    if not query:
        emit_error("invalid_input", "Missing GAQL query.")
        raise SystemExit(1)

    service = client.get_service("GoogleAdsService")
    rows: list[dict[str, Any]] = []

    stream = service.search_stream(customer_id=customer_id, query=query)
    for batch in stream:
        for row in batch.results:
            rows.append(normalize_row(row))

    emit_success({"rows": rows})


def get_google_ads_service(client: GoogleAdsClient) -> Any:
    return client.get_service("GoogleAdsService")


def geo_target_paths(client: GoogleAdsClient, geo_target_ids: list[str]) -> list[str]:
    google_ads_service = get_google_ads_service(client)
    return [
        google_ads_service.geo_target_constant_path(str(geo_target_id))
        for geo_target_id in geo_target_ids
    ]


def language_path(client: GoogleAdsClient, language_id: str) -> str:
    return get_google_ads_service(client).language_constant_path(str(language_id))


def keyword_plan_network(client: GoogleAdsClient, payload: dict[str, Any]) -> Any:
    network = payload.get("network") or "GOOGLE_SEARCH"
    enum = client.enums.KeywordPlanNetworkEnum
    if network == "GOOGLE_SEARCH_AND_PARTNERS":
        return enum.GOOGLE_SEARCH_AND_PARTNERS
    return enum.GOOGLE_SEARCH


def normalize_keyword_plan_metrics(metrics: Any) -> dict[str, Any] | None:
    if not metrics:
        return None

    return normalize_row(metrics)


def generate_keyword_ideas(client: GoogleAdsClient, payload: dict[str, Any]) -> None:
    customer_id = payload.get("customerId")
    keywords = payload.get("keywords") or []
    page_url = payload.get("pageUrl")

    if not customer_id:
        emit_error("invalid_input", "Missing Google Ads customer ID.")
        raise SystemExit(1)

    if not keywords and not page_url:
        emit_error(
            "invalid_input",
            "At least one of keywords or pageUrl is required for keyword ideas.",
        )
        raise SystemExit(1)

    service = client.get_service("KeywordPlanIdeaService")
    request = client.get_type("GenerateKeywordIdeasRequest")
    request.customer_id = customer_id
    request.language = language_path(client, payload.get("languageId") or "1000")
    request.geo_target_constants.extend(
        geo_target_paths(client, payload.get("geoTargetIds") or [])
    )
    request.include_adult_keywords = bool(payload.get("includeAdultKeywords"))
    request.keyword_plan_network = keyword_plan_network(client, payload)

    if keywords and page_url:
        request.keyword_and_url_seed.url = page_url
        request.keyword_and_url_seed.keywords.extend(keywords)
    elif keywords:
        request.keyword_seed.keywords.extend(keywords)
    else:
        request.url_seed.url = page_url

    limit = payload.get("limit") or 100
    rows: list[dict[str, Any]] = []
    for idea in service.generate_keyword_ideas(request=request):
        rows.append(
            {
                "text": idea.text,
                "keywordIdeaMetrics": normalize_keyword_plan_metrics(
                    idea.keyword_idea_metrics
                ),
            }
        )
        if len(rows) >= limit:
            break

    emit_success({"rows": rows})


def generate_keyword_historical_metrics(
    client: GoogleAdsClient, payload: dict[str, Any]
) -> None:
    customer_id = payload.get("customerId")
    keywords = payload.get("keywords") or []

    if not customer_id:
        emit_error("invalid_input", "Missing Google Ads customer ID.")
        raise SystemExit(1)

    if not keywords:
        emit_error("invalid_input", "Missing keywords.")
        raise SystemExit(1)

    service = client.get_service("KeywordPlanIdeaService")
    request = client.get_type("GenerateKeywordHistoricalMetricsRequest")
    request.customer_id = customer_id
    request.keywords.extend(keywords)
    request.geo_target_constants.extend(
        geo_target_paths(client, payload.get("geoTargetIds") or [])
    )
    request.keyword_plan_network = keyword_plan_network(client, payload)
    request.language = language_path(client, payload.get("languageId") or "1000")

    if payload.get("includeAverageCpc"):
        request.historical_metrics_options.include_average_cpc = True

    response = service.generate_keyword_historical_metrics(request=request)
    rows = [normalize_row(result) for result in response.results]

    emit_success({"rows": rows})


def emit_google_ads_error(error: GoogleAdsException) -> None:
    code = "provider_failure"
    hint = None

    error_name = ""
    if error.failure and error.failure.errors:
        for entry in error.failure.errors:
            error_name = resolve_error_name(entry.error_code)
            if error_name:
                break

    if error.error.code in {7, 16} or error_name in {
        "authentication_error",
        "authorization_error",
        "header_error",
    }:
        code = "provider_auth"
        hint = (
            "Verify the service account email has Google Ads access and the "
            "developer token is authorized for this account."
        )
    elif error.error.code == 3 or error_name in {"query_error", "request_error"}:
        code = "invalid_input"
        hint = "Check the GAQL shape, selected fields, and request filters."
    elif error.error.code == 8 or error_name in {
        "quota_error",
        "resource_count_limit_exceeded_error",
    }:
        code = "provider_rate_limited"
        hint = "Retry later or reduce request frequency."
    elif error_name == "customer_error":
        code = "not_found"
        hint = "Check the customer ID and confirm the account is accessible."

    emit_error(code, resolve_error_message(error), hint)


def main() -> None:
    payload = read_payload()
    command = ensure_command()
    client = None
    temp_path = None

    try:
        client, temp_path = build_client(payload)

        if command == "list-accessible-customers":
            list_accessible_customers(client)
            return

        if command == "run-gaql":
            run_gaql(client, payload)
            return

        if command == "generate-keyword-ideas":
            generate_keyword_ideas(client, payload)
            return

        if command == "generate-keyword-historical-metrics":
            generate_keyword_historical_metrics(client, payload)
            return

        emit_error("unsupported", f"Unsupported provider command: {command}")
        raise SystemExit(1)
    except GoogleAdsException as error:
        emit_google_ads_error(error)
        raise SystemExit(1) from error
    except Exception as error:  # noqa: BLE001
        emit_error("backend_failure", str(error))
        raise SystemExit(1) from error
    finally:
        if temp_path and Path(temp_path).exists():
            os.unlink(temp_path)


if __name__ == "__main__":
    main()
