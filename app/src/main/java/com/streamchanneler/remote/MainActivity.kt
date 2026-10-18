package com.streamchanneler.remote

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.KeyEvent
import android.view.ViewConfiguration
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.Toast
import org.mozilla.geckoview.GeckoRuntime
import org.mozilla.geckoview.GeckoSession
import org.mozilla.geckoview.GeckoView
import org.mozilla.geckoview.WebExtension

class MainActivity : Activity(), TabManager.Listener {
    private lateinit var runtime: GeckoRuntime
    private lateinit var geckoView: GeckoView
    private lateinit var prompts: Prompts
    private lateinit var tabs: TabManager
    private lateinit var cursor: Cursor
    private var browserAction: WebExtension.Action? = null
    private var pendingUrl: String? = null
    private var ready = false
    private var backDownTime = 0L
    private var backLongPressed = false

    // TODO: Validate
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        runtime = (application as RemoteApp).runtime

        val root = FrameLayout(this)
        geckoView = GeckoView(this)
        root.addView(geckoView, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))

        cursor = Cursor(this, geckoView)
        root.addView(cursor.view, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        setContentView(root)

        prompts = Prompts(this)
        tabs = TabManager(runtime, prompts, this)
        pendingUrl = intent?.dataString

        runtime.webExtensionController.ensureBuiltIn(EXTENSION_URI, EXTENSION_ID).accept(
            { extension ->
                if (extension != null) attachExtension(extension)
                start()
            },
            { error ->
                Log.e(TAG, "Extension failed to install", error)
                Toast.makeText(this, R.string.extension_failed, Toast.LENGTH_LONG).show()
                start()
            },
        )
    }

    // TODO: Validate
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val url = intent.dataString ?: return
        if (ready) tabs.open(url) else pendingUrl = url
    }

    // TODO: Validate
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (!hasFocus) cursor.reset()
    }

    // TODO: Validate
    override fun onDestroy() {
        if (isFinishing) {
            geckoView.releaseSession()
            tabs.closeAll()
        }
        super.onDestroy()
    }

    // TODO: Validate
    override fun onActiveTabChanged(tab: Tab?) {
        if (tab == null) {
            geckoView.releaseSession()
            if (ready) tabs.open(HOME_URL)
            return
        }
        geckoView.setSession(tab.session)
        geckoView.requestFocus()
    }

    // TODO: Validate
    override fun onPlayingChanged(playing: Boolean) {
        if (playing) {
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    // TODO: Validate
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (cursor.onKey(event)) return true
        val down = event.action == KeyEvent.ACTION_DOWN
        val first = down && event.repeatCount == 0
        when (event.keyCode) {
            KeyEvent.KEYCODE_BACK -> {
                handleBack(event)
                return true
            }

            KeyEvent.KEYCODE_MENU, KeyEvent.KEYCODE_SETTINGS -> {
                if (first) toggleSettings()
                return true
            }

            KeyEvent.KEYCODE_GUIDE -> {
                if (first) tabs.active?.let { it.guideOpen = !it.guideOpen }
                sendKey(event, KeyEvent.KEYCODE_G)
                return true
            }

            KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE,
            KeyEvent.KEYCODE_MEDIA_PLAY,
            KeyEvent.KEYCODE_MEDIA_PAUSE,
            KeyEvent.KEYCODE_MEDIA_FAST_FORWARD,
            KeyEvent.KEYCODE_MEDIA_REWIND,
            -> {
                val tab = tabs.active ?: return super.dispatchKeyEvent(event)
                val media = tab.media ?: return super.dispatchKeyEvent(event)
                if (first) {
                    when (event.keyCode) {
                        KeyEvent.KEYCODE_MEDIA_PLAY -> media.play()
                        KeyEvent.KEYCODE_MEDIA_PAUSE -> media.pause()
                        KeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> media.seekForward()
                        KeyEvent.KEYCODE_MEDIA_REWIND -> media.seekBackward()
                        else -> if (tab.playing) media.pause() else media.play()
                    }
                }
                return true
            }
        }
        return super.dispatchKeyEvent(event)
    }

    // TODO: Validate
    private fun handleBack(event: KeyEvent) {
        if (event.action == KeyEvent.ACTION_DOWN) {
            if (event.repeatCount == 0) {
                backDownTime = event.eventTime
                backLongPressed = false
            } else if (!backLongPressed &&
                event.eventTime - backDownTime >= ViewConfiguration.getLongPressTimeout()
            ) {
                backLongPressed = true
                toggleSettings()
            }
            return
        }
        if (event.action != KeyEvent.ACTION_UP || backLongPressed || event.isCanceled) return
        val tab = tabs.active
        when {
            tab == null -> finish()
            tab.settingsOpen -> {
                tab.settingsOpen = false
                pressEscape()
            }
            tab.guideOpen -> {
                tab.guideOpen = false
                pressEscape()
            }
            tab.fullScreen -> tab.session.exitFullScreen()
            tab.canGoBack -> tab.session.goBack()
            tabs.count > 1 -> tabs.close(tab)
            else -> finish()
        }
    }

    // TODO: Validate
    private fun toggleSettings() {
        val tab = tabs.active ?: return
        if (tab.settingsOpen) {
            tab.settingsOpen = false
            pressEscape()
            return
        }
        val action = browserAction ?: return
        tab.settingsOpen = true
        action.click()
    }

    // TODO: Validate
    private fun pressEscape() {
        sendKey(KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ESCAPE), KeyEvent.KEYCODE_ESCAPE)
        sendKey(KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ESCAPE), KeyEvent.KEYCODE_ESCAPE)
    }

    // TODO: Validate
    private fun sendKey(source: KeyEvent, keyCode: Int) {
        geckoView.dispatchKeyEvent(
            KeyEvent(source.downTime, source.eventTime, source.action, keyCode, source.repeatCount),
        )
    }

    // TODO: Validate
    private fun start() {
        if (ready) return
        ready = true
        tabs.open(pendingUrl ?: HOME_URL)
        pendingUrl = null
    }

    // TODO: Validate
    private fun attachExtension(extension: WebExtension) {
        tabs.attach(extension)
        extension.setActionDelegate(object : WebExtension.ActionDelegate {
            // TODO: Validate
            override fun onBrowserAction(
                extension: WebExtension,
                session: GeckoSession?,
                action: WebExtension.Action,
            ) {
                if (session == null) browserAction = action
            }
        })
    }
}
