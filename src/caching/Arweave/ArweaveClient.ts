import Arweave from "arweave";
import { JWKInterface } from "arweave/node/lib/wallet";
import { ethers } from "ethers";
import winston from "winston";
import { isDefined, jsonReplacerWithBigNumbers, parseWinston, toBN } from "../../utils";
import { Struct, is } from "superstruct";
import { ARWEAVE_TAG_APP_NAME } from "../../constants";

export class ArweaveClient {
  private client: Arweave;

  public constructor(
    private arweaveJWT: JWKInterface,
    private logger: winston.Logger,
    gatewayURL = "arweave.net",
    protocol = "https",
    port = 443
  ) {
    this.client = new Arweave({
      host: gatewayURL,
      port,
      protocol,
      timeout: 20000,
      logging: false,
    });
    this.logger.info("Arweave client initialized");
  }

  /**
   * Stores an arbitrary record in the Arweave network. The record is stored as a JSON string and uses
   * JSON.stringify to convert the record to a string. The record has all of its big numbers converted
   * to strings for convenience.
   * @param value The value to store
   * @param topicTag An optional topic tag to add to the transaction
   * @returns The transaction ID of the stored value
   * @
   */
  async set(value: Record<string, unknown>, topicTag?: string | undefined): Promise<string | undefined> {
    const transaction = await this.client.createTransaction(
      { data: JSON.stringify(value, jsonReplacerWithBigNumbers) },
      this.arweaveJWT
    );

    // Add tags to the transaction
    transaction.addTag("Content-Type", "application/json");
    transaction.addTag("App-Name", ARWEAVE_TAG_APP_NAME);
    if (isDefined(topicTag)) {
      transaction.addTag("Topic", topicTag);
    }

    // Sign the transaction
    await this.client.transactions.sign(transaction, this.arweaveJWT);
    // Send the transaction
    const result = await this.client.transactions.post(transaction);

    // Ensure that the result is successful
    if (result.status !== 200) {
      const message = result?.data?.error?.msg ?? "Unknown error";
      this.logger.error({
        at: "ArweaveClient:set",
        message,
        result,
        txn: transaction.id,
        address: await this.getAddress(),
        balance: (await this.getBalance()).toString(),
      });
      throw new Error(message);
    } else {
      this.logger.debug({
        at: "ArweaveClient:set",
        message: `Arweave transaction posted with ${transaction.id}`,
      });
    }
    return transaction.id;
  }

  /**
   * Retrieves a record from the Arweave network. The record is expected to be a JSON string and is
   * parsed using JSON.parse. All numeric strings are converted to big numbers for convenience.
   * @param transactionID The transaction ID of the record to retrieve
   * @param structValidator An optional struct validator to validate the retrieved value. If the value does not match the struct, null is returned.
   * @returns The record if it exists, otherwise null
   */
  async get<T>(transactionID: string, validator: Struct<T>): Promise<T | null> {
    const rawData = await this.client.transactions.getData(transactionID, { decode: true, string: true });
    if (!rawData) {
      return null;
    }
    // Parse the retrieved data - if it is an Uint8Array, it is a buffer and needs to be converted to a string
    const data = JSON.parse(typeof rawData === "string" ? rawData : Buffer.from(rawData).toString("utf-8"));
    // Ensure that the result is successful. If it is not, the retrieved value is not our expected type
    // but rather a {status: string, statusText: string} object. We can detect that and return null.
    if (data.status === 400) {
      return null;
    }
    // If the validator does not match the retrieved value, return null and log a warning
    if (!is(data, validator)) {
      this.logger.warn("Retrieved value from Arweave does not match the expected type");
      return null;
    }
    return data;
  }

  /**
   * Retrieves the metadata of a transaction
   * @param transactionID The transaction ID of the record to retrieve
   * @returns The metadata of the transaction if it exists, otherwise null
   */
  async getMetadata(transactionID: string): Promise<Record<string, string> | null> {
    const transaction = await this.client.transactions.get(transactionID);
    if (!isDefined(transaction)) {
      return null;
    }
    const tags = Object.fromEntries(
      transaction.tags.map((tag) => [
        tag.get("name", { decode: true, string: true }),
        tag.get("value", { decode: true, string: true }),
      ])
    );
    return {
      contentType: tags["Content-Type"],
      appName: tags["App-Name"],
      topic: tags.Topic,
    };
  }

  /**
   * Returns the address of the signer of the JWT
   * @returns The address of the signer in this client
   */
  getAddress(): Promise<string> {
    return this.client.wallets.jwkToAddress(this.arweaveJWT);
  }

  /**
   * The balance of the signer
   * @returns The balance of the signer in winston units
   */
  async getBalance(): Promise<ethers.BigNumber> {
    const address = await this.getAddress();
    const balanceInFloat = await this.client.wallets.getBalance(address);
    // Sometimes the balance is returned in scientific notation, so we need to
    // convert it to a BigNumber
    if (balanceInFloat.includes("e")) {
      const [balance, exponent] = balanceInFloat.split("e");
      const resultingBN = ethers.BigNumber.from(balance).mul(toBN(10).pow(exponent.replace("+", "")));
      return parseWinston(resultingBN.toString());
    } else {
      return parseWinston(balanceInFloat);
    }
  }
}