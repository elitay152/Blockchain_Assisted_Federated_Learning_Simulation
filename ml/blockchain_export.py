import json
import glob
import os


def collect_updates():
    """Collect all Flower client update JSON files into one combined JSON file for blockchain submission."""

    update_files = glob.glob("clients/client*/updates/*_update.json")

    # error handling
    if not update_files:
        raise FileNotFoundError(
            "No client update files found. Run the Flower simulation first."
        )

    updates = []

    # Load each client's update JSON file and append it to the updates list
    for path in update_files:
        with open(path, "r", encoding="utf-8") as f:
            updates.append(json.load(f))

    # Sort by round first, then client ID, so updates are submitted in a consistent order.
    updates = sorted(
        updates,
        key=lambda x: (x["roundNumber"], x["clientId"])
    )

    # Ensure the output directory exists
    os.makedirs("ml/output", exist_ok=True)

    # Save the combined updates to a single JSON file
    with open("ml/output/updates.json", "w", encoding="utf-8") as f:
        json.dump(updates, f, indent=2)

    print(f"Collected {len(updates)} updates into ml/output/updates.json")


if __name__ == "__main__":
    collect_updates()
