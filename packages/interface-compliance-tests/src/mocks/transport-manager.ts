import type { TransportManager } from "@libp2p/interface-internal/transport-manager"
import type { EventEmitter } from "@libp2p/interface/events"
import type { Libp2pEvents } from "@libp2p/interface"
import type { Startable } from "@libp2p/interface/startable"
import { FaultTolerance, type Listener, type Transport, type Upgrader } from "@libp2p/interface/transport"
import type { Connection } from "@libp2p/interface/src/connection"
import type { Multiaddr } from "@multiformats/multiaddr"
import { CodeError } from "@libp2p/interface/errors"

export interface MockTransportManagerComponents {
	events: EventEmitter<Libp2pEvents>
	upgrader: Upgrader
}

class MockTransportManager implements TransportManager, Startable {
	private readonly components: MockTransportManagerComponents
	private readonly transports: Map<string, Transport>
	private readonly listeners: Map<string, Listener[]>
	private readonly faultTolerance: FaultTolerance
	private started: boolean

	constructor(components: MockTransportManagerComponents) {
		this.components = components
		this.started = false
		this.transports = new Map<string, Transport>()
		this.listeners = new Map<string, Listener[]>()
		this.faultTolerance = FaultTolerance.FATAL_ALL
	}

	isStarted(): boolean {
		return this.started
	}

	async start(): Promise<void> {
		this.started = true
	}

	async stop(): Promise<void> {
		const tasks = []
		for (const [_, listeners] of this.listeners) {
			while (listeners.length > 0) {
				const listener = listeners.pop()

				if (listener == null) {
					continue
				}

				tasks.push(listener.close())
			}
		}

		await Promise.all(tasks)
		for (const key of this.listeners.keys()) {
			this.listeners.set(key, [])
		}

		this.started = false
	}

	getAddrs(): Multiaddr[] {
		let addrs: Multiaddr[] = []
		for (const listeners of this.listeners.values()) {
			for (const listener of listeners) {
				addrs = [...addrs, ...listener.getAddrs()]
			}
		}
		return addrs
	}

	/**
	 * Returns all the transports instances
	 */
	getTransports(): Transport[] {
		return Array.of(...this.transports.values())
	}

	/**
	 * Returns all the listener instances
	 */
	getListeners(): Listener[] {
		return Array.of(...this.listeners.values()).flat()
	}

	add(transport: Transport): void {
		const tag = transport[Symbol.toStringTag]

		if (tag == null) {
			throw new CodeError("Transport must have a valid tag", "INVALID_TAG")
		}

		if (this.transports.has(tag)) {
			throw new CodeError(`There is already a transport with the tag ${tag}`, "DUPLICATE")
		}

		this.transports.set(tag, transport)

		if (!this.listeners.has(tag)) {
			this.listeners.set(tag, [])
		}
	}

	transportForMultiaddr(ma: Multiaddr): Transport | undefined {
		for (const transport of this.transports.values()) {
			const addrs = transport.filter([ma])

			if (addrs.length > 0) {
				return transport
			}
		}
	}

	async dial(ma: Multiaddr, options?: any): Promise<Connection> {
		const transport = this.transportForMultiaddr(ma)

		if (transport == null) {
			throw new CodeError(`No transport available for address ${String(ma)}`, "TRANSPORT_UNAVAILABLE")
		}

		try {
			return await transport.dial(ma, {
				...options,
				upgrader: this.components.upgrader,
			})
		} catch (err: any) {
			if (err.code == null) {
				err.code = "TRANSPORT_DIAL_FAILED"
			}

			throw err
		}
	}

	/**
	 * Starts listeners for each listen Multiaddr
	 */
	async listen(addrs: Multiaddr[]): Promise<void> {
		if (!this.isStarted()) {
			throw new CodeError("Not started", "ERR_NODE_NOT_STARTED")
		}

		if (addrs == null || addrs.length === 0) {
			return
		}

		const couldNotListen = []

		for (const [key, transport] of this.transports.entries()) {
			const supportedAddrs = transport.filter(addrs)
			const tasks = []

			// For each supported multiaddr, create a listener
			for (const addr of supportedAddrs) {
				const listener = transport.createListener({
					upgrader: this.components.upgrader,
				})

				let listeners: Listener[] = this.listeners.get(key) ?? []

				if (listeners == null) {
					listeners = []
					this.listeners.set(key, listeners)
				}

				listeners.push(listener)

				// Track listen/close events
				listener.addEventListener("listening", () => {
					this.components.events.safeDispatchEvent("transport:listening", {
						detail: listener,
					})
				})
				listener.addEventListener("close", () => {
					const index = listeners.findIndex((l) => l === listener)

					// remove the listener
					listeners.splice(index, 1)

					this.components.events.safeDispatchEvent("transport:close", {
						detail: listener,
					})
				})

				// We need to attempt to listen on everything
				tasks.push(listener.listen(addr))
			}

			// Keep track of transports we had no addresses for
			if (tasks.length === 0) {
				couldNotListen.push(key)
				continue
			}

			const results = await Promise.allSettled(tasks)

			const isListening = results.find((r) => r.status === "fulfilled")
			if (isListening == null && this.faultTolerance !== FaultTolerance.NO_FATAL) {
				throw new CodeError(`Transport (${key}) could not listen on any available address`, "ERR_NO_VALID_ADDRESSES")
			}
		}

		if (couldNotListen.length === this.transports.size) {
			const message = `no valid addresses were provided for transports [${couldNotListen.join(", ")}]`
			if (this.faultTolerance === FaultTolerance.FATAL_ALL) {
				throw new CodeError(message, "ERR_NO_VALID_ADDRESSES")
			}
		}
	}

	async remove(key: string): Promise<void> {
		// Close any running listeners
		for (const listener of this.listeners.get(key) ?? []) {
			await listener.close()
		}

		this.transports.delete(key)
		this.listeners.delete(key)
	}

	async removeAll(): Promise<void> {
		const tasks = []
		for (const key of this.transports.keys()) {
			tasks.push(this.remove(key))
		}

		await Promise.all(tasks)
	}
}

export function mockTransportManager(components: MockTransportManagerComponents): TransportManager {
	return new MockTransportManager(components)
}
