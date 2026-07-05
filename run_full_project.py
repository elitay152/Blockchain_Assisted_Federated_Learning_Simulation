import os
import platform
import subprocess
import sys


def get_npx_command():
    """Return the correct npx command for the current operating system."""
    if platform.system() == "Windows":
        return "npx.cmd"

    return "npx"


def run_command(command):
    """Run a terminal command and stop the workflow if it fails."""
    print()
    print(f"Running: {' '.join(command)}")
    print("-" * 60)

    result = subprocess.run(command)

    if result.returncode != 0:
        print()
        print(f"Command failed: {' '.join(command)}")
        sys.exit(result.returncode)


def main():
    print("Starting full Flower + Blockchain workflow")

    npx = get_npx_command()

    # Step 1: Run the Flower federated learning simulation.
    run_command([
        sys.executable,
        "ml/run_simulation.py",
    ])

    # Step 2: Submit Flower-generated updates to the smart contract.
    run_command([
        npx,
        "hardhat",
        "run",
        "scripts/submitClientUpdates.ts",
        "--network",
        "localhost",
    ])

    # Step 3: Read and display updates stored on-chain.
    run_command([
        npx,
        "hardhat",
        "run",
        "scripts/checkUpdates.ts",
        "--network",
        "localhost",
    ])

    # Step 4: Read and display reputation/reward information.
    run_command([
        npx,
        "hardhat",
        "run",
        "scripts/checkReputation.ts",
        "--network",
        "localhost",
    ])

    print()
    print("Full workflow complete.")


if __name__ == "__main__":
    main()