// A tooltip that works with a mouse, with the keyboard, and with a finger.
// The mouse opens it on hover, the keyboard on focus, and a tap opens it and closes it.
//
// The box of the tooltip is a child of <body>, not of its button. A card of the page can have
// a transform (for its entry animation), and a fixed box inside such a card gets a wrong place.
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './tip.css'

const WIDTH = 320
const EDGE = 12

// Puts a box of this height near a point of the window, and keeps it inside the window.
function place(x: number, top: number, bottom: number, height: number): CSSProperties {
  const width = Math.min(WIDTH, window.innerWidth - 2 * EDGE)
  const left = Math.min(Math.max(EDGE, x - width / 2), window.innerWidth - width - EDGE)
  // Below the point if there is room. If not, above it.
  const below = bottom + 10 + height <= window.innerHeight - EDGE
  return { left, width, top: below ? bottom + 10 : Math.max(EDGE, top - 10 - height) }
}

type TipProps = {
  // The text of the tooltip.
  tip: ReactNode
  // What the person sees and touches.
  children: ReactNode
  // The name of the button for a screen reader, if the content is not text.
  label?: string
  className?: string
}

export function Tip({ tip, children, label, className = '' }: TipProps) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' })
  const button = useRef<HTMLButtonElement>(null)
  const box = useRef<HTMLSpanElement>(null)
  const id = useId()
  // The mouse needs a moment to move from the button to the tooltip, for example to a link in it.
  const leave = useRef<number | undefined>(undefined)
  const enter = () => {
    window.clearTimeout(leave.current)
    setOpen(true)
  }
  const exit = () => {
    leave.current = window.setTimeout(() => setOpen(false), 180)
  }
  useEffect(() => () => window.clearTimeout(leave.current), [])

  const move = useCallback(() => {
    if (!button.current || !box.current) return
    const at = button.current.getBoundingClientRect()
    setStyle(place(at.left + at.width / 2, at.top, at.bottom, box.current.offsetHeight))
  }, [])
  useLayoutEffect(() => {
    if (open) move()
  }, [open, move])

  // A tap outside or the Escape key closes the tooltip. It follows its button when the page scrolls.
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const outside = (event: PointerEvent) => {
      if (!button.current?.contains(event.target as Node) && !box.current?.contains(event.target as Node)) close()
    }
    const key = (event: KeyboardEvent) => event.key === 'Escape' && close()
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', key)
    window.addEventListener('scroll', move, { passive: true })
    window.addEventListener('resize', move)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('keydown', key)
      window.removeEventListener('scroll', move)
      window.removeEventListener('resize', move)
    }
  }, [open, move])

  // The keyboard focus left the button and the tooltip. A tap on a link inside the tooltip keeps it open.
  const blur = (target: EventTarget | null) => {
    if (target instanceof Node && !button.current?.contains(target) && !box.current?.contains(target)) setOpen(false)
  }

  return (
    <span className="tip-wrap" onMouseEnter={enter} onMouseLeave={exit} onBlur={(event) => blur(event.relatedTarget)}>
      <button
        type="button"
        ref={button}
        className={`tip-button ${className}`}
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen((current) => !current)}
      >
        {children}
      </button>
      {open &&
        createPortal(
          <span ref={box} id={id} role="tooltip" className="tip-box" style={style} onMouseEnter={enter} onMouseLeave={exit}>
            {tip}
          </span>,
          document.body,
        )}
    </span>
  )
}

// A tooltip with no button of its own, for the body figure. It shows near a point of the window,
// or inside its parent when "point" is absent (a tap or the keyboard selected the region).
export function FloatingTip({ point, children }: { point?: { x: number; y: number }; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' })
  const x = point?.x
  const y = point?.y
  useLayoutEffect(() => {
    if (x === undefined || y === undefined || !box.current) return
    setStyle(place(x, y - 8, y + 14, box.current.offsetHeight))
  }, [x, y, children])
  if (!point) return <div role="tooltip" className="tip-box tip-docked">{children}</div>
  return createPortal(
    <div ref={box} role="tooltip" className="tip-box tip-floating" style={style}>
      {children}
    </div>,
    document.body,
  )
}
