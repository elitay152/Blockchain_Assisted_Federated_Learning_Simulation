// SPDX-License-Identifier: MIT
// MIT License is a permissive free software license that allows for reuse and modification
// of the code with minimal restrictions. It is commonly used in open source projects.

pragma solidity ^0.8.28;
// Specifies the Solidity compiler version.

contract FederatedTrainingCoordinator {
    // Stores a blockchain-based ledger of machine learning training runs, allowing users
    // to log and retrieve details about each run, such as model version, performance metrics,
    // and timestamps. This contract can be used to create a transparent and immutable record
    // of training activities for AI models.
    struct TrainingRun {
        uint256 runId;                  // unique numeric ID for each training run
        string clientId;                // identifier for the client associated with the run
        uint256 roundNumber;            // training round number
        string modelVersion;            // label for the model version, e.g. "v1"
        string performanceMetric;       // e.g. "accuracy"
        uint256 performanceScaled;      // e.g. 0.9456 => 945600
        uint256 timestamp;              // block timestamp when the run was logged
        string modelHash;               // SHA-256 or similar hash as hex string
        address submittedBy;            // address of the user who logged the run
        bool accepted;                  // whether the submission met the minimum performance threshold
        uint256 rewardTokensAwarded;    // simulated reward tokens for performance
        int256 reputationChange;        // change in reputation score from this submission
    }

    struct ClientReputation {
        uint256 totalSubmissions;       // total number of submissions from this client
        uint256 acceptedSubmissions;    // submissions that met the minimum threshold
        uint256 rejectedSubmissions;    // submissions that failed the minimum threshold
        uint256 lastPerformanceScaled;  // most recent submitted performance
        uint256 bestPerformanceScaled;  // best submitted performance so far
        int256 reputationScore;         // overall reputation score
        uint256 rewardTokenBalance;     // simulated reward token balance
    }

    // Dynamic array that stores all training runs submitted to the contract.
    TrainingRun[] private runs;

    // Maps client ID to their reputation.
    mapping(string => ClientReputation) private reputations;

    // Tracks whether a client has already submitted an update for a specific round.
    // This prevents duplicate submissions such as client1 submitting round 1 more than once.
    mapping(string => mapping(uint256 => bool)) private hasSubmittedRound;

    // Reputation/reward thresholds.
    uint256 public minimumPerformanceScaled = 700000;      // 70%
    uint256 public highPerformanceScaled = 850000;         // 85%
    uint256 public improvementThresholdScaled = 10000;     // 1 percentage point
    uint256 public dropToleranceScaled = 50000;            // 5 percentage points

    // An event will be emitted every time a new training run is logged.
    // This allows off-chain applications to listen for new runs without querying the
    // contract state repeatedly.
    // The "indexed" keyword allows filtering events by runId, roundNumber, and submittedBy address.
    event TrainingRunLogged(
        uint256 indexed runId,
        string clientId,
        uint256 indexed roundNumber,
        string modelVersion,
        string performanceMetric,
        uint256 performanceScaled,
        uint256 timestamp,
        string modelHash,
        address indexed submittedBy,
        bool accepted,
        uint256 rewardTokensAwarded,
        int256 reputationChange
    );

    event ClientReputationUpdated(
        string clientId,
        int256 reputationScore,
        uint256 rewardTokenBalance,
        uint256 totalSubmissions,
        uint256 acceptedSubmissions,
        uint256 rejectedSubmissions
    );

    // This function allows an external user to log a new training run.
    // It can be called from outside the contract, and it will create a new TrainingRun
    // struct and add it to the runs array.
    function logTrainingRun(
        string calldata clientId,
        uint256 roundNumber,
        string calldata modelVersion,
        string calldata performanceMetric,
        uint256 performanceScaled,
        string calldata modelHash
    ) external {
        uint256 runId = runs.length;

        require(
            !hasSubmittedRound[clientId][roundNumber],
            "Client already submitted for this round"
        );

        hasSubmittedRound[clientId][roundNumber] = true;

        ClientReputation storage rep = reputations[clientId];

        bool accepted = performanceScaled >= minimumPerformanceScaled;
        uint256 rewardTokensAwarded = 0;
        int256 reputationChange = 0;

        rep.totalSubmissions += 1;

        // Base participation credit for submitting an update.
        reputationChange += 1;

        if (accepted) {
            rep.acceptedSubmissions += 1;

            // Reward for meeting minimum quality threshold.
            reputationChange += 10;
            rewardTokensAwarded += 10;

            // Bonus for high-performing update.
            if (performanceScaled >= highPerformanceScaled) {
                reputationChange += 5;
                rewardTokensAwarded += 5;
            }

            // Bonus for improvement over the client's previous submission.
            if (
                rep.lastPerformanceScaled > 0 &&
                performanceScaled >= rep.lastPerformanceScaled + improvementThresholdScaled
            ) {
                reputationChange += 3;
                rewardTokensAwarded += 3;
            }

            // Penalty for a large performance drop from the previous submission.
            if (
                rep.lastPerformanceScaled > 0 &&
                performanceScaled + dropToleranceScaled < rep.lastPerformanceScaled
            ) {
                reputationChange -= 3;
            }
        } else {
            rep.rejectedSubmissions += 1;

            // Penalty for failing to meet the minimum threshold.
            reputationChange -= 5;
        }

        rep.reputationScore += reputationChange;
        rep.rewardTokenBalance += rewardTokensAwarded;
        rep.lastPerformanceScaled = performanceScaled;

        if (performanceScaled > rep.bestPerformanceScaled) {
            rep.bestPerformanceScaled = performanceScaled;
        }

        runs.push(
            TrainingRun({
                runId: runId,
                clientId: clientId,
                roundNumber: roundNumber,
                modelVersion: modelVersion,
                performanceMetric: performanceMetric,
                performanceScaled: performanceScaled,
                timestamp: block.timestamp,
                modelHash: modelHash,
                submittedBy: msg.sender,
                accepted: accepted,
                rewardTokensAwarded: rewardTokensAwarded,
                reputationChange: reputationChange
            })
        );

        // Emit the newly logged training run as an event for off-chain listeners.
        emit TrainingRunLogged(
            runId,
            clientId,
            roundNumber,
            modelVersion,
            performanceMetric,
            performanceScaled,
            block.timestamp,
            modelHash,
            msg.sender,
            accepted,
            rewardTokensAwarded,
            reputationChange
        );

        emit ClientReputationUpdated(
            clientId,
            rep.reputationScore,
            rep.rewardTokenBalance,
            rep.totalSubmissions,
            rep.acceptedSubmissions,
            rep.rejectedSubmissions
        );
    }

    // This function retrieves the details of a specific training run by its index.
    function getRun(uint256 index) external view returns (TrainingRun memory) {
        require(index < runs.length, "Invalid run index");
        return runs[index];
    }

    // This function returns the total number of training runs that have been logged.
    function getRunCount() external view returns (uint256) {
        return runs.length;
    }

    // This function retrieves the reputation details for a specific client by their ID.
    function getClientReputation(
        string calldata clientId
    ) external view returns (ClientReputation memory) {
        return reputations[clientId];
    }

    // This function checks whether a specific client has already submitted
    // an update for a specific federated learning round.
    function hasClientSubmittedRound(
        string calldata clientId,
        uint256 roundNumber
    ) external view returns (bool) {
        return hasSubmittedRound[clientId][roundNumber];
    }
}