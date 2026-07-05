import json # For loading configuration settings from a JSON file
import os # For file and directory operations
import hashlib # For hashing model files to ensure integrity

def load_config():
    """Helper function to load configuration settings from a JSON file."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(script_dir, "config.json")

    with open(config_path, "r") as file:
        return json.load(file)
    
def hash_file(file_path):
    """Calculate the SHA-256 hash of a file to ensure integrity.

    The model hash will be recorded on the blockchain to verify that the 
    model used in the update is the same as the one saved by the client.
    
    Args:
        file_path (str): The path to the file to be hashed.
    """
    sha256 = hashlib.sha256() # Create a new SHA-256 hash object

    with open(file_path, "rb") as file:
        for block in iter(lambda: file.read(4096), b""):
            sha256.update(block)

    return sha256.hexdigest()
