# Add project specific ProGuard rules for Capacitor / WebView releases.
-keep class com.getcapacitor.** { *; }
-keep class org.apache.cordova.** { *; }
-keep class com.simsor.app.** { *; }

-dontwarn com.getcapacitor.**
-dontwarn org.apache.cordova.**

# Keep JS bridge classes
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin *;
    @com.getcapacitor.PluginMethod *;
}
