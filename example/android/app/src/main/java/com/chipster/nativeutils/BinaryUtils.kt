package com.chipster.nativeutils

import android.content.Context
import android.util.Log
import java.io.File
import java.io.FileOutputStream

object BinaryUtils {
    fun copyAssetBinary(context: Context, assetPath: String, outputName: String): File {
        val outputFile = File(context.filesDir, outputName)

        if (!outputFile.exists()) {
            try {
                Log.d("BinaryUtils", "Copying $assetPath to ${outputFile.absolutePath}")
                context.assets.open(assetPath).use { input ->
                    FileOutputStream(outputFile).use { output ->
                        input.copyTo(output)
                    }
                }
                outputFile.setExecutable(true)
                outputFile.setWritable(false)
                Log.d("BinaryUtils", "Binary copied and made executable.")
            } catch (e: Exception) {
                Log.e("BinaryUtils", "Error copying binary: $assetPath", e)
                throw e
            }
        } else {
            Log.d("BinaryUtils", "Binary already exists: ${outputFile.absolutePath}")
        }

        return outputFile
    }
}
