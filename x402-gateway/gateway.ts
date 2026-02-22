import express, { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const CRE_WEBHOOK_URL = process.env.CRE_WEBHOOK_URL || "https://your-chainlink-cre-url.com/webhook";

// --- Types & Interfaces ---
interface ServiceRequestBody {
    agentId: number;
    userPrompt: string;
}

interface PaymentRequestBody {
    invoiceId: string;
}

interface Invoice {
    status: 'pending' | 'paid';
    amount: number;
}

// In-memory mock database
const pendingInvoices = new Map<string, Invoice>();
const validTokens = new Set<string>();

// ==========================================
// MAIN ENDPOINT: Request AI Service
// ==========================================
app.post('/api/request-service', async (req: Request<{}, {}, ServiceRequestBody>, res: Response): Promise<any> => {
    try {
        const { agentId, userPrompt } = req.body;

        if (!agentId || !userPrompt) {
            return res.status(400).json({ error: "Missing agentId or userPrompt in request body." });
        }

        const authHeader = req.headers['authorization'];

        // --- PHASE 1: THE 402 PAYWALL (L402) ---
        if (!authHeader || !authHeader.startsWith('L402 ')) {
            console.log(`[Gateway] No valid token. Generating 402 for Agent #${agentId}.`);

            const invoiceId = crypto.randomUUID();
            const mockInvoiceStr = `lnbc10u1...mock_invoice_${invoiceId}`;

            pendingInvoices.set(invoiceId, { status: 'pending', amount: 10 });

            res.set('Www-Authenticate', `L402 invoice="${mockInvoiceStr}"`);
            return res.status(402).json({
                error: "Payment Required",
                invoiceId: invoiceId,
                message: "Please pay the invoice to receive an L402 token, then retry with the Authorization header."
            });
        }

        const providedToken = authHeader.split(' ')[1];
        if (!validTokens.has(providedToken)) {
            console.log(`[Gateway] Invalid or expired L402 token provided.`);
            return res.status(401).json({ error: "Unauthorized. Invalid payment token." });
        }

        console.log(`[Gateway] Payment verified! Routing prompt to Agent #${agentId}...`);
        validTokens.delete(providedToken); // Single-use token

        // --- PHASE 2: OPENCLAW EXECUTION ---
        console.log(`[Gateway] Triggering OpenClaw Engine...`);
        const startTime = Date.now();
        const openClawRawResponse = await simulateOpenClawExecution(userPrompt);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // --- PHASE 3: QUALITY AUDIT (CHAINLINK CRE) ---
        console.log(`[Gateway] Task complete (${responseTime}ms). Sending to Chainlink CRE for ERC-8004 auditing...`);

        let auditData;
        try {
            const creResponse = await axios.post(CRE_WEBHOOK_URL, {
                agentId: agentId,
                rawPayload: openClawRawResponse,
                responseTime: responseTime
            });
            auditData = creResponse.data;
            console.log(`[Gateway] CRE Audit Status: ${auditData.body.auditStatus}`);
        } catch (creError: any) {
            console.error("[Gateway] Failed to contact Chainlink CRE.", creError.message);
            return res.status(502).json({ error: "Decentralized audit failed. Service unavailable." });
        }

        // --- PHASE 4: FINAL DELIVERY ---
        if (auditData.body.auditStatus === "FAILED") {
            return res.status(400).json({
                error: "The Agent's response was rejected by the AgentScore Quality Protocol.",
                auditDetails: auditData.body
            });
        }

        return res.status(200).json({
            status: "success",
            data: JSON.parse(openClawRawResponse),
            agentScoreAudit: auditData.body
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Gateway Error." });
    }
});

// ==========================================
// MOCK ENDPOINT: Pay Invoice
// ==========================================
app.post('/api/pay-invoice', (req: Request<{}, {}, PaymentRequestBody>, res: Response): any => {
    const { invoiceId } = req.body;

    if (!invoiceId || !pendingInvoices.has(invoiceId)) {
        return res.status(404).json({ error: "Invoice not found or already paid." });
    }

    pendingInvoices.delete(invoiceId);
    const paymentToken = crypto.randomBytes(16).toString('hex');
    validTokens.add(paymentToken);

    console.log(`[Payment Webhook] Invoice ${invoiceId} paid. Issued Token: ${paymentToken}`);

    return res.status(200).json({
        status: "paid",
        token: paymentToken,
        instruction: "Include this token in your next request header as: 'Authorization: L402 <token>'"
    });
});

// ==========================================
// SIMULATOR
// ==========================================
async function simulateOpenClawExecution(prompt: string): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (prompt.toLowerCase().includes("weather")) {
        return JSON.stringify({ temperature: 22, condition: "Sunny", location: "Base Testnet" });
    }

    if (prompt.toLowerCase().includes("hallucinate")) {
        return "Here is the weather: It is 22 degrees and sunny. Hope this helps!";
    }

    return JSON.stringify({ message: "Generic task completed successfully." });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 AgentScore API Gateway running on port ${PORT} (TypeScript)`);
    console.log(`🔒 L402 Paywall Enabled.`);
});