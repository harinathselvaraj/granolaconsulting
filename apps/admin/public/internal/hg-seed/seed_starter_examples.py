#!/usr/bin/env python3
"""Load two built-in Superset example dashboards into HoneyGold Workspace."""
from __future__ import annotations

import os
import re
import sys
import uuid
from importlib.resources import as_file, files
from pathlib import Path
from typing import TYPE_CHECKING, Any

from superset.app import create_app

if TYPE_CHECKING:
    from flask_appbuilder.security.sqla.models import Role
    from superset.security.manager import SupersetSecurityManager

# UUID from superset/examples/_shared/database.yaml (remapped to workspace on import).
EXAMPLES_DATABASE_UUID = "a2dc77af-e654-49bb-b321-40f6b559a1ee"
# Namespace for per-tenant example object UUIDs (isolates metadata in shared Superset DB).
_TENANT_EXAMPLE_UUID_NS = uuid.UUID("6f2e8b1c-4d5a-4e9f-a1b2-c3d4e5f60789")
_UUID_IN_TEXT_RE = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
    re.IGNORECASE,
)

# (example folder under superset/examples/, dashboard_title for idempotency)
STARTER_EXAMPLES: tuple[tuple[str, str], ...] = (
    ("usa_births_names", "USA Births Names"),
    ("sales_dashboard", "Sales Dashboard"),
)
STARTER_EXAMPLE_TITLES: tuple[str, ...] = tuple(title for _, title in STARTER_EXAMPLES)

# Local E2E tenant id → Superset FAB username (email from gateway session).
_LOCAL_TENANT_OWNER_EMAILS: dict[str, str] = {
    "dev-tenant": "dev@local.test",
    "business-e2e": "business-e2e@local.test",
    "enterprise-e2e": "enterprise-e2e@local.test",
}

WORKSPACE_DB_NAME = os.environ.get("HG_WORKSPACE_DB_NAME", "HoneyGold Workspace").strip() or (
    "HoneyGold Workspace"
)
STARTER_CREATOR_ROLE = "StarterCreator"
TENANT_ROLE_PREFIX = "Tenant_"


def _example_data_schema() -> str:
    """Shared-rbac tenants store data in uploads_<tenant>; default examples use main."""
    return os.environ.get("HG_UPLOAD_DB_SCHEMA", "").strip() or "main"


def _disabled() -> bool:
    return os.environ.get("HG_STARTER_EXAMPLES", "1").strip().lower() in (
        "0",
        "false",
        "no",
        "off",
    )


def _remap_database_uuid(content: str, workspace_uuid: str) -> str:
    return content.replace(EXAMPLES_DATABASE_UUID, workspace_uuid)


def _tenant_scoped_uuid(raw_uuid: str, tenant_id: str) -> str:
    return str(uuid.uuid5(_TENANT_EXAMPLE_UUID_NS, f"{tenant_id}:{raw_uuid.lower()}"))


def _remap_tenant_example_uuids(content: str, tenant_id: str) -> str:
    """Give each tenant its own chart/dashboard/dataset rows in the shared metadata DB."""

    def _replace(match: re.Match[str]) -> str:
        return _tenant_scoped_uuid(match.group(0), tenant_id)

    return _UUID_IN_TEXT_RE.sub(_replace, content)


def _remap_example_schema(text: str) -> str:
    """Point example YAML/JSON at the tenant uploads schema instead of main."""
    schema = _example_data_schema()
    if schema == "main":
        return text
    text = re.sub(r"(?m)^schema:\s*main\s*$", f"schema: {schema}", text)
    text = re.sub(r"(?m)^schema:\s*null\s*$", f"schema: {schema}", text)
    text = text.replace('"schema": "main"', f'"schema": "{schema}"')
    text = text.replace('"schema": null', f'"schema": "{schema}"')
    text = text.replace('"schema":null', f'"schema":"{schema}"')
    return text


def _dashboard_datasets_wrong_schema(dashboard, expected_schema: str) -> bool:
    for slc in dashboard.slices or []:
        tbl = getattr(slc, "table", None)
        if tbl is None:
            continue
        actual = (tbl.schema or "main").strip() or "main"
        if actual != expected_schema:
            return True
    return False


def _normalize_dataset_schema(schema: str | None) -> str:
    return (schema or "").strip() or "main"


