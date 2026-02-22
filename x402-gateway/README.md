# How to Test This Flow

You can test this entire flow using Postman or curl right now:

### Attempt the Request (Without paying):

**POST** to `http://localhost:3000/api/request-service`

**Body:**
```json
{"agentId": 1, "userPrompt": "weather"}
```

**Result:** You will get a `402 Payment Required` and an `invoiceId`.

---

### Pay the Invoice:

**POST** to `http://localhost:3000/api/pay-invoice`

**Body:**
```json
{"invoiceId": "<the_id_from_step_1>"}
```

**Result:** You will receive an L402 `<token>`.

---

### Retry the Request (With the token):

**POST** to `http://localhost:3000/api/request-service`

**Headers:**
```
Authorization: L402 <token>
```

**Body:**
```json
{"agentId": 1, "userPrompt": "weather"}
```

**Result:** The Gateway bypasses the paywall, triggers OpenClaw, sends the result to your CRE for auditing, and returns a `200 OK` with the JSON data.
