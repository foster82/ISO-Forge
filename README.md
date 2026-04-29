# ISO Forge 🚀

ISO Forge is a full-stack Next.js application designed to automate the customization of Ubuntu ISOs and Cloud Images. It provides a web-based interface for creating "Profiles" that define how an OS should be automatically installed or configured using `cloud-init` and `autoinstall`.

## ✨ Features

- **ISO Customization:** Inject `autoinstall` configurations into official Ubuntu Server ISOs.
- **Cloud Image Injection:** Pre-configure Cloud Images (QCOW2/IMG) using `virt-customize`.
- **Profile Management:** Create, edit, and manage multiple OS configuration profiles.
- **Automated Boot Testing:** Integrated QEMU runner to verify that your customized images boot successfully in a virtual environment.
- **Serial Console Capture:** Live capture of serial output during boot tests for debugging.
- **Identity & Auth:** Automated SHA-512 password hashing and SSH key injection.
- **Advanced Overrides:** Direct YAML editor for complex `cloud-init` or `autoinstall` keys.

## 🛠️ Technology Stack

- **Framework:** [Next.js 15+](https://nextjs.org) (App Router)
- **Database:** [Prisma](https://prisma.io) with SQLite
- **Styling:** [Tailwind CSS](https://tailwindcss.com) & [Lucide React](https://lucide.dev)
- **Hashing:** `sha512-crypt-ts` (Ubuntu/Debian compatible hashes)
- **Backend Tools:** `xorriso`, `7z`, `qemu-system-x86_64`, `virt-customize`

## 🚀 Getting Started

### Prerequisites

Ensure you have the following tools installed on your host system:

```bash
sudo apt update
sudo apt install p7zip-full xorriso qemu-system-x86 ovmf libguestfs-tools
```

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/foster82/ISO-Forge.git
   cd ISO-Forge
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Initialize the database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📁 Directory Structure

- `src/app`: Next.js pages and API routes.
- `src/lib`: Core logic including `BuildEngine` and `QEMURunner`.
- `src/components`: Reusable UI components.
- `storage/base`: Directory for official base ISOs/Images.
- `storage/builds`: Directory where customized outputs are saved.

## 🛡️ License

This project is open-source. Please refer to the LICENSE file for more details.
