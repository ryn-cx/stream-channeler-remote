package com.streamchanneler.remote

import org.mozilla.geckoview.AllowOrDeny
import org.mozilla.geckoview.GeckoResult
import org.mozilla.geckoview.GeckoRuntime
import org.mozilla.geckoview.GeckoSession
import org.mozilla.geckoview.GeckoSession.PermissionDelegate.ContentPermission
import org.mozilla.geckoview.GeckoSessionSettings
import org.mozilla.geckoview.MediaSession
import org.mozilla.geckoview.WebExtension

class Tab(val session: GeckoSession) {
    var url: String? = null
    var canGoBack = false
    var fullScreen = false
    var guideOpen = false
    var settingsOpen = false
    var media: MediaSession? = null
    var playing = false
}

class TabManager(
    private val runtime: GeckoRuntime,
    private val prompts: GeckoSession.PromptDelegate,
    private val listener: Listener,
) {
    interface Listener {
        // TODO: Validate
        fun onActiveTabChanged(tab: Tab?)
        // TODO: Validate
        fun onPlayingChanged(playing: Boolean)
    }

    private val tabs = mutableListOf<Tab>()
    private var extension: WebExtension? = null

    var active: Tab? = null
        private set

    val count: Int
        get() = tabs.size

    // TODO: Validate
    fun attach(extension: WebExtension) {
        this.extension = extension
        extension.setTabDelegate(object : WebExtension.TabDelegate {
            // TODO: Validate
            override fun onNewTab(
                source: WebExtension,
                createDetails: WebExtension.CreateTabDetails,
            ): GeckoResult<GeckoSession> {
                val tab = add(createSession(), createDetails.active != false)
                return GeckoResult.fromValue(tab.session)
            }
        })
        tabs.forEach { bindExtension(it) }
    }

    // TODO: Validate
    fun open(url: String): Tab {
        val session = createSession()
        session.open(runtime)
        val tab = add(session, true)
        session.loadUri(url)
        return tab
    }

    // TODO: Validate
    fun select(tab: Tab) {
        val previous = active
        if (previous === tab) return
        previous?.let {
            it.session.setActive(false)
            runtime.webExtensionController.setTabActive(it.session, false)
        }
        active = tab
        tab.session.setActive(true)
        runtime.webExtensionController.setTabActive(tab.session, true)
        listener.onActiveTabChanged(tab)
        listener.onPlayingChanged(tab.playing)
    }

    // TODO: Validate
    fun close(tab: Tab) {
        val index = tabs.indexOf(tab)
        if (index < 0) return
        tabs.removeAt(index)
        if (active === tab) {
            active = null
            val next = tabs.getOrNull(index - 1) ?: tabs.lastOrNull()
            if (next != null) select(next) else listener.onActiveTabChanged(null)
        }
        tab.session.close()
    }

    // TODO: Validate
    fun closeAll() {
        tabs.forEach { it.session.close() }
        tabs.clear()
        active = null
    }

    // TODO: Validate
    private fun add(session: GeckoSession, select: Boolean): Tab {
        val tab = Tab(session)
        tabs.add(tab)
        bindDelegates(tab)
        bindExtension(tab)
        if (select || active == null) select(tab)
        return tab
    }

    // TODO: Validate
    private fun createSession(): GeckoSession = GeckoSession(
        GeckoSessionSettings.Builder()
            .userAgentMode(GeckoSessionSettings.USER_AGENT_MODE_DESKTOP)
            .viewportMode(GeckoSessionSettings.VIEWPORT_MODE_DESKTOP)
            .build(),
    )

    // TODO: Validate
    private fun bindExtension(tab: Tab) {
        val extension = extension ?: return
        tab.session.webExtensionController.setTabDelegate(
            extension,
            object : WebExtension.SessionTabDelegate {
                // TODO: Validate
                override fun onUpdateTab(
                    extension: WebExtension,
                    session: GeckoSession,
                    details: WebExtension.UpdateTabDetails,
                ): GeckoResult<AllowOrDeny> {
                    if (details.active == true) tabs.firstOrNull { it.session === session }?.let { select(it) }
                    return GeckoResult.allow()
                }

                // TODO: Validate
                override fun onCloseTab(
                    source: WebExtension?,
                    session: GeckoSession,
                ): GeckoResult<AllowOrDeny> {
                    tabs.firstOrNull { it.session === session }?.let { close(it) }
                    return GeckoResult.allow()
                }
            },
        )
    }

    // TODO: Validate
    private fun bindDelegates(tab: Tab) {
        val session = tab.session
        session.promptDelegate = prompts

        session.navigationDelegate = object : GeckoSession.NavigationDelegate {
            // TODO: Validate
            override fun onLocationChange(
                session: GeckoSession,
                url: String?,
                perms: MutableList<ContentPermission>,
                hasUserGesture: Boolean,
            ) {
                tab.url = url
                tab.guideOpen = url?.substringAfter('#', "") == "guide"
                tab.settingsOpen = false
            }

            // TODO: Validate
            override fun onCanGoBack(session: GeckoSession, canGoBack: Boolean) {
                tab.canGoBack = canGoBack
            }

            // TODO: Validate
            override fun onNewSession(session: GeckoSession, uri: String): GeckoResult<GeckoSession> =
                GeckoResult.fromValue(add(createSession(), true).session)
        }

        session.contentDelegate = object : GeckoSession.ContentDelegate {
            // TODO: Validate
            override fun onCloseRequest(session: GeckoSession) {
                close(tab)
            }

            // TODO: Validate
            override fun onFullScreen(session: GeckoSession, fullScreen: Boolean) {
                tab.fullScreen = fullScreen
            }

            // TODO: Validate
            override fun onCrash(session: GeckoSession) {
                replace(tab)
            }

            // TODO: Validate
            override fun onKill(session: GeckoSession) {
                replace(tab)
            }
        }

        session.permissionDelegate = object : GeckoSession.PermissionDelegate {
            // TODO: Validate
            override fun onContentPermissionRequest(
                session: GeckoSession,
                perm: ContentPermission,
            ): GeckoResult<Int> = GeckoResult.fromValue(
                when (perm.permission) {
                    GeckoSession.PermissionDelegate.PERMISSION_MEDIA_KEY_SYSTEM_ACCESS,
                    GeckoSession.PermissionDelegate.PERMISSION_AUTOPLAY_AUDIBLE,
                    GeckoSession.PermissionDelegate.PERMISSION_AUTOPLAY_INAUDIBLE,
                    GeckoSession.PermissionDelegate.PERMISSION_PERSISTENT_STORAGE,
                    GeckoSession.PermissionDelegate.PERMISSION_STORAGE_ACCESS,
                    -> ContentPermission.VALUE_ALLOW
                    else -> ContentPermission.VALUE_DENY
                },
            )
        }

        session.mediaSessionDelegate = object : MediaSession.Delegate {
            // TODO: Validate
            override fun onActivated(session: GeckoSession, mediaSession: MediaSession) {
                tab.media = mediaSession
            }

            // TODO: Validate
            override fun onDeactivated(session: GeckoSession, mediaSession: MediaSession) {
                if (tab.media === mediaSession) tab.media = null
                setPlaying(tab, false)
            }

            // TODO: Validate
            override fun onPlay(session: GeckoSession, mediaSession: MediaSession) {
                setPlaying(tab, true)
            }

            // TODO: Validate
            override fun onPause(session: GeckoSession, mediaSession: MediaSession) {
                setPlaying(tab, false)
            }

            // TODO: Validate
            override fun onStop(session: GeckoSession, mediaSession: MediaSession) {
                setPlaying(tab, false)
            }
        }
    }

    // TODO: Validate
    private fun setPlaying(tab: Tab, playing: Boolean) {
        tab.playing = playing
        if (tab === active) listener.onPlayingChanged(playing)
    }

    // TODO: Validate
    private fun replace(tab: Tab) {
        val url = tab.url
        val wasActive = tab === active
        val index = tabs.indexOf(tab)
        if (index < 0) return
        val session = createSession()
        session.open(runtime)
        val replacement = Tab(session)
        tabs[index] = replacement
        bindDelegates(replacement)
        bindExtension(replacement)
        if (wasActive) {
            active = null
            select(replacement)
        }
        tab.session.close()
        session.loadUri(url ?: HOME_URL)
    }
}