def _is_orphan_dataset_schema(orphan_schema: str | None, canonical_schema: str) -> bool:
    normalized = _normalize_dataset_schema(orphan_schema)
    if normalized == canonical_schema:
        return False
    if canonical_schema.startswith("uploads_"):
        return True
    return normalized != canonical_schema


def _dashboard_keep_sort_key(*, wrong_schema: bool, dashboard_id: int) -> tuple[int, int]:
    return (1 if wrong_schema else 0, -dashboard_id)


def _workspace_database_yaml(db) -> str:
    from urllib.parse import unquote_plus, urlparse

    uri = (db.sqlalchemy_uri or "").strip()
    parsed = urlparse(uri)
    from superset.constants import PASSWORD_MASK

    parsed_password = unquote_plus(parsed.password or "")
    if parsed_password == PASSWORD_MASK:
        parsed_password = ""
    password = os.environ.get("HG_UPLOAD_DB_PASSWORD", "").strip() or parsed_password
    lines = [
        f"database_name: {db.database_name}",
        f"sqlalchemy_uri: {uri}",
        "expose_in_sqllab: true",
        "extra:",
        "  allows_virtual_table_explore: true",
        f"uuid: {db.uuid}",
        "version: 1.0.0",
    ]
    # Superset 6.x import rejects masked URIs without an explicit password field.
    if password:
        lines.insert(2, f"password: {password}")
    return "\n".join(lines) + "\n"


def _resolve_workspace_database(session):
    from superset.models.core import Database

    workspace = (
        session.query(Database).filter_by(database_name=WORKSPACE_DB_NAME).one_or_none()
    )
    if workspace is not None:
        return workspace
    if WORKSPACE_DB_NAME != "HoneyGold Workspace":
        return (
            session.query(Database)
            .filter_by(database_name="HoneyGold Workspace")
            .one_or_none()
        )
    return None


# Physical table names under superset/examples/<folder>/ (stable across Superset 4.x).
_EXAMPLE_TABLE_NAMES: dict[str, str] = {
    "usa_births_names": "birth_names",
    "sales_dashboard": "cleaned_sales_data",
}


def _example_dataset_config(example_name: str) -> dict[str, Any]:
    table_name = _EXAMPLE_TABLE_NAMES.get(example_name, example_name)
    return {"table_name": table_name, "schema": None}


def _example_table_location(example_name: str) -> tuple[str, str]:
    config = _example_dataset_config(example_name)
    table_name = config["table_name"] or example_name
    tenant_schema = os.environ.get("HG_UPLOAD_DB_SCHEMA", "").strip()
    if tenant_schema:
        return tenant_schema, table_name
    schema = config.get("schema") or _example_data_schema()
    return schema, table_name


def _ensure_pg_schema(workspace, schema: str) -> None:
    from sqlalchemy import text

    tenant_schema = os.environ.get("HG_UPLOAD_DB_SCHEMA", "").strip()
    if schema.startswith("uploads_") or (tenant_schema and schema == tenant_schema):
        return
    with workspace.get_sqla_engine() as engine:
        with engine.begin() as conn:
            conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))


def _physical_table_exists(workspace, schema: str, table_name: str) -> bool:
    from sqlalchemy import inspect

    with workspace.get_sqla_engine() as engine:
        inspector = inspect(engine)
        try:
            return table_name in inspector.get_table_names(schema=schema)
        except Exception:  # noqa: BLE001
            return False


def _load_example_data(example_name: str, workspace, schema: str) -> None:
    from superset.examples.generic_loader import load_parquet_table

    config = _example_dataset_config(example_name)
    table_name = config["table_name"] or example_name
    data_rel = config.get("data_file") or "data.parquet"
    with as_file(files("superset") / "examples" / example_name) as example_dir:
        example_path = Path(example_dir)
        data_file = example_path / str(data_rel)
        if not data_file.is_file():
            data_file = example_path / "data.parquet"
        load_parquet_table(
            parquet_file=example_name,
            table_name=table_name,
            database=workspace,
            schema=schema,
            data_file=data_file,
            uuid=config.get("uuid"),
        )
    tenant_id = os.environ.get("HG_TENANT_ID", "").strip()
    if tenant_id:
        _grant_upload_role_on_schema_tables(workspace, schema, tenant_id)
    print(f"Loaded example table {schema}.{table_name} for {example_name}")


