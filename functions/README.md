# SHARO Notification Engine

Firebase Functions v2 backend for Firestore notifications, per-user notification state, and FCM delivery.

## Exported functions

- `onErpEventWritten`: converts company collection writes into idempotent ERP events.
- `onNotificationCreated`: resolves recipients and sends FCM for new notifications.
- `runNotificationDetectors`: handles scheduled announcements and project time/finance alerts every 30 minutes.
- `runDailyWorkforceDetectors`: detects missing attendance, missing punches, and missing work logs Monday–Saturday.

## Delivery model

Notifications are stored at `Companies/{companyId}/Notifications/{notificationId}`. Recipient state is stored at `Companies/{companyId}/UserNotifications/{userId}/Items/{notificationId}`. Delivery logs are stored at `Companies/{companyId}/NotificationLogs/{notificationId}`.

The dispatcher uses deterministic IDs derived from the company, source document, and event transition. This makes Firestore trigger retries idempotent. FCM sends are leased, split into groups of 500, retried once for transient service failures, and invalid tokens are removed from their source user document.

## Local verification

```sh
cd functions
npm install
npm test
npm run lint
```

## Deployment

The Firebase project alias is configured as `sharo-ad80a`. Authenticate the Firebase CLI with an account authorized for that project, then deploy the functions and notification index:

```sh
firebase deploy --only functions,firestore:indexes
```

Cloud Scheduler and the Blaze plan are required for scheduled functions. Confirm that the Flutter app reads the FCM data keys `notificationId`, `companyId`, `type`, `module`, `priority`, `actionId`, `actionRoute`, and `deepLink`.
