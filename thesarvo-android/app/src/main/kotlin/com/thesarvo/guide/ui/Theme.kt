package com.thesarvo.guide.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.thesarvo.guide.Appearance

/** The bars and the menu are dark navy with light text whatever the page below them looks like; the accent is navy in light mode and a light periwinkle in dark. */
object Chrome {
    val bar = Color(0.082f, 0.063f, 0.298f)
    val menu = Color(0.047f, 0.039f, 0.176f)
    val light = Color.White
    val dim = Color(1f, 1f, 1f, 0.6f)
    val navy = Color(0.106f, 0.078f, 0.392f)
    val periwinkle = Color(0.62f, 0.68f, 1f)
}

private val Light: ColorScheme = lightColorScheme(primary = Chrome.navy, onPrimary = Color.White, secondaryContainer = Color(0.86f, 0.87f, 1f), onSecondaryContainer = Chrome.navy)
private val Dark: ColorScheme = darkColorScheme(primary = Chrome.periwinkle, onPrimary = Chrome.navy, secondaryContainer = Color(0.2f, 0.2f, 0.45f), onSecondaryContainer = Color.White)

@Composable
fun ThesarvoTheme(appearance: Appearance = Appearance.System, content: @Composable () -> Unit) {
    val dark = when (appearance) { Appearance.System -> isSystemInDarkTheme(); Appearance.Light -> false; Appearance.Dark -> true }
    MaterialTheme(colorScheme = if (dark) Dark else Light, content = content)
}