def _import_example_configs(example_name: str, workspace) -> dict[str, str]:
    from superset.examples.utils import _load_example_contents

    test_re = re.compile(r"\.test\.")
    examples_root = files("superset") / "examples"
    example_dir = examples_root / example_name
    contents = _load_example_contents(example_dir, example_name, test_re, load_test_data=False)

    shared_meta = files("superset") / "examples" / "_shared" / "metadata.yaml"
    with as_file(shared_meta) as meta_path:
        contents["metadata.yaml"] = Path(meta_path).read_text(encoding="utf-8")

    contents["databases/examples.yaml"] = _workspace_database_yaml(workspace)
    workspace_uuid = str(workspace.uuid)
    remapped: dict[str, str] = {}
    tenant_id = os.environ.get("HG_TENANT_ID", "").strip()
    for key, value in contents.items():
        text = _remap_database_uuid(value, workspace_uuid)
        text = _remap_example_schema(text)
        if tenant_id:
            text = _remap_tenant_example_uuids(text, tenant_id)
        remapped[key] = text
    return remapped


def _starter_creator_role(sm: SupersetSecurityManager) -> Role | None:
    role = sm.find_role(STARTER_CREATOR_ROLE)
    if role is None:
        role = sm.find_role("Gamma")
    return role


def _tenant_role(sm: SupersetSecurityManager, tenant_id: str) -> Role | None:
    if not tenant_id:
        return None
    return sm.find_role(f"{TENANT_ROLE_PREFIX}{tenant_id}")


def _backfill_tenant_role_from_base(sm: SupersetSecurityManager, role: Role, base: Role) -> bool:
    """REST provision creates an empty Tenant_* role; copy Gamma/StarterCreator menu perms."""
    from superset import db

    base_ids = {p.id for p in base.permissions}
    role_ids = {p.id for p in role.permissions}
    missing = base_ids - role_ids
    if not missing:
        return False
    for pv in base.permissions:
        if pv.id in missing and pv not in role.permissions:
            role.permissions.append(pv)
    db.session.flush()
    print(f"Backfilled {len(missing)} permission(s) onto {role.name} from {base.name}")
    return True


def _ensure_tenant_role(sm: SupersetSecurityManager, tenant_id: str) -> Role | None:
    """Tenant_* roles need StarterCreator/Gamma perms (shared-pool list APIs return 403 otherwise)."""
    role_name = f"{TENANT_ROLE_PREFIX}{tenant_id}"
    base = sm.find_role(STARTER_CREATOR_ROLE) or sm.find_role("Gamma")
    if base is None:
        print("StarterCreator/Gamma missing; cannot create tenant role", file=sys.stderr)
        return None
    role = _tenant_role(sm, tenant_id)
    if role is None:
        sm.copy_role(base.name, role_name)
        from superset import db

        db.session.flush()
        print(f"Created role {role_name} from {base.name}")
        return _tenant_role(sm, tenant_id)
    _backfill_tenant_role_from_base(sm, role, base)
    return role


def _remove_orphan_example_datasets(workspace, tenant_id: str) -> None:
    """Drop null/main-schema duplicates left by ImportExamplesCommand (keep tenant uploads schema)."""
    from superset import db
    from superset.connectors.sqla.models import SqlaTable
    from superset.models.slice import Slice

    schema = _example_data_schema()
    if not schema.startswith("uploads_") or workspace is None:
        return
    removed = 0
    for table_name in _EXAMPLE_TABLE_NAMES.values():
        datasets = (
            db.session.query(SqlaTable)
            .filter_by(database_id=workspace.id, table_name=table_name)
            .all()
        )
        if not datasets:
            continue
        canonical = next(
            (d for d in datasets if _normalize_dataset_schema(d.schema) == schema),
            None,
        )
        if canonical is None:
            uploads_rows = [
                d for d in datasets if _normalize_dataset_schema(d.schema).startswith("uploads_")
            ]
            canonical = next(
                (d for d in uploads_rows if _normalize_dataset_schema(d.schema) == schema),
                uploads_rows[0] if uploads_rows else None,
            )
        if canonical is None:
            continue
        for orphan in datasets:
            if orphan.id == canonical.id:
                continue
            if not (
                _is_orphan_dataset_schema(orphan.schema, schema)
                or _normalize_dataset_schema(orphan.schema) == schema
            ):
                continue
            for slc in db.session.query(Slice).filter_by(datasource_id=orphan.id).all():
                slc.datasource_id = canonical.id
                if hasattr(slc, "table_id"):
                    slc.table_id = canonical.id
            db.session.delete(orphan)
            removed += 1
    if removed:
        db.session.flush()
        print(f"Removed {removed} orphan example dataset(s) for {tenant_id}")


