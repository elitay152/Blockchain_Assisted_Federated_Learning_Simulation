import json
import os
import platform
import subprocess
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


REPORT_DIR = os.path.join("ml", "output", "reports")

UPDATES_PATH = os.path.join("ml", "output", "updates.json")

REPUTATION_JSON_PATH = os.path.join(
    REPORT_DIR,
    "reputation_summary.json",
)

PDF_OUTPUT_PATH = os.path.join(
    REPORT_DIR,
    "federated_learning_blockchain_report.pdf",
)


def get_npx_command():
    """Return the correct npx command for the current operating system."""
    if platform.system() == "Windows":
        return "npx.cmd"

    return "npx"


def run_command(command, env=None):
    """Run a terminal command and stop if it fails."""
    print()
    print(f"Running: {' '.join(command)}")
    print("-" * 60)

    run_env = os.environ.copy()

    if env:
        run_env.update(env)

    result = subprocess.run(command, env=run_env)

    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(command)}")


def export_reputation_json():
    """
    Call the TypeScript reputation script in JSON export mode.

    This uses an environment variable instead of passing custom CLI arguments
    through Hardhat.
    """
    os.makedirs(REPORT_DIR, exist_ok=True)

    npx = get_npx_command()

    run_command(
        [
            npx,
            "hardhat",
            "run",
            "scripts/checkReputation.ts",
            "--network",
            "localhost",
        ],
        env={
            "REPUTATION_JSON_OUT": REPUTATION_JSON_PATH,
        },
    )


def load_json(path):
    """Load JSON data from a file."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"Could not find required file: {path}")

    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def format_performance(value):
    """
    Convert scaled performance to a percentage string.

    Contract scaling:
    800000 -> 80.00%
    945600 -> 94.56%
    """
    return f"{value / 10000:.2f}%"


def summarize_updates(updates):
    """Summarize the Flower-generated update records."""
    clients = sorted(set(update["clientId"] for update in updates))
    rounds = sorted(set(update["roundNumber"] for update in updates))

    model_version = updates[0].get("modelVersion", "N/A") if updates else "N/A"

    performance_metric = (
        updates[0].get("performanceMetric", "N/A")
        if updates
        else "N/A"
    )

    return {
        "num_clients": len(clients),
        "num_rounds": len(rounds),
        "total_updates": len(updates),
        "model_version": model_version,
        "performance_metric": performance_metric,
    }


def build_pdf(updates, reputation_rows):
    """Build the final one-page PDF report."""
    os.makedirs(REPORT_DIR, exist_ok=True)

    doc = SimpleDocTemplate(
        PDF_OUTPUT_PATH,
        pagesize=letter,
        rightMargin=0.6 * inch,
        leftMargin=0.6 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
    )

    styles = getSampleStyleSheet()
    story = []

    generated_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    update_summary = summarize_updates(updates)

    story.append(
        Paragraph(
            "Federated Learning + Blockchain Audit Report",
            styles["Title"],
        )
    )
    story.append(Spacer(1, 0.1 * inch))

    story.append(
        Paragraph(
            f"Generated: {generated_at}",
            styles["Normal"],
        )
    )
    story.append(Spacer(1, 0.18 * inch))

    story.append(Paragraph("Project Summary", styles["Heading2"]))

    story.append(
        Paragraph(
            "This report summarizes a Flower federated learning simulation "
            "integrated with a Hardhat/Solidity blockchain audit layer. Each "
            "client trains locally, produces a model hash and performance metric, "
            "and submits metadata to the FederatedTrainingCoordinator smart "
            "contract. The blockchain stores audit metadata, reputation results, "
            "and reward token balances rather than patient data or full model files.",
            styles["BodyText"],
        )
    )

    story.append(Spacer(1, 0.15 * inch))

    summary_data = [
        ["Metric", "Value"],
        ["Number of Clients", str(update_summary["num_clients"])],
        ["Number of Rounds", str(update_summary["num_rounds"])],
        ["Total Client Updates", str(update_summary["total_updates"])],
        ["Model Version", update_summary["model_version"]],
        ["Performance Metric", update_summary["performance_metric"]],
    ]

    summary_table = Table(
        summary_data,
        colWidths=[2.5 * inch, 3.5 * inch],
    )

    summary_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("PADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )

    story.append(summary_table)
    story.append(Spacer(1, 0.2 * inch))

    story.append(
        Paragraph(
            "Client Reputation and Reward Summary",
            styles["Heading2"],
        )
    )

    client_data = [
        [
            "Client",
            "Runs",
            "Last Perf.",
            "Best Perf.",
            "Accepted",
            "Rejected",
            "Reputation",
            "Tokens",
        ]
    ]

    for row in reputation_rows:
        client_data.append(
            [
                row["clientId"],
                str(row["totalSubmissions"]),
                format_performance(row["lastPerformanceScaled"]),
                format_performance(row["bestPerformanceScaled"]),
                str(row["acceptedSubmissions"]),
                str(row["rejectedSubmissions"]),
                str(row["reputationScore"]),
                str(row["rewardTokenBalance"]),
            ]
        )

    client_table = Table(
        client_data,
        colWidths=[
            0.85 * inch,
            0.55 * inch,
            0.85 * inch,
            0.85 * inch,
            0.75 * inch,
            0.75 * inch,
            0.9 * inch,
            0.7 * inch,
        ],
        repeatRows=1,
    )

    client_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("PADDING", (0, 0), (-1, -1), 4),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )

    story.append(client_table)
    story.append(Spacer(1, 0.18 * inch))

    story.append(Paragraph("Interpretation", styles["Heading2"]))

    story.append(
        Paragraph(
            "The client summary table shows how many training updates each client "
            "submitted, the most recent performance recorded for that client, the "
            "best performance achieved across rounds, and the resulting reputation "
            "score and simulated reward token balance. These values are based on the "
            "smart contract's governance logic, including participation credit, "
            "acceptance thresholds, high-performance bonuses, and improvement bonuses.",
            styles["BodyText"],
        )
    )

    doc.build(story)

    print()
    print(f"PDF report created at: {PDF_OUTPUT_PATH}")


def main():
    print("Generating PDF report...")

    export_reputation_json()

    updates = load_json(UPDATES_PATH)
    reputation_rows = load_json(REPUTATION_JSON_PATH)

    build_pdf(updates, reputation_rows)


if __name__ == "__main__":
    main()