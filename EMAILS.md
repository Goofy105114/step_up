# Email Notifications

## Status

✅ Backend endpoints are ready. Email templates are configured in the API.

## Triggers

Emails are sent automatically when:

| Event | Recipient | Template |
|---|---|---|
| Order Placed | Customer | Order confirmation + order number |
| Order Shipped | Customer | Tracking number + estimated delivery |
| Order Delivered | Customer | Delivery confirmation |
| Return Requested | Admin + Customer | Return request details |
| Return Approved | Customer | Return label + instructions |
| Refund Processed | Customer | Refund confirmation + amount |
| Newsletter Signup | Subscriber | Welcome + 15% discount code |

## Setup

Email service is **Resend** (configured in Render environment).

If not working:
1. Set `RESEND_API_KEY` on Render
2. Set `ADMIN_EMAIL` for order notifications
3. Update email templates in `api/db/seed.sql` if needed

## Testing

```bash
# Send test email via API
curl -X POST https://step-up-09ee.onrender.com/api/emails/send-test \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","template":"order_confirmation"}'
```

---

**Note:** Emails work in production. Frontend just shows order status — backend handles email sends.
