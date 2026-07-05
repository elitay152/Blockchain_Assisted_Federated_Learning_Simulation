import platform
import subprocess
import sys

from utils import load_config


def get_flwr_command():
    """Return the correct Flower CLI command for the current operating system."""
    if platform.system() == "Windows":
        return "flwr.exe"

    return "flwr"


def run_command(command):
    """Run a terminal command and stop if it fails."""
    print(f"\nRunning: {' '.join(command)}")

    result = subprocess.run(command)

    if result.returncode != 0:
        print(f"Command failed: {' '.join(command)}")
        sys.exit(result.returncode)


def main():
    config = load_config()

    num_clients = config["numClients"]
    num_rounds = config["rounds"]

    print("Starting Flower federated learning simulation...")
    print(f"Number of clients: {num_clients}")
    print(f"Number of rounds: {num_rounds}")

    # Step 1: Prepare client datasets
    run_command([sys.executable, "ml/prepare_clients.py"])

    # Step 2: Run the Flower app-based simulation
    flwr_command = get_flwr_command()
    run_command([flwr_command, "run", ".", "--stream"])

    # Step 3: Collect Flower client update files into one blockchain-ready JSON file
    run_command([sys.executable, "ml/blockchain_export.py"])

    print("\nFlower simulation complete.")
    print("Combined blockchain update file created at: ml/output/updates.json")


if __name__ == "__main__":
    main()