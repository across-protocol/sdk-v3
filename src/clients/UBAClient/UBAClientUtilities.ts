import { BigNumber } from "ethers";
import { HubPoolClient } from "../HubPoolClient";
import { calculateUtilizationBoundaries, computePiecewiseLinearFunction } from "../../UBAFeeCalculator/UBAFeeUtility";
import { SpokePoolClient } from "../SpokePoolClient";
import UBAFeeConfig, { FlowTupleParameters } from "../../UBAFeeCalculator/UBAFeeConfig";
import {
  SpokePoolClients,
  isDefined,
  max,
  resolveCorrespondingDepositForFill,
  sortEventsAscending,
  toBN,
} from "../../utils";
import { ERC20__factory } from "../../typechain";
import { UBAActionType } from "../../UBAFeeCalculator/UBAFeeTypes";
import {
  RequestValidReturnType,
  UBABundleState,
  UBABundleTokenState,
  UBAChainState,
  UBAClientState,
} from "./UBAClientTypes";
import { DepositWithBlock, FillWithBlock, RefundRequestWithBlock, UbaFlow } from "../../interfaces";
import { Logger } from "winston";
import { analog } from "../../UBAFeeCalculator";
import { RelayFeeCalculator, RelayFeeCalculatorConfig } from "../../relayFeeCalculator";
import { TOKEN_SYMBOLS_MAP } from "@across-protocol/contracts-v2";
import { getDepositFee, getRefundFee } from "../../UBAFeeCalculator/UBAFeeSpokeCalculatorAnalog";
import { filterAsync } from "../../utils/ArrayUtils";

/**
 * Compute the realized LP fee for a given amount.
 * @param hubPoolTokenAddress The L1 token address to get the LP fee
 * @param depositChainId The chainId of the deposit
 * @param refundChainId The chainId of the refund
 * @param amount The amount that is being deposited
 * @param hubPoolClient A hubpool client instance to query the hubpool
 * @param spokePoolClients A mapping of spoke chainIds to spoke pool clients
 * @param baselineFee The baseline fee to use for this given token
 * @param gammaCutoff The gamma cutoff to use for this given token - used in the piecewise linear function calculation
 * @returns The realized LP fee for the given token on the given chainId at the given block number
 */
export async function computeLpFeeForRefresh(
  hubPoolTokenAddress: string,
  depositChainId: number,
  refundChainId: number,
  amount: BigNumber,
  hubPoolClient: HubPoolClient,
  spokePoolClients: { [chainId: number]: SpokePoolClient },
  baselineFee: BigNumber,
  gammaCutoff: FlowTupleParameters,
  blockNumber?: number
): Promise<BigNumber> {
  const configStoreClient = hubPoolClient.configStoreClient;
  const erc20 = ERC20__factory.connect(hubPoolTokenAddress, hubPoolClient.hubPool.provider);
  const [decimals, ethSpokeBalance, hubBalance, hubEquity, spokeTargets] = await Promise.all([
    erc20.decimals({ blockTag: blockNumber }),
    erc20.balanceOf(spokePoolClients[hubPoolClient.chainId].spokePool.address, { blockTag: blockNumber }),
    erc20.balanceOf(hubPoolClient.hubPool.address, { blockTag: blockNumber }),
    erc20.balanceOf(hubPoolClient.hubPool.address, { blockTag: blockNumber }),
    configStoreClient.getUBATargetSpokeBalances([depositChainId, refundChainId], hubPoolTokenAddress, blockNumber),
  ]);
  return computeLpFeeStateful(
    amount,
    depositChainId,
    hubPoolClient.chainId,
    decimals,
    hubBalance,
    hubEquity,
    ethSpokeBalance,
    spokeTargets,
    baselineFee,
    gammaCutoff
  );
}

