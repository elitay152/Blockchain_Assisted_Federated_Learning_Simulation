from flwr.common import Context
from flwr.server import ServerApp, ServerAppComponents, ServerConfig
from flwr.server.strategy import FedAvg


def fit_config(server_round: int):
    """Return a configuration dictionary for the current training round."""
    return {
        "server_round": server_round
    }


def server_fn(context: Context):
    """Create and return the components needed to start a Flower server."""
    num_rounds = int(context.run_config["num-server-rounds"])
    num_clients = int(context.run_config["num-clients"])

    strategy = FedAvg(
        fraction_fit=1.0,
        fraction_evaluate=1.0,
        min_fit_clients=num_clients,
        min_evaluate_clients=num_clients,
        min_available_clients=num_clients,
        on_fit_config_fn=fit_config,
    )

    config = ServerConfig(num_rounds=num_rounds)

    return ServerAppComponents(
        strategy=strategy,
        config=config,
    )


app = ServerApp(server_fn=server_fn)