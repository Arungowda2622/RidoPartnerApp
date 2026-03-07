const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withCustomAndroidManifest(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application[0];

    // Add foreground service type for location
    if (!mainApplication.service) {
      mainApplication.service = [];
    }

    // Ensure location services are properly configured
    const locationServiceConfig = {
      $: {
        "android:name": "expo.modules.location.LocationBackgroundService",
        "android:foregroundServiceType": "location",
        "android:exported": "false",
      },
    };

    // Check if service already exists, if not add it
    const existingService = mainApplication.service.find(
      (service) =>
        service.$["android:name"] ===
        "expo.modules.location.LocationBackgroundService"
    );

    if (!existingService) {
      mainApplication.service.push(locationServiceConfig);
    }

    // Add uses-feature for location
    if (!androidManifest.manifest["uses-feature"]) {
      androidManifest.manifest["uses-feature"] = [];
    }

    const locationFeatures = [
      {
        $: {
          "android:name": "android.hardware.location.gps",
          "android:required": "true",
        },
      },
      {
        $: {
          "android:name": "android.hardware.location.network",
          "android:required": "false",
        },
      },
    ];

    locationFeatures.forEach((feature) => {
      const exists = androidManifest.manifest["uses-feature"].some(
        (f) => f.$["android:name"] === feature.$["android:name"]
      );
      if (!exists) {
        androidManifest.manifest["uses-feature"].push(feature);
      }
    });

    return config;
  });
};