def _retire_tenant_example_for_reimport(
    dashboard_title: str,
    tenant_id: str,
    sm: SupersetSecurityManager,
) -> None:
    """Delete tenant-scoped example dashboards before ImportExamplesCommand re-import."""
    from superset import db
    from superset.models.dashboard import Dashboard

    tenant_role = _tenant_role(sm, tenant_id)
    if tenant_role is None:
        return
    removed = 0
    for dashboard in db.session.query(Dashboard).filter_by(dashboard_title=dashboard_title).all():
        if tenant_role not in (dashboard.roles or []):
            continue
        db.session.delete(dashboard)
        removed += 1
    if removed:
        db.session.flush()
        print(
            f"Retired {removed} existing {dashboard_title!r} dashboard(s) "
            f"before re-import for {tenant_id}",
        )


def _dedupe_tenant_example_dashboards(tenant_id: str, sm: SupersetSecurityManager) -> None:
    """Keep one example dashboard per title for this tenant (correct schema, newest id)."""
    from superset import db
    from superset.models.dashboard import Dashboard

    tenant_role = _tenant_role(sm, tenant_id)
    if tenant_role is None:
        return
    expected_schema = _example_data_schema()
    removed = 0
    for title in STARTER_EXAMPLE_TITLES:
        all_rows = db.session.query(Dashboard).filter_by(dashboard_title=title).all()
        tenant_rows = [d for d in all_rows if tenant_role in (d.roles or [])]
        if len(tenant_rows) > 1:
            tenant_rows.sort(
                key=lambda d: _dashboard_keep_sort_key(
                    wrong_schema=_dashboard_datasets_wrong_schema(d, expected_schema)
                    if expected_schema.startswith("uploads_")
                    else False,
                    dashboard_id=d.id,
                ),
            )
            keep = tenant_rows[0]
            for duplicate in tenant_rows[1:]:
                db.session.delete(duplicate)
                removed += 1
        elif len(tenant_rows) == 1:
            keep = tenant_rows[0]
        else:
            keep = None

        for dashboard in all_rows:
            if keep is not None and dashboard.id == keep.id:
                continue
            other_tenant_roles = [
                r
                for r in (dashboard.roles or [])
                if r.name.startswith(TENANT_ROLE_PREFIX) and r != tenant_role
            ]
            if other_tenant_roles:
                continue
            if tenant_role in (dashboard.roles or []):
                db.session.delete(dashboard)
                removed += 1
                continue
            if not (dashboard.roles or []):
                db.session.delete(dashboard)
                removed += 1
    if removed:
        db.session.flush()
        print(f"Removed {removed} duplicate example dashboard(s) for {tenant_id}")


def _repair_tenant_file_upload_settings(workspace) -> None:
    """Enable CSV upload scoped to the tenant uploads schema."""
    import json

    tenant_id = os.environ.get("HG_TENANT_ID", "").strip()
    schema = os.environ.get("HG_UPLOAD_DB_SCHEMA", "").strip()
    if not tenant_id or not schema or workspace is None:
        return
    extra_raw = workspace.extra or "{}"
    try:
        extra = json.loads(extra_raw) if isinstance(extra_raw, str) else dict(extra_raw or {})
    except json.JSONDecodeError:
        extra = {}
    extra["schemas_allowed_for_file_upload"] = [schema]
    extra["allows_virtual_table_explore"] = True
    workspace.extra = json.dumps(extra)
    workspace.allow_file_upload = True
    from sqlalchemy import text
    from sqlalchemy.orm.attributes import flag_modified
    from superset import db

    flag_modified(workspace, "extra")
    db.session.execute(
        text(
            "UPDATE dbs SET allow_file_upload = true, extra = :extra "
            "WHERE id = :db_id",
        ),
        {"extra": json.dumps(extra), "db_id": workspace.id},
    )
    db.session.flush()
    print(
        f"Repaired file upload settings on {workspace.database_name!r} "
        f"(allow_file_upload=true, schemas={extra.get('schemas_allowed_for_file_upload')})",
    )


