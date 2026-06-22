# Local Notification Notes

This app uses Capacitor local notifications only. There is no backend, push server, database
server, or cron server.

On every app open, the app cancels pending notifications created by this app and schedules the
nearest upcoming notifications again. The scheduler caps pending notifications at 50 because iOS
has a practical pending-local-notification limit of about 64.

Browser fallback is intentionally safe: when the app is not running inside a Capacitor native
platform, notification APIs are no-ops and do not crash.

Manual device test:

1. Build and sync: `npm run build && npx cap sync`.
2. Open Android Studio or Xcode: `npx cap open android` or `npx cap open ios`.
3. Run on a real device.
4. In the app, enable a reminder setting or a note reminder.
5. Accept the native notification permission prompt.
6. Put the app in background and wait for the configured reminder time.
