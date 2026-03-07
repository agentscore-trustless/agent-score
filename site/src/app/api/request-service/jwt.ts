import { v4 as uuidv4 } from 'uuid';
import { sha256 } from 'js-sha256';
import { type Hex, parseSignature } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export interface JSONRPCRequest {
    jsonrpc: string;
    id: string;
    method: string;
    params: {
        input: any;
        workflow: {
            workflowID: string;
        };
    };
}

export const createJWT = async (request: JSONRPCRequest, privateKey: string): Promise<string> => {
    const formattedKey = (privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`) as Hex;
    const account = privateKeyToAccount(formattedKey);
    const address = account.address;

    // Create JWT header
    const header = {
        alg: 'ETH',
        typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);

    // sha256 Digest of the request body
    const digestHash = sha256(JSON.stringify(request));

    const payload = {
        digest: `0x${digestHash}`,
        iss: address,
        iat: now,
        exp: now + 300, // 5 minutes expiration
        jti: uuidv4(),
    };

    // Node.js native base64url encoding
    const encodedHeader = Buffer.from(JSON.stringify(header), 'utf8').toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

    const rawMessage = `${encodedHeader}.${encodedPayload}`;

    // Sign the message - viem handles the Ethereum Signed Message prefix
    const signature = await account.signMessage({
        message: rawMessage,
    });

    const { r, s, v, yParity } = parseSignature(signature);
    const recoveryId = v !== undefined ? (v >= 27n ? v - 27n : v) : yParity;

    if (recoveryId === undefined) {
        throw new Error('Unable to extract recovery ID from signature');
    }

    const rBuffer = Buffer.from(r.slice(2).padStart(64, '0'), 'hex');
    const sBuffer = Buffer.from(s.slice(2).padStart(64, '0'), 'hex');
    const signatureBytes = Buffer.concat([rBuffer, sBuffer, Buffer.from([Number(recoveryId)])]);

    const encodedSignature = signatureBytes.toString('base64url');

    return `${rawMessage}.${encodedSignature}`;
};