def _remove_orphan_example_dashboards(sm: SupersetSecurityManager) -> None:
    """Delete failed imports that never received a Tenant_* role."""
    from superset import db
    from superset.models.dashboard import Dashboard

    removed = 0
    for title in STARTER_EXAMPLE_TITLES:
        for dashboard in db.session.query(Dashboard).filter_by(dashboard_title=title).all():
            tenant_roles = [
                r for r in (dashboard.roles or []) if r.name.startswith(TENANT_ROLE_PREFIX)
            ]
            if tenant_roles:
                continue
            db.session.delete(dashboard)
            removed += 1
    if removed:
        db.session.flush()
        print(f"Removed {removed} orphan example dashboard(s) without tenant roles")


def _example_share_roles(sm: SupersetSecurityManager) -> list[Role]:
    """Only the current tenant role — never share one dashboard across Tenant_* roles."""
    tenant_id = os.environ.get("HG_TENANT_ID", "").strip()
    tenant_role = _tenant_role(sm, tenant_id)
    return [tenant_role] if tenant_role is not None else []


def _find_tenant_example_dashboard(dashboard_title: str, tenant_id: str, sm: SupersetSecurityManager):
    from superset import db
    from superset.models.dashboard import Dashboard

    tenant_role = _tenant_role(sm, tenant_id)
    if tenant_role is None:
        return None
    unclaimed: Dashboard | None = None
    for dashboard in db.session.query(Dashboard).filter_by(dashboard_title=dashboard_title).all():
        if tenant_role in (dashboard.roles or []):
            return dashboard
        other_tenant_roles = [
            r
            for r in (dashboard.roles or [])
            if r.name.startswith(TENANT_ROLE_PREFIX) and r != tenant_role
        ]
        if not other_tenant_roles and unclaimed is None:
            unclaimed = dashboard
    return unclaimed


def _remove_legacy_shared_example_dashboards(tenant_id: str, sm: SupersetSecurityManager) -> None:
    """Drop pre-fix dashboards that were granted to multiple Tenant_* roles (one shared row)."""
    from superset import db
    from superset.models.dashboard import Dashboard

    removed = 0
    for title in STARTER_EXAMPLE_TITLES:
        for dashboard in db.session.query(Dashboard).filter_by(dashboard_title=title).all():
            tenant_roles = [
                r for r in (dashboard.roles or []) if r.name.startswith(TENANT_ROLE_PREFIX)
            ]
            if len(tenant_roles) <= 1:
                continue
            db.session.delete(dashboard)
            removed += 1
    if removed:
        db.session.flush()
        print(f"Removed {removed} legacy cross-tenant example dashboard(s) before seeding {tenant_id}")


def _grant_perm(sm: SupersetSecurityManager, role: Role, permission_name: str, view_menu_name: str) -> bool:
    pv = sm.find_permission_view_menu(permission_name, view_menu_name)
    if pv and pv not in role.permissions:
        role.permissions.append(pv)
        return True
    return False


def _revoke_perm(sm: SupersetSecurityManager, role: Role, permission_name: str, view_menu_name: str) -> bool:
    pv = sm.find_permission_view_menu(permission_name, view_menu_name)
    if pv and pv in role.permissions:
        role.permissions.remove(pv)
        return True
    return False


def _grant_tenant_role_on_schema_datasets(
    sm: SupersetSecurityManager,
    workspace,
    tenant_id: str,
) -> None:
    """Grant datasource_access on every dataset in this tenant uploads schema (native filters + chart/data)."""
    from superset import db
    from superset.connectors.sqla.models import SqlaTable

    role = _tenant_role(sm, tenant_id)
    if role is None:
        return
    schema = _example_data_schema()
    if not schema.startswith("uploads_"):
        return
    added = 0
    if workspace:
        _ensure_database_perms(sm, workspace)
        if _grant_perm(sm, role, "database_access", workspace.perm):
            added += 1
        if _grant_perm(sm, role, "can_upload", workspace.perm):
            added += 1
    for dataset in db.session.query(SqlaTable).filter_by(schema=schema).all():
        _ensure_dataset_perms(sm, dataset)
        if _grant_perm(sm, role, "datasource_access", dataset.perm):
            added += 1
    if added:
        db.session.flush()
        print(
            f"Granted {added} database/datasource perm(s) on {schema!r} datasets "
            f"to {role.name}",
        )


