# AGENTS.md

## Hard rule

-   **Jangan edit `packages/server/src/enterprise/`.** Folder itu berlisensi komersial (lihat `packages/server/src/enterprise/LICENSE.md`), padahal core (`utils/*.ts`, `constants.ts`) meng-import darinya. Kalau butuh ubah perilaku enterprise, ubah pemanggilnya di `packages/server/src`, bukan modul enterprise-nya.
-   **Jangan tambah file di `extensions/` atau `apps/*` kecuali `apps/oss-app/`.** `.husky/pre-push` dan CI `proprietary-path-guard.yml` akan menolak push.

## Layout

-   `packages/server` — Express backend + oclif CLI (`bin/run`). Nama paketnya `flowise` (sama dengan root).
-   `packages/ui` — React + Vite frontend.
-   `packages/components` — node, credential, integrasi LLM/vectorstore. Di-load server saat runtime via `require()` dari **`dist/nodes`** yang sudah di-build (`NodesPool.ts:27`).
-   `packages/agentflow`, `packages/observe` — library React embeddable.
-   `packages/api-documentation` — swagger UI.

## Commands

-   Prasyarat: Node 24, pnpm 10.26 (`pnpm install`).
-   `pnpm build` — build semua. Kalau OOM: `NODE_OPTIONS=--max_old_space_size=4096 pnpm build`.
-   `pnpm dev` — ui + server saja, http://localhost:8080. Perubahan `packages/components` **tidak** hot-reload; jalankan `pnpm build` lagi.
-   `pnpm start` — production, http://localhost:3000.
-   Test per paket: `pnpm --filter flowise-components test`, `pnpm --filter "./packages/server" test`, `pnpm --filter @flowiseai/agentflow test`.
-   Test satu file: `pnpm --filter "./packages/server" exec jest src/path/Foo.test.ts`.
-   Urutan CI (`.github/workflows/main.yml`): `pnpm lint` → `pnpm build` → `pnpm test:coverage` → Cypress di `packages/server`.

## Conventions

-   Prettier di root `package.json` (tidak ada `.prettierrc`): no semicolon, single quote, printWidth 140, tabWidth 4.
-   Test co-located: `Foo.test.ts` di sebelah `Foo.ts`. Catatan: jest `packages/ui` hanya match `*.test.js`, bukan `.tsx`.
-   Credential field berisi secret wajib `type: 'url'` atau `'password'`, jangan `'string'` (server hanya meredaksi url/password).
-   Jangan pakai `pnpm --filter flowise` dari root (nama bentrok root/server). Pakai `--filter "./packages/server"`.
-   Jest server: `uuid` dipetakan ke CJS dan `typeorm` ke `__mocks__/typeorm.ts`; jangan tambah `jest.mock('typeorm')` inline.
-   Env var: lihat `CONTRIBUTING.md` dan `.env.example`.
