import { CronCapability, EvmCapability, handler, HttpCapability, Runner, type Runtime, X402Capability } from "@chainlink/cre-sdk";
import { JsonRpcProvider, Contract } from "ethers";

// Define the configuration interface, including the contract address
type Config = {
  schedule: string;
  contractAddress: string;
  agentAddress: string;
};

// ABI for the submitAssertion function
const AGENT_SCORE_REGISTRY_ABI = [
  "function submitAssertion(address agent, uint256 score, bytes calldata data)"
];

const onCronTrigger = async (runtime: Runtime<Config>): Promise<string> => {
  runtime.log("AgentScore workflow triggered.");

  const http = new HttpCapability(runtime);
  const x402 = new X402Capability(runtime);
  const evm = new EvmCapability(runtime);

  const contractAddress = runtime.config.contractAddress;
  const agentAddress = runtime.config.agentAddress;

  let response;
  try {
    // Perform an HTTP GET request
    response = await http.get("https://api.example.com/data");
    runtime.log("API request successful.");
  } catch (error: any) {
    if (error.status === 402) {
      runtime.log("API request requires payment (402). Using x402 capability.");
      // Use the x402 capability to handle the payment
      response = await x402.post("https://api.example.com/data", {});
      runtime.log("x402 payment and request successful.");
    } else {
      runtime.log(`API request failed with status: ${error.status}`);
      throw error;
    }
  }

  // TODO: Assuming the response body contains the score
  const score = response.json.score || 100; // Example score
  const data = new Uint8Array(); // Example data

  // Get a signer for the transaction
  const signer = await evm.getSigner("80002"); // Base Sepolia Testnet

  // Create a contract instance
  const agentScoreRegistry = new Contract(contractAddress, AGENT_SCORE_REGISTRY_ABI, signer);

  // Call the submitAssertion function
  try {
    const tx = await agentScoreRegistry.submitAssertion(agentAddress, score, data);
    runtime.log(`Transaction sent: ${tx.hash}`);
    await tx.wait();
    runtime.log("Assertion submitted successfully.");
    return "Assertion submitted successfully.";
  } catch (err: any) {
    runtime.log(`Error submitting assertion: ${err.message}`);
    throw err;
  }
};

const initWorkflow = (config: Config) => {
  const cron = new CronCapability();

  return [
    handler(
      cron.trigger(
        { schedule: config.schedule }
      ),
      onCronTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