def _prune_tenant_datasource_permissions(sm: SupersetSecurityManager, tenant_id: str) -> None:
    """Drop datasource_access to other tenants' uploads_* datasets (shared metadata DB)."""
    from superset import db
    from superset.connectors.sqla.models import SqlaTable

    role = _tenant_role(sm, tenant_id)
    if role is None:
        return
    expected_schema = _example_data_schema()
    removed = 0
    for dataset in db.session.query(SqlaTable).all():
        schema = (dataset.schema or "main").strip() or "main"
        if not schema.startswith("uploads_"):
            continue
        if schema == expected_schema:
            continue
        if _revoke_perm(sm, role, "datasource_access", dataset.perm):
            removed += 1
    if removed:
        db.session.flush()
        print(f"Pruned {removed} cross-tenant datasource_access perm(s) for {role.name}")


def _ensure_database_perms(sm: SupersetSecurityManager, workspace) -> None:
    add_db = getattr(sm, "add_permissions_database", None)
    if callable(add_db):
        add_db(workspace)


def _ensure_dataset_perms(sm: SupersetSecurityManager, dataset) -> None:
    add_ds = getattr(sm, "add_permissions_view_menu", None)
    if callable(add_ds):
        add_ds(dataset.perm)
    add_datasource = getattr(sm, "add_datasource_permissions", None)
    if callable(add_datasource):
        add_datasource(dataset)


def _ensure_dashboard_owners(dashboard, sm: SupersetSecurityManager) -> None:
    from hg_tenant_example_owners import assign_tenant_ownership_to_examples

    tenant_id = os.environ.get("HG_TENANT_ID", "").strip()
    if not tenant_id:
        return
    assign_tenant_ownership_to_examples(sm, tenant_id)


def _share_dashboard_with_starter_creator(dashboard, workspace, sm: SupersetSecurityManager) -> None:
    """Publish example dashboards for this tenant's role only (RBAC isolation)."""
    from superset import db

    roles = _example_share_roles(sm)
    if not roles:
        print("No roles for example dashboards; cannot share", file=sys.stderr)
        return

    dashboard.published = True
    dashboard.roles = list(roles)

    added = 0
    if workspace:
        _ensure_database_perms(sm, workspace)
        db.session.flush()
        for role in roles:
            if _grant_perm(sm, role, "database_access", workspace.perm):
                added += 1

    datasets: set[Any] = set()
    for slc in dashboard.slices or []:
        tbl = getattr(slc, "table", None)
        if tbl is not None:
            datasets.add(tbl)

    for dataset in datasets:
        _ensure_dataset_perms(sm, dataset)
        db.session.flush()
        for role in roles:
            if _grant_perm(sm, role, "datasource_access", dataset.perm):
                added += 1

    db.session.flush()
    _ensure_dashboard_owners(dashboard, sm)
    role_names = ",".join(r.name for r in roles)
    print(
        f"Shared dashboard {dashboard.dashboard_title!r} with {role_names} "
        f"(published=True, perms_added={added}, datasets={len(datasets)})"
    )


def _uploads_role_name(tenant_id: str) -> str:
    suffix = re.sub(r"[^a-zA-Z0-9_]", "_", tenant_id)[:48]
    return f"hg_{suffix}_rw"


def _grant_upload_role_on_schema_tables(workspace, schema: str, tenant_id: str) -> None:
    """Parquet load creates tables as the upload role; re-grant for idempotent seed runs."""
    if not schema.startswith("uploads_") or not tenant_id:
        return
    role = _uploads_role_name(tenant_id)
    from sqlalchemy import text

    with workspace.get_sqla_engine() as engine:
        with engine.begin() as conn:
            conn.execute(
                text(
                    f'GRANT SELECT ON ALL TABLES IN SCHEMA "{schema}" TO "{role}"',
                ),
            )
    print(f"Granted SELECT on {schema}.* to {role}")


