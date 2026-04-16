import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

export function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError((err as Error).message || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      {/* Background watermark */}
      <div
        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <img
          src="/logo-seal.svg"
          alt=""
          className="h-[400px] w-[400px] opacity-[0.10] md:h-[600px] md:w-[600px]"
        />
      </div>

      <Card className="relative z-10 w-full max-w-sm space-y-6 p-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <img src="/logo-seal.svg" alt="Mái Ngói" className="h-16 w-16" />
          <div className="text-center leading-tight">
            <p className="font-['Cormorant_SC'] text-2xl font-bold tracking-wider text-foreground">
              mái ngói
            </p>
            <p className="font-['Playfair_Display'] text-xs font-light italic tracking-[0.2em] text-muted-foreground">
              homestay
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            id="username"
            label="Tên đăng nhập"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            autoFocus
          />
          <Input
            id="password"
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
