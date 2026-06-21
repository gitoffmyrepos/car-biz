# GigWheels — Autonomous Customer-Contact + Back-Office Platform (research + plan)

2026-06-21. OSS-only, self-hosted on the existing k8s stack (Ollama LLM+`nomic-embed`,
Postgres, Redis, Redpanda, MinIO, Chatwoot, Vault, ArgoCD). Star counts are live as of research date.

## Recommended stack (one pick per category)

| Role | Pick | Stars | Why |
|---|---|---|---|
| **Orchestrator** ("nervous system") | **n8n** | ~193k | Native IMAP trigger, webhooks, cron, **Ollama + AI-Agent nodes**, huge template library. Fair-code license = fine for internal use. (MIT fallback: Activepieces ~23k) |
| **RAG / agent brain** | **Dify** | ~146k | Only one with RAG + agents + chat + visual workflow in one; uses Ollama as LLM **and** embedder; supports **pgvector**; every app is a REST API n8n/Chatwoot/voice can call. (Deep-PDF fallback: RAGFlow) |
| **Vector DB** | **pgvector** (have it) | ~22k | KB is tiny; reuse existing Postgres; metadata filters = SQL. Scale-up → Qdrant ~33k |
| **Voice agent** | **pipecat + Telnyx** | ~13k | Only framework with first-party Whisper+Ollama+Piper; Telnyx number ~$1/mo + ~$0.003-0.005/min. (SIP control plane: LiveKit SIP / Jambonz) |
| **Email agent** | **n8n IMAP → Dify → SMTP** (workflow, not a repo) | — | Dedicated OSS email-AI repos are hobbyware. Build as a workflow, draft-for-approval first |
| **CRM** | **EspoCRM** | ~3.1k | Mature, lightweight, Postgres-capable, best automation (REST + webhooks + built-in BPM). Modern-UX runner-up: Twenty ~51k. Full-ERP alt: ERPNext ~36k |
| **Helpdesk / shared inbox** | **Chatwoot** (have it) | ~33k | Already deployed; email channel + shared inbox covers tickets. Add FreeScout/Zammad later if needed |
| **Office suite** | **Nextcloud + OnlyOffice/Collabora** | ~36k | Files/calendar/contacts on Postgres+MinIO; CalDAV/CardDAV syncs to CRM |

## Architecture

```
Phone ─Telnyx SIP/WS─▶ pipecat (Whisper→Ollama→Piper) ─┐
Email ─IMAP──────────▶ n8n Email Trigger ──────────────┤
Web   ───────────────▶ Chatwoot (widget + email) ──────┘
                                   │ webhooks/REST
                          ┌────────▼─────────┐
                          │ n8n  ORCHESTRATOR │ routing·scheduling·approvals·logging·CRM-sync
                          └───┬───────────┬───┘
                       (HTTP) │           │ (REST)
                    ┌─────────▼──┐   ┌────▼───────┐
                    │ Dify RAG   │   │ EspoCRM    │ customers/bookings + BPM
                    │ brain      │   └────────────┘
                    └──┬──────┬──┘
            (LLM+embed)│      │(vectors+metadata)
                  ┌────▼─┐ ┌──▼──────────────┐
                  │Ollama│ │Postgres+pgvector│ ← KB: cars/policies/FAQs
                  └──────┘ └─────────────────┘
Shared: Redis (queues) · MinIO (files) · Redpanda (event/audit bus) · Vault · ArgoCD
Back office: Nextcloud (docs/calendar/files)
```
One KB (Dify+pgvector via Ollama nomic-embed), one agent brain (Dify REST) behind every channel, n8n routes everything.

## Phased roadmap (each = its own deploy, mirror-OSS→harbor→k8s→CF, like Chatwoot)

1. **Phase 1 — autonomous chat + email (~$0, uses deployed stack):** Dify (Ollama+pgvector) + KB (fleet/rates/policy/FAQ) → Chatwoot→n8n→Dify autonomous chat; n8n IMAP→Dify→SMTP email agent (draft-for-approval → auto-send low-risk).
2. **Phase 2 — back office (~$0):** EspoCRM (sync Chatwoot contacts/bookings via n8n); Nextcloud+OnlyOffice on Postgres+MinIO.
3. **Phase 3 — voice (~$1/mo + ~$0.004/min):** Telnyx number + faster-whisper + Piper + pipecat → Ollama function-calling into Dify/CRM.
4. **Phase 4 — scale/hardening:** Qdrant if vectors→millions; RAGFlow if scanned-PDF KB; Redpanda audit backbone; FreeScout/Zammad if SLA ticketing needed.

## Cost: only the phone number
Telnyx ~$1/mo + ~$0.003-0.005/min inbound (Plivo ~$0.50/mo cheaper; Twilio priciest). Everything else fully free/self-hosted.

## ⚠️ CORRECTION — Proton is wrong for the autonomous EMAIL agent
Proton has **no native IMAP/SMTP** — only the **Proton Mail Bridge** (a desktop app: interactive 2FA, stateful creds, self-signed TLS — headless-hostile in k8s, fights GitOps). The earlier sub-project-C Proton-SMTP choice works awkwardly for *sending* but the autonomous email agent needs **IMAP monitoring** which Proton can't do cleanly. **Recommend: use a normal IMAP/SMTP provider (Gmail app-password / Fastmail / mailbox.org) OR self-host Mailcow/Stalwart** for the GigWheels mailbox. Revisit the C wiring (it's flag-gated, easy to point at a real IMAP provider).

## Other gotchas
- Dify default vector store is Weaviate — explicitly configure **pgvector**.
- Standardize embeddings on `nomic-embed-text` (768-dim) so KB is portable pgvector→Qdrant.
- Voice latency: co-locate Whisper+Piper+Ollama on a GPU node; prefer Telnyx SIP/RTP over Twilio Media Streams.
- Auto-reply risk: gate price/availability sends through n8n human-in-the-loop until trusted.
- Licenses (none block internal self-host): n8n fair-code, Dify modified-Apache (no SaaS resale), Twenty/Nextcloud/EspoCRM AGPL.
</content>
