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
import { formatVND, formatDate, calculateNights } from '@/lib/utils'

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

  const invalidateAll = () => {
    // refetchType: 'all' forces inactive queries (like the dashboard when user is
    // on this page) to refetch in the background, so when they navigate back the
    // data is already fresh instead of showing a stale flash.
    queryClient.invalidateQueries({ queryKey: ['bookings'], refetchType: 'all' })
    queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'all' })
    queryClient.invalidateQueries({ queryKey: ['rooms'], refetchType: 'all' })
  }

  const checkInMutation = useMutation({
    mutationFn: () => bookingsApi.checkIn(booking.id),
    onSuccess: invalidateAll,
  })

  const checkOutMutation = useMutation({
    mutationFn: () => bookingsApi.checkOut(booking.id),
    onSuccess: invalidateAll,
  })

  const cancelMutation = useMutation({
    mutationFn: () => bookingsApi.cancel(booking.id),
    onSuccess: invalidateAll,
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

export function BookingDetail({ booking }: { booking: Booking }) {
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

      {/* Notes */}
      {detail.notes && (
        <div className="rounded-md bg-amber-50 p-3 text-sm">
          <p className="mb-1 text-xs font-medium text-amber-800">Ghi chú</p>
          <p className="whitespace-pre-wrap text-amber-900">{detail.notes}</p>
        </div>
      )}

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

  const availableRooms = rooms?.filter((r) => r.status !== 'MAINTENANCE') ?? []

  // Controlled form state
  const [guestName, setGuestName] = useState('')
  const [phone, setPhone] = useState('')
  const [roomId, setRoomId] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [totalRoomPrice, setTotalRoomPrice] = useState('')
  const [priceEdited, setPriceEdited] = useState(false)
  const [notes, setNotes] = useState('')

  // Auto-calculate total when room/dates change (unless user manually edited)
  const selectedRoom = availableRooms.find((r) => r.id === roomId)
  const nights = calculateNights(checkIn, checkOut)
  const roomPricePerNight = selectedRoom ? parseFloat(selectedRoom.pricePerNight) : 0
  const suggested = roomPricePerNight * nights

  // If the user hasn't manually overridden the price, keep it in sync with the suggestion
  const displayedPrice = priceEdited ? totalRoomPrice : suggested > 0 ? suggested.toString() : ''

  const mutation = useMutation({
    mutationFn: bookingsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['dashboard'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['rooms'], refetchType: 'all' })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const finalPrice = Number(displayedPrice)
    if (!Number.isFinite(finalPrice) || finalPrice < 0) return
    mutation.mutate({
      roomId,
      guestName,
      phone,
      checkIn,
      checkOut,
      totalRoomPrice: finalPrice,
      notes: notes || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-lg font-bold">Đặt phòng mới</h3>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input
            id="guestName"
            label="Tên khách"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            required
          />
          <Input
            id="phone"
            label="Số điện thoại"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <Select
            id="roomId"
            label="Phòng"
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value)
              setPriceEdited(false) // reset manual override
            }}
            options={[
              { value: '', label: '-- Chọn phòng --' },
              ...availableRooms.map((r) => ({
                value: r.id,
                label: `${r.name} — ${parseFloat(r.pricePerNight) > 0 ? formatVND(r.pricePerNight) + '/đêm' : 'Chưa đặt giá'}`,
              })),
            ]}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="checkIn"
              label="Ngày nhận"
              type="date"
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value)
                setPriceEdited(false)
              }}
              required
            />
            <Input
              id="checkOut"
              label="Ngày trả"
              type="date"
              value={checkOut}
              onChange={(e) => {
                setCheckOut(e.target.value)
                setPriceEdited(false)
              }}
              required
            />
          </div>

          {/* Auto-calculated total with manual override */}
          <div>
            <Input
              id="totalRoomPrice"
              label={`Tổng tiền phòng (₫)${nights > 0 ? ` — ${nights} đêm` : ''}`}
              type="number"
              min="0"
              value={displayedPrice}
              onChange={(e) => {
                setPriceEdited(true)
                setTotalRoomPrice(e.target.value)
              }}
              required
            />
            {suggested > 0 && !priceEdited && (
              <p className="mt-1 text-xs text-muted-foreground">
                Tự động tính: {formatVND(roomPricePerNight)} × {nights} đêm = {formatVND(suggested)}
              </p>
            )}
            {priceEdited && suggested > 0 && Number(displayedPrice) !== suggested && (
              <p className="mt-1 text-xs text-amber-600">
                Đã chỉnh sửa (gợi ý: {formatVND(suggested)})
              </p>
            )}
          </div>

          <Input
            id="notes"
            label="Ghi chú"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

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
