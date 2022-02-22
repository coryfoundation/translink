/**
 * cory.foundation :: Translink
 */

import Hyperswarm from "hyperswarm";
import PeerDiscovery from "hyperswarm/lib/peer-discovery";
import NoiseSecretStream from "@hyperswarm/secret-stream";
import EventEmitter from "events";
import pmap from "p-map";

declare interface Opts {
  namespace: string;
  nodeID?: string;
  log?: boolean;
  logErrors?: boolean;
  logger?: Console;
  encoding?: string;
  requestTimeout?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  maxPeers?: number;
  maxClientConnections?: number;
  maxServerConnections?: number;
  maxParallel?: number;
  broadcastReqConcurrency?: number;
}

declare type DataType = any[] | object | string | Buffer;
declare interface Node {
  listenerNames: string[];
  heartbeat: number;
  node: NoiseSecretStream;
}

class RequestError {
  code: String;
  message: String;

  constructor(args: any) {
    this.message = args.message;
    this.code = args.code;
  }
}

export default class Translink {
  private opts: Opts;
  private client: Hyperswarm | null = null;
  private net: PeerDiscovery | null = null;
  private nodeID: string | null = null;
  heartbeatTimer: NodeJS.Timer | null = null;
  private eventEmitter = new EventEmitter();
  private respondEmitter = new EventEmitter();
  private nodes: Map<string, Node> = new Map();

  constructor(opts: Opts) {
    this.opts = opts;

    this.nodeID =
      this.opts.nodeID ??
      Date.now().toString(36) + Math.random().toString(36).substring(2, 5);

    if (!this.opts.namespace)
      throw new Error("Namespace has not been set in options!");

    if (!this.opts.logErrors) this.opts.logErrors = true;
    if (!this.opts.logger) this.opts.logger = console;
    if (!this.opts.encoding) this.opts.encoding = "utf8";
    if (!this.opts.requestTimeout) this.opts.requestTimeout = 10 * 1000;
    if (!this.opts.heartbeatInterval) this.opts.heartbeatInterval = 5 * 1000;
    if (!this.opts.heartbeatTimeout) this.opts.heartbeatTimeout = 10 * 1000;
    if (!this.opts.maxClientConnections)
      this.opts.maxClientConnections = Infinity;
    if (!this.opts.maxServerConnections)
      this.opts.maxServerConnections = Infinity;
    if (!this.opts.maxPeers) this.opts.maxPeers = Infinity;
    if (!this.opts.maxParallel) this.opts.maxParallel = Infinity;
    if (!this.opts.broadcastReqConcurrency)
      this.opts.broadcastReqConcurrency = 5;

    this.heartbeatTimer = setInterval(
      () => this.heartbeatCheck(),
      this.opts.heartbeatInterval
    );
  }

  public async connect() {
    try {
      return new Promise((resolve, reject) => {
        this.client = new Hyperswarm({
          maxPeers: this.opts.maxPeers,
          maxClientConnections: this.opts.maxClientConnections,
          maxServerConnections: this.opts.maxServerConnections,
          maxParallel: this.opts.maxParallel,
        });

        this.client.on("connection", this.onConnection.bind(this));

        this.client.on("error", (err: Error) =>
          this.logErr("hyperswarm error", err)
        );

        this.net = this.client.join(
          Buffer.alloc(32).fill(String(this.opts.namespace)),
          { server: true, client: true }
        );

        this.log("Waiting to announcing...");
        this.net
          ?.flushed()
          .then(() => {
            this.log(
              "Joined to network. Waiting for connecting other nodes..."
            );

            const interval = setInterval(() => {
              if (this.nodes.size > 0) {
                clearInterval(interval);
                resolve(true);
              }
            }, 500);
          })
          .catch(reject);
      });
    } catch (err) {
      this.logErr("Connection error", err);
    }
  }

  private onConnection(node: NoiseSecretStream) {
    try {
      // Inform about the connection
      node.on("data", (data: Buffer) => this.onMessage(data, node));
      node.on("error", (error: Error) =>
        this.logErr("hyperswarm error", error)
      );
      node.write(
        this._prepareOutgoingData([
          ":peer",
          this.nodeID,
          this.eventEmitter.eventNames(),
        ])
      );
    } catch (err) {
      if (this.opts.logErrors) this.logErr("onConnection() error", err);
    }
  }