def _repair_dashboard_filter_scope(dashboard) -> bool:
    """Example imports keep template chart ids (111+) in native filters; remap to this tenant."""
    import json

    chart_ids = sorted({slc.id for slc in (dashboard.slices or []) if slc.id})
    if not chart_ids:
        return False

    raw = dashboard.json_metadata or "{}"
    try:
        meta = json.loads(raw) if isinstance(raw, str) else dict(raw or {})
    except json.JSONDecodeError:
        meta = {}

    changed = False
    for filt in meta.get("native_filter_configuration") or []:
        if filt.get("chartsInScope") != chart_ids:
            filt["chartsInScope"] = chart_ids
            changed = True

    gcc = meta.get("global_chart_configuration") or {}
    if gcc.get("chartsInScope") != chart_ids:
        gcc["chartsInScope"] = chart_ids
        meta["global_chart_configuration"] = gcc
        changed = True

    cc = meta.get("chart_configuration") or {}
    stale = [k for k in cc if k.isdigit() and int(k) not in chart_ids]
    for key in stale:
        cc.pop(key, None)
        changed = True

    if changed:
        dashboard.json_metadata = json.dumps(meta)

    if changed:
        from superset import db

        db.session.flush()
        print(
            f"Repaired dashboard {dashboard.dashboard_title!r} filter scope "
            f"(chartsInScope={chart_ids})",
        )
    return changed


def _load_or_repair_example(
    example_name: str,
    dashboard_title: str,
    workspace,
    sm: SupersetSecurityManager,
) -> None:
    from superset import db
    from superset.commands.importers.v1.examples import ImportExamplesCommand
    from superset.models.dashboard import Dashboard

    tenant_id = os.environ.get("HG_TENANT_ID", "").strip()
    if not tenant_id:
        print("HG_TENANT_ID required for tenant-isolated example seed", file=sys.stderr)
        return

    schema, table_name = _example_table_location(example_name)
    _ensure_pg_schema(workspace, schema)

    dashboard = _find_tenant_example_dashboard(dashboard_title, tenant_id, sm)
    table_missing = not _physical_table_exists(workspace, schema, table_name)
    needs_import = dashboard is None or table_missing
    tenant_schema = os.environ.get("HG_UPLOAD_DB_SCHEMA", "").strip()
    if (
        dashboard is not None
        and tenant_schema
        and _dashboard_datasets_wrong_schema(dashboard, tenant_schema)
    ):
        print(
            f"Re-import {example_name}: chart datasets still point at wrong schema "
            f"(expected {tenant_schema!r})",
        )
        needs_import = True

    if table_missing:
        _load_example_data(example_name, workspace, schema)

    if needs_import:
        _retire_tenant_example_for_reimport(dashboard_title, tenant_id, sm)
        contents = _import_example_configs(example_name, workspace)
        ImportExamplesCommand(contents, overwrite=True, force_data=False).run()
        db.session.flush()
        dashboard = _find_tenant_example_dashboard(dashboard_title, tenant_id, sm)
        if dashboard is None:
            dashboard = (
                db.session.query(Dashboard)
                .filter_by(dashboard_title=dashboard_title)
                .order_by(Dashboard.id.desc())
                .first()
            )
        if dashboard is None:
            print(
                f"starter example import produced no dashboard for {example_name}",
                file=sys.stderr,
            )
            return
        print(f"Imported starter example {example_name} ({dashboard_title!r})")

    if dashboard is not None:
        _repair_dashboard_filter_scope(dashboard)
        _share_dashboard_with_starter_creator(dashboard, workspace, sm)
        _remove_orphan_example_datasets(workspace, tenant_id)