/**
 * Compute the realized LP fee for a given amount. This function is stateless and does not require a hubpool client.
 * @param amount The amount that is being deposited
 * @param depositChainId The chainId of the deposit
 * @param hubPoolChainId The chainId of the hub pool
 * @param decimals The number of decimals for the token
 * @param hubBalance The balance of the hub pool
 * @param hubEquity The equity of the hub pool
 * @param ethSpokeBalance The balance of the spoke pool on the mainnet spoke
 * @param spokeTargets The spoke targets for the spoke pool
 * @param baselineFee The baseline fee to use for this given token
 * @param gammaCutoff The gamma cutoff to use for this given token - used in the piecewise linear function calculation
 * @returns The realized LP fee for the given token on the given chainId at the given block number
 */
export function computeLpFeeStateful(
  amount: BigNumber,
  depositChainId: number,
  hubPoolChainId: number,
  decimals: number,
  hubBalance: BigNumber,
  hubEquity: BigNumber,
  ethSpokeBalance: BigNumber,
  spokeTargets: {
    spokeChainId: number;
    target: BigNumber;
  }[],
  baselineFee: BigNumber,
  gammaCutoff: FlowTupleParameters
) {
  const { utilizationPostTx, utilizationPreTx } = calculateUtilizationBoundaries(
    { actionType: UBAActionType.Deposit, amount, chainId: depositChainId },
    decimals,
    hubBalance,
    hubEquity,
    ethSpokeBalance,
    spokeTargets,
    hubPoolChainId
  );

  const utilizationDelta = utilizationPostTx.sub(utilizationPreTx).abs();
  const utilizationIntegral = computePiecewiseLinearFunction(gammaCutoff, utilizationPreTx, utilizationPostTx);
  return max(toBN(0), baselineFee.add(utilizationIntegral.div(utilizationDelta)));
}

// THIS IS A STUB FOR NOW
export async function getUBAFeeConfig(
  chainId: number,
  token: string,
  blockNumber: number | "latest" = "latest"
): Promise<UBAFeeConfig> {
  chainId;
  token;
  blockNumber;
  return new UBAFeeConfig(
    {
      default: toBN(0),
    },
    toBN(0),
    {
      default: [],
    },
    {},
    {
      default: [],
    }
  );
}

