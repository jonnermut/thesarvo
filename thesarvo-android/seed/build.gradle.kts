plugins {
    id("com.android.asset-pack")
}

// The first-run content (the site's text and the small photos), delivered at install time; built by thesarvo-private/scripts/build-app-seed.mjs
assetPack {
    packName.set("seed")
    dynamicDelivery { deliveryType.set("install-time") }
}
