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
  requestTimeout?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
}

declare type DataType = any[] | object | string | Buffer;

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
  private nodes: Map<
    string,
    { listenerNames: string[]; heartbeat: number; node: NoiseSecretStream }
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
    if (!this.opts.requestTimeout) this.opts.requestTimeout = 10 * 1000;
    if (!this.opts.heartbeatInterval) this.opts.heartbeatInterval = 5 * 1000;
    if (!this.opts.heartbeatTimeout) this.opts.heartbeatTimeout = 10 * 1000;

    this.heartbeatTimer = setInterval(
      () => this.heartbeatCheck(),
      this.opts.heartbeatInterval
    );
  }

  public async connect() {
    try {
      this.client = new Hyperswarm({
        maxPeers: Infinity,
        maxClientConnections: Infinity,
        maxServerConnections: Infinity,
        maxParallel: 5,
      });
      this.client.on("connection", this.onConnection.bind(this));
      this.client.on("error", (err) => console.error(err));

      this.net = this.client.join(
        Buffer.alloc(32).fill(String(this.opts.namespace)),
        { server: true, client: true }
      );

      if (this.opts.log) {
        this.opts?.logger?.info("Translink :: Waiting to announcing...");
      }

      await this.net?.flushed();

      if (this.opts.log) {
        this.opts?.logger?.info("Translink :: Joined to network.");
      }
    } catch (err) {
      console.error("Translink :: Connection error", err);
    }
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

    if (this.opts.log) {
      this.opts.logger?.info("Getted event " + eventName);
    }

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
      if (this.opts.log) {
        this.opts.logger?.info(
          "Translink :: Node",
          node.userData,
          "connected with listeners " + JSON.stringify(data[2] ?? [])
        );
      }
    } else if (eventName === ":res") {
      if (this.opts.log) {
        this.opts.logger?.info(
          "Translink :: Result got for request",
          String(data[2]),
          " from node " + node.userData
        );
      }

      this.respondEmitter.emit(String(data[2]), data[1]);
    } else if (eventName === ":err") {
      if (this.opts.log) {
        this.opts.logger?.info(
          "Translink :: Error result getted for request",
          String(data[2]),
          " from node " + node.userData
        );
      }

      this.respondEmitter.emit(String(data[2]), data[1], true);
    } else if (eventName === ":hb") {
      const $node = this.nodes.get(node.userData);
      if (!$node) return;

      $node.heartbeat = Date.now();
      this.nodes.set(node.userData, $node);
    } else {
      const nodeCell = this.nodes.get(node.userData);
      if (!nodeCell) {
        if (this.opts.log) {
          this.opts.logger?.log(
            "Node's " + node.userData + " cell not found. Skip"
          );
        }

        return;
      }

      data.push(node.userData);

      if (this.opts.log) {
        this.opts.logger?.info("Executing event " + eventName);
      }

      const success = this.eventEmitter.emit(eventName, data);
      if (!success) {
        if (this.opts.log) {
          this.opts.logger?.log(
            "Event's " + eventName + " handler response is not success. Skip"
          );

          return;
        }
      }
    }
  }

  private heartbeatCheck() {
    this.nodes.forEach((node, key) => {
      if (Date.now() - node.heartbeat > Number(this.opts?.heartbeatTimeout)) {
        if (this.opts.log) {
          this.opts.logger?.log(
            "Heartbeat timeout for node " +
              node.node.userData +
              ". Remove from nodes list"
          );
        }

        this.nodes.delete(key);
      } else {
        node.node.write(this._prepareOutgoingData([":hb"]));
      }
    });
  }

  public emit(eventId: string, data: DataType) {
    const node = this._findAvailableNode(eventId);
    if (!node)
      throw new RequestError({
        code: "EVENT_NOT_EXIST",
        message: "Event " + eventId + " not exist in network",
      });
    node?.node.write(this._prepareOutgoingData([eventId, data]));
    return true;
  }

  public async get(eventId: string, data: DataType): Promise<any> {
    // Trying to find node with this event
    return new Promise((resolve, reject) => {
      try {
        const node = this._findAvailableNode(eventId);
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

        if (this.opts.log) {
          this.opts.logger?.info(
            "Request " +
              eventId +
              " with id " +
              reqId +
              " sent to node " +
              node.node.userData
          );
        }

        node?.node.write(this._prepareOutgoingData([eventId, data, reqId]));
      } catch (err) {
        reject(err);
      }
    });
  }

  public broadcast(eventId: string, data: DataType) {
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
  }

  public broadcastToAllNodes(eventId: string, data: DataType) {
    this.nodes.forEach((node) =>
      node.node.write(this._prepareOutgoingData([eventId, data]))
    );
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

    if (this.opts.log) {
      this.opts.logger?.log(
        "Request received " +
          reqId +
          " from node " +
          nodeID +
          ". Executing handler"
      );
    }

    listener(data[1], data[3])
      .then((result: DataType) => {
        if (this.opts.log) {
          this.opts.logger?.log(
            "Result received from handler for request " +
              reqId +
              " and node " +
              nodeID +
              ". Return result"
          );
        }

        node?.node?.write(this._prepareOutgoingData([":res", result, reqId]));
      })
      .catch((err: Error) => {
        node?.node?.write(
          this._prepareOutgoingData([":err", err.stack ?? err, reqId])
        );
      });
  }
}
