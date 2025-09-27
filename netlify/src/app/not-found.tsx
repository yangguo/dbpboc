import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>页面未找到</h1>
      <p style={{ marginBottom: '2rem', color: '#666' }}>
        抱歉，您访问的页面不存在。
      </p>
      <Link href="/" className="btn">
        返回首页
      </Link>
    </div>
  )
}