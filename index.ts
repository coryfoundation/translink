/**
 * cory.foundation :: Translink
 */

import Hyperswarm from "hyperswarm";
import PeerDiscovery from "hyperswarm/lib/peer-discovery";
// @ts-ignore
import NoiseSecretStream from "@hyperswarm/secret-stream";
import EventEmitter from "events";

declare interface Opts {
  namespace: string;
  nodeID?: string;
  log?: boolean;
  logger?: Console;
  encoding?: string;
}

declare type DataType = any[] | object | string | Buffer;

export default class Translink {
  private opts: Opts;
  private client: Hyperswarm | null = null;
  private net: PeerDiscovery | null = null;
  private nodeID: string | null = null;
  private eventEmitter = new EventEmitter();
  private respondEmitter = new EventEmitter();
  private nodes: Map<
    string,
    { listenerNames: string[]; node: NoiseSecretStream }
  > = new Map();

  constructor(opts: Opts) {
    this.opts = opts;
    this.nodeID =
      this.opts.nodeID ??
      Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    if (!this.opts.namespace)
      throw new Error("Namespace has not been set in options!");
    if (!this.opts.logger) this.opts.logger = console;
    if (!this.opts.encoding) this.opts.encoding = "utf8";
  }

  public async connect() {
    this.client = new Hyperswarm({
      maxPeers: Infinity,
      maxClientConnections: Infinity,
      maxServerConnections: Infinity,
    });
    this.client.on("connection", this.onConnection.bind(this));

    this.net = this.client.join(
      Buffer.alloc(32).fill(String(this.opts.namespace)),
      { server: true, client: true }
    );

    if (this.opts.log)
      this.opts?.logger?.info("Translink :: Waiting to announcing...");

    await this.net?.flushed();

    if (this.opts.log)
      this.opts?.logger?.info("Translink :: Joined to network.");
  }

  private onConnection(node: NoiseSecretStream) {
    // Inform about the connection
    node.write(
      this._prepareOutgoingData([
        ":peer",
        this.nodeID,
        this.eventEmitter.eventNames(),
      ])
    );
    node.on("data", (data: Buffer) => this.onMessage(data, node));
  }

  private onMessage(data: Buffer, node: NoiseSecretStream) {
    const preparedData: any = this._prepareIncomingData(data);
    this.processMessageEvent(preparedData, node);
  }

  private processMessageEvent(data: Array<any>, node: NoiseSecretStream) {
    const eventName = String(data[0]);

    //Informing about the connection
    if (eventName === ":peer") {
      // Set node id
      node.userData = String(data[1]);
      this.nodes.set(node.userData, { listenerNames: [...data[2]], node });
      // Inform to console
      if (this.opts.log)
        this.opts.logger?.info("Translink :: Node", node.userData, "connected");
    } else if (eventName === ":res") {
      this.respondEmitter.emit(String(data[2]), data[1]);
    } else if (eventName === ":err") {
      this.respondEmitter.emit(String(data[2]), data[1], true);
    } else {
      const nodeCell = this.nodes.get(node.userData);
      if (!nodeCell) return;

      data.push(node.userData);

      const success = this.eventEmitter.emit(eventName, data);
      if (!success) return;
    }
  }

  public emit(eventId: string, data: DataType) {
    const node = this._findAvailableNode(eventId);
    if (!node) throw "Event " + eventId + " not exist in network";
    node?.node.write(this._prepareOutgoingData([eventId, data]));
    return true;
  }

  public async get(eventId: string, data: DataType) {
    // Trying to find node with this event
    return new Promise((resolve, reject) => {
      try {
        const node = this._findAvailableNode(eventId);
        if (!node) throw "Event " + eventId + " not exist in network";

        const reqId = Math.random().toString(36).substring(2, 9);
        this.respondEmitter.once(
          reqId,
          (data: any, isError: boolean = false) => {
            if (!isError) resolve(data);
            else reject(data);
          }
        );

        node?.node.write(this._prepareOutgoingData([eventId, data, reqId]));
      } catch (err) {
        reject(err);
      }
    });
  }

  public subscribe(eventId: string, listener: (...args: any[]) => any) {
    this.eventEmitter.on(eventId, (data: any) => listener(data[1]));
  }

  public subscribeReq(eventId: string, listener: (...args: any[]) => any) {
    this.eventEmitter.on(eventId, (data) =>
      this._bindReqResult(listener, data)
    );
  }

  private _prepareIncomingData(
    data: Buffer | string
  ): Array<any> | object | Buffer {
    if (this.opts.encoding === "utf8") {
      data = data.toString();
      return data.indexOf("[") !== -1 || data.indexOf("{") !== -1
        ? JSON.parse(data)
        : data;
    } else return Buffer.from(data);
  }

  private _prepareOutgoingData(data: DataType): string | DataType {
    return this.opts.encoding === "utf8"
      ? typeof data === "object"
        ? JSON.stringify(data)
        : data
      : data;
  }

  private _findAvailableNode(eventId: string) {
    const nodes = Array.from(this.nodes.values()).filter(
      (cell) => cell.listenerNames.indexOf(eventId) !== -1
    );
    return nodes[Math.floor(Math.random() * nodes.length)];
  }

  private _bindReqResult(listener: (...args: any[]) => any, data: any) {
    const reqId = data[2];
    const nodeID = data[3];
    const node = this.nodes.get(nodeID);

    listener(data[1], data[3])
      .then((result: DataType) =>
        node?.node?.write(this._prepareOutgoingData([":res", result, reqId]))
      )
      .catch((err: Error) => {
        node?.node?.write(
          this._prepareOutgoingData([":err", err.stack ?? err, reqId])
        );
      });
  }
}
