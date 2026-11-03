package com.thesarvo.guide.auth

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** The sign-in tokens, encrypted with an AES-GCM key held in the Android Keystore, in a file that is never backed up. */
class TokenVault(dir: File) {
    private val file = File(dir, "tokens.bin")

    private fun key(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        gen.init(KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build())
        return gen.generateKey()
    }

    fun write(data: ByteArray) {
        val c = Cipher.getInstance(TRANSFORM).apply { init(Cipher.ENCRYPT_MODE, key()) }
        val enc = c.doFinal(data)
        file.parentFile?.mkdirs()
        file.writeBytes(byteArrayOf(c.iv.size.toByte()) + c.iv + enc)
    }

    /** The stored bytes, or null when there are none or they cannot be read (a restored device, a lost key): the person signs in again. */
    fun read(): ByteArray? {
        if (!file.exists()) return null
        return try {
            val raw = file.readBytes()
            val n = raw[0].toInt()
            val c = Cipher.getInstance(TRANSFORM).apply { init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, raw, 1, n)) }
            c.doFinal(raw, 1 + n, raw.size - 1 - n)
        } catch (e: Exception) {
            file.delete()
            null
        }
    }

    fun delete() { file.delete() }

    private companion object {
        const val ALIAS = "thesarvo.tokens"
        const val TRANSFORM = "AES/GCM/NoPadding"
    }
}
