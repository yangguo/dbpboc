'use client'

import { useState, useCallback, useRef } from 'react'
import { config } from '@/lib/config'

export interface ProgressState {
  isActive: boolean
  progress: number
  message: string
  error: string | null
  orgName: string | null
  currentLink: number
  totalLinks: number
  updatedCases: number
  downloads: number
  tables: number
}

const initialState: ProgressState = {
  isActive: false,
  progress: 0,
  message: '',
  error: null,
  orgName: null,
  currentLink: 0,
  totalLinks: 0,
  updatedCases: 0,
  downloads: 0,
  tables: 0
}

export function useProgressStream() {
  const [state, setState] = useState<ProgressState>(initialState)
  const eventSourceRef = useRef<EventSource | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const resetState = useCallback(() => {
    setState(initialState)
  }, [])

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setState(prev => ({ ...prev, isActive: false }))
  }, [])

  const startStream = useCallback(async (orgName: string, selectedLinks?: string[]) => {
    // Stop any existing stream
    stopStream()

    // Reset state and set as active
    setState({
      ...initialState,
      isActive: true,
      orgName,
      message: '正在初始化...'
    })

    try {
      // Create abort controller for fetch request
      abortControllerRef.current = new AbortController()

      // Prepare request body
      const requestBody = {
        orgName,
        ...(selectedLinks && selectedLinks.length > 0 ? { selectedLinks } : {})
      }

      // Start the stream request
      const response = await fetch(`${config.backendUrl}/api/v1/cases/update-details-selective-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('Response body is null')
      }

      // Create EventSource-like reader for Server-Sent Events
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                setState(prev => {
                  switch (data.type) {
                    case 'start':
                      return {
                        ...prev,
                        isActive: true,
                        progress: 0,
                        message: data.message || '开始更新...',
                        error: null,
                        orgName: data.orgName,
                        totalLinks: data.totalLinks || 0,
                        currentLink: 0
                      }
                    
                    case 'progress':
                      return {
                        ...prev,
                        progress: Math.min(data.progress || 0, 99), // Cap at 99% until complete
                        message: data.message || `正在处理第 ${data.currentLink}/${data.totalLinks} 个链接`,
                        currentLink: data.currentLink || 0,
                        totalLinks: data.totalLinks || prev.totalLinks
                      }
                    
                    case 'complete':
                      return {
                        ...prev,
                        isActive: false,
                        progress: 100,
                        message: data.message || '更新完成',
                        updatedCases: data.updatedCases || 0,
                        downloads: data.downloads || 0,
                        tables: data.tables || 0
                      }
                    
                    case 'error':
                      return {
                        ...prev,
                        isActive: false,
                        error: data.error || '更新过程中出现错误',
                        message: data.message || '更新失败'
                      }
                    
                    default:
                      return prev
                  }
                })
              } catch (parseError) {
                console.error('Failed to parse SSE data:', parseError, 'Raw line:', line)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Request was aborted, don't update state
        return
      }
      
      console.error('Stream error:', error)
      setState(prev => ({
        ...prev,
        isActive: false,
        error: error.message || '连接失败',
        message: '更新失败'
      }))
    }
  }, [stopStream])

  const retryStream = useCallback(async () => {
    const { orgName } = state
    if (orgName) {
      await startStream(orgName)
    }
  }, [state.orgName, startStream])

  return {
    state,
    startStream,
    stopStream,
    resetState,
    retryStream
  }
}