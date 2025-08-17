import { NextRequest } from 'next/server'
import { config } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orgName, selectedLinks } = body

    if (!orgName) {
      return new Response('Missing orgName', { status: 400 })
    }

    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        
        // Send initial progress
        const sendProgress = (data: any) => {
          const message = `data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(message))
        }

        let progressInterval: NodeJS.Timeout | null = null
        
        try {
          const totalLinks = selectedLinks?.length || 0
          
          // Send start event
          sendProgress({
            type: 'start',
            orgName,
            totalLinks,
            message: `开始更新案例详情... (共 ${totalLinks} 个链接)`
          })

          // Call the backend streaming API
          const backendUrl = config.backendUrl
          const response = await fetch(`${backendUrl}/api/v1/cases/update-details-selective-stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          })

          if (!response.ok) {
            const text = await response.text()
            throw new Error(`Backend error ${response.status}: ${text}`)
          }

          // Read the streaming response from backend
          const reader = response.body?.getReader()
          const decoder = new TextDecoder()

          if (!reader) {
            throw new Error('No response body reader available')
          }

          // Process the stream from backend
          while (true) {
            const { done, value } = await reader.read()
            
            if (done) break

            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const eventData = JSON.parse(line.slice(6))
                  // Forward the event from backend to frontend
                  sendProgress(eventData)
                } catch (parseError) {
                  console.error('Error parsing backend SSE data:', parseError)
                }
              }
            }
          }

        } catch (error) {
          console.error('Error updating details selectively:', error)
          // Clear any remaining intervals
          if (progressInterval) {
            clearInterval(progressInterval)
            progressInterval = null
          }
          
          // Provide more specific error messages
          let errorMessage = '更新失败'
          let detailedError = 'Unknown error'
          
          if (error instanceof Error) {
            detailedError = error.message
            if (error.message.includes('fetch')) {
              errorMessage = '网络连接失败，请检查后端服务是否正常运行'
            } else if (error.message.includes('timeout')) {
              errorMessage = '请求超时，请稍后重试'
            } else if (error.message.includes('Backend error')) {
              errorMessage = '后端处理出错，请查看服务器日志'
            } else {
              errorMessage = '更新过程中出现错误，请稍后重试'
            }
          }
          
          sendProgress({
            type: 'error',
            orgName,
            error: detailedError,
            message: errorMessage
          })
        } finally {
          // Ensure interval is cleared
          if (progressInterval) {
            clearInterval(progressInterval)
          }
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in stream setup:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}