def _repair_workspace_sqlalchemy_uri(workspace) -> None:
    """RDS requires TLS; provisioning URIs may omit sslmode or hold a stale password."""
    from urllib.parse import quote_plus, unquote_plus, urlparse, urlunparse, parse_qs, urlencode

    uri = (workspace.sqlalchemy_uri or "").strip()
    if not uri:
        return
    parsed = urlparse(uri)
    user = unquote_plus(parsed.username or "")
    host = parsed.hostname or ""
    port = parsed.port or 5432
    database = (parsed.path or "/").lstrip("/") or "honeygold"
    password = os.environ.get("HG_UPLOAD_DB_PASSWORD", "").strip() or unquote_plus(parsed.password or "")
    query = parse_qs(parsed.query, keep_blank_values=True)
    use_ssl = os.environ.get("HG_UPLOAD_DB_SSL", "1").strip().lower() not in (
        "0",
        "false",
        "no",
        "off",
    )
    if use_ssl and "sslmode" not in query:
        query["sslmode"] = ["require"]
    schema = os.environ.get("HG_UPLOAD_DB_SCHEMA", "").strip()
    if schema:
        query["options"] = [f"-csearch_path={schema}"]
    rebuilt = urlunparse(
        (
            parsed.scheme or "postgresql+psycopg2",
            f"{quote_plus(user)}:{quote_plus(password)}@{host}:{port}",
            f"/{database}",
            "",
            urlencode(query, doseq=True),
            "",
        )
    )
    setter = getattr(workspace, "set_sqlalchemy_uri", None)
    if setter is not None:
        setter(rebuilt)
    else:
        workspace.sqlalchemy_uri = rebuilt
    if rebuilt != uri:
        print(f"Repaired workspace SQLAlchemy URI for {workspace.database_name!r}")
    try:
        from sqlalchemy import text

        with workspace.get_sqla_engine() as engine:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
        print(f"Workspace DB connection OK for {workspace.database_name!r}")
    except Exception as exc:  # noqa: BLE001
        print(f"Workspace DB connection failed after repair: {exc}", file=sys.stderr)
        return


def main() -> int:
    if _disabled():
        print("HG_STARTER_EXAMPLES disabled")
        return 0

    app = create_app()
    with app.app_context():
        from superset import db
        from superset.models.core import Database
        from superset.models.dashboard import Dashboard

        sm: SupersetSecurityManager = app.appbuilder.sm

        workspace = _resolve_workspace_database(db.session)
        if workspace is None:
            print(f"{WORKSPACE_DB_NAME!r} missing; skip starter examples", file=sys.stderr)
            return 0

        _repair_workspace_sqlalchemy_uri(workspace)
        _repair_tenant_file_upload_settings(workspace)
        db.session.commit()
        try:
            from sqlalchemy import text

            with workspace.get_sqla_engine() as engine:
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
        except Exception as exc:  # noqa: BLE001
            print(
                f"Workspace DB unreachable for {WORKSPACE_DB_NAME!r}: {exc}",
                file=sys.stderr,
            )
            return 1

        if not workspace.uuid:
            db.session.flush()

        tenant_id = os.environ.get("HG_TENANT_ID", "").strip()
        if tenant_id:
            _ensure_tenant_role(sm, tenant_id)
            _remove_orphan_example_dashboards(sm)
            _remove_legacy_shared_example_dashboards(tenant_id, sm)
            _ensure_database_perms(sm, workspace)
            db.session.flush()
            tenant_role = _tenant_role(sm, tenant_id)
            if tenant_role is not None:
                if _grant_perm(sm, tenant_role, "database_access", workspace.perm):
                    print(f"Granted database_access {workspace.perm!r} to {tenant_role.name}")
            else:
                print(f"Tenant role missing for {tenant_id}; examples may fail", file=sys.stderr)

        missing: list[str] = []
        for example_name, dashboard_title in STARTER_EXAMPLES:
            try:
                _load_or_repair_example(example_name, dashboard_title, workspace, sm)
            except Exception as exc:  # noqa: BLE001
                print(f"starter example {example_name} failed: {exc}", file=sys.stderr)
                missing.append(dashboard_title)
                continue
            dashboard = _find_tenant_example_dashboard(dashboard_title, tenant_id, sm)
            if dashboard is None:
                missing.append(dashboard_title)
        if tenant_id:
            _grant_tenant_role_on_schema_datasets(sm, workspace, tenant_id)
            _prune_tenant_datasource_permissions(sm, tenant_id)
            _remove_orphan_example_datasets(workspace, tenant_id)
            _dedupe_tenant_example_dashboards(tenant_id, sm)
            from hg_tenant_example_owners import assign_tenant_ownership_to_examples

            owned = assign_tenant_ownership_to_examples(sm, tenant_id)
            if owned:
                print(f"Set example owners for {tenant_id} ({owned} object(s))")
        db.session.commit()

        if missing:
            print(
                f"starter examples missing dashboards: {', '.join(missing)}",
                file=sys.stderr,
            )
            return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
