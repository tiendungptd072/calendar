# Lịch âm Việt Nam

PWA lịch âm Việt Nam mobile-first, phong cách iOS Calendar. App chạy hoàn toàn client-side: lịch âm tính bằng TypeScript, ghi chú lưu offline bằng IndexedDB/Dexie, notification là local notification qua Capacitor.

## Tech Stack

- Bun
- Vite + React 19 + TypeScript strict
- Tailwind CSS v4
- Radix UI Dialog
- Framer Motion + `@use-gesture/react`
- Dexie / IndexedDB
- vite-plugin-pwa
- Capacitor Android/iOS
- `@capacitor/local-notifications`
- Vitest

## Yêu Cầu Máy

Cài Bun trước khi chạy project:

```bash
curl -fsSL https://bun.sh/install | bash
```

Sau đó mở terminal mới và kiểm tra:

```bash
bun --version
```

Repo hiện được pin với Bun `1.3.14` trong `package.json`. Nếu vừa cài Bun mà terminal chưa nhận lệnh `bun`, hãy mở terminal mới hoặc chạy `exec /bin/zsh`.

## Cài Đặt

```bash
bun install
```

Project đã chuyển sang Bun-first. Không dùng `package-lock.json`; lockfile chuẩn là `bun.lock`.

## Chạy Development

```bash
bun run dev
```

Vite thường chạy tại:

```text
http://localhost:5173/
```

## Scripts

```bash
bun run dev        # chạy Vite dev server
bun run build      # TypeScript build + Vite production build
bun run lint       # ESLint
bun run test       # Vitest
bun run preview    # preview production build
```

Capacitor:

```bash
bun run cap:sync
bun run cap:open:ios
bun run cap:open:android
```

## Kiến Trúc Chính

```text
src/
  app/
    App.tsx
    AppShell.tsx
  core/
    lunar/
      hnd.ts
      canchi.ts
      hoangdao.ts
      tietkhi.ts
      truc.ts
      sao.ts
      index.ts
  modules/
    calendar/
      components/
      hooks/
  storage/
  notifications/
  shared/
```

## Lunar Engine

`src/core/lunar` là pure TypeScript, không import React/UI và không có side effect. Thuật toán chuyển đổi âm dương dựa trên Hồ Ngọc Đức, mặc định timezone Việt Nam UTC+7.

API chính:

```ts
import { getDayInfo } from '@/core/lunar'

const info = getDayInfo(new Date(), { timeZone: 7 })
```

## Ghi Chú Offline

Notes lưu trong IndexedDB qua Dexie:

- `id`
- `title`
- `note`
- `solarDate`
- optional `lunarDate`
- `repeatType: none | yearly_lunar`
- reminder config
- `createdAt`, `updatedAt`

Ghi chú lặp `yearly_lunar` được map vào month grid bằng lunar date, phù hợp cho giỗ/lễ âm lịch.

## Local Notifications

Notification chỉ dùng local notification của Capacitor:

- Không backend.
- Không push server.
- Không cron server.
- Browser fallback an toàn, không crash nếu không chạy native.

Mỗi lần mở app, nếu user đã bật nhắc, app hủy pending notification của app rồi schedule lại tối đa 50 notification gần nhất. Con số này giữ dưới giới hạn pending notification thực tế của iOS, thường khoảng 64.

Test máy thật:

```bash
bun run build
bunx cap sync
bunx cap open ios
# hoặc
bunx cap open android
```

Chạy trên thiết bị thật, bật nhắc trong app, cấp quyền notification, rồi đưa app xuống background để kiểm tra.

## PWA

Build production tạo:

- `manifest.webmanifest`
- `sw.js`
- Workbox precache app shell

Icon PWA hiện là placeholder. Thay icon thật trước khi release.

## Web Push Reminders

Web Push có hai phần khác nhau:

- `Gửi thử ngay` gửi notification ngay từ `/api/push/test`.
- Nhắc ghi chú/mùng 1/rằm theo giờ cần scheduler server gọi `/api/dispatch` liên tục.

Vercel Hobby chỉ hỗ trợ Cron mỗi ngày một lần, nên không đủ để gửi ghi chú đúng phút khi PWA đã đóng. Để note reminder vẫn gửi khi app đã tắt, chạy file SQL này trong Supabase SQL Editor:

```text
supabase/web_push_dispatch_cron.sql
```

Trước khi chạy, thay:

```text
YOUR_VERCEL_APP_URL
YOUR_CRON_SECRET
```

`YOUR_VERCEL_APP_URL` là domain production, ví dụ `calendar-nine-navy.vercel.app`. `YOUR_CRON_SECRET` phải trùng với env `CRON_SECRET` trên Vercel.

Supabase job này dùng `pg_cron` và `pg_net` để gọi `/api/dispatch` mỗi phút. `dispatch` sẽ quét bảng `scheduled_pushes`, gửi các push đến hạn, rồi đánh dấu `sent/status`.

## Kiểm Tra Trước Khi Commit

```bash
bun run lint
bun run test
bun run build
```

Nếu vừa thay native plugin:

```bash
bunx cap sync
```
