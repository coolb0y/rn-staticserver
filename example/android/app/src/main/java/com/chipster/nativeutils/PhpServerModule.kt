package com.chipster.nativeutils

import android.content.Context
import android.util.Log
import com.facebook.react.bridge.*
import java.io.File

class PhpServerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var phpProcess: Process? = null
    private val context: Context = reactContext

    override fun getName(): String {
        return "PhpServer"
    }

    @ReactMethod
    fun startPhpServer(promise: Promise) {
        try {
            val phpBinary = BinaryUtils.copyAssetBinary(context, "php/php-cgi", "php-cgi")

            val command = listOf(
                phpBinary.absolutePath,
                "-b", "127.0.0.1:9000"
            )

            val processBuilder = ProcessBuilder(command)
                .directory(context.filesDir)
                .redirectErrorStream(true)

            phpProcess = processBuilder.start()

            // Log process output
            Thread {
                phpProcess?.inputStream?.bufferedReader()?.useLines { lines ->
                    lines.forEach { Log.d("PHP-CGI", it) }
                }
            }.start()

            promise.resolve("PHP server started")
        } catch (e: Exception) {
            promise.reject("PHP_START_FAILED", e)
        }
    }

    @ReactMethod
    fun stopPhpServer(promise: Promise) {
        try {
            phpProcess?.destroy()
            phpProcess = null
            promise.resolve("PHP server stopped")
        } catch (e: Exception) {
            promise.reject("PHP_STOP_FAILED", e)
        }
    }
}
