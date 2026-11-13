package com.athlys.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "HealthConnectBackground")
public class HealthConnectBackgroundPlugin extends Plugin {
  private static final String WORK_NAME = "athlys-health-connect-hourly";
  private android.content.SharedPreferences securePrefs() throws Exception {
    MasterKey key = new MasterKey.Builder(getContext()).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build();
    return EncryptedSharedPreferences.create(getContext(), "athlys_health_background", key,
      EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
      EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM);
  }
  @PluginMethod public void configure(PluginCall call) {
    try {
      String token = call.getString("deviceToken"), url = call.getString("url");
      String device = call.getString("deviceId"), consents = call.getString("consents");
      if (token == null || url == null || device == null || consents == null) {
        call.reject("Configuration de synchronisation incomplète"); return;
      }
      securePrefs().edit().putString("device_token", token).putString("supabase_url", url)
        .putString("device_id", device).putString("consents", consents).apply();
      Constraints constraints = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
      PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(HealthConnectSyncWorker.class, 1, TimeUnit.HOURS)
        .setConstraints(constraints).setBackoffCriteria(androidx.work.BackoffPolicy.EXPONENTIAL, 15, TimeUnit.MINUTES).build();
      WorkManager.getInstance(getContext()).enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, request);
      JSObject result = new JSObject(); result.put("scheduled", true); result.put("intervalHours", 1); result.put("timing", "best_effort_android");
      call.resolve(result);
    } catch (Exception error) { call.reject("Impossible de configurer la synchronisation en arrière-plan", error); }
  }
  @PluginMethod public void disable(PluginCall call) {
    WorkManager.getInstance(getContext()).cancelUniqueWork(WORK_NAME);
    try { securePrefs().edit().clear().apply(); } catch (Exception ignored) {}
    call.resolve(new JSObject());
  }
  @PluginMethod public void status(PluginCall call) {
    try {
      android.content.SharedPreferences p = securePrefs();
      JSObject result = new JSObject(); result.put("status", p.getString("last_status", p.contains("device_token") ? "scheduled" : "not_configured"));
      result.put("lastAttemptAt", p.getLong("last_attempt_at", 0)); result.put("lastUploadedCount", p.getInt("last_uploaded_count", 0));
      call.resolve(result);
    } catch (Exception error) { call.reject("État de synchronisation indisponible", error); }
  }
  @PluginMethod public void openHealthConnectSettings(PluginCall call) {
    try {
      Intent intent = new Intent("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS");
      intent.setData(Uri.parse("package:" + getContext().getPackageName()));
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); getContext().startActivity(intent); call.resolve(new JSObject());
    } catch (Exception error) { call.reject("Impossible d'ouvrir les paramètres Health Connect", error); }
  }
}
