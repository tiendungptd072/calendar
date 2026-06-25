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

## Native Local Notifications

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

Phần này dành cho bản native Capacitor. Bản PWA trên Vercel dùng Web Push ở mục dưới.

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
- `Kiểm tra lịch nhắc` gọi `/api/push/status` để xem subscription còn active không, có pending reminder không, và có reminder nào đã đến hạn nhưng chưa dispatch không.

Vercel Hobby chỉ hỗ trợ Cron mỗi ngày một lần, nên không đủ để gửi ghi chú đúng phút khi PWA đã đóng. Để note reminder vẫn gửi khi app đã tắt, dùng một scheduler bên ngoài gọi API bằng `CRON_SECRET`.

Set trên Vercel Environment Variables:

```env
CRON_SECRET=your_long_random_cron_secret
```

Nếu bảng Supabase được tạo thủ công, chạy schema idempotent trước:

```text
supabase/web_push_schema.sql
```

Nếu chưa chắc schema production có đủ cột, kiểm tra trong Supabase SQL Editor:

```sql
select column_name, is_nullable, column_default
from information_schema.columns
where table_name = 'scheduled_pushes'
order by ordinal_position;
```

### Scheduler bằng cron-job.org

Tạo 2 job:

#### Job 1 - Dispatch push

```text
GET https://<app>.vercel.app/api/dispatch
Header:
Authorization: Bearer <CRON_SECRET>
Frequency: moi 1-2 phut
```

Job này quét `scheduled_pushes` có `fire_at <= now` và `sent = false`, gửi Web Push thật qua `web-push`, rồi đánh dấu `sent=true`.

#### Job 2 - Replenish schedule

```text
GET https://<app>.vercel.app/api/replenish
Header:
Authorization: Bearer <CRON_SECRET>
Frequency: 1 lan/ngay
```

Job này gọi `generateScheduleForSub` cho từng subscription active để nạp lại lịch mùng 1/rằm tương lai.

Secret trên cron-job.org phải trùng với `CRON_SECRET` trên Vercel. Sau khi thêm env, redeploy project.

### Test Web Push Khi App Đã Đóng

Tạo một lịch đến hạn trong Supabase:

```sql
update scheduled_pushes
set fire_at = now() - interval '1 minute',
    sent = false
where id = '<scheduled_push_id>';
```

Đóng PWA trên iPhone rồi gọi:

```bash
curl "https://<app>.vercel.app/api/dispatch" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

Kết quả mong muốn:

```json
{ "ok": true, "processed": 1, "sent": 1 }
```

Test sai secret:

```bash
curl "https://<app>.vercel.app/api/dispatch" \
  -H "Authorization: Bearer wrong-secret"
```

Kết quả mong muốn là HTTP `401`. Làm tương tự với `/api/replenish`.

Trên iPhone đã Add to Home Screen, kiểm tra `push_subscriptions.subscription -> endpoint`; endpoint đúng của iOS thường chứa `web.push.apple.com`.

### Supabase pg_cron tuỳ chọn

Nếu không dùng cron-job.org, có thể chạy file SQL cron trong Supabase SQL Editor:

```text
supabase/web_push_dispatch_cron.sql
```

Trước khi chạy, thay:

```text
YOUR_VERCEL_APP_ORIGIN
YOUR_CRON_SECRET
```

`YOUR_VERCEL_APP_ORIGIN` là domain production có `https://`, ví dụ `https://calendar-nine-navy.vercel.app`. `YOUR_CRON_SECRET` phải trùng env `CRON_SECRET` trên Vercel.

Supabase job này dùng `pg_cron` và `pg_net` để gọi `/api/dispatch` mỗi phút.

Kiểm tra scheduler trong Supabase:

```sql
select jobname, schedule, active
from cron.job
where jobname = 'lunar-calendar-dispatch-every-minute';
```

Kiểm tra các request gần nhất từ `pg_net`:

```sql
select status_code, content, created
from net._http_response
order by created desc
limit 10;
```

Kiểm tra reminder ghi chú:

```sql
select id, type, fire_at, sent, status, error_message
from scheduled_pushes
where type = 'note'
order by fire_at desc
limit 10;
```

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
