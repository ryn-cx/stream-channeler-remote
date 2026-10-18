package com.streamchanneler.remote

import android.app.Application
import android.util.Log
import androidx.annotation.OptIn
import org.mozilla.geckoview.ExperimentalGeckoViewApi
import org.mozilla.geckoview.GeckoPreferenceController
import org.mozilla.geckoview.GeckoRuntime
import org.mozilla.geckoview.GeckoRuntimeSettings

class RemoteApp : Application() {
    val runtime: GeckoRuntime by lazy {
        val runtime = GeckoRuntime.create(
            this,
            GeckoRuntimeSettings.Builder()
                .remoteDebuggingEnabled(BuildConfig.DEBUG)
                .consoleOutput(BuildConfig.DEBUG)
                .aboutConfigEnabled(BuildConfig.DEBUG)
                .build(),
        )
        applyPreferences()
        runtime
    }

    // TODO: Validate
    @OptIn(markerClass = [ExperimentalGeckoViewApi::class])
    private fun applyPreferences() {
        val prefs = mapOf(
            "media.eme.enabled" to true,
            "media.mediadrm-widevinecdm.visible" to true,
            "full-screen-api.allow-trusted-requests-only" to false,
        )
        for ((name, value) in prefs) {
            GeckoPreferenceController
                .setGeckoPref(name, value, GeckoPreferenceController.PREF_BRANCH_USER)
                .exceptionally<Void> { error ->
                    Log.w(TAG, "Could not set $name", error)
                    null
                }
        }
    }
}
