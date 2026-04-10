import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { bookingsApi, roomsApi, type Booking } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { BOOKING_STATUS, PAYMENT_METHOD, SERVICE_TYPE } from '@/lib/constants'
import { formatVND, formatDate } from '@/lib/utils'

export function BookingsPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null)

  const { data: bookingsList, isLoading } = useQuery({
    queryKey: ['bookings', statusFilter, search],
    queryFn: () =>
      bookingsApi.list({
        status: statusFilter || undefined,
        guest: search || undefined,
      }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Đặt phòng</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} /> Đặt phòng mới
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input
          placeholder="Tìm tên khách..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'Tất cả' },
            { value: 'BOOKED', label: 'Đã đặt' },
            { value: 'CHECKED_IN', label: 'Đang ở' },
            { value: 'COMPLETED', label: 'Hoàn thành' },
            { value: 'CANCELLED', label: 'Đã huỷ' },
          ]}
          className="w-40"
        />
      </div>

      {/* Booking list */}
      {isLoading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : bookingsList?.length === 0 ? (
        <p className="text-muted-foreground">Không có đặt phòng nào</p>
      ) : (
        <div className="space-y-3">
          {bookingsList?.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              expanded={selectedBooking === b.id}
              onToggle={() => setSelectedBooking(selectedBooking === b.id ? null : b.id)}
            />
          ))}
        </div>
      )}

      {/* New booking modal */}
      {showForm && <NewBookingForm onClose={() => setShowForm(false)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Booking Card
// ---------------------------------------------------------------------------

function BookingCard({ booking, expanded, onToggle }: {
  booking: Booking
  expanded: boolean
  onToggle: () => void
}) {
  const queryClient = useQueryClient()
  const statusConfig = BOOKING_STATUS[booking.status]

  const checkInMutation = useMutation({
    mutationFn: () => bookingsApi.checkIn(booking.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
  })

  const checkOutMutation = useMutation({
    mutationFn: () => bookingsApi.checkOut(booking.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.cancel(booking.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  return (
    <Card>
      <div className="flex cursor-pointer items-center justify-between" onClick={onToggle}>
        <div>
          <p className="font-semibold">{booking.guestName}</p>
          <p className="text-sm text-muted-foreground">
            {booking.room?.name} · {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)} · {booking.phone}
          </p>
        </div>
        <div className="text-right">
          <p className="font-medium">{formatVND(booking.totalRoomPrice)}</p>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
      </div>

      {expanded && (
        <BookingDetail booking={booking} />
      )}

      {/* Action buttons */}
      <div className="mt-3 flex gap-2">
        {booking.status === 'BOOKED' && (
          <>
            <Button size="sm" onClick={() => checkInMutation.mutate()} disabled={checkInMutation.isPending}>
              Nhận phòng
            </Button>
            <Button size="sm" variant="danger" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
              Huỷ
            </Button>
          </>
        )}
        {booking.status === 'CHECKED_IN' && (
          <Button size="sm" onClick={() => checkOutMutation.mutate()} disabled={checkOutMutation.isPending}>
            Trả phòng
          </Button>
        )}
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Booking Detail (service charges + payments)
// ---------------------------------------------------------------------------

function BookingDetail({ booking }: { booking: Booking }) {
  const queryClient = useQueryClient()
  const { data: detail } = useQuery({
    queryKey: ['booking', booking.id],
    queryFn: () => bookingsApi.get(booking.id),
  })

  const [showChargeForm, setShowChargeForm] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  const addChargeMutation = useMutation({
    mutationFn: (data: { description: string; quantity: number; unitPrice: number; type: 'FOOD' | 'DAMAGE' | 'OTHER' }) =>
      bookingsApi.addServiceCharge(booking.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] })
      setShowChargeForm(false)
    },
  })

  const addPaymentMutation = useMutation({
    mutationFn: (data: { amount: number; method: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD' }) =>
      bookingsApi.addPayment(booking.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', booking.id] })
      setShowPaymentForm(false)
    },
  })

  if (!detail) return <p className="mt-3 text-sm text-muted-foreground">Đang tải chi tiết...</p>

  const totalCharges = detail.serviceCharges?.reduce(
    (sum, sc) => sum + parseFloat(sc.unitPrice) * sc.quantity, 0,
  ) ?? 0
  const totalPaid = detail.payments?.reduce(
    (sum, p) => sum + parseFloat(p.amount), 0,
  ) ?? 0
  const grandTotal = parseFloat(detail.totalRoomPrice) + totalCharges
  const balance = grandTotal - totalPaid

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div><span className="text-muted-foreground">Tiền phòng:</span> <strong>{formatVND(detail.totalRoomPrice)}</strong></div>
        <div><span className="text-muted-foreground">Phụ thu:</span> <strong>{formatVND(totalCharges)}</strong></div>
        <div><span className="text-muted-foreground">Đã thanh toán:</span> <strong>{formatVND(totalPaid)}</strong></div>
        <div><span className="text-muted-foreground">Còn lại:</span> <strong className={balance > 0 ? 'text-destructive' : 'text-emerald-600'}>{formatVND(balance)}</strong></div>
      </div>

      {/* Service charges */}
      {(detail.serviceCharges?.length ?? 0) > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium">Phụ thu</p>
          <div className="space-y-1">
            {detail.serviceCharges?.map((sc) => (
              <div key={sc.id} className="flex justify-between text-sm">
                <span>{sc.description} <span className="text-muted-foreground">({SERVICE_TYPE[sc.type]})</span></span>
                <span>{sc.quantity} × {formatVND(sc.unitPrice)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payments */}
      {(detail.payments?.length ?? 0) > 0 && (
        <div>
          <p className="mb-1 text-sm font-medium">Thanh toán</p>
          <div className="space-y-1">
            {detail.payments?.map((p) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span>{PAYMENT_METHOD[p.method]} · {formatDate(p.paidAt)}</span>
                <span>{formatVND(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons for charges/payments */}
      {(booking.status === 'BOOKED' || booking.status === 'CHECKED_IN') && (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowChargeForm(!showChargeForm)}>
            + Phụ thu
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShowPaymentForm(!showPaymentForm)}>
            + Thanh toán
          </Button>
        </div>
      )}

      {/* Add charge form */}
      {showChargeForm && (
        <form
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            addChargeMutation.mutate({
              description: fd.get('description') as string,
              quantity: Number(fd.get('quantity')),
              unitPrice: Number(fd.get('unitPrice')),
              type: fd.get('type') as 'FOOD' | 'DAMAGE' | 'OTHER',
            })
          }}
        >
          <Input name="description" placeholder="Mô tả (VD: Coca-Cola)" required />
          <Input name="quantity" type="number" placeholder="SL" defaultValue="1" min="1" required />
          <Input name="unitPrice" type="number" placeholder="Đơn giá" min="0" required />
          <div className="flex gap-2">
            <Select
              name="type"
              options={[
                { value: 'FOOD', label: 'Đồ ăn/uống' },
                { value: 'DAMAGE', label: 'Hư hỏng' },
                { value: 'OTHER', label: 'Khác' },
              ]}
            />
            <Button size="sm" type="submit" disabled={addChargeMutation.isPending}>Thêm</Button>
          </div>
        </form>
      )}

      {/* Add payment form */}
      {showPaymentForm && (
        <form
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            addPaymentMutation.mutate({
              amount: Number(fd.get('amount')),
              method: fd.get('method') as 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD',
            })
          }}
        >
          <Input name="amount" type="number" placeholder="Số tiền" min="1" required />
          <Select
            name="method"
            options={[
              { value: 'CASH', label: 'Tiền mặt' },
              { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
              { value: 'CREDIT_CARD', label: 'Thẻ tín dụng' },
            ]}
          />
          <Button size="sm" type="submit" disabled={addPaymentMutation.isPending}>Thanh toán</Button>
        </form>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// New Booking Form
// ---------------------------------------------------------------------------

function NewBookingForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: roomsApi.list,
  })

  const mutation = useMutation({
    mutationFn: bookingsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  const availableRooms = rooms?.filter((r) => r.status !== 'MAINTENANCE') ?? []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold">Đặt phòng mới</h3>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            mutation.mutate({
              roomId: fd.get('roomId') as string,
              guestName: fd.get('guestName') as string,
              phone: fd.get('phone') as string,
              checkIn: fd.get('checkIn') as string,
              checkOut: fd.get('checkOut') as string,
              totalRoomPrice: Number(fd.get('totalRoomPrice')),
              notes: (fd.get('notes') as string) || undefined,
            })
          }}
        >
          <Input id="guestName" name="guestName" label="Tên khách" required />
          <Input id="phone" name="phone" label="Số điện thoại" required />
          <Select
            id="roomId"
            name="roomId"
            label="Phòng"
            options={availableRooms.map((r) => ({ value: r.id, label: r.name }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input id="checkIn" name="checkIn" label="Ngày nhận" type="date" required />
            <Input id="checkOut" name="checkOut" label="Ngày trả" type="date" required />
          </div>
          <Input id="totalRoomPrice" name="totalRoomPrice" label="Tổng tiền phòng (₫)" type="number" min="0" required />
          <Input id="notes" name="notes" label="Ghi chú" />

          {mutation.error && (
            <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Huỷ</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Đang lưu...' : 'Đặt phòng'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
