# Security Specifications for Social App

## Data Invariants
1. **Identity Integrity**: Every document representing user-generated content (`Post`, `Comment`, `Message`, `LiveRoom`, `Story`, `Reel`) MUST store the creator's UID (e.g., `authorId`, `hostId`, `senderId`, `userId`) and this MUST be immutable and verified against `request.auth.uid`.
2. **Relational Synchronization (The Master Gate)**: All sub-resources (e.g., `Comment` -> `Post`, `LiveViewer`/`LiveReaction` -> `LiveRoom`, `Message` -> `Chat`) MUST verify the existence and state of the parent resource via `get()`. Access to the sub-resource is derived from the parent's membership/privacy settings.
3. **Immutability of History**: Timestamps (`createdAt`, `startedAt`, `timestamp`) MUST be set to `request.time` upon creation and remain unchanged during updates.
4. **Member-Only Access (The Fortress)**: Data in private rooms, chats, and notifications MUST be strictly limited to authenticated participants via membership lists or relational IDs.
5. **No Shadow Fields**: All writes MUST be strictly validated against a known schema to prevent "Hidden Admin" or "Shadow Permission" injection.

## The Dirty Dozen (Critical Vulnerabilities)
1. **Identity Spoofing**: User A tries to create a `Post` with `authorId: "UserB"`.
2. **Shadow Field Injection**: User A tries to update their `User` profile and inject `role: "admin"` or `isVerified: true`.
3. **Relational Bypass**: User A tries to create a `Comment` on `posts/fakePostId` (orphaned write).
4. **Membership Breach**: User A (non-participant) tries to read messages in `chats/ChatB`.
5. **Viewer Scraper**: User A tries to `list` all viewers of `live_rooms/PrivateRoomB` without being a participant.
6. **Interaction Poisoning**: User A tries to send a `LiveReaction` with `emoji: "long_string_1MB"`.
7. **Terminal State Lock Bypass**: Host tries to update `title` of a `LiveRoom` where `status == "ended"`.
8. **Update Gap**: User A tries to update a `User` profile and change `followersCount` manually.
9. **Notification Seizure**: User A tries to `update` or `delete` a `Notification` intended for `recipientId: "UserB"`.
10. **ID Poisoning**: User A tries to create a `Post` with a document ID that is 2KB of junk characters.
11. **PII Leakage**: User A tries to `get` or `list` documents in `users_private` belonging to others.
12. **Self-Promotion**: User A tries to set their own `verificationStatus` to `"verified"` during registration.

## Evaluation & Audit
The `firestore.rules` must ensure 100% rejection across all "Dirty Dozen" payloads.
