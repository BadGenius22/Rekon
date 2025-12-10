/**
 * Polymarket RelayClient and transaction types
 * Used for Safe wallet deployment and transaction execution
 */

/**
 * Transaction type used for RelayClient operations
 * Works for both Safe and Proxy wallets
 */
export interface Transaction {
  to: string;
  data: string;
  value: string;
}

/**
 * Wallet type selector for RelayClient
 * Note: RelayerTxType is also exported from @polymarket/builder-relayer-client
 * but we define it here for type consistency
 */
export enum RelayerTxType {
  SAFE = "SAFE",
  PROXY = "PROXY",
}

/**
 * Transaction states returned by Polymarket relayer
 */
export enum RelayerTransactionState {
  STATE_NEW = "STATE_NEW",
  STATE_EXECUTED = "STATE_EXECUTED",
  STATE_MINED = "STATE_MINED",
  STATE_CONFIRMED = "STATE_CONFIRMED",
  STATE_FAILED = "STATE_FAILED",
  STATE_INVALID = "STATE_INVALID",
}

/**
 * Response from Polymarket relayer after transaction execution
 */
export interface RelayerTransaction {
  transactionID: string;
  transactionHash: string;
  from: string;
  to: string;
  proxyAddress: string;
  data: string;
  state: RelayerTransactionState;
  type: string;
  metadata: string;
  createdAt: Date;
  updatedAt: Date;
}