export async function updateUBAClient(
  hubPoolClient: HubPoolClient,
  spokePoolClients: { [chainId: number]: SpokePoolClient },
  relevantChainIds: number[],
  relevantTokenSymbols: string[],
  hubPoolBlockNumber: number,
  updateInternalClients = true,
  relayFeeCalculatorConfig: RelayFeeCalculatorConfig,
  maxBundleStates: number
): Promise<UBAClientState> {
  if (updateInternalClients) {
    await hubPoolClient.update();
    await Promise.all(Object.values(spokePoolClients).map((spokePoolClient) => spokePoolClient.update()));
  }
  return await relevantChainIds.reduce(async (accumulator, chainId) => {
    const spokePoolClient = spokePoolClients[chainId];

    const chainState: UBAChainState = {
      bundles: {},
      spokeChain: {
        deploymentBlockNumber: spokePoolClient.deploymentBlock,
        bundleEndBlockNumber: hubPoolClient.getLatestBundleEndBlockForChain(
          relevantChainIds,
          hubPoolBlockNumber,
          chainId
        ),
        latestBlockNumber: spokePoolClient.latestBlockNumber,
      },
    };

    const tokenStates = await relevantTokenSymbols.reduce(async (accumulator, tokenSymbol) => {
      // Find the last MAX_BUNDLE_LOOKBACK_SIZE bundle start/end blocks for this token
      let startingBlock = hubPoolBlockNumber;
      const bundleBounds: { start: number; end: number }[] = [];
      for (let i = 0; i < maxBundleStates; i++) {
        const lastPreviousBlock = hubPoolClient.getLatestBundleEndBlockForChain(
          relevantChainIds,
          startingBlock,
          chainId
        );
        // Push the structure to the start of the list
        bundleBounds.unshift({
          start: startingBlock,
          end: lastPreviousBlock,
        });
        startingBlock = lastPreviousBlock - 1;
      }
      // Iterate through the bundle bounds and find the bundles that are available
      const constructedBundles = await Promise.all(
        bundleBounds.map(async ({ end: endingBundleBlockNumber }) => {
          // Get the block number and opening balance for this token
          const {
            blockNumber: startingBundleBlockNumber,
            spokePoolBalance,
            incentiveBalance,
          } = getOpeningTokenBalances(chainId, tokenSymbol, hubPoolClient, endingBundleBlockNumber);
          const tokenMappingLookup = (
            TOKEN_SYMBOLS_MAP as Record<string, { addresses: { [x: number]: string }; decimals: number }>
          )[tokenSymbol];
          const hubPoolTokenAddress = tokenMappingLookup.addresses[hubPoolClient.chainId];
          const tokenDecimals = tokenMappingLookup.decimals;
          const erc20 = ERC20__factory.connect(hubPoolTokenAddress, hubPoolClient.hubPool.provider);
          const [hubBalance, hubEquity, ethSpokeBalance, spokeTargets] = await Promise.all([
            erc20.balanceOf(hubPoolClient.hubPool.address, { blockTag: endingBundleBlockNumber }),
            erc20.balanceOf(hubPoolClient.hubPool.address, { blockTag: endingBundleBlockNumber }),
            erc20.balanceOf(spokePoolClient.spokePool.address, { blockTag: endingBundleBlockNumber }),
            hubPoolClient.configStoreClient.getUBATargetSpokeBalances(
              [chainId],
              hubPoolTokenAddress,
              endingBundleBlockNumber
            ),
          ]);

          // Construct the bundle. If the bundle already exists, use the existing bundle
          const constructedBundle: UBABundleState = {
            flows: [],
            openingBlockNumberForSpokeChain: startingBundleBlockNumber,
            openingBalance: spokePoolBalance,
            openingIncentiveBalance: incentiveBalance,
            config: {
              ubaConfig: await getUBAFeeConfig(chainId, tokenSymbol, startingBundleBlockNumber),
              tokenDecimals,
              hubBalance,
              hubEquity,
              hubPoolSpokeBalance: ethSpokeBalance,
              spokeTargets,
            },
          };
          // These flows are guaranteed to be sorted in ascending order
          // Get the flows from the start of the bundle to the end of the bundle
          const recentFlows = await getFlows(
            chainId,
            relevantChainIds,
            spokePoolClients,
            hubPoolClient,
            startingBundleBlockNumber,
            endingBundleBlockNumber
          );
          for (const flow of recentFlows) {
            const previousFlows = constructedBundle.flows.map((flow) => flow.flow);
            const previousFlowsIncludingCurrent = previousFlows.concat(flow);
            const { runningBalance, incentiveBalance, netRunningBalanceAdjustment } =
              analog.calculateHistoricalRunningBalance(
                previousFlowsIncludingCurrent,
                constructedBundle.openingBalance,
                constructedBundle.openingIncentiveBalance,
                chainId,
                tokenSymbol,
                constructedBundle.config.ubaConfig
              );
            const { balancingFee: depositBalancingFee } = getDepositFee(
              flow.amount,
              previousFlows,
              constructedBundle.openingBalance,
              constructedBundle.openingIncentiveBalance,
              chainId,
              tokenSymbol,
              constructedBundle.config.ubaConfig
            );
            const { balancingFee: relayerBalancingFee } = getRefundFee(
              flow.amount,
              previousFlows,
              constructedBundle.openingBalance,
              constructedBundle.openingIncentiveBalance,
              chainId,
              tokenSymbol,
              constructedBundle.config.ubaConfig
            );
            const lpFee = await computeLpFeeForRefresh(
              tokenSymbol,
              flow.originChainId,
              flow.destinationChainId,
              flow.amount,
              hubPoolClient,
              spokePoolClients,
              constructedBundle.config.ubaConfig.getBaselineFee(flow.destinationChainId, flow.originChainId),
              constructedBundle.config.ubaConfig.getLpGammaFunctionTuples(flow.destinationChainId)
            );

            const relayFeeCalculator = new RelayFeeCalculator(relayFeeCalculatorConfig);
            const { capitalFeeTotal, relayFeeTotal, gasFeeTotal, isAmountTooLow } =
              await relayFeeCalculator.relayerFeeDetails(
                flow.amount,
                tokenSymbol,
                undefined,
                flow.originChainId.toString(),
                flow.destinationChainId.toString()
              );

            constructedBundle.flows.push({
              flow,
              runningBalance,
              incentiveBalance,
              netRunningBalanceAdjustment,
              relayerFee: {
                relayerBalancingFee,
                relayerCapitalFee: toBN(capitalFeeTotal),
                relayerFee: toBN(relayFeeTotal).add(relayerBalancingFee),
                relayerGasFee: toBN(gasFeeTotal),
                amountTooLow: isAmountTooLow,
              },
              systemFee: {
                depositBalancingFee,
                lpFee,
                systemFee: lpFee.add(depositBalancingFee),
              },
            });
          }
          return constructedBundle;
        })
      );
      return {
        ...(await accumulator),
        [tokenSymbol]: constructedBundles,
      };
    }, Promise.resolve({} as UBABundleTokenState));
    chainState.bundles = tokenStates;
    return {
      ...(await accumulator),
      [chainId]: chainState,
    };
  }, Promise.resolve({} as { [chainId: number]: UBAChainState }));
}

