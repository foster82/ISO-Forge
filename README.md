# ISO Forge 🚀

ISO Forge is a full-stack Next.js application designed to automate the customization of Ubuntu ISOs and Cloud Images. It provides a web-based interface for creating "Profiles" that define how an OS should be automatically installed or configured using `cloud-init` and `autoinstall`.

## ✨ Features

- **ISO Customization:** Inject `autoinstall` configurations into official Ubuntu Server ISOs.
- **Cloud Image Injection:** Pre-configure Cloud Images (QCOW2/IMG) using `virt-customize`.
- **Profile Management:** Create, edit, and manage multiple OS configuration profiles.
- **Automated Boot Testing:** Integrated QEMU runner to verify that your customized images boot successfully in a virtual environment (KVM accelerated).
- **Authentication:** Secure login supporting both **Local Database** accounts and **LDAP/Active Directory** integration.
- **Role-Based Access Control (RBAC):** Granular permissions to restrict sensitive administrative actions.
- **Custom Branding:** Global settings to configure company name and logo across the application.
- **Flexible Image Sourcing:** Download base images via URL or upload them directly from your local machine (supports up to 10GB).

## 🛡️ User Roles & Permissions

ISO Forge implements two primary roles to ensure system security:

- **ADMIN:** 
  - Full access to all features.
  - Manage **Global Settings** (Branding, LDAP, Auth methods).
  - Add or delete **Base Images**.
  - Delete any **Build Jobs** or **Profiles**.
- **USER:**
  - View dashboard and image lists.
  - Create and edit **Profiles**.
  - Start **Build Jobs** and run **Boot Tests**.
  - *Restricted:* Cannot access settings, add/delete base images, or delete records.

> **Default Admin Credentials:** `admin` / `admin` (Change these immediately upon setup!)

## 🛠️ Technology Stack

- **Framework:** [Next.js 15+](https://nextjs.org) (App Router, Standalone mode)
- **Authentication:** [Auth.js (v5)](https://authjs.dev)
- **Database:** [Prisma](https://prisma.io) with SQLite (Better-SQLite3 adapter)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com) & [Lucide React](https://lucide.dev)
- **Backend Tools:** `xorriso`, `7z`, `qemu-system-x86_64`, `virt-customize` (libguestfs)

## 🐳 Docker Deployment (Recommended)

The easiest way to run ISO Forge is using Docker Compose, which bundles all system dependencies and ensures consistent execution.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/foster82/ISO-Forge.git
   cd ISO-Forge
   ```

2. **Start with Docker Compose:**
   ```bash
   docker-compose up -d --build
   ```

3. **Persistent Data:**
   - `./storage`: Contains base ISOs and generated builds.
   - `./data`: Contains the SQLite database file.

## 🚀 Manual Installation

### Prerequisites

Ensure you have the following tools installed on your host system:
```bash
sudo apt update
sudo apt install p7zip-full xorriso qemu-system-x86 ovmf libguestfs-tools wget linux-image-amd64
```

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Initialize the database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Create initial admin account:**
   ```bash
   # Run the provided setup script or manual prisma query to create the admin user
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

## 📁 Directory Structure

- `src/app`: Next.js pages, API routes, and Server Actions.
- `src/lib`: Core logic including `BuildEngine`, `QEMURunner`, and LDAP integration.
- `src/components`: Reusable UI components.
- `storage/`: Persistent storage for images and builds.
- `prisma/`: Database schema and generated client.

## 🛡️ License

This project is open-source. Please refer to the LICENSE file for more details.
