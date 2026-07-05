import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

// This script gets client updates stored on the blockchain
// and displays their details in the console.
// Optional usage:
//   npx hardhat run scripts/checkUpdates.ts --network localhost -- client1
type TrainingRun = {
  runId: bigint;
  clientId: string;
  roundNumber: bigint;
  modelVersion: string;
  performanceMetric: string;
  performanceScaled: bigint;
  timestamp: bigint;
  modelHash: string;
  submittedBy: `0x${string}`;
  accepted: boolean;
  reputationChange: bigint;
  rewardTokensAwarded: bigint;
};

// Load the deployed contract address from the Ignition deployment output
function loadContractAddress(): `0x${string}` {
  const addressesPath = path.join(
    process.cwd(),
    "ignition",
    "deployments",
    "chain-31337",
    "deployed_addresses.json"
  );

  if (!fs.existsSync(addressesPath)) {
    throw new Error(
      "Could not find deployed_addresses.json. Deploy the contract first."
    );
  }

  const rawData = fs.readFileSync(addressesPath, "utf8");
  const addresses = JSON.parse(rawData);

  const address =
    addresses["FederatedTrainingCoordinatorModule#FederatedTrainingCoordinator"];

  if (!address) {
    throw new Error(
      "Contract address not found. Check the key in deployed_addresses.json."
    );
  }

  return address as `0x${string}`;
}

// Parse command-line arguments to get an optional client filter
function getClientFilter(): string | undefined {
  const separatorIndex = process.argv.lastIndexOf("--");

  if (separatorIndex === -1) {
    return undefined;
  }

  const candidate = process.argv[separatorIndex + 1];

  if (!candidate) {
    return undefined;
  }

  // Only treat values like client_1, client_2, client1, client2 as valid filters.
  if (!/^client_?\d+$/.test(candidate)) {
    return undefined;
  }

  return candidate;
}

// Helper function to format the performance metric
// from scaled integer to percentage string
function formatPerformance(value: bigint): string {
  const percentage = Number(value) / 10000;
  return `${percentage.toFixed(2)}%`;
}

// Main function to read and display client updates stored on the blockchain
async function main() {
  const { viem } = await network.getOrCreate();

  const contractAddress = loadContractAddress();
  const clientFilter = getClientFilter();

  const coordinator = await viem.getContractAt(
    "FederatedTrainingCoordinator",
    contractAddress
  );

  const count = (await coordinator.read.getRunCount()) as bigint;

  if (clientFilter) {
    console.log(`Training runs for client: ${clientFilter}`);
  } else {
    console.log("All training runs stored on-chain");
  }

  console.log(`Total training runs stored on-chain: ${count}`);
  console.log();

  let displayedCount = 0;

  for (let i = 0n; i < count; i++) {
    const run = (await coordinator.read.getRun([i])) as TrainingRun;

    if (clientFilter && run.clientId !== clientFilter) {
      continue;
    }

    displayedCount++;

    console.log(`Run ${run.runId}`);
    console.log(`  Client ID: ${run.clientId}`);
    console.log(`  Round: ${run.roundNumber}`);
    console.log(`  Model Version: ${run.modelVersion}`);
    console.log(`  Performance Metric: ${run.performanceMetric}`);
    console.log(`  Performance: ${formatPerformance(run.performanceScaled)}`);
    console.log(`  Performance Scaled: ${run.performanceScaled}`);
    console.log(`  Model Hash: ${run.modelHash}`);
    console.log(`  Submitted By: ${run.submittedBy}`);
    console.log(`  Accepted: ${run.accepted}`);
    console.log(`  Reputation Change: ${run.reputationChange}`);
    console.log(`  Reward Tokens Awarded: ${run.rewardTokensAwarded}`);
    console.log(`  Timestamp: ${run.timestamp}`);
    console.log();
  }

  if (clientFilter && displayedCount === 0) {
    console.log(`No training runs found for client: ${clientFilter}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});