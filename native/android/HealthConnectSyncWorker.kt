package com.athlys.app

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.health.connect.client.units.*
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID
import kotlin.reflect.KClass

class HealthConnectSyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
  private fun securePrefs() = EncryptedSharedPreferences.create(
    applicationContext, "athlys_health_background",
    MasterKey.Builder(applicationContext).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
  )

  override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
    val prefs = securePrefs()
    try {
      val base = prefs.getString("supabase_url", null) ?: return@withContext Result.success()
      val deviceToken = prefs.getString("device_token", null) ?: return@withContext Result.success()
      val device = prefs.getString("device_id", null) ?: UUID.randomUUID().toString()
      
      val client = HealthConnectClient.getOrCreate(applicationContext)
      val granted = client.permissionController.getGrantedPermissions()
      if (!granted.contains(HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND)) {
        prefs.edit().putString("last_status", "needs_background_permission").putLong("last_attempt_at", System.currentTimeMillis()).apply()
        return@withContext Result.success()
      }
      val consents = JSONObject(prefs.getString("consents", "{}") ?: "{}")
      val from = Instant.now().minus(30, ChronoUnit.DAYS)
      val to = Instant.now()
      val batches = mutableListOf<Pair<String, List<Map<String, Any?>>>>()

      suspend fun <T : Record> read(type: KClass<T>): List<T> {
        val result = mutableListOf<T>()
        var cursor: String? = null
        do {
          val page = client.readRecords(ReadRecordsRequest(type, TimeRangeFilter.between(from, to), pageSize = 1000, pageToken = cursor))
          result.addAll(page.records)
          cursor = page.pageToken
        } while (cursor != null)
        return result
      }
      fun row(id: String, origin: String, start: Instant, end: Instant, value: Double, unit: String, type: String) =
        mapOf("recordId" to UUID.nameUUIDFromBytes("$type|$origin|$id".toByteArray(StandardCharsets.UTF_8)).toString(),
          "dataOrigin" to origin.take(255), "startTime" to start.toString(), "endTime" to end.toString(),
          "value" to value, "unit" to unit,
          "data" to mapOf("platform" to "android", "provider" to "Health Connect", "nativeType" to type, "backgroundSync" to true))

      if (consents.optBoolean("activity")) {
        if (granted.contains(HealthPermission.getReadPermission(StepsRecord::class)))
          batches.add("steps" to read(StepsRecord::class).map { row(it.metadata.id, it.metadata.dataOrigin.packageName, it.startTime, it.endTime, it.count.toDouble(), "count", "steps") })
        if (granted.contains(HealthPermission.getReadPermission(DistanceRecord::class)))
          batches.add("distance" to read(DistanceRecord::class).map { row(it.metadata.id, it.metadata.dataOrigin.packageName, it.startTime, it.endTime, it.distance.inMeters, "m", "distance") })
        if (granted.contains(HealthPermission.getReadPermission(ActiveCaloriesBurnedRecord::class)))
          batches.add("active_calories" to read(ActiveCaloriesBurnedRecord::class).map { row(it.metadata.id, it.metadata.dataOrigin.packageName, it.startTime, it.endTime, it.energy.inKilocalories, "kcal", "active_calories") })
      }
      if (consents.optBoolean("recovery") && granted.contains(HealthPermission.getReadPermission(HeartRateRecord::class))) {
        val values = mutableListOf<Map<String, Any?>>()
        read(HeartRateRecord::class).forEach { record ->
          record.samples.forEachIndexed { index, sample ->
            values.add(row("${record.metadata.id}:$index:${sample.time}", record.metadata.dataOrigin.packageName, sample.time, sample.time, sample.beatsPerMinute.toDouble(), "bpm", "heart_rate"))
          }
        }
        batches.add("heart_rate" to values)
      }
      if (consents.optBoolean("body") && granted.contains(HealthPermission.getReadPermission(WeightRecord::class)))
        batches.add("weight" to read(WeightRecord::class).map { row(it.metadata.id, it.metadata.dataOrigin.packageName, it.time, it.time, it.weight.inKilograms, "kg", "weight") })

      var uploaded = 0
      for ((type, records) in batches) {
        records.chunked(250).forEach { chunk ->
          val id = UUID.randomUUID().toString()
          val body = JSONObject().put("batchId", id).put("deviceId", device).put("recordType", type)
            .put("syncFrom", from.toString()).put("syncTo", to.toString())
            .put("upserts", JSONArray(chunk.map { JSONObject(it) })).put("deletions", JSONArray()).toString()
          val status = post("$base/functions/v1/athlys-health-connect-background", body, deviceToken, id)
          if (status == 401) {
            prefs.edit().putString("last_status", "token_revoked").putLong("last_attempt_at", System.currentTimeMillis()).apply()
            return@withContext Result.success()
          }
          if (status == 403) {
            prefs.edit().putString("last_status", "consent_revoked").putLong("last_attempt_at", System.currentTimeMillis()).apply()
            return@withContext Result.success()
          }
          if (status == 429 || status >= 500) return@withContext Result.retry()
          if (status !in 200..299) {
            prefs.edit().putString("last_status", "rejected").putLong("last_attempt_at", System.currentTimeMillis()).apply()
            return@withContext Result.success()
          }
          uploaded += chunk.size
        }
      }
      prefs.edit().putString("last_status", "completed").putLong("last_attempt_at", System.currentTimeMillis()).putInt("last_uploaded_count", uploaded).apply()
      Result.success()
    } catch (_: SecurityException) {
      prefs.edit().putString("last_status", "permission_revoked").putLong("last_attempt_at", System.currentTimeMillis()).apply()
      Result.success()
    } catch (_: Exception) {
      prefs.edit().putString("last_status", "error").putLong("last_attempt_at", System.currentTimeMillis()).apply()
      Result.retry()
    }
  }

  private fun post(url: String, body: String, token: String, id: String): Int {
    val c = URL(url).openConnection() as HttpURLConnection
    c.requestMethod = "POST"; c.connectTimeout = 15000; c.readTimeout = 30000; c.doOutput = true
    c.setRequestProperty("Authorization", "Bearer $token")
    c.setRequestProperty("Content-Type", "application/json"); c.setRequestProperty("Idempotency-Key", id)
    c.outputStream.use { it.write(body.toByteArray(StandardCharsets.UTF_8)) }
    val status = c.responseCode; c.disconnect(); return status
  }
}
