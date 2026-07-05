import os # For file and directory operations
import pandas as pd # For data manipulation and analysis
from ucimlrepo import fetch_ucirepo # To fetch datasets from the UCI Machine Learning Repository

# import the load_config function from the utils module to load configuration settings
from utils import load_config

config = load_config()
NUM_CLIENTS = config["numClients"] # The number of clients to simulate
DATASET_ID = config["datasetId"] # The ID of the dataset to fetch from the UCI repository (e.g., 519 for the heart failure dataset)
TARGET_COLUMN = config["targetColumn"] # The column name for the target variable
RANDOM_STATE = config["randomState"] # The random state for reproducibility

# Create a directory to store client data if it doesn't exist
os.makedirs("clients", exist_ok=True)

# Fetch the heart failure dataset from the UCI repository
heart_failure = fetch_ucirepo(id=DATASET_ID)

# Extract features and targets from the dataset
X = heart_failure.data.features
y = heart_failure.data.targets

# Convert y to a Series (if it's a DataFrame with a single column)
if isinstance(y, pd.DataFrame):
    y = y.iloc[:, 0]

df = X.copy() # Create a copy of the features DataFrame to avoid modifying the original
df[TARGET_COLUMN] = y.values # Add the target variable to the DataFrame

# Shuffle the DataFrame to ensure random distribution of data across clients
df = df.sample(frac=1, random_state=RANDOM_STATE).reset_index(drop=True)

# Calculate what size to split the DataFrame into based on the number of clients
split_size = len(df) // NUM_CLIENTS

for i in range(NUM_CLIENTS):
    client_id = f"client_{i + 1}" # create unique client identifier
    client_folder = f"clients/{client_id}" # get the path for the client's folder
    os.makedirs(client_folder, exist_ok=True) # Create the client's folder if it doesn't exist

    # split the DataFrame
    start = i * split_size

    if i == NUM_CLIENTS - 1:
        end = len(df)
    else:
        end = (i + 1) * split_size

    client_df = df.iloc[start:end]

    # Save the client's data to a CSV file in their respective folder
    output_path = f"{client_folder}/local_data.csv"
    client_df.to_csv(output_path, index=False)

    print(f"{client_id}: saved {len(client_df)} records to {output_path}")