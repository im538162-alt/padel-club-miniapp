import { useState } from 'react'
import { formatDateWithWeekday } from '../utils/date'
import { StateNotice } from './StateNotice'
import type { Slot } from '../types'

interface Props {
  courtName: string
  dateKey: string
  slots: Slot[]
  onClose: () => void
  onConfirm: (time: string) => Promise<void>
}

type Step = 'time' | 'confirm' | 'success'

export function BookingFlow({ courtName, dateKey, slots, onClose, onConfirm }: Props) {
  const [step, setStep] = useState<Step>('time')
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!selectedTime || isSubmitting) return
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      await onConfirm(selectedTime)
      setStep('success')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Не удалось создать бронирование')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <div className="modal-sheet__handle" />

        {step === 'time' && (
          <>
            <h2 className="modal-sheet__title">{courtName}</h2>
            <p className="modal-sheet__subtitle">{formatDateWithWeekday(dateKey)}</p>
            <p className="modal-sheet__label">Выберите время</p>
            <div className="time-grid">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  disabled={slot.status === 'booked'}
                  className={`time-slot ${slot.status === 'booked' ? 'is-disabled' : ''} ${
                    selectedTime === slot.time ? 'is-selected' : ''
                  }`}
                  onClick={() => setSelectedTime(slot.time)}
                >
                  {slot.time}
                </button>
              ))}
            </div>
            <div className="modal-sheet__actions">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Отмена
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!selectedTime}
                onClick={() => setStep('confirm')}
              >
                Далее
              </button>
            </div>
          </>
        )}

        {step === 'confirm' && selectedTime && (
          <>
            <h2 className="modal-sheet__title">Подтверждение</h2>
            <div className="confirm-summary">
              <div className="confirm-summary__row">
                <span>Корт</span>
                <strong>{courtName}</strong>
              </div>
              <div className="confirm-summary__row">
                <span>Дата</span>
                <strong>{formatDateWithWeekday(dateKey)}</strong>
              </div>
              <div className="confirm-summary__row">
                <span>Время</span>
                <strong>{selectedTime}</strong>
              </div>
            </div>
            {submitError && (
              <StateNotice kind="error" title="Не удалось забронировать" description={submitError} />
            )}
            <div className="modal-sheet__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setStep('time')}
                disabled={isSubmitting}
              >
                Назад
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Бронируем…' : 'Подтвердить'}
              </button>
            </div>
          </>
        )}

        {step === 'success' && selectedTime && (
          <div className="success-step">
            <div className="success-step__icon">✅</div>
            <h2 className="modal-sheet__title">Корт забронирован!</h2>
            <p className="modal-sheet__subtitle">
              {courtName} • {formatDateWithWeekday(dateKey)} • {selectedTime}
            </p>
            <button type="button" className="btn btn--primary" onClick={onClose}>
              Готово
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
