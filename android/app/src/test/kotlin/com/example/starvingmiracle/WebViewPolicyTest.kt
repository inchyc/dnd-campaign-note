package com.example.starvingmiracle

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class WebViewPolicyTest {

    @Test
    fun isTrustedAppUrl_acceptsExactProductionHttpsAndBundledAssets() {
        assertTrue(WebViewPolicy.isTrustedAppUrl("https://dnd-campaign-notes-hub.vercel.app"))
        assertTrue(WebViewPolicy.isTrustedAppUrl("https://dnd-campaign-notes-hub.vercel.app/api/vault/export"))
        assertTrue(WebViewPolicy.isTrustedAppUrl("https://DND-CAMPAIGN-NOTES-HUB.vercel.app/?session=1"))
        assertTrue(WebViewPolicy.isTrustedAppUrl("file:///android_asset/offline.html"))
    }

    @Test
    fun isTrustedAppUrl_rejectsSpoofedSubstringsHttpAndArbitraryFiles() {
        assertFalse(WebViewPolicy.isTrustedAppUrl(null))
        assertFalse(WebViewPolicy.isTrustedAppUrl(""))
        assertFalse(WebViewPolicy.isTrustedAppUrl("http://dnd-campaign-notes-hub.vercel.app"))
        assertFalse(WebViewPolicy.isTrustedAppUrl("https://evil.com/?next=vercel.app"))
        assertFalse(WebViewPolicy.isTrustedAppUrl("https://evil-vercel.app/phish"))
        assertFalse(WebViewPolicy.isTrustedAppUrl("https://dnd-campaign-notes-hub.vercel.app.evil.com"))
        assertFalse(WebViewPolicy.isTrustedAppUrl("https://dnd-campaign-notes-hub.vercel.app@evil.com"))
        assertFalse(WebViewPolicy.isTrustedAppUrl("file:///data/data/com.starvingmiracle.app/shared_prefs/secret.xml"))
    }

    @Test
    fun isTrustedOriginHost_enforcesHttpsAndExactHost() {
        assertTrue(WebViewPolicy.isTrustedOriginHost("https", "dnd-campaign-notes-hub.vercel.app"))
        assertTrue(WebViewPolicy.isTrustedOriginHost("HTTPS", "DND-CAMPAIGN-NOTES-HUB.vercel.app"))
        assertFalse(WebViewPolicy.isTrustedOriginHost("http", "dnd-campaign-notes-hub.vercel.app"))
        assertFalse(WebViewPolicy.isTrustedOriginHost("https", "other.vercel.app"))
        assertFalse(WebViewPolicy.isTrustedOriginHost(null, "dnd-campaign-notes-hub.vercel.app"))
    }

    @Test
    fun shouldOpenExternally_handlesExternalVsInternalAndSpecialSchemes() {
        assertFalse(WebViewPolicy.shouldOpenExternally("https://dnd-campaign-notes-hub.vercel.app/notes"))
        assertFalse(WebViewPolicy.shouldOpenExternally("file:///android_asset/offline.html"))
        assertFalse(WebViewPolicy.shouldOpenExternally("about:blank"))
        assertFalse(WebViewPolicy.shouldOpenExternally("javascript:void(0)"))
        assertFalse(WebViewPolicy.shouldOpenExternally("blob:https://dnd-campaign-notes-hub.vercel.app/123"))

        assertTrue(WebViewPolicy.shouldOpenExternally("https://5e.tools/spells.html"))
        assertTrue(WebViewPolicy.shouldOpenExternally("https://github.com/inchyc/dnd-campaign-note/raw/main/release/D&D-Campaign-Notes.apk"))
        assertTrue(WebViewPolicy.shouldOpenExternally("https://evil.com/?vercel.app"))
        assertTrue(WebViewPolicy.shouldOpenExternally("mailto:scribe@example.com"))
        assertTrue(WebViewPolicy.shouldOpenExternally("tel:+61400000000"))
    }

    @Test
    fun sanitizeDownloadFilename_stripsTraversalAndInvalidChars() {
        assertEquals("starving-vilgeismar-obsidian-vault.zip", WebViewPolicy.sanitizeDownloadFilename("starving-vilgeismar-obsidian-vault.zip"))
        assertEquals("passwd", WebViewPolicy.sanitizeDownloadFilename("../../../../etc/passwd"))
        assertEquals("secret.zip", WebViewPolicy.sanitizeDownloadFilename("..\\.\\secret.zip"))
        assertEquals("campaign-export.zip", WebViewPolicy.sanitizeDownloadFilename("..."))
        assertEquals("campaign-export.zip", WebViewPolicy.sanitizeDownloadFilename(null))
    }
}
