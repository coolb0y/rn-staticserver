package com.chipster.nativeutils

import android.content.Context
import android.util.Log
import java.io.File
import java.io.FileOutputStream

object BinaryUtils {

    private const val TAG = "BinaryUtils"

    /**
     * Copies an asset binary to the app's internal storage and makes it executable.
     *
     * @param context The context to access assets and files directory.
     * @param assetPath The relative path inside the assets folder (e.g., "php/php-cgi").
     * @param outputName The name of the output binary (e.g., "php-cgi").
     * @return The File pointing to the copied executable.
     */
    fun copyAssetBinary(context: Context, assetPath: String, outputName: String): File {
        val outputFile = File(context.filesDir, outputName)

        Log.d(TAG, "Attempting to copy asset: $assetPath to ${outputFile.absolutePath}")

        if (!outputFile.exists()) {
            try {
                context.assets.open(assetPath).use { input ->
                    FileOutputStream(outputFile).use { output ->
                        input.copyTo(output)
                    }
                }
                val madeExecutable = outputFile.setExecutable(true)
                Log.d(TAG, "Successfully copied binary and set executable: $madeExecutable")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to copy or set executable for asset binary: $assetPath", e)
                throw e
            }
        } else {
            Log.d(TAG, "Binary already exists at ${outputFile.absolutePath}")
        }

        return outputFile
    }
}
