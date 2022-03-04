# translink ![GitHub Repo stars](https://img.shields.io/github/stars/coryfoundation/translink)

A high-level API for connecting nodes together using **P2P** and **DHT** without using message brokers, queues and intermediate servers.

All messages are encrypted with **end-to-end encryption** (more: https://hypercore-protocol.org)


## Installation
```
npm install @coryfoundation/translink
```

```js
import Translink from '@coryfoundation/translink'

const bridge = new Translink(options)

// Subscriptions here

bridge.connect()
  .then(() => console.log('Connected'))
  .catch((e) => console.error('Connection error', e))

```

## Options

#### `namespace (string)`
Namespace for recognition on the network. Must be the same on all nodes.
* **Required:** `true`

#### `nodeID (string)`
Node identifier. Must be unique.
* **Required:** `false`
* **Default:** `random string`

#### `log (boolean)`
Determines whether to write module messages to the console.
* **Required:** `false`
* **Default:** `true`

#### `logger (console-like class)`
Allows you to set your console-like class for logging.
* **Required:** `false`
* **Default:** `console`

#### `encoding (string)`
The encoding that should be used to encode and decode messages. **utf8** is currently supported only.
* **Required:** `false`
* **Default:** `utf8`

#### `requestTimeout (number)`
Timeout for the request, after which Error will be thrown on the sender's side. In milliseconds.
* **Required:** `false`
* **Default:** `10000`

#### `heartbeatInterval (number)`
The interval after which the heartbeat will be sent to other nodes.
* **Required:** `false`
* **Default:** `5000`

#### `heartbeatTimeout (number)`
Timeout, after which the node will be removed from the list of available nodes.
* **Required:** `false`
* **Default:** `10000`

#### `maxClientConnections (number)`
Maximum client connections to be allowed.
* **Required:** `false`
* **Default:** `Infinity`

#### `maxServerConnections (number)`
Maximum server connections to be allowed.
* **Required:** `false`
* **Default:** `Infinity`

#### `maxPeers (number)`
Maximum peers to be allowed.
* **Required:** `false`
* **Default:** `Infinity`

#### `maxParallel (number)`
Maximum parallel connections to be allowed.
* **Required:** `false`
* **Default:** `Infinity`

#### `broadcastReqConcurrency (number)`
Request concurrency for **broadcastReq()** method
* **Required:** `false`
* **Default:** `5`

#### `broadcastReqTimeout (number)`
Request timeout for **broadcastReq()** method
* **Required:** `false`
* **Default:** `1000`

#### `waitForPeer (boolean)`
Do we need to wait for the connection of the peer
* **Required:** `false`
* **Default:** `true`

## Usage
### Request
#### Subscribe
```js
bridge.subscribeReq('my.request', async (data) => {
  // Something to do with data
  return { hello: 'world' }
})
```
#### Send
```js
bridge.get('my.request', { something: 'data' })
.then((response) => {
  // Something to do with response
}).catch((error) => {
  console.error('Error', error)
})
```

### Event
#### Subscribe
```js
bridge.subscribe('my.event', async (data) => {
  // Something to do with data
})
```
#### Send
```js
bridge.emit('my.event', { world: 'hello' })
```

### Broadcast
#### Request
##### No all node responses needed
```js
bridge.broadcastReq('my.request', { world: 'hello' })
.then((results) => {
  // results is array with all responses
}).catch((error) => {
  console.error('Error', error)
})
```

#### Event
##### With same event subscription
```js
bridge.broadcast('my.event', { world: 'hello' })
```

##### All nodes
```js
bridge.broadcastToAllNodes('my.event', { world: 'hello' })
```

## Replic nodes
You can duplicate nodes with the same subscriptions an infinite number of times. Translink will send a message to a random available suitable node.

## License
MIT
