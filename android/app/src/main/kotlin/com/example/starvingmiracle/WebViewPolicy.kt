package com.example.starvingmiracle

import java.net.URI

/**
 * Pure URL, origin, and filename validation policy for the Android WebView shell.
 * Kept free of Android framework dependencies so it can be unit-tested on the JVM.
 */
object WebViewPolicy {
    const val PRODUCTION_HOST = "dnd-campaign-notes-hub.vercel.app"
    const val PRODUCTION_URL = "https://$PRODUCTION_HOST"

    private val EXTERNAL_SCHEMES = setOf("http", "https", "mailto", "tel")

    /**
     * Returns true only when [url] belongs to the exact production HTTPS origin
     * or a bundled asset under `file:///android_asset/`.
     */
    fun isTrustedAppUrl(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        val uri = try {
            URI(url.trim())
        } catch (_: Exception) {
            return false
        }

        val scheme = uri.scheme?.lowercase() ?: return false
        if (scheme == "https") {
            return uri.host.equals(PRODUCTION_HOST, ignoreCase = true)
        }
        if (scheme == "file") {
            val path = uri.path ?: return false
            return path.startsWith("/android_asset/")
        }
        return false
    }

    /**
     * Returns true only when a WebView PermissionRequest origin matches the exact
     * production HTTPS host.
     */
    fun isTrustedOriginHost(scheme: String?, host: String?): Boolean {
        return scheme.equals("https", ignoreCase = true) &&
            host.equals(PRODUCTION_HOST, ignoreCase = true)
    }

    /**
     * Returns true when navigation should be handed off to an external Android Activity
     * (standard external http/https/mailto/tel links outside the production host).
     */
    fun shouldOpenExternally(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        if (isTrustedAppUrl(url)) return false
        val uri = try {
            URI(url.trim())
        } catch (_: Exception) {
            return false
        }
        val scheme = uri.scheme?.lowercase() ?: return false
        return scheme in EXTERNAL_SCHEMES
    }

    /**
     * Sanitizes a Content-Disposition / URL-guessed filename before passing to DownloadManager.
     */
    fun sanitizeDownloadFilename(
        suggested: String?,
        fallback: String = "campaign-export.zip"
    ): String {
        val raw = suggested.orEmpty()
        val basename = raw.substringAfterLast('/').substringAfterLast('\\')
        val cleaned = buildString(basename.length) {
            for (ch in basename) {
                if (ch.code >= 32 && ch != '\u007f' && ch != ':' && ch != '*' && ch != '?' && ch != '"' && ch != '<' && ch != '>' && ch != '|') {
                    append(ch)
                }
            }
        }.trim().trimStart('.')

        return cleaned.ifBlank { fallback }
    }
}
