import { network } from "hardhat";
import fs from "node:fs";
import path from "node:path";

// This script reads Flower client updates from ml/output/updates.json
// and submits them to the FederatedTrainingCoordinator contract
// on the local Hardhat network.
type ClientUpdate = {
  clientId: string;
  roundNumber: number;
  modelVersion: string;
  performanceMetric: string;
  performanceScaled: number;
  modelHash: string;

  // Optional fields from older or expanded update formats
  accuracyReadable?: number;
  modelPath?: string;
};

// Load client updates from the Flower export JSON file
function loadClientUpdates(): ClientUpdate[] {
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

  return updates;
}

// Load the deployed contract address from the
// Ignition deployment output
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

  // Read the deployed addresses JSON file and parse it
  const rawData = fs.readFileSync(addressesPath, "utf8");
  const addresses = JSON.parse(rawData);

  // Extract the address of the FederatedTrainingCoordinator contract
  const address =
    addresses["FederatedTrainingCoordinatorModule#FederatedTrainingCoordinator"];

  // If the address is not found, throw an error
  if (!address) {
    throw new Error(
      "Contract address not found. Check the module name in deployed_addresses.json."
    );
  }

  return address as `0x${string}`;
}

// Select a client wallet based on the client ID.
function getWalletIndexForClient(clientId: string): number {
  const match = clientId.match(/\d+/);
  const clientNumber = match ? Number(match[0]) : 1;

  return clientNumber;
}

// Main function to submit client updates to the blockchain
async function main() {
  const { viem } = await network.getOrCreate();

  // Load client updates and contract address
  const updates = loadClientUpdates();
  const contractAddress = loadContractAddress();

  // Get wallet clients and public client from Viem
  const walletClients = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  // Basic submission summary
  console.log("Submitting Flower client updates to blockchain...");
  console.log(`Contract address: ${contractAddress}`);
  console.log(`Number of updates: ${updates.length}`);
  console.log();

  // Loop through each client update and submit it to the contract
  for (const update of updates) {
    const walletIndex = getWalletIndexForClient(update.clientId);
    const clientWallet = walletClients[walletIndex];

    if (!clientWallet) {
      throw new Error(
        `No wallet available for ${update.clientId}. Needed walletClients[${walletIndex}].`
      );
    }

    // Get a contract instance with the client's wallet for signing transactions
    const coordinator = await viem.getContractAt(
      "FederatedTrainingCoordinator",
      contractAddress,
      {
        client: {
          wallet: clientWallet,
        },
      }
    );

    // Submit the client update to the contract
    const txHash = await coordinator.write.logTrainingRun([
      update.clientId,
      BigInt(update.roundNumber),
      update.modelVersion,
      update.performanceMetric,
      BigInt(update.performanceScaled),
      update.modelHash,
    ]);

    // Wait for the transaction to be mined
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    console.log(
      `Submitted ${update.clientId}, round ${update.roundNumber}. Tx: ${txHash}`
    );
  }

  console.log();

  // After submitting all updates, read the total
  // count of training runs stored on-chain
  const coordinator = await viem.getContractAt(
    "FederatedTrainingCoordinator",
    contractAddress
  );

  const count = await coordinator.read.getRunCount();

  console.log(`Total training runs stored on-chain: ${count}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});