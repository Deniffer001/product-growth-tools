---
type: Reference
title: HubSpot operation inventory
description: >
  Generated inventory of pinned HubSpot operations and their gkit exposure decisions.
provider: hubspot
inventoryRevision: 2026-08-30.hubspot.read-v1.1
---

# HubSpot operation inventory

This pinned inventory contains 17 operations: 7 executable and 10 inventory-only.
Inventory-only operations cannot be routed by `gkit hubspot api call`.

HubSpot record, owner, event, association, pipeline, and property artifacts may contain PII or confidential business data. The inventory records endpoint exposure only; it does not authorize copying provider data into logs or prompts.

| Method | Path | Operation ID | Exposure | Decision |
| --- | --- | --- | --- | --- |
| `POST` | `/crm/imports/2026-03/imports` | `crm.imports.create` | `inventory` | Imports are mutations and are outside the read-only HubSpot V1 provider. |
| `GET` | `/crm/objects/2026-03/{fromObjectType}/{objectId}/associations/{toObjectType}` | `crm.associations.list` | `executable` | Reviewed adapter, input, effect, and response contracts are committed.; capability: `hubspot.crm.associations.list` |
| `DELETE` | `/crm/objects/2026-03/{fromObjectType}/{objectId}/associations/{toObjectType}/{toObjectId}` | `crm.associations.delete` | `inventory` | Destructive mutation is outside the read-only HubSpot V1 provider. |
| `PUT` | `/crm/objects/2026-03/{fromObjectType}/{objectId}/associations/default/{toObjectType}/{toObjectId}` | `crm.associations.create` | `inventory` | Mutation is outside the read-only HubSpot V1 provider. |
| `GET` | `/crm/objects/2026-03/{objectType}` | `crm.objects.list` | `executable` | Reviewed adapter, input, effect, and response contracts are committed.; capability: `hubspot.crm.objects.list` |
| `POST` | `/crm/objects/2026-03/{objectType}` | `crm.objects.create` | `inventory` | Mutation is outside the read-only HubSpot V1 provider. |
| `DELETE` | `/crm/objects/2026-03/{objectType}/{recordId}` | `crm.objects.archive` | `inventory` | Destructive mutation is outside the read-only HubSpot V1 provider. |
| `PATCH` | `/crm/objects/2026-03/{objectType}/{recordId}` | `crm.objects.update` | `inventory` | Mutation is outside the read-only HubSpot V1 provider. |
| `POST` | `/crm/objects/2026-03/{objectType}/search` | `crm.objects.search` | `executable` | Reviewed adapter, input, effect, and response contracts are committed.; capability: `hubspot.crm.objects.search` |
| `GET` | `/crm/owners/2026-03` | `crm.owners.list` | `executable` | Reviewed adapter, input, effect, and response contracts are committed.; capability: `hubspot.crm.owners.list` |
| `GET` | `/crm/pipelines/2026-03/{objectType}` | `crm.pipelines.list` | `executable` | Reviewed adapter, input, effect, and response contracts are committed.; capability: `hubspot.crm.pipelines.list` |
| `POST` | `/crm/pipelines/2026-03/{objectType}` | `crm.pipelines.create` | `inventory` | Mutation is outside the read-only HubSpot V1 provider. |
| `DELETE` | `/crm/pipelines/2026-03/{objectType}/{pipelineId}` | `crm.pipelines.delete` | `inventory` | Destructive mutation is outside the read-only HubSpot V1 provider. |
| `GET` | `/crm/properties/2026-03/{objectType}` | `crm.properties.list` | `executable` | Reviewed adapter, input, effect, and response contracts are committed.; capability: `hubspot.crm.properties.list` |
| `POST` | `/crm/properties/2026-03/{objectType}` | `crm.properties.create` | `inventory` | Mutation is outside the read-only HubSpot V1 provider. |
| `POST` | `/events/2026-03/send` | `events.occurrences.send` | `inventory` | Event sending is outside the read-only HubSpot V1 provider. |
| `GET` | `/events/event-occurrences/2026-03` | `events.occurrences.list` | `executable` | Reviewed adapter, input, effect, and response contracts are committed.; capability: `hubspot.events.occurrences.list` |
