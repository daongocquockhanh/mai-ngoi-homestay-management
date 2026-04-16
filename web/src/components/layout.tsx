import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { LayoutDashboard, BedDouble, CalendarDays, BarChart3, LogOut, KeyRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { authApi } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Tổng quan' },
  { to: '/rooms', icon: BedDouble, label: 'Phòng' },
  { to: '/bookings', icon: CalendarDays, label: 'Đặt phòng' },
  { to: '/reports', icon: BarChart3, label: 'Báo cáo' },
]

export function Layout() {
  const { username, logout } = useAuth()
  const [showChangePw, setShowChangePw] = useState(false)

  return (
    <div className="relative min-h-screen bg-background pb-16 md:pb-0">
      {/* Background watermark — seal logo, very subtle */}
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

      {/* Top header */}
      <header className="sticky top-0 z-30 border-b border-[#5C3A1E] bg-[#3D2B1F] shadow-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-1.5">
            <img src="/logo-seal.svg" alt="Mái Ngói" className="h-9 w-9 brightness-0 invert opacity-80" />
            <div className="leading-tight">
              <p className="font-['Cormorant_SC'] text-lg font-bold tracking-wider text-[#F0E4D4]">
                mái ngói
              </p>
              <p className="font-['Playfair_Display'] text-[10px] font-light italic tracking-[0.2em] text-[#C4A882]">
                homestay
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop nav — hidden on mobile */}
            <nav className="hidden gap-1 md:flex">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-[#C4A882] hover:bg-[#5C3A1E] hover:text-[#F0E4D4]',
                    )
                  }
                  end={to === '/'}
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* User menu */}
            <div className="ml-2 flex items-center gap-1 border-l border-[#5C3A1E] pl-2">
              <span className="hidden text-xs text-[#C4A882] md:inline">{username}</span>
              <button
                type="button"
                onClick={() => setShowChangePw(true)}
                className="rounded-md p-1.5 text-[#C4A882] hover:bg-[#5C3A1E] hover:text-[#F0E4D4]"
                title="Đổi mật khẩu"
              >
                <KeyRound size={16} />
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-md p-1.5 text-[#C4A882] hover:bg-[#5C3A1E] hover:text-[#F0E4D4]"
                title="Đăng xuất"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Page content — above the watermark */}
      <main className="relative z-10 mx-auto max-w-6xl p-4">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar — hidden on desktop */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#5C3A1E] bg-[#3D2B1F] md:hidden">
        <div className="mx-auto flex max-w-md justify-around">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-[#C4A882]',
                )
              }
              end={to === '/'}
            >
              <Icon size={20} />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Change password modal */}
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
    </div>
  )
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPw !== confirmPw) {
      setError('Mật khẩu mới không khớp')
      return
    }
    if (newPw.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }
    setLoading(true)
    try {
      await authApi.changePassword(currentPw, newPw)
      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <Card className="w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold">Đổi mật khẩu</h3>
        {success ? (
          <p className="text-sm text-[#4A7A3E]">Đổi mật khẩu thành công!</p>
        ) : (
          <form className="space-y-3" onSubmit={handleSubmit}>
            <Input
              id="currentPw"
              label="Mật khẩu hiện tại"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              required
              autoFocus
            />
            <Input
              id="newPw"
              label="Mật khẩu mới"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              required
            />
            <Input
              id="confirmPw"
              label="Xác nhận mật khẩu mới"
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              required
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={onClose}>Huỷ</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Đang lưu...' : 'Đổi mật khẩu'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
