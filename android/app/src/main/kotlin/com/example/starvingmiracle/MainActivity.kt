package com.example.starvingmiracle

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.ColorStateList
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.*
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var pendingPermissionRequest: PermissionRequest? = null

    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            val callback = filePathCallback ?: return@registerForActivityResult
            filePathCallback = null
            val uris: Array<Uri>? = if (result.resultCode == RESULT_OK) {
                val data = result.data
                val clip = data?.clipData
                if (clip != null && clip.itemCount > 0) {
                    Array(clip.itemCount) { idx -> clip.getItemAt(idx).uri }
                } else {
                    WebChromeClient.FileChooserParams.parseResult(result.resultCode, data)
                }
            } else {
                null
            }
            callback.onReceiveValue(uris)
        }

    private val requestAudioPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            val req = pendingPermissionRequest ?: return@registerForActivityResult
            pendingPermissionRequest = null
            if (granted) {
                req.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
            } else {
                req.deny()
                Toast.makeText(
                    this,
                    "Microphone permission is required for Audio Scribe.",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }

    private inner class AndroidBridge {
        @JavascriptInterface
        fun setKeepScreenOn(enabled: Boolean) {
            runOnUiThread {
                if (isFinishing || isDestroyed || !::webView.isInitialized) return@runOnUiThread
                if (!WebViewPolicy.isTrustedAppUrl(webView.url)) return@runOnUiThread
                if (enabled) {
                    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                } else {
                    window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        val obsidianBg = Color.parseColor("#0e1117")
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(obsidianBg),
            navigationBarStyle = SystemBarStyle.dark(obsidianBg)
        )
        super.onCreate(savedInstanceState)

        // Wrap WebView in a dark container that respects system bars, notch cutout, and soft keyboard (IME)
        val rootLayout = FrameLayout(this).apply {
            setBackgroundColor(obsidianBg)
        }

        webView = WebView(this).apply {
            overScrollMode = View.OVER_SCROLL_NEVER
        }
        rootLayout.addView(
            webView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )

        val progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 100
            progress = 0
            progressTintList = ColorStateList.valueOf(Color.parseColor("#f59e0b"))
            progressBackgroundTintList = ColorStateList.valueOf(Color.parseColor("#1e2433"))
            visibility = View.VISIBLE
        }
        val density = resources.displayMetrics.density
        rootLayout.addView(
            progressBar,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                (3 * density).toInt(),
                Gravity.TOP
            )
        )
        setContentView(rootLayout)

        // Apply safe-area + IME insets so status bar, gesture bar, and soft keyboard never overlap editors
        ViewCompat.setOnApplyWindowInsetsListener(rootLayout) { view, insets ->
            val systemBars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            view.updatePadding(
                left = systemBars.left,
                top = systemBars.top,
                right = systemBars.right,
                bottom = maxOf(systemBars.bottom, ime.bottom)
            )
            insets
        }
        ViewCompat.requestApplyInsets(rootLayout)

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, false)
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            setSupportMultipleWindows(false)
            loadWithOverviewMode = true
            useWideViewPort = true
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        webView.addJavascriptInterface(AndroidBridge(), "AndroidBridge")

        webView.setDownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
            if (url.isNullOrBlank()) return@setDownloadListener
            val filename = WebViewPolicy.sanitizeDownloadFilename(
                URLUtil.guessFileName(url, contentDisposition, mimeType)
            )
            try {
                val uri = Uri.parse(url)
                if (uri.scheme.equals("http", ignoreCase = true) ||
                    uri.scheme.equals("https", ignoreCase = true)
                ) {
                    val request = DownloadManager.Request(uri).apply {
                        if (!mimeType.isNullOrBlank()) setMimeType(mimeType)
                        val cookies = CookieManager.getInstance().getCookie(url)
                        if (!cookies.isNullOrEmpty()) {
                            addRequestHeader("Cookie", cookies)
                        }
                        if (!userAgent.isNullOrBlank()) {
                            addRequestHeader("User-Agent", userAgent)
                        }
                        setTitle(filename)
                        setDescription("Downloading $filename")
                        setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                        setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename)
                    }
                    val dm = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                    dm.enqueue(request)
                    Toast.makeText(this, "Downloading $filename to Downloads...", Toast.LENGTH_SHORT).show()
                } else {
                    openExternalUrl(url)
                }
            } catch (_: Exception) {
                openExternalUrl(url)
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString()
                if (WebViewPolicy.shouldOpenExternally(url)) {
                    openExternalUrl(url!!)
                    return true
                }
                return false
            }

            // Graceful reconnect screen on network failure or server update
            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    view?.loadUrl("file:///android_asset/offline.html")
                }
            }

            // Handle 502/503/504 deployment window errors gracefully
            override fun onReceivedHttpError(view: WebView?, request: WebResourceRequest?, errorResponse: WebResourceResponse?) {
                super.onReceivedHttpError(view, request, errorResponse)
                val status = errorResponse?.statusCode ?: 200
                if (request?.isForMainFrame == true && (status == 502 || status == 503 || status == 504)) {
                    view?.loadUrl("file:///android_asset/offline.html")
                }
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                super.onProgressChanged(view, newProgress)
                if (newProgress >= 100) {
                    progressBar.visibility = View.GONE
                } else {
                    if (progressBar.visibility != View.VISIBLE) {
                        progressBar.visibility = View.VISIBLE
                    }
                    progressBar.progress = newProgress
                }
            }

            override fun onShowFileChooser(
                webView: WebView?,
                callback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = callback
                val intent = try {
                    fileChooserParams?.createIntent()
                        ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                            addCategory(Intent.CATEGORY_OPENABLE)
                            type = "*/*"
                        }
                } catch (_: Exception) {
                    Intent(Intent.ACTION_GET_CONTENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                    }
                }
                return try {
                    fileChooserLauncher.launch(intent)
                    true
                } catch (_: ActivityNotFoundException) {
                    this@MainActivity.filePathCallback?.onReceiveValue(null)
                    this@MainActivity.filePathCallback = null
                    Toast.makeText(
                        this@MainActivity,
                        "No file picker app available.",
                        Toast.LENGTH_SHORT
                    ).show()
                    false
                }
            }

            // Grant web audio capture only to the exact production origin after OS permission check
            override fun onPermissionRequest(request: PermissionRequest?) {
                if (request == null) return
                val origin = request.origin
                val wantsAudio = request.resources?.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE) == true
                if (!wantsAudio || !WebViewPolicy.isTrustedOriginHost(origin?.scheme, origin?.host)) {
                    request.deny()
                    return
                }

                pendingPermissionRequest?.deny()
                pendingPermissionRequest = null

                if (ContextCompat.checkSelfPermission(
                        this@MainActivity,
                        Manifest.permission.RECORD_AUDIO
                    ) == PackageManager.PERMISSION_GRANTED
                ) {
                    request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                } else {
                    pendingPermissionRequest = request
                    requestAudioPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                }
            }
        }

        // Handle Android Back button with multi-tier hierarchy & recording-aware exit confirmation
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.url?.startsWith("file:///android_asset/") == true) {
                    showExitDialog(false)
                    return
                }
                // First query web app: let it close open modals, drawers, or switch back to Home tab
                webView.evaluateJavascript("window.__handleAndroidBack ? window.__handleAndroidBack() : false") { result ->
                    val handled = result?.replace("\"", "")?.trim()?.equals("true", ignoreCase = true) == true
                    if (!handled) {
                        // At root Home: check if session recording is active before showing confirmation
                        webView.evaluateJavascript("window.__isAudioRecording ? window.__isAudioRecording() : false") { recResult ->
                            val isRecording = recResult?.replace("\"", "")?.trim()?.equals("true", ignoreCase = true) == true
                            showExitDialog(isRecording)
                        }
                    }
                }
            }
        })

        webView.loadUrl(WebViewPolicy.PRODUCTION_URL)
    }

    override fun onResume() {
        super.onResume()
        if (::webView.isInitialized) {
            webView.onResume()
        }
    }

    override fun onPause() {
        CookieManager.getInstance().flush()
        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        if (::webView.isInitialized) {
            webView.onPause()
        }
        super.onPause()
    }

    override fun onDestroy() {
        pendingPermissionRequest?.deny()
        pendingPermissionRequest = null
        filePathCallback?.onReceiveValue(null)
        filePathCallback = null
        if (::webView.isInitialized) {
            (webView.parent as? ViewGroup)?.removeView(webView)
            webView.stopLoading()
            webView.destroy()
        }
        super.onDestroy()
    }

    private fun openExternalUrl(url: String) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(this, "No app installed to open this link.", Toast.LENGTH_SHORT).show()
        } catch (_: Exception) {
            Toast.makeText(this, "Could not open external link.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun showExitDialog(isRecording: Boolean) {
        if (isFinishing || isDestroyed) return

        val title = if (isRecording) "⚠️ Live Session Recording Active" else "Exit D&D Campaign Notes?"
        val message = if (isRecording) {
            "An audio session recording is currently active!\n\nExiting now will stop and discard your recording.\n\nAre you sure you want to stop recording and exit?"
        } else {
            "Are you sure you want to close the campaign companion?"
        }
        val positiveText = if (isRecording) "Stop & Exit" else "Exit"
        val negativeText = if (isRecording) "Keep Recording" else "Cancel"

        AlertDialog.Builder(this, android.R.style.Theme_DeviceDefault_Dialog_Alert)
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton(positiveText) { _, _ ->
                finish()
            }
            .setNegativeButton(negativeText, null)
            .show()
    }
}
