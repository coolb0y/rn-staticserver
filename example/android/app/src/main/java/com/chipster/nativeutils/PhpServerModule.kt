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
        //val spawnFcgi = BinaryUtils.copyAssetBinary(context, "php/spawn-fcgi", "spawn-fcgi")
        val socketPath = File(context.filesDir, "php-fcgi.sock").absolutePath

        Log.d("PHP-CGI", "Binary copied to: ${phpBinary.absolutePath}")
        //Log.d("PHP-CGI", "Binary copied to: ${spawnFcgi.absolutePath}")
        Log.d("PHP-CGI", "Exists: ${phpBinary.exists()}")
        Log.d("PHP-CGI", "Executable: ${phpBinary.canExecute()}")
        Log.d("PHP-CGI", "file path ${socketPath}")
        val command = listOf(
            phpBinary.absolutePath,
            "-b", socketPath
        )

        val processBuilder = ProcessBuilder(command)
            .directory(context.filesDir)
            .redirectErrorStream(true)

        phpProcess = processBuilder.start()
  
        // Log process output
        Thread {
            phpProcess?.inputStream?.bufferedReader()?.useLines { lines ->
                lines.forEach { Log.d("PHP-CGI-OUT", it) }
            }
        }.start()

        // Log errors, if any
        Thread {
            phpProcess?.errorStream?.bufferedReader()?.useLines { lines ->
                lines.forEach { Log.e("PHP-CGI-ERR", it) }
            }
        }.start()

        promise.resolve("PHP server started on port 9569")
    } catch (e: Exception) {
        Log.e("PHP-CGI", "Failed to start php-cgi ${e}")
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
