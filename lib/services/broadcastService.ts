/**
 * BroadcastChannel Service
 * Handles real-time synchronization between cashier screen (/pos) and customer display (/customer-display)
 * Uses the native BroadcastChannel API for inter-window communication
 * 
 * This is the primary communication mechanism between screens
 * Supabase is used only for persistence, not for real-time updates
 */

import { Order, CartItem } from '@/lib/types'

export type BroadcastMessageType = 
  | 'order-update'
  | 'payment-complete'
  | 'order-status-change'
  | 'sync-request'

export interface BroadcastMessage {
  type: BroadcastMessageType
  payload: Order | CartItem[] | { orderId: string; status: string } | null
  timestamp: number
}

class BroadcastService {
  private channel: BroadcastChannel | null = null
  private listeners: Map<BroadcastMessageType, Set<(payload: any) => void>> = new Map()
  private isSupported: boolean = typeof BroadcastChannel !== 'undefined'

  constructor() {
    if (this.isSupported) {
      try {
        this.channel = new BroadcastChannel('pos-system')
        this.setupMessageListener()
      } catch (error) {
        console.error('[v0] Failed to create BroadcastChannel:', error)
        this.isSupported = false
      }
    }
  }

  /**
   * Setup listener for incoming messages from other windows
   */
  private setupMessageListener() {
    if (!this.channel) return

    this.channel.onmessage = (event) => {
      const message: BroadcastMessage = event.data
      
      // Call all registered listeners for this message type
      const listeners = this.listeners.get(message.type)
      if (listeners) {
        listeners.forEach((callback) => {
          try {
            callback(message.payload)
          } catch (error) {
            console.error(`[v0] Error in listener for ${message.type}:`, error)
          }
        })
      }
    }

    this.channel.addEventListener('messageerror', (error: MessageEvent) => {
      console.error('[v0] BroadcastChannel error:', error)
    })
  }

  /**
   * Broadcast order update to all connected windows
   * Called when items are added/removed from cart or order is modified
   */
  public broadcastOrderUpdate(items: CartItem[]) {
    this.sendMessage('order-update', items)
  }

  /**
   * Broadcast payment completion
   * Called when payment is successfully processed
   */
  public broadcastPaymentComplete(order: Order) {
    this.sendMessage('payment-complete', order)
  }

  /**
   * Broadcast order status change
   * Called when order status is updated (pending -> preparing -> ready -> completed)
   */
  public broadcastOrderStatusChange(orderId: string, status: string) {
    this.sendMessage('order-status-change', { orderId, status })
  }

  /**
   * Request sync from customer display
   * Called when customer display window needs to refresh
   */
  public requestSync() {
    this.sendMessage('sync-request', null)
  }

  /**
   * Register listener for specific message type
   */
  public subscribe(type: BroadcastMessageType, callback: (payload: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    
    this.listeners.get(type)!.add(callback)

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback)
    }
  }

  /**
   * Send message through BroadcastChannel
   */
  private sendMessage(type: BroadcastMessageType, payload: any) {
    if (!this.isSupported || !this.channel) {
      console.warn('[v0] BroadcastChannel not supported')
      return
    }

    try {
      const message: BroadcastMessage = {
        type,
        payload,
        timestamp: Date.now(),
      }
      this.channel.postMessage(message)
    } catch (error) {
      console.error(`[v0] Failed to send broadcast message (${type}):`, error)
    }
  }

  /**
   * Close the broadcast channel
   * Call this during cleanup
   */
  public close() {
    if (this.channel) {
      this.channel.close()
      this.channel = null
    }
    this.listeners.clear()
  }
}

// Singleton instance
export const broadcastService = new BroadcastService()
