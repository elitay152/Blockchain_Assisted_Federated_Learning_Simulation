import os # For file and directory operations
import json # For loading and saving update information in JSON format

# import the load_config function from the utils module to load configuration settings
from utils import load_config

config = load_config()
NUM_CLIENTS = config["numClients"] # The number of clients to simulate
ROUND_NUMBER = config["roundNumber"] # The current round number of the federated learning process

# create a list to hold the updates from all clients
updates = []

# Loop through each client and load their update for the current round
for i in range(NUM_CLIENTS):
    client_id = f"client_{i + 1}"
    update_path = f"clients/{client_id}/update_round_{ROUND_NUMBER}.json"

    if not os.path.exists(update_path):
        # If the update file is missing for a client, raise an error
        raise FileNotFoundError(f"Missing update file: {update_path}")

    # Load the client's update from the JSON file and add it to the updates list
    with open(update_path, "r") as file:
        update = json.load(file)
        updates.append(update)

# create a directory to store the combined updates if it doesn't exist
os.makedirs("ml", exist_ok=True)

output_path = "ml/client_updates.json"

# Save the combined updates from all clients to a single JSON file
with open(output_path, "w") as file:
    json.dump(updates, file, indent=4)

print(f"Collected {len(updates)} client updates.")
print(f"Saved combined update file to {output_path}")
