package com.example.starvingmiracle

import android.Manifest
import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.*
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.updatePadding

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    // Connects to production Vercel deployment
    private val appUrl = "https://dnd-campaign-notes-hub.vercel.app"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Request audio recording permissions if not granted
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), 101)
        }

        // Wrap WebView in a dark container that respects Android Window Insets (status bar & gesture bar)
        val rootLayout = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#0e1117"))
        }

        webView = WebView(this)
        rootLayout.addView(
            webView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        setContentView(rootLayout)

        // Apply safe-area insets to prevent status bar clock & gesture navigation bar from overlapping web content
        ViewCompat.setOnApplyWindowInsetsListener(rootLayout) { view, insets ->
            val systemBars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            view.updatePadding(
                left = systemBars.left,
                top = systemBars.top,
                right = systemBars.right,
                bottom = systemBars.bottom
            )
            insets
        }

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = true
            allowContentAccess = true
            loadWithOverviewMode = true
            useWideViewPort = true
            cacheMode = WebSettings.LOAD_DEFAULT
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: ""
                // Open external links (e.g. 5e.tools) in external system browser
                if (url.contains("5e.tools") || (!url.contains("localhost") && !url.contains("10.70.70.28") && !url.contains("vercel.app") && !url.contains("android_asset"))) {
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    startActivity(intent)
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
            // Automatically grant web audio recording permissions for Audio Scribe
            override fun onPermissionRequest(request: PermissionRequest?) {
                request?.grant(request.resources)
            }
        }

        // Handle Android Back button with multi-tier hierarchy & recording-aware exit confirmation
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
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

        webView.loadUrl(appUrl)
    }

    private fun showExitDialog(isRecording: Boolean) {
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
