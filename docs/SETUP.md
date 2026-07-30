# Setup Guide

> **Status: stub.** This file is not yet the full setup guide (that's still a
> planned task). For now it contains one important note flagged during
> review that shouldn't wait for the full write-up.

## ⚠️ Security note: Elasticsearch has no authentication (dev-only)

In `docker-compose.yml`, the `elasticsearch` service runs with
`xpack.security.enabled=false`. This means:

- There is **no username/password** required to read, write, or delete data.
- There is **no TLS encryption** on the connection.
- **Anyone who can reach port 9200** on your machine (or network) can query
  or wipe every indexed threat.

This is intentional and fine **only** for local development on your own
computer. It must **never** be used as-is:
- on a shared network (e.g. university wifi, a shared lab machine),
- on any publicly reachable server,
- in any deployment beyond your own local Docker setup.

A real deployment would need `xpack.security.enabled=true`, proper TLS
certificates, and real credentials configured for both Elasticsearch itself
and the Django backend connecting to it.

---

*(Full setup instructions - prerequisites, first-time setup, running via
Docker vs. natively, common troubleshooting - still to be written.)*
