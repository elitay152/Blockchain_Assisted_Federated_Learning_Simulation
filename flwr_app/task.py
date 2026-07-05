import json
import os

import flwr as fl
import joblib
import numpy as np
import pandas as pd

from sklearn.linear_model import SGDClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from ml.utils import hash_file, load_config


class HeartDiseaseClient(fl.client.NumPyClient):
    
    # initialize the client with its ID, path to local data, and output directory for updates
    def __init__(self, client_id: str, data_path: str, round_output_dir: str):
        self.client_id = client_id
        self.data_path = data_path
        self.round_output_dir = round_output_dir

        # Use SGDClassifier with log_loss for incremental learning, 
        # which is more efficient for this simulation than retraining 
        # a full LogisticRegression model each round.
        self.model = SGDClassifier(
            loss="log_loss",
            max_iter=1,
            tol=None,
            random_state=42,
            warm_start=True,
        )

        # Load the client's local dataset and split into train/test sets.
        self.X_train, self.X_test, self.y_train, self.y_test = self.load_data()

        # Initialize the model so coef_ and intercept_ exist before Flower requests parameters.
        self.model.partial_fit(
            self.X_train,
            self.y_train,
            classes=np.array([0, 1]),
        )

    def load_data(self):
        """Load the client's local dataset, split into train/test sets, and standardize features."""
        df = pd.read_csv(self.data_path)

        config = load_config()
        target_col = config["targetColumn"]

        if target_col not in df.columns:
            raise ValueError(
                f"Target column '{target_col}' not found in {self.data_path}. "
                f"Available columns: {list(df.columns)}"
            )

        X = df.drop(columns=[target_col])
        y = df[target_col]

        # split features with stratification
        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=42,
            stratify=y if len(y.unique()) > 1 else None,
        )

        # standardize features for improved performance
        scaler = StandardScaler()
        X_train = scaler.fit_transform(X_train)
        X_test = scaler.transform(X_test)

        return X_train, X_test, y_train, y_test

    def get_parameters(self, _config):
        """Return the current model parameters as a list of NumPy arrays."""
        return [
            self.model.coef_.astype(np.float64),
            self.model.intercept_.astype(np.float64),
        ]

    def set_parameters(self, parameters):
        """Set the model parameters from a list of NumPy arrays."""
        self.model.coef_ = parameters[0]
        self.model.intercept_ = parameters[1]
        self.model.classes_ = np.array([0, 1])

    def fit(self, parameters, config):
        """Perform one round of local training and return updated parameters and metrics."""
        # Receive the current global model from the Flower server.
        self.set_parameters(parameters)
        server_round = int(config.get("server_round", 0))

        # Perform one incremental local training step.
        self.model.partial_fit(
            self.X_train,
            self.y_train,
            classes=np.array([0, 1]),
        )

        os.makedirs(self.round_output_dir, exist_ok=True)

        # Save the updated model to a file for potential later inspection.
        model_filename = f"{self.client_id}_round_{server_round}.pkl"
        model_path = os.path.join(self.round_output_dir, model_filename)
        joblib.dump(self.model, model_path)
        model_hash = hash_file(model_path)

        # Evaluate the updated model on the local test set to compute performance metrics.
        y_pred = self.model.predict(self.X_test)
        accuracy = accuracy_score(self.y_test, y_pred)
        performance_scaled = int(accuracy * 1_000_000)

        update = {
            "clientId": self.client_id,
            "roundNumber": server_round,
            "modelVersion": "flower-fedavg-v1",
            "performanceMetric": "accuracy",
            "performanceScaled": performance_scaled,
            "modelHash": model_hash,
        }

        update_path = os.path.join(
            self.round_output_dir,
            f"{self.client_id}_round_{server_round}_update.json",
        )

        with open(update_path, "w", encoding="utf-8") as f:
            json.dump(update, f, indent=2)

        return self.get_parameters(config), len(self.X_train), {
            "accuracy": accuracy,
            "model_hash": model_hash,
            "client_id": self.client_id,
        }

    def evaluate(self, parameters, _config):
        """Evaluate the current global model on the client's local test set."""
        self.set_parameters(parameters)

        y_pred = self.model.predict(self.X_test)
        accuracy = accuracy_score(self.y_test, y_pred)
        loss = 1.0 - accuracy

        return loss, len(self.X_test), {"accuracy": accuracy}