  private onMessage(data: Buffer, node: NoiseSecretStream) {
    try {
      const preparedData: any = this._prepareIncomingData(data);
      this.processMessageEvent(preparedData, node);
    } catch (err) {
      if (this.opts.logErrors) this.logErr("onMessage() error", err);
    }
  }

  private processMessageEvent(data: Array<any>, node: NoiseSecretStream) {
    try {
      const eventName = String(data[0]);

      if (this.opts.log) this.log("Getted event " + eventName);

      //Informing about the connection
      if (eventName === ":peer") {
        // Set node id
        node.userData = String(data[1]);
        this.nodes.set(node.userData, {
          listenerNames: [...data[2]],
          node,
          heartbeat: Date.now(),
        });

        // Inform to console
        if (this.opts.log)
          this.log(
            "Node",
            node.userData,
            "connected with listeners " + JSON.stringify(data[2] ?? [])
          );
      } else if (eventName === ":res") {
        if (this.opts.log)
          this.log(
            "Result got for request",
            String(data[2]),
            " from node " + node.userData
          );

        this.respondEmitter.emit(String(data[2]), data[1]);
      } else if (eventName === ":err") {
        if (this.opts.log)
          this.log(
            "Error result getted for request",
            String(data[2]),
            " from node " + node.userData
          );

        this.respondEmitter.emit(String(data[2]), data[1], true);
      } else if (eventName === ":hb") {
        const $node = this.nodes.get(node.userData);
        if (!$node) return;

        $node.heartbeat = Date.now();
        this.nodes.set(node.userData, $node);
      } else {
        const nodeCell = this.nodes.get(node.userData);
        if (!nodeCell) {
          if (this.opts.log)
            this.log("Node's " + node.userData + " cell not found. Skip");

          return;
        }

        data.push(node.userData);

        if (this.opts.log) this.log("Executing event " + eventName);

        const success = this.eventEmitter.emit(eventName, data);
        if (!success && this.opts.log)
          this.log(
            "Event's " + eventName + " handler response is not success. Skip"
          );

        return success;
      }
    } catch (err) {
      if (this.opts.logErrors) this.logErr("processMessageEvent() error", err);
    }
  }

  private heartbeatCheck() {
    this.nodes.forEach((node, key) => {
      if (Date.now() - node.heartbeat > Number(this.opts?.heartbeatTimeout)) {
        if (this.opts.log)
          this.log(
            "Heartbeat timeout for node " +
              node.node.userData +
              ". Remove from nodes list"
          );

        this.nodes.delete(key);
      } else {
        node.node.write(this._prepareOutgoingData([":hb"]));
      }
    });
  }

  public emit(eventId: string, data: DataType) {
    try {
      const node = this._findAvailableNode(eventId);

      if (!node)
        throw new RequestError({
          code: "EVENT_NOT_EXIST",
          message: "Event " + eventId + " not exist in network",
        });

      node?.node.write(this._prepareOutgoingData([eventId, data]));
      return true;
    } catch (err) {
      throw err;
    }
  }

  public async get(eventId: string, data: DataType, node?: Node): Promise<any> {
    // Trying to find node with this event
    return new Promise((resolve, reject) => {
      try {
        if (!node) node = this._findAvailableNode(eventId);
        if (!node)
          throw new RequestError({
            code: "EVENT_NOT_EXIST",
            message: "Event " + eventId + " not exist in network",
          });

        const timer = setTimeout(
          () =>
            this.respondEmitter.emit(reqId, new Error("Request timeout"), true),
          this.opts.requestTimeout
        );

        const reqId = Math.random().toString(36).substring(2, 9);

        this.respondEmitter.once(
          reqId,
          (data: any, isError: boolean = false) => {
            clearTimeout(timer);
            if (!isError) resolve(data);
            else reject(data);
          }
        );

        if (this.opts.log)
          this.log(
            "Request " +
              eventId +
              " with id " +
              reqId +
              " sent to node " +
              node.node.userData
          );

        node?.node.write(this._prepareOutgoingData([eventId, data, reqId]));
      } catch (err) {
        reject(err);
      }
    });
  }

