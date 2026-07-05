from flwr.client import ClientApp
from flwr.common import Context

from flwr_app.task import HeartDiseaseClient


def client_fn(context: Context):
    """Create and return a Flower client instance based on the provided context.
    The context contains a partition ID that can be used to determine which client's data to load.
    """
    partition_id = int(context.node_config["partition-id"])

    client_id = f"client_{partition_id + 1}"

    # Construct the paths for the client's local dataset and output directory for updates
    data_path = f"clients/{client_id}/local_data.csv"
    output_dir = f"clients/{client_id}/updates"

    return HeartDiseaseClient(
        client_id=client_id,
        data_path=data_path,
        round_output_dir=output_dir,
    ).to_client()


app = ClientApp(client_fn=client_fn)
