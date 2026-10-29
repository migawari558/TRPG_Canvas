package jp.trpgcanvas.mobile;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "ScenarioFiles")
public class ScenarioFilesPlugin extends Plugin {
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private static final int LIMIT = 20_000_000;

    @PluginMethod public void open(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.setType("*/*");
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "opened");
    }
    private byte[] read(Uri uri) throws Exception {
        try (InputStream stream = getContext().getContentResolver().openInputStream(uri); ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
            if (stream == null) throw new Exception("ファイルを開けませんでした");
            byte[] buffer = new byte[8192]; int count;
            while ((count = stream.read(buffer)) != -1) {
                if (bytes.size() + count > LIMIT) throw new Exception("20MBを超えるファイルは開けません");
                bytes.write(buffer, 0, count);
            }
            return bytes.toByteArray();
        }
    }
    private String hash(byte[] bytes) throws Exception {
        StringBuilder result = new StringBuilder();
        for (byte value : MessageDigest.getInstance("SHA-256").digest(bytes)) result.append(String.format("%02x", value & 255));
        return result.toString();
    }
    private void retain(Intent data, Uri uri) {
        int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        getContext().getContentResolver().takePersistableUriPermission(uri, flags);
    }
    @ActivityCallback private void opened(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { call.resolve(new JSObject().put("cancelled", true)); return; }
        Uri uri = result.getData().getData();
        if (uri == null) { call.reject("ファイルが選択されませんでした"); return; }
        try { retain(result.getData(), uri); } catch (SecurityException ignored) { /* Some providers only grant access for this session. */ }
        io.execute(() -> {
            try {
                byte[] bytes = read(uri);
                call.resolve(new JSObject().put("uri", uri.toString()).put("text", new String(bytes, StandardCharsets.UTF_8)).put("hash", hash(bytes)));
            } catch (Exception error) { call.reject("ファイルを読み込めません: " + error.getMessage()); }
        });
    }
    @PluginMethod public void write(PluginCall call) {
        String address = call.getString("uri"), expected = call.getString("hash"), text = call.getString("text");
        if (address == null || expected == null || text == null || !address.startsWith("content://")) { call.reject("保存先が不正です"); return; }
        io.execute(() -> {
            try {
                Uri uri = Uri.parse(address);
                if (!hash(read(uri)).equals(expected)) { call.reject("元ファイルがPCなどで変更されています。端末の下書きは残しています。元ファイルを開き直し、内容を比較してください。"); return; }
                save(call, uri, text);
            } catch (Exception error) { call.reject("保存できません。端末の下書きは残っています: " + error.getMessage()); }
        });
    }
    private void save(PluginCall call, Uri uri, String text) throws Exception {
        byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
        if (bytes.length > LIMIT) throw new Exception("保存容量は20MBまでです");
        try (OutputStream stream = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (stream == null) throw new Exception("書き込み権限がありません");
            stream.write(bytes); stream.flush();
        }
        call.resolve(new JSObject().put("uri", uri.toString()).put("hash", hash(bytes)));
    }
    @PluginMethod public void create(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.setType("application/json"); intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.putExtra(Intent.EXTRA_TITLE, call.getString("name", "scenario.trpg.json").replaceAll("[\\\\/:*?\"<>|]", "_"));
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "created");
    }
    @ActivityCallback private void created(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) { call.resolve(new JSObject().put("cancelled", true)); return; }
        Uri uri = result.getData().getData(); String text = call.getString("text");
        if (uri == null || text == null) { call.reject("保存内容が不正です"); return; }
        try { retain(result.getData(), uri); } catch (SecurityException ignored) {}
        io.execute(() -> { try { save(call, uri, text); } catch (Exception error) { call.reject("保存できません: " + error.getMessage()); } });
    }
}