  public broadcast(eventId: string, data: DataType) {
    try {
      const nodes = Array.from(this.nodes.values()).filter(
        (cell) => cell.listenerNames.indexOf(eventId) !== -1
      );

      if (nodes.length === 0)
        throw new RequestError({
          code: "EVENT_NOT_REGISTERED",
          message: "Event " + eventId + " not registered in network",
        });

      nodes.map((node) =>
        node.node.write(this._prepareOutgoingData([eventId, data]))
      );
    } catch (err) {
      throw err;
    }
  }

  public broadcastToAllNodes(eventId: string, data: DataType) {
    try {
      this.nodes.forEach((node) =>
        node.node.write(this._prepareOutgoingData([eventId, data]))
      );
    } catch (err) {
      throw err;
    }
  }

  public async broadcastReq(eventId: string, data: DataType): Promise<any> {
    try {
      return await pmap(
        this._findAvailableNodes(eventId),
        (node) => {
          return new Promise((resolve, reject) => {
            const timer = setTimeout(reject, 500);
            this.get(eventId, data, node)
              .then(resolve)
              .catch(reject)
              .finally(() => clearTimeout(timer));
          });
        },
        { concurrency: this.opts.broadcastReqConcurrency, stopOnError: false }
      );
    } catch (err) {
      throw err;
    }
  }

  public subscribe(eventId: string, listener: (...args: any[]) => any) {
    try {
      this.eventEmitter.on(eventId, (data: any) => listener(data[1]));
    } catch (err) {
      if (this.opts.logErrors) this.logErr("subscribe() error", err);
    }
  }

  public subscribeReq(eventId: string, listener: (...args: any[]) => any) {
    try {
      this.eventEmitter.on(eventId, (data) =>
        this._bindReqResult(listener, data)
      );
    } catch (err) {
      if (this.opts.logErrors) this.logErr("subscribeReq() error", err);
    }
  }

  private _prepareIncomingData(
    data: Buffer | string
  ): Array<any> | object | Buffer {
    try {
      if (this.opts.encoding === "utf8") {
        data = data.toString();
        return data.indexOf("[") !== -1 || data.indexOf("{") !== -1
          ? JSON.parse(data)
          : data;
      } else return Buffer.from(data);
    } catch (err) {
      if (this.opts.logErrors) this.logErr("_prepareIncomingData() error", err);
      return {};
    }
  }

  private _prepareOutgoingData(data: DataType): string | DataType {
    try {
      return this.opts.encoding === "utf8"
        ? typeof data === "object"
          ? JSON.stringify(data)
          : data
        : data;
    } catch (err) {
      if (this.opts.logErrors) this.logErr("_prepareOutgoingData() error", err);
      return "{}";
    }
  }

  private _findAvailableNode(eventId: string) {
    try {
      const nodes = Array.from(this.nodes.values()).filter(
        (cell) => cell.listenerNames.indexOf(eventId) !== -1
      );
      return nodes[Math.floor(Math.random() * nodes.length)];
    } catch (err) {
      if (this.opts.logErrors) this.logErr("_findAvailableNode() error", err);
      return null;
    }
  }

  private _findAvailableNodes(eventId: string) {
    try {
      const nodes = Array.from(this.nodes.values()).filter(
        (cell) => cell.listenerNames.indexOf(eventId) !== -1
      );
      return nodes;
    } catch (err) {
      if (this.opts.logErrors) this.logErr("_findAvailableNode() error", err);
      return null;
    }
  }

  private _bindReqResult(listener: (...args: any[]) => any, data: any) {
    try {
      const reqId = data[2];
      const nodeID = data[3];
      const node = this.nodes.get(nodeID);

      if (this.opts.log)
        this.log(
          "Request received " +
            reqId +
            " from node " +
            nodeID +
            ". Executing handler"
        );

      listener(data[1], data[3])
        .then((result: DataType) => {
          if (this.opts.log)
            this.log(
              "Result received from handler for request " +
                reqId +
                " and node " +
                nodeID +
                ". Return result"
            );

          node?.node?.write(this._prepareOutgoingData([":res", result, reqId]));
        })
        .catch((err: Error) => {
          node?.node?.write(
            this._prepareOutgoingData([":err", err.stack ?? err, reqId])
          );
        });
    } catch (err) {
      if (this.opts.logErrors) this.logErr("_bindReqResult() error", err);
    }
  }

  private log(...args: any[]) {
    if (!this.opts.log) return;
    this.opts.logger?.info(...args);
  }

  private logErr(...args: any[]) {
    if (!this.opts.log) return;
    this.logErr(...args);
  }
}
