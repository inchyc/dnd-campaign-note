-keep class com.example.starvingmiracle.MainActivity { *; }
-keep class com.example.starvingmiracle.MainActivity$AndroidBridge { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
