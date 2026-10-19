package com.streamchanneler.remote

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.os.SystemClock
import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import org.mozilla.geckoview.GeckoView

class CursorView(context: Context) : View(context) {
    var posX = 0f
    var posY = 0f

    private val density = resources.displayMetrics.density
    private val arrow = Path().apply {
        moveTo(0f, 0f)
        lineTo(0f, 22f * density)
        lineTo(6f * density, 16.5f * density)
        lineTo(10f * density, 25f * density)
        lineTo(13.5f * density, 23.5f * density)
        lineTo(9.5f * density, 15f * density)
        lineTo(17f * density, 15f * density)
        close()
    }
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        style = Paint.Style.FILL
    }
    private val outline = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.BLACK
        style = Paint.Style.STROKE
        strokeWidth = 1.5f * density
        strokeJoin = Paint.Join.ROUND
    }

    // TODO: Validate
    override fun onDraw(canvas: Canvas) {
        canvas.save()
        canvas.translate(posX, posY)
        canvas.drawPath(arrow, fill)
        canvas.drawPath(arrow, outline)
        canvas.restore()
    }
}

class Cursor(
    context: Context,
    private val target: GeckoView,
) {
    val view = CursorView(context).apply { visibility = View.INVISIBLE }

    private val density = context.resources.displayMetrics.density
    private val minSpeed = 1.5f * density
    private val maxSpeed = 14f * density
    private val acceleration = 0.25f * density
    private val held = mutableSetOf<Int>()
    private var speed = minSpeed
    private var pressing = false
    private var pressDownTime = 0L
    private var centered = false

    private val hide = Runnable { view.visibility = View.INVISIBLE }
    private val frame = object : Runnable {
        // TODO: Validate
        override fun run() {
            if (held.isEmpty()) return
            step()
            view.postOnAnimation(this)
        }
    }

    // TODO: Validate
    fun onKey(event: KeyEvent): Boolean {
        val code = event.keyCode
        when (code) {
            KeyEvent.KEYCODE_DPAD_UP,
            KeyEvent.KEYCODE_DPAD_DOWN,
            KeyEvent.KEYCODE_DPAD_LEFT,
            KeyEvent.KEYCODE_DPAD_RIGHT,
            -> {
                if (event.action == KeyEvent.ACTION_DOWN) {
                    if (held.isEmpty()) {
                        speed = minSpeed
                        held.add(code)
                        show()
                        step()
                        view.postOnAnimation(frame)
                    } else {
                        held.add(code)
                    }
                } else if (event.action == KeyEvent.ACTION_UP) {
                    held.remove(code)
                }
                return true
            }

            KeyEvent.KEYCODE_DPAD_CENTER, KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_NUMPAD_ENTER -> {
                if (code != KeyEvent.KEYCODE_DPAD_CENTER &&
                    event.device?.keyboardType == InputDevice.KEYBOARD_TYPE_ALPHABETIC
                ) {
                    return false
                }
                if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0) press()
                if (event.action == KeyEvent.ACTION_UP) release()
                return true
            }
        }
        return false
    }

    // TODO: Validate
    fun reset() {
        held.clear()
        if (pressing) release()
    }

    // TODO: Validate
    private fun show() {
        if (!centered && view.width > 0) {
            view.posX = view.width / 2f
            view.posY = view.height / 2f
            centered = true
        }
        view.visibility = View.VISIBLE
        view.invalidate()
        view.removeCallbacks(hide)
        view.postDelayed(hide, HIDE_DELAY_MS)
    }

    // TODO: Validate
    private fun step() {
        val dx = direction(KeyEvent.KEYCODE_DPAD_RIGHT, KeyEvent.KEYCODE_DPAD_LEFT)
        val dy = direction(KeyEvent.KEYCODE_DPAD_DOWN, KeyEvent.KEYCODE_DPAD_UP)
        speed = (speed + acceleration).coerceAtMost(maxSpeed)
        val maxX = (view.width - 1).toFloat()
        val maxY = (view.height - 1).toFloat()
        val wantX = view.posX + dx * speed
        val wantY = view.posY + dy * speed
        view.posX = wantX.coerceIn(0f, maxX)
        view.posY = wantY.coerceIn(0f, maxY)
        show()

        val overflowX = if (wantX != view.posX) dx else 0f
        val overflowY = if (wantY != view.posY) dy else 0f
        if (pressing) {
            dispatchTouch(target, MotionEvent.ACTION_MOVE)
        } else if (overflowX != 0f || overflowY != 0f) {
            val amount = speed / maxSpeed * SCROLL_PER_FRAME
            dispatchPointer(target, MotionEvent.ACTION_SCROLL, overflowX * amount, -overflowY * amount)
        } else {
            dispatchPointer(target, MotionEvent.ACTION_HOVER_MOVE, 0f, 0f)
        }
    }

    // TODO: Validate
    private fun direction(positive: Int, negative: Int): Float =
        (if (positive in held) 1f else 0f) - (if (negative in held) 1f else 0f)

    // TODO: Validate
    private fun press() {
        show()
        pressing = true
        pressDownTime = SystemClock.uptimeMillis()
        dispatchTouch(target, MotionEvent.ACTION_DOWN)
    }

    // TODO: Validate
    private fun release() {
        if (!pressing) return
        dispatchTouch(target, MotionEvent.ACTION_UP)
        pressing = false
    }

    // TODO: Validate
    private fun dispatchTouch(target: GeckoView, action: Int) {
        val event = obtain(
            target,
            action,
            pressDownTime,
            MotionEvent.TOOL_TYPE_FINGER,
            InputDevice.SOURCE_TOUCHSCREEN,
            0f,
            0f,
        )
        target.dispatchTouchEvent(event)
        event.recycle()
    }

    // TODO: Validate
    private fun dispatchPointer(target: GeckoView, action: Int, hScroll: Float, vScroll: Float) {
        val event = obtain(
            target,
            action,
            SystemClock.uptimeMillis(),
            MotionEvent.TOOL_TYPE_MOUSE,
            InputDevice.SOURCE_MOUSE,
            hScroll,
            vScroll,
        )
        target.session?.panZoomController?.onMotionEvent(event)
        event.recycle()
    }

    // TODO: Validate
    private fun obtain(
        target: GeckoView,
        action: Int,
        downTime: Long,
        toolType: Int,
        source: Int,
        hScroll: Float,
        vScroll: Float,
    ): MotionEvent {
        val cursorLocation = IntArray(2).also { view.getLocationInWindow(it) }
        val targetLocation = IntArray(2).also { target.getLocationInWindow(it) }
        val properties = MotionEvent.PointerProperties().apply {
            id = 0
            this.toolType = toolType
        }
        val coords = MotionEvent.PointerCoords().apply {
            x = view.posX + cursorLocation[0] - targetLocation[0]
            y = view.posY + cursorLocation[1] - targetLocation[1]
            pressure = 1f
            size = 1f
            setAxisValue(MotionEvent.AXIS_HSCROLL, hScroll)
            setAxisValue(MotionEvent.AXIS_VSCROLL, vScroll)
        }
        return MotionEvent.obtain(
            downTime,
            SystemClock.uptimeMillis(),
            action,
            1,
            arrayOf(properties),
            arrayOf(coords),
            0,
            0,
            1f,
            1f,
            0,
            0,
            source,
            0,
        )
    }

    private companion object {
        const val HIDE_DELAY_MS = 5000L
        const val SCROLL_PER_FRAME = 0.35f
    }
}