function getOpeningTokenBalances(
  chainId: number,
  spokePoolTokenAddress: string,
  hubPoolClient: HubPoolClient,
  hubPoolBlockNumber?: number
): { blockNumber: number; spokePoolBalance: BigNumber; incentiveBalance: BigNumber } {
  if (!isDefined(hubPoolBlockNumber)) {
    if (!isDefined(hubPoolClient.latestBlockNumber)) {
      throw new Error("Could not resolve latest block number for hub pool client");
    }
    hubPoolBlockNumber = hubPoolClient.latestBlockNumber;
  }
  const hubPoolToken = hubPoolClient.getL1TokenCounterpartAtBlock(chainId, spokePoolTokenAddress, hubPoolBlockNumber);
  if (!isDefined(hubPoolToken)) {
    throw new Error(`Could not resolve ${chainId} token ${spokePoolTokenAddress} at block ${hubPoolBlockNumber}`);
  }
  const balances = hubPoolClient.getRunningBalanceBeforeBlockForChain(hubPoolBlockNumber, chainId, hubPoolToken);
  const endBlock = hubPoolClient.getLatestBundleEndBlockForChain([chainId], hubPoolBlockNumber, chainId);
  return {
    blockNumber: endBlock,
    spokePoolBalance: balances.runningBalance,
    incentiveBalance: balances.incentiveBalance,
  };
}

/**
 * Retrieves the flows for a given chainId.
 * @param chainId The chainId to retrieve flows for
 * @param chainIdIndices The chainIds of the spoke pools that align with the spoke pool clients
 * @param spokePoolClients A mapping of chainIds to spoke pool clients
 * @param hubPoolClient A hub pool client instance to query the hub pool
 * @param fromBlock The block number to start retrieving flows from
 * @param toBlock The block number to stop retrieving flows from
 * @param logger A logger instance to log messages to. Optional
 * @returns The flows for the given chainId
 */
async function getFlows(
  chainId: number,
  chainIdIndices: number[],
  spokePoolClients: SpokePoolClients,
  hubPoolClient: HubPoolClient,
  fromBlock?: number,
  toBlock?: number,
  logger?: Logger
): Promise<UbaFlow[]> {
  const spokePoolClient = spokePoolClients[chainId];

  fromBlock = fromBlock ?? spokePoolClient.deploymentBlock;
  toBlock = toBlock ?? spokePoolClient.latestBlockNumber;

  // @todo: Fix these type assertions.
  const deposits: UbaFlow[] = spokePoolClient
    .getDeposits()
    .filter(
      (deposit: DepositWithBlock) =>
        deposit.blockNumber >= (fromBlock as number) && deposit.blockNumber <= (toBlock as number)
    );

  // Filter out:
  // - Fills that request refunds on a different chain.
  // - Subsequent fills after an initial partial fill.
  // - Slow fills.
  // - Fills that are considered "invalid" by the spoke pool client.
  const fills: UbaFlow[] = await filterAsync(spokePoolClient.getFills(), async (fill: FillWithBlock) => {
    const validWithinBounds =
      fill.repaymentChainId === spokePoolClient.chainId &&
      fill.fillAmount.eq(fill.totalFilledAmount) &&
      fill.updatableRelayData.isSlowRelay === false &&
      fill.blockNumber > (fromBlock as number) &&
      fill.blockNumber < (toBlock as number);

    const hasMatchingDeposit = (await resolveCorrespondingDepositForFill(fill, spokePoolClients)) !== undefined;

    return validWithinBounds || hasMatchingDeposit;
  });

  const refundRequests: UbaFlow[] = spokePoolClient.getRefundRequests(fromBlock, toBlock).filter((refundRequest) => {
    const result = refundRequestIsValid(chainId, chainIdIndices, spokePoolClients, hubPoolClient, refundRequest);
    if (!result.valid && logger !== undefined) {
      logger.info({
        at: "UBAClient::getFlows",
        message: `Excluding RefundRequest on chain ${chainId}`,
        reason: result.reason,
        refundRequest,
      });
    }

    return result.valid;
  });

  // This is probably more expensive than we'd like... @todo: optimise.
  const flows = sortEventsAscending(deposits.concat(fills).concat(refundRequests));

  return flows;
}

