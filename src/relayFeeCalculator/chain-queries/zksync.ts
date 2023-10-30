import { getDeployedAddress } from "../../utils/DeploymentUtils";
import { DEFAULT_LOGGER, Logger } from "../relayFeeCalculator";
import { providers } from "ethers";
import {
  TOKEN_SYMBOLS_MAP,
  CHAIN_IDs,
  DEFAULT_SIMULATED_RELAYER_ADDRESS,
  DEFAULT_SIMULATED_RELAYER_ADDRESS_TEST
} from "../../constants";
import QueryBase from "./baseQuery";

export class ZkSyncQueries extends QueryBase {
  constructor(
    provider: providers.Provider,
    symbolMapping = TOKEN_SYMBOLS_MAP,
    spokePoolAddress = getDeployedAddress("SpokePool", CHAIN_IDs.ZK_SYNC),
    simulatedRelayerAddress = DEFAULT_SIMULATED_RELAYER_ADDRESS,
    coingeckoProApiKey?: string,
    logger: Logger = DEFAULT_LOGGER,
    gasMarkup = 0
  ) {
    super(provider, symbolMapping, spokePoolAddress, simulatedRelayerAddress, gasMarkup, logger, coingeckoProApiKey);
  }
}

/**
 * Query class for zkSync Görli.
 */
export class zkSyncGoerliQueries extends QueryBase {
  constructor(
    provider: providers.Provider,
    symbolMapping = TOKEN_SYMBOLS_MAP,
    spokePoolAddress = "0x863859ef502F0Ee9676626ED5B418037252eFeb2", // @todo upgrade contracts-v2
    simulatedRelayerAddress = DEFAULT_SIMULATED_RELAYER_ADDRESS_TEST,
    coingeckoProApiKey?: string,
    logger: Logger = DEFAULT_LOGGER,
    gasMarkup = 0
  ) {
    super(provider, symbolMapping, spokePoolAddress, simulatedRelayerAddress, gasMarkup, logger, coingeckoProApiKey);
  }
}
