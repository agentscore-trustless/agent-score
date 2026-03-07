import { NextResponse } from 'next/server';
import crypto from 'crypto';

// Basic in-memory state for Next.js API Routes (Warning: resets on Vercel cold-starts)
export const pendingInvoices = new Map<string, { status: string, amount: number }>();
export const validTokens = new Set<string>();

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { invoiceId } = body;

        if (!invoiceId || !pendingInvoices.has(invoiceId)) {
            return NextResponse.json({ error: "Invoice not found or already paid." }, { status: 404 });
        }

        pendingInvoices.delete(invoiceId);
        const paymentToken = crypto.randomBytes(16).toString('hex');
        validTokens.add(paymentToken);

        console.log(`[Payment Webhook] Invoice ${invoiceId} paid. Issued Token: ${paymentToken}`);

        return NextResponse.json({
            status: "paid",
            token: paymentToken,
            instruction: "Include this token in your next request header as: 'Authorization: L402 <token>'"
        }, { status: 200 });

    } catch (error) {
        return NextResponse.json({ error: "Failed to process payment." }, { status: 500 });
    }
}
