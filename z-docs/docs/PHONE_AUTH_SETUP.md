# Phone verification (Supabase Auth + Twilio)

Signup and social login use **SMS OTP on the customer’s mobile number**. Twilio credentials are configured in **Supabase**, not in this app’s `.env.local`.

## 2. Twilio Console (trial — complete walkthrough)

Use **Live** credentials on a **trial** account. Do **not** use Twilio **Test** credentials in Supabase — Test keys never send real SMS.

### Step 1 — Copy Live API credentials

1. Twilio Console → **Account** → **Keys & credentials** → **API keys & tokens**
2. Under **Live credentials**, copy:
   - **Account SID** (`AC…`)
   - **Auth Token** (click the eye icon)

### Step 2 — Confirm your trial SMS number

1. **Phone Numbers** → **Manage** → **Active numbers**
2. You should have an SMS-capable number (e.g. `(984) 231-9871` → E.164: `+19842319871`)
3. Open the number → confirm **SMS** is enabled under capabilities

> **A2P 10DLC banner:** That registration is required to send SMS **to US mobiles** with a US local number. It does **not** block sending **to Pakistan (+92)**. You can ignore A2P for now if your test destination is PK.

### Step 3 — Verify the destination phone (trial only)

Trial accounts can only text numbers you prove you own:

1. **Phone Numbers** → **Manage** → **Verified Caller IDs**
2. **Add a new Caller ID**
3. Enter the exact number users will type in the app (e.g. `+923231103430`)
4. Complete Twilio’s verification (SMS or call to that device)

### Step 4 — Enable Pakistan in Geo Permissions

1. **Messaging** → **Settings** → **Geo permissions**
2. Find **Pakistan** and enable outbound SMS (if available on your account)
3. Save

### Step 5 — Fix Messaging Service (error 21704)

Your logs showed **21704: Messaging Service contains no phone numbers**. Fix:

1. **Messaging** → **Services**
2. Open the service whose SID matches Supabase (e.g. `MGcaa727d40df3bfaf207531012d6c95c4`)  
   — or create **Create Messaging Service** → name it e.g. `TravelTourUp Auth`
3. Go to **Senders** (or **Sender Pool**)
4. **Add senders** → select your trial number `(984) 231-9871` / `+19842319871`
5. Save
6. Copy the **Messaging Service SID** (`MG…`) from the service overview

Optional (same link, other direction):

1. **Phone Numbers** → your number → **Configure**
2. Under **Messaging configuration** → **Messaging Service** → select the service from step 5
3. Save

### Step 6 — Trial country rule (important)

During trial, SMS is limited to your **Twilio sign-up country**:

| You signed up Twilio with… | Can text +92 (Pakistan) on trial? |
|----------------------------|-----------------------------------|
| Pakistan number            | Yes, if number is Verified Caller ID |
| US or other country        | **No** — upgrade account first    |

If PK delivery fails after fixing step 5, either **upgrade Twilio** ($20 min) or temporarily test with a **Verified Caller ID in your sign-up country**.

---

## 1. Supabase Dashboard

### Authentication → Providers → Email

- Turn **off** “Confirm email” so password signup returns a session immediately (no email confirmation step).

### Authentication → Providers → Phone

- Enable **Phone** provider.
- **SMS provider:** choose **Twilio** (not **Twilio Verify** unless you created a Verify Service `VA…` and want that product instead).
- Paste **Live** credentials from Twilio Step 1:
  - **Account SID** (`AC…`)
  - **Auth Token**
  - **Twilio Message Service SID** (`MG…`) from Twilio Step 5
- **Alternative:** paste the Twilio phone number (`+19842319871`) directly instead of `MG…` if you prefer not to use a Messaging Service.
- Leave **Test Phone Numbers and OTPs** **empty** for real SMS via Twilio.

### Authentication → Rate limits

- Keep default OTP send/verify limits (or tighten for production).

## 2b. End-to-end test checklist

After Twilio + Supabase are configured:

1. Open the app → **Sign up** or **Verify phone**
2. Enter the **exact** Verified Caller ID (e.g. `PK +92` / `3231103430`)
3. Click **Send verification code**
4. **Twilio → Monitor → Logs → Messaging** — expect:
   - **From:** `+19842319871` (or your trial number) — not blank
   - **To:** `+923231103430`
   - **Status:** Delivered or Sent — not Failed `21704`
5. Enter the 6-digit code from SMS → **Verify & continue**
6. **Supabase → Authentication → Logs** — no SMS errors at the same timestamp

### Dev-only shortcut (no SMS)

Supabase → **Auth → Phone → Test Phone Numbers and OTPs**:

```
+923231103430=123456
```

Any send returns success; always use code `123456`. Remove before production.

---

## 3. App environment (no Twilio secrets)

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server only
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 4. User flows

### Email signup

1. Customer submits name, email, password, phone.
2. App creates Supabase user (email auto-confirmed).
3. App calls `updateUser({ phone })` and sends SMS OTP via Supabase/Twilio.
4. Customer enters 6-digit code → `verifyOtp` → profile stores `phone_e164` + `phone_verified_at`.

### Google / Facebook / X

1. OAuth completes at `/auth/callback`.
2. **New** users are redirected to `/verify-phone` until OTP succeeds.
3. **Existing** users (created before rollout) are not forced to verify.

## 5. API (mobile)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/v1/auth/signup` | Body includes `phone` (E.164); returns tokens + `phone_verification_required: true` |
| POST | `/api/v1/auth/phone/send-otp` | `Authorization: Bearer <access_token>` |
| POST | `/api/v1/auth/phone/verify-otp` | `Authorization: Bearer <access_token>` |

## 6. Database

After deploy:

```bash
npx prisma migrate deploy
npx prisma generate
```

New columns on `users`: `phone_e164`, `phone_verified_at`, `phone_verify_required`.

## 7. Troubleshooting

| Symptom | Fix |
|---------|-----|
| UI says “code sent” but no SMS | Check **Twilio → Monitor → Logs → Messaging** first. If empty, Supabase never reached Twilio (wrong Live credentials or missing sender). If **Failed**, read the error code there and in **Supabase → Authentication → Logs**. |
| “Session missing after signup” | Disable email confirmation in Supabase Email provider |
| SMS not received (trial) | Number must be in **Verified Caller IDs** **and** in your **Twilio sign-up country** until you upgrade |
| SMS not received (PK) | Confirm Geo Permissions include Pakistan; PK carriers may rewrite sender ID — delivery can still succeed with a different “From” |
| Supabase error about `From` number | Use `MG…` Messaging Service with a sender number, or a Twilio phone number — not `VA…` Verify SID |
| “Phone already registered” | Number linked to another Supabase auth user |
| OAuth skips verify | User existed before rollout (`phone_verify_required = false`) |
| Dev server shows no error | Run `npm run dev` and watch terminal for `[phone-otp]` lines after clicking Send |

### Diagnostic order (recommended)

1. **Supabase → Authentication → Logs** — filter for your user / phone; look for SMS send errors.
2. **Twilio → Monitor → Logs → Messaging** — confirm a message was created for `+923231103430` and its status (queued, delivered, failed).
3. **Supabase → Auth → Providers → Phone** — Live `AC…` + Auth Token + `MG…` or phone number; Test credentials disabled.
4. **Twilio trial country** — if sign-up country ≠ Pakistan, upgrade Twilio or test with a number in your sign-up country.
5. Retry from the app; check terminal for `[phone-otp] updateUser failed` with the raw Supabase message.

See also: [SOCIAL_AUTH_SETUP.md](./SOCIAL_AUTH_SETUP.md)
