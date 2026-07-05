// assert library is used to compare actual vs expected values in tests
import assert from "node:assert/strict";
// node:test provides a simple testing framework for writing unit tests in Node.js
import { describe, it } from "node:test";
// network is imported from hardhat to create a testing environment and deploy contracts
import { network } from "hardhat";

// Grouping related tests for the FederatedTrainingCoordinator contract
describe("FederatedTrainingCoordinator", async () => {
  // Test case 1:
  // This test checks that when the contract is first deployed, there are no training runs logged
  it("starts with zero training runs", async () => {
    const { viem } = await network.create();
    const coordinator = await viem.deployContract("FederatedTrainingCoordinator");

    const count = await coordinator.read.getRunCount();

    assert.equal(count, 0n);
  });

  // Test case 2:
  // This test checks that a training run can be logged correctly and retrieved
  it("logs a training run correctly", async () => {
    const { viem } = await network.create();
    const coordinator = await viem.deployContract("FederatedTrainingCoordinator");

    await coordinator.write.logTrainingRun([
      "client_1",    // client identifier
      1n,            // round number
      "v1",          // model version
      "accuracy",    // performance metric
      945600n,       // performance scaled
      "abc123hash"   // model hash
    ]);

    const count = await coordinator.read.getRunCount();
    assert.equal(count, 1n);

    const run = await coordinator.read.getRun([0n]);

    assert.equal(run.runId, 0n);
    assert.equal(run.clientId, "client_1");
    assert.equal(run.roundNumber, 1n);
    assert.equal(run.modelVersion, "v1");
    assert.equal(run.performanceMetric, "accuracy");
    assert.equal(run.performanceScaled, 945600n);
    assert.equal(run.modelHash, "abc123hash");

    // Since 94.56% is above the 70% minimum and 85% high-performance threshold:
    // reputation = +1 participation +10 accepted +5 high performance = +16
    // tokens = +10 accepted +5 high performance = +15
    assert.equal(run.accepted, true);
    assert.equal(run.rewardTokensAwarded, 15n);
    assert.equal(run.reputationChange, 16n);

    const reputation = await coordinator.read.getClientReputation(["client_1"]);

    assert.equal(reputation.totalSubmissions, 1n);
    assert.equal(reputation.acceptedSubmissions, 1n);
    assert.equal(reputation.rejectedSubmissions, 0n);
    assert.equal(reputation.lastPerformanceScaled, 945600n);
    assert.equal(reputation.bestPerformanceScaled, 945600n);
    assert.equal(reputation.reputationScore, 16n);
    assert.equal(reputation.rewardTokenBalance, 15n);

    const submitted = await coordinator.read.hasClientSubmittedRound([
      "client_1",
      1n,
    ]);

    assert.equal(submitted, true);
  });

  // Test case 3:
  // This test checks that multiple clients can submit updates for the same round
  it("stores multiple client submissions in order", async () => {
    const { viem } = await network.create();
    const coordinator = await viem.deployContract("FederatedTrainingCoordinator");

    await coordinator.write.logTrainingRun([
      "client_1",
      1n,
      "v1",
      "accuracy",
      910000n,
      "hash1"
    ]);

    await coordinator.write.logTrainingRun([
      "client_2",
      1n,
      "v2",
      "accuracy",
      955000n,
      "hash2"
    ]);

    const count = await coordinator.read.getRunCount();
    assert.equal(count, 2n);

    const run0 = await coordinator.read.getRun([0n]);
    const run1 = await coordinator.read.getRun([1n]);

    assert.equal(run0.clientId, "client_1");
    assert.equal(run1.clientId, "client_2");
    assert.equal(run0.roundNumber, 1n);
    assert.equal(run1.roundNumber, 1n);
    assert.equal(run0.modelVersion, "v1");
    assert.equal(run1.modelVersion, "v2");
    assert.equal(run0.modelHash, "hash1");
    assert.equal(run1.modelHash, "hash2");

    const client1Submitted = await coordinator.read.hasClientSubmittedRound([
      "client_1",
      1n,
    ]);

    const client2Submitted = await coordinator.read.hasClientSubmittedRound([
      "client_2",
      1n,
    ]);

    assert.equal(client1Submitted, true);
    assert.equal(client2Submitted, true);

    // Both clients submitted high-performing models, so each gets:
    // +1 participation +10 accepted +5 high performance = +16 reputation
    // +10 accepted +5 high performance = +15 tokens
    const client1Rep = await coordinator.read.getClientReputation(["client_1"]);
    const client2Rep = await coordinator.read.getClientReputation(["client_2"]);

    assert.equal(client1Rep.totalSubmissions, 1n);
    assert.equal(client1Rep.acceptedSubmissions, 1n);
    assert.equal(client1Rep.rejectedSubmissions, 0n);
    assert.equal(client1Rep.reputationScore, 16n);
    assert.equal(client1Rep.rewardTokenBalance, 15n);

    assert.equal(client2Rep.totalSubmissions, 1n);
    assert.equal(client2Rep.acceptedSubmissions, 1n);
    assert.equal(client2Rep.rejectedSubmissions, 0n);
    assert.equal(client2Rep.reputationScore, 16n);
    assert.equal(client2Rep.rewardTokenBalance, 15n);
  });

  // Test case 4:
  // This test checks that the same client can submit updates across different rounds
  it("stores multiple rounds from the same client", async () => {
    const { viem } = await network.create();
    const coordinator = await viem.deployContract("FederatedTrainingCoordinator");

    await coordinator.write.logTrainingRun([
      "client_1",
      1n,
      "v1",
      "accuracy",
      900000n,
      "round1hash"
    ]);

    await coordinator.write.logTrainingRun([
      "client_1",
      2n,
      "v2",
      "accuracy",
      930000n,
      "round2hash"
    ]);

    const count = await coordinator.read.getRunCount();
    assert.equal(count, 2n);

    const run0 = await coordinator.read.getRun([0n]);
    const run1 = await coordinator.read.getRun([1n]);

    assert.equal(run0.clientId, "client_1");
    assert.equal(run1.clientId, "client_1");

    assert.equal(run0.roundNumber, 1n);
    assert.equal(run1.roundNumber, 2n);

    assert.equal(run0.modelVersion, "v1");
    assert.equal(run1.modelVersion, "v2");

    const round1Submitted = await coordinator.read.hasClientSubmittedRound([
      "client_1",
      1n,
    ]);

    const round2Submitted = await coordinator.read.hasClientSubmittedRound([
      "client_1",
      2n,
    ]);

    assert.equal(round1Submitted, true);
    assert.equal(round2Submitted, true);

    // Round 1:
    // +1 participation +10 accepted +5 high performance = +16 reputation
    // +10 accepted +5 high performance = +15 tokens
    assert.equal(run0.accepted, true);
    assert.equal(run0.reputationChange, 16n);
    assert.equal(run0.rewardTokensAwarded, 15n);

    // Round 2:
    // +1 participation +10 accepted +5 high performance +3 improvement = +19 reputation
    // +10 accepted +5 high performance +3 improvement = +18 tokens
    assert.equal(run1.accepted, true);
    assert.equal(run1.reputationChange, 19n);
    assert.equal(run1.rewardTokensAwarded, 18n);

    const reputation = await coordinator.read.getClientReputation(["client_1"]);

    assert.equal(reputation.totalSubmissions, 2n);
    assert.equal(reputation.acceptedSubmissions, 2n);
    assert.equal(reputation.rejectedSubmissions, 0n);
    assert.equal(reputation.lastPerformanceScaled, 930000n);
    assert.equal(reputation.bestPerformanceScaled, 930000n);

    // Total reputation: 16 + 19 = 35
    // Total tokens: 15 + 18 = 33
    assert.equal(reputation.reputationScore, 35n);
    assert.equal(reputation.rewardTokenBalance, 33n);
  });

  // Test case 5:
  // This test checks that the same client cannot submit twice for the same round
  it("rejects duplicate submissions from the same client in the same round", async () => {
    const { viem } = await network.create();
    const coordinator = await viem.deployContract("FederatedTrainingCoordinator");

    await coordinator.write.logTrainingRun([
      "client_1",
      1n,
      "v1",
      "accuracy",
      900000n,
      "round1hash"
    ]);

    await assert.rejects(
      async () => {
        await coordinator.write.logTrainingRun([
          "client_1",
          1n,
          "v1-duplicate",
          "accuracy",
          920000n,
          "duplicatehash"
        ]);
      },
      /Client already submitted for this round/
    );

    const count = await coordinator.read.getRunCount();
    assert.equal(count, 1n);

    const reputation = await coordinator.read.getClientReputation(["client_1"]);

    // Reputation should only reflect the first accepted submission.
    assert.equal(reputation.totalSubmissions, 1n);
    assert.equal(reputation.acceptedSubmissions, 1n);
    assert.equal(reputation.rejectedSubmissions, 0n);
    assert.equal(reputation.lastPerformanceScaled, 900000n);
    assert.equal(reputation.bestPerformanceScaled, 900000n);
    assert.equal(reputation.reputationScore, 16n);
    assert.equal(reputation.rewardTokenBalance, 15n);
  });
});
