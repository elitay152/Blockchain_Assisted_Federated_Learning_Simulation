import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("FederatedTrainingCoordinatorModule", (m) => {
  const coordinator = m.contract("FederatedTrainingCoordinator");
  return { coordinator };
});
