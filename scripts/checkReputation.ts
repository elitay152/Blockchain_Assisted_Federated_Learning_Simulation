import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

// This script retrieves and displays the reputation and
// reward information for clients from the
// FederatedTrainingCoordinator contract.
// Optional usage:
//   npx hardhat run scripts/checkReputation.ts --network localhost
//   npx hardhat run scripts/checkReputation.ts --network localhost -- client_1
//   npx hardhat run scripts/checkReputation.ts --network localhost -- --json-out ml/output/reports/reputation_summary.json

type ClientUpdate = {
  clientId: string;
  roundNumber: number;
  modelVersion: string;
  performanceMetric: string;
  performanceScaled: number;
  modelHash: string;
};

type ClientReputation = {
  totalSubmissions: bigint;
  acceptedSubmissions: bigint;
  rejectedSubmissions: bigint;
  lastPerformanceScaled: bigint;
  bestPerformanceScaled: bigint;
  reputationScore: bigint;
  rewardTokenBalance: bigint;
};

type ReputationReportRow = {
  clientId: string;
  totalSubmissions: number;
  acceptedSubmissions: number;
  rejectedSubmissions: number;
  lastPerformanceScaled: number;
  bestPerformanceScaled: number;
  reputationScore: number;
  rewardTokenBalance: number;
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

// Load unique client IDs from the Flower updates file
function loadClientIds(): string[] {
  const updatesPath = path.join(
    process.cwd(),
    "ml",
    "output",
    "updates.json"
  );

  if (!fs.existsSync(updatesPath)) {
    throw new Error(
      "Could not find ml/output/updates.json. Run the Flower simulation and export step first."
    );
  }

  const rawData = fs.readFileSync(updatesPath, "utf8");
  const updates = JSON.parse(rawData) as ClientUpdate[];

  if (!Array.isArray(updates) || updates.length === 0) {
    throw new Error("No client updates found in ml/output/updates.json.");
  }

  const clientIds = [...new Set(updates.map((update) => update.clientId))];

  return clientIds.sort();
}

// Optional client ID argument
function getClientFilter(): string | undefined {
  const candidate = process.argv.find((arg) => /^client_?\d+$/.test(arg));

  return candidate;
}

// Optional JSON output argument.
function getJsonOutputPath(): string | undefined {
  return process.env.REPUTATION_JSON_OUT;
}

// Helper function to format the performance metric
// from scaled integer to percentage string
function formatPerformance(value: bigint): string {
  const percentage = Number(value) / 10000;
  return `${percentage.toFixed(2)}%`;
}

async function getReputationRows(
  clientIds: string[]
): Promise<ReputationReportRow[]> {
  const { viem } = await network.getOrCreate();

  const contractAddress = loadContractAddress();

  const coordinator = await viem.getContractAt(
    "FederatedTrainingCoordinator",
    contractAddress
  );

  const rows: ReputationReportRow[] = [];

  for (const clientId of clientIds) {
    const reputation = (await coordinator.read.getClientReputation([
      clientId,
    ])) as ClientReputation;

    rows.push({
      clientId,
      totalSubmissions: Number(reputation.totalSubmissions),
      acceptedSubmissions: Number(reputation.acceptedSubmissions),
      rejectedSubmissions: Number(reputation.rejectedSubmissions),
      lastPerformanceScaled: Number(reputation.lastPerformanceScaled),
      bestPerformanceScaled: Number(reputation.bestPerformanceScaled),
      reputationScore: Number(reputation.reputationScore),
      rewardTokenBalance: Number(reputation.rewardTokenBalance),
    });
  }

  return rows;
}

// Main function to read and display client reputation and reward information
async function main() {
  const clientFilter = getClientFilter();
  const jsonOutputPath = getJsonOutputPath();

  const clientIds = clientFilter ? [clientFilter] : loadClientIds();
  const rows = await getReputationRows(clientIds);

  console.log("Client Reputation and Reward Summary");
  console.log("====================================");

  if (clientFilter) {
    console.log(`Filtered Client: ${clientFilter}`);
  }

  console.log();

  for (const row of rows) {
    console.log(`Client: ${row.clientId}`);
    console.log(`  Total Submissions: ${row.totalSubmissions}`);
    console.log(`  Accepted Submissions: ${row.acceptedSubmissions}`);
    console.log(`  Rejected Submissions: ${row.rejectedSubmissions}`);
    console.log(
      `  Last Performance: ${formatPerformance(
        BigInt(row.lastPerformanceScaled)
      )}`
    );
    console.log(
      `  Best Performance: ${formatPerformance(
        BigInt(row.bestPerformanceScaled)
      )}`
    );
    console.log(`  Reputation Score: ${row.reputationScore}`);
    console.log(`  Reward Token Balance: ${row.rewardTokenBalance}`);
    console.log();
  }

  if (jsonOutputPath) {
    const fullOutputPath = path.join(process.cwd(), jsonOutputPath);
    const outputDir = path.dirname(fullOutputPath);

    fs.mkdirSync(outputDir, { recursive: true });

    fs.writeFileSync(
      fullOutputPath,
      JSON.stringify(rows, null, 2),
      "utf8"
    );

    console.log(`Reputation JSON exported to: ${jsonOutputPath}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
