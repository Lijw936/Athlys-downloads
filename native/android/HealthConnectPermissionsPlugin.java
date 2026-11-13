package com.athlys.app;

import androidx.activity.ComponentActivity;
import androidx.activity.result.ActivityResultLauncher;
import androidx.health.connect.client.PermissionController;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@CapacitorPlugin(name = "HealthConnectPermissions")
public class HealthConnectPermissionsPlugin extends Plugin {
  private static final Map<String, String> READ_PERMISSIONS = new LinkedHashMap<>();
  static {
    READ_PERMISSIONS.put("steps", "android.permission.health.READ_STEPS");
    READ_PERMISSIONS.put("distance", "android.permission.health.READ_DISTANCE");
    READ_PERMISSIONS.put("calories", "android.permission.health.READ_ACTIVE_CALORIES_BURNED");
    READ_PERMISSIONS.put("heartRate", "android.permission.health.READ_HEART_RATE");
    READ_PERMISSIONS.put("weight", "android.permission.health.READ_WEIGHT");
  }

  private ActivityResultLauncher<Set<String>> permissionLauncher;
  private PluginCall pendingCall;
  private List<String> pendingTypes = new ArrayList<>();

  @Override
  public void load() {
    ComponentActivity activity = (ComponentActivity) getActivity();
    permissionLauncher = activity.registerForActivityResult(
      PermissionController.createRequestPermissionResultContract(),
      granted -> {
        PluginCall call = pendingCall;
        List<String> requested = pendingTypes;
        pendingCall = null;
        pendingTypes = new ArrayList<>();
        if (call == null) return;

        JSArray authorized = new JSArray();
        JSArray denied = new JSArray();
        for (String type : requested) {
          String permission = READ_PERMISSIONS.get(type);
          if (permission != null && granted != null && granted.contains(permission)) {
            authorized.put(type);
          } else {
            denied.put(type);
          }
        }
        JSObject result = new JSObject();
        result.put("readAuthorized", authorized);
        result.put("readDenied", denied);
        result.put("writeAuthorized", new JSArray());
        call.resolve(result);
      }
    );
  }

  @PluginMethod
  public void requestAuthorization(PluginCall call) {
    if (permissionLauncher == null) {
      call.reject("Le gestionnaire natif des autorisations Health Connect n’est pas initialisé.");
      return;
    }
    if (pendingCall != null) {
      call.reject("Une demande d’autorisation Health Connect est déjà en cours.");
      return;
    }
    try {
      JSArray read = call.getArray("read");
      Set<String> permissions = new LinkedHashSet<>();
      List<String> requested = new ArrayList<>();
      if (read != null) {
        for (int i = 0; i < read.length(); i++) {
          String type = read.getString(i);
          if (type == null || !READ_PERMISSIONS.containsKey(type)) {
            call.reject("Type de donnée Health Connect non pris en charge : " + type);
            return;
          }
          requested.add(type);
          permissions.add(READ_PERMISSIONS.get(type));
        }
      }
      if (permissions.isEmpty()) {
        call.reject("Aucune autorisation de lecture Health Connect n’a été demandée.");
        return;
      }
      pendingCall = call;
      pendingTypes = requested;
      permissionLauncher.launch(permissions);
    } catch (Exception error) {
      pendingCall = null;
      pendingTypes = new ArrayList<>();
      call.reject("Impossible d’ouvrir la demande d’autorisation Health Connect.", error);
    }
  }
}
