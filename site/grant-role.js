const { ethers } = require('ethers');

// Base Sepolia JSON-RPC
const provider = new ethers.JsonRpcProvider('https://virtual.base-sepolia.eu.rpc.tenderly.co/04f5e39c-873d-4198-b9b6-ed311b7406b0');

// Your Private Key from .env
const privateKey = '0x5d1c9d94c81fc6c7ff5cc364b64b6d4270c0fecb44389129982dde7a2192a531';
const wallet = new ethers.Wallet(privateKey, provider);

// AgentScoreRegistry Contract Address
const contractAddress = '0xCf8fbb38D1352A9c418025720D9F2F0BF1740F38';

// Chainlink CRE Forwarder on Base Sepolia
const forwarderAddress = '0xaF3202F6bAEbA50d37e0d4B0b870455EDF198D7c';

// The ABI for grantRole
const abi = ['function grantRole(bytes32 role, address account) external'];
const contract = new ethers.Contract(contractAddress, abi, wallet);

async function grantCRERole() {
    const roleHash = ethers.id('CRE_ROLE');
    console.log(`Granting CRE_ROLE (${roleHash}) to Chainlink Forwarder (${forwarderAddress})...`);

    try {
        const tx = await contract.grantRole(roleHash, forwarderAddress);
        console.log(`Transaction submitted! Hash: ${tx.hash}`);
        console.log('Waiting for confirmation...');

        await tx.wait();
        console.log('✅ Success! The Chainlink CRE nodes are now authorized to submit assertions!');
    } catch (e) {
        console.error('Failed to grant role:', e.message);
    }
}

grantCRERole();
