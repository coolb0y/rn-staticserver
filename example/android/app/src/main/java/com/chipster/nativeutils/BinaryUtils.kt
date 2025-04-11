package com.chipster.nativeutils

import android.content.Context
import java.io.File

object BinaryUtils {
    fun copyAssetBinary(context: Context, assetName: String, outputName: String): File {
        val outFile = File(context.filesDir, outputName)

        if (!outFile.exists()) {
            context.assets.open(assetName).use { input ->
                outFile.outputStream().use { output ->
                    input.copyTo(output)
                }
            }
            outFile.setExecutable(true)
        }

        return outFile
    }
}
