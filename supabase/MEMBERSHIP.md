# AB Insider Membership — setup

## 1. Run the migration

Apply `migrations/20261101150000_ab_insider_membership.sql` to the Supabase project
(Supabase dashboard → SQL editor, or `supabase db push`). It creates:

| Table | Purpose |
| --- | --- |
| `membership_settings` | One row: programme on/off, fee, validity (default 365 days), plan copy, terms + version, stacking, reminders |
| `customer_memberships` | One row per membership (paid or admin granted) with status, dates, payment order id, grant/revoke details |
| `membership_payments` | Cashfree payment per paid membership |
| `membership_product_rules` | Member price per product, or per variant (overrides the product rule) |
| `membership_audit_logs` | Every settings, price and membership change with admin name, time, old/new values, reason |

It also adds `orders.member_discount` and `orders.customer_membership_id` for reporting.
The programme starts **switched off**; turn it on in **Admin → Membership → Settings**
after setting a fee and member prices.

All tables have RLS on with no policies: only the server (service role) reads them.

## 2. Environment variable

```
MEMBERSHIP_CRON_SECRET=<long random string>
```

Payments use the existing `CASHFREE_*` settings. Cashfree's webhook URL is unchanged
(`/api/payments/cashfree`); membership payments are recognised by their `abm…` order id.

## 3. Daily job (expiry, reminders, abandoned payments)

Memberships stop giving member prices the moment they expire, even without this job.
The job updates stored statuses and sends the "ends soon" and "has ended" emails (once each).

In the Supabase SQL editor (replace the URL and secret):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'ab-insider-daily',
  '30 3 * * *', -- 09:00 IST
  $$
  select net.http_post(
    url := 'https://abcollection.co.in/api/cron/membership',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'REPLACE_WITH_MEMBERSHIP_CRON_SECRET'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

To remove it later: `select cron.unschedule('ab-insider-daily');`

## 4. How pricing works

- Member prices are calculated on the server at checkout for logged-in customers with a
  live membership. The browser display is a preview; the server total is what's charged.
- A variant rule overrides the product rule. Prices never exceed the regular price and
  never fall below the configured minimum. Schedules use start/end dates.
- Stacking off (default): member-priced items get only the member price; coupons, the
  Istefada offer and bundle deals apply to the other items. Each can be switched on.
- If the total changes between the cart and payment (membership expired, price changed),
  checkout stops and asks the shopper to confirm the new total.
- Guest checkout never gets member prices (membership needs an account).

## 5. Staging QA checklist

- [ ] Paid success: join → pay in sandbox → return page shows Active with ID and dates; email arrives once
- [ ] Failed payment (`testfailure@gocash`): status Failed, no member prices
- [ ] Pending: close the app mid-UPI → return page waits; webhook later activates
- [ ] Duplicate webhook: resend the Cashfree webhook → still one activation, one email
- [ ] Expiry: admin sets expiry in the past → member prices stop at once; daily job marks Expired and emails once
- [ ] Admin grant: search customer → grant → shows as Admin granted in admin and My Account, no payment row
- [ ] Admin revoke: reason required → member prices stop; audit log shows who/when/why
- [ ] Member checkout: member price on card, product page, cart and checkout; order saves `member_discount`
- [ ] Stacking: with a coupon/Istefada, member-priced items keep only the member price
- [ ] Price change mid-checkout: revoke while on checkout → "Your total has changed" → confirm and pay
- [ ] Mobile: membership page, My Account and Admin → Membership have no horizontal scrolling
