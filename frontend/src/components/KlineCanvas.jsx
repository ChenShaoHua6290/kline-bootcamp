import { useEffect, useRef } from 'react'
import { init } from '@klinecharts/pro'

export default function KlineCanvas({ data = [] }) {
  const chartRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    chartRef.current = init(containerRef.current)
    chartRef.current?.setStyleOptions({
      candle: {
        bar: {
          upColor: '#26a69a',
          downColor: '#ef5350'
        }
      }
    })

    return () => {
      chartRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    chartRef.current?.applyNewData(data)
  }, [data])

  return <div ref={containerRef} className="chart-container" />
}