/**
 * Validate a refund request.
 * @param chainId The chainId of the spoke pool
 * @param chainIdIndices The chainIds of the spoke pools that align with the spoke pool clients
 * @param spokePoolClients A mapping of chainIds to spoke pool clients
 * @param hubPoolClient The hub pool client
 * @param refundRequest The refund request to validate
 * @returns Whether or not the refund request is valid
 */
function refundRequestIsValid(
  chainId: number,
  chainIdIndices: number[],
  spokePoolClients: { [chainId: number]: SpokePoolClient },
  hubPoolClient: HubPoolClient,
  refundRequest: RefundRequestWithBlock
): RequestValidReturnType {
  const { relayer, amount, refundToken, depositId, originChainId, destinationChainId, realizedLpFeePct, fillBlock } =
    refundRequest;

  if (!chainIdIndices.includes(originChainId)) {
    return { valid: false, reason: "Invalid originChainId" };
  }
  const originSpoke = spokePoolClients[originChainId];

  if (!chainIdIndices.includes(destinationChainId) || destinationChainId === chainId) {
    return { valid: false, reason: "Invalid destinationChainId" };
  }
  const destSpoke = spokePoolClients[destinationChainId];

  if (fillBlock.lt(destSpoke.deploymentBlock) || fillBlock.gt(destSpoke.latestBlockNumber)) {
    return {
      valid: false,
      reason:
        `FillBlock (${fillBlock} out of SpokePool range` +
        ` [${destSpoke.deploymentBlock}, ${destSpoke.latestBlockNumber}]`,
    };
  }

  // Validate relayer and depositId.
  const fill = destSpoke.getFillsForRelayer(relayer).find((fill) => {
    // prettier-ignore
    return (
        fill.depositId === depositId
        && fill.originChainId === originChainId
        && fill.destinationChainId === destinationChainId
        && fill.amount.eq(amount)
        && fill.realizedLpFeePct.eq(realizedLpFeePct)
        && fill.blockNumber === fillBlock.toNumber()
      );
  });
  if (!isDefined(fill)) {
    return { valid: false, reason: "Unable to find matching fill" };
  }

  const deposit = originSpoke.getDepositForFill(fill);
  if (!isDefined(deposit)) {
    return { valid: false, reason: "Unable to find matching deposit" };
  }

  // Verify that the refundToken maps to a known HubPool token.
  // Note: the refundToken must be valid at the time of the Fill *and* the RefundRequest.
  // @todo: Resolve to the HubPool block number at the time of the RefundRequest ?
  const hubPoolBlockNumber = hubPoolClient.latestBlockNumber ?? hubPoolClient.deploymentBlock - 1;
  try {
    hubPoolClient.getL1TokenCounterpartAtBlock(chainId, refundToken, hubPoolBlockNumber);
  } catch {
    return { valid: false, reason: `Refund token unknown at HubPool block ${hubPoolBlockNumber}` };
  }

  return { valid: true };
}
