# ISO Forge 🚀

ISO Forge is a full-stack Next.js application designed to automate the customization of Ubuntu ISOs and Cloud Images. It provides a web-based interface for creating "Profiles" that define how an OS should be automatically installed or configured using `cloud-init` and `autoinstall`.

## ✨ Features

- **ISO Customization:** Inject `autoinstall` configurations into official Ubuntu Server ISOs.
- **Cloud Image Injection:** Pre-configure Cloud Images (QCOW2/IMG) using `virt-customize`.
- **Profile Management:** Create, edit, and manage multiple OS configuration profiles.
- **Automated Boot Testing:** Integrated QEMU runner to verify that your customized images boot successfully in a virtual environment (KVM accelerated).
- **Authentication:** Secure login supporting both **Local Database** accounts and **LDAP/Active Directory** integration.
- **Custom Branding:** Global settings to configure company name and logo across the application.
- **Flexible Image Sourcing:** Download base images via URL or upload them directly from your local machine.

## 🛠️ Technology Stack

- **Framework:** [Next.js 15+](https://nextjs.org) (App Router, Standalone mode)
- **Authentication:** [Auth.js (v5)](https://authjs.dev)
- **Database:** [Prisma](https://prisma.io) with SQLite
- **Styling:** [Tailwind CSS](https://tailwindcss.com) & [Lucide React](https://lucide.dev)
- **Backend Tools:** `xorriso`, `7z`, `qemu-system-x86_64`, `virt-customize` (libguestfs)

## 🐳 Docker Deployment (Recommended)

The easiest way to run ISO Forge is using Docker Compose, which bundles all system dependencies.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/foster82/ISO-Forge.git
   cd ISO-Forge
   ```

2. **Start with Docker Compose:**
   ```bash
   docker-compose up -d --build
   ```

Open [http://localhost:3000](http://localhost:3000) to access the app.
- **Default Credentials:** `admin` / `admin`

## 🚀 Manual Installation

### Prerequisites

Ensure you have the following tools installed on your host system:
```bash
sudo apt update
sudo apt install p7zip-full xorriso qemu-system-x86 ovmf libguestfs-tools wget
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

3. **Run the development server:**
   ```bash
   npm run dev
   ```

## 📁 Directory Structure

- `src/app`: Next.js pages, API routes, and Server Actions.
- `src/lib`: Core logic including `BuildEngine`, `QEMURunner`, and LDAP integration.
- `src/components`: Reusable UI components.
- `storage/`: Persistent storage for base images (`base/`) and customized outputs (`builds/`).
- `data/`: Directory for the SQLite database (in Docker).

## 🛡️ License

This project is open-source. Please refer to the LICENSE file for more details.
