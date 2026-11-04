package com.thesarvo.guide

import org.junit.Assert.assertEquals
import org.junit.Test

class AppearanceTest {
    @Test fun `keys round trip`() = Appearance.entries.forEach { assertEquals(it, Appearance.of(it.key)) }

    @Test fun `anything unknown follows the system`() {
        assertEquals(Appearance.System, Appearance.of(null))
        assertEquals(Appearance.System, Appearance.of("sepia"))
    }
}
