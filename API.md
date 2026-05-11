# ISO Forge API Documentation

ISO Forge provides a RESTful API (v1) to allow programmatic management of images, profiles, and build jobs. This is useful for CI/CD integration and CLI-based workflows.

## Authentication

Currently, the API uses **Session Authentication**. To use the API from external tools (like `curl` or scripts):

1. Log in to the Web UI.
2. Capture the `authjs.session-token` cookie.
3. Pass this cookie in your requests.

*Note: Dedicated API Key support is planned for a future release.*

## Endpoints

All endpoints are prefixed with `/api/v1`.

### Images

#### `GET /api/v1/images`
List all base ISOs and Cloud Images.

**Response:**
```json
[
  {
    "id": "cm1...",
    "name": "Debian 12 Stable",
    "version": "12",
    "arch": "amd64",
    "status": "READY",
    "imageType": "ISO"
  }
]
```

### Profiles

#### `GET /api/v1/profiles`
List all configuration profiles.

#### `POST /api/v1/profiles/[id]/build`
Trigger a new build job for a specific profile.

**Response:**
```json
{
  "message": "Build job started",
  "jobId": "cm2...",
  "status": "PENDING"
}
```

### Jobs

#### `GET /api/v1/jobs`
List the 50 most recent build jobs.

#### `GET /api/v1/jobs/[id]`
Get detailed status and metadata for a specific job.

**Response:**
```json
{
  "id": "cm2...",
  "status": "COMPLETED",
  "outputPath": "/home/user/iso-forge/storage/builds/custom-cm2.iso",
  "profile": { "name": "Web Server" }
}
```

---

# CLI Usage

A helper script is provided at `scripts/iso-cli.sh` to simplify API interactions.

### Setup
1. Log in to the web UI.
2. Save your session cookie to a file named `.iso-forge-cookie` in the project root.
   * Format: `authjs.session-token=your-token-here`

### Commands

```bash
# List all base images
./scripts/iso-cli.sh images

# List all profiles
./scripts/iso-cli.sh profiles

# Trigger a build
./scripts/iso-cli.sh build <profile_id>

# Check job status
./scripts/iso-cli.sh status <job_id>
```
