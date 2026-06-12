import { useEffect } from 'react'
import { broadcastService, BroadcastMessageType } from '@/lib/services/broadcastService'

/**
 * Hook for subscribing to broadcast messages
 * Automatically handles subscription cleanup
 */
export function useBroadcast(
  messageType: BroadcastMessageType,
  callback: (payload: any) => void
) {
  useEffect(() => {
    const unsubscribe = broadcastService.subscribe(messageType, callback)
    return unsubscribe
  }, [messageType, callback])
}
