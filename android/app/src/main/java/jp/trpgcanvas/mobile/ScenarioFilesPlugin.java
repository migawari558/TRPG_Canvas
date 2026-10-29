package jp.trpgcanvas.mobile;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.provider.DocumentsContract;
import android.database.Cursor;
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
import java.net.HttpURLConnection;
import java.net.URL;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "ScenarioFiles")
public class ScenarioFilesPlugin extends Plugin {
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private static final int LIMIT = 20_000_000;
    @PluginMethod public void setSystemBars(PluginCall call) {
        String color=call.getString("color","#ffffff");boolean dark=Boolean.TRUE.equals(call.getBoolean("dark",false));
        getActivity().runOnUiThread(()->{
            try{
                int value=android.graphics.Color.parseColor(color);
                android.view.Window window=getActivity().getWindow();
                window.setStatusBarColor(value);window.setNavigationBarColor(value);
                window.getDecorView().setBackgroundColor(value);
                androidx.core.view.WindowInsetsControllerCompat bars=new androidx.core.view.WindowInsetsControllerCompat(window,window.getDecorView());
                bars.setAppearanceLightStatusBars(!dark);bars.setAppearanceLightNavigationBars(!dark);call.resolve();
            }catch(Exception error){call.reject("システムバーの色を設定できませんでした");}
        });
    }
    @PluginMethod public void checkUpdate(PluginCall call) {
        io.execute(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection)new URL("https://api.github.com/repos/migawari558/TRPG_Canvas/releases?per_page=30").openConnection();
                connection.setConnectTimeout(15000); connection.setReadTimeout(15000);
                connection.setRequestProperty("Accept", "application/vnd.github+json");
                connection.setRequestProperty("User-Agent", "TRPG-Canvas-Android");
                if (connection.getResponseCode()!=200) throw new Exception("更新情報を取得できませんでした");
                String text;
                try (InputStream stream=connection.getInputStream(); ByteArrayOutputStream buffer=new ByteArrayOutputStream()) { byte[] bytes=new byte[8192]; int count; while((count=stream.read(bytes))!=-1){if(buffer.size()+count>2_000_000)throw new Exception("更新情報が大きすぎます");buffer.write(bytes,0,count);} text=buffer.toString("UTF-8"); }
                JSONArray releases=new JSONArray(text);
                for(int i=0;i<releases.length();i++){
                    JSONObject release=releases.getJSONObject(i);
                    if(release.optBoolean("draft")||release.optBoolean("prerelease")||!release.optString("tag_name").matches("android-v[0-9]+\\.[0-9]+\\.[0-9]+"))continue;
                    JSONArray assets=release.optJSONArray("assets"); boolean apk=false;
                    if(assets!=null)for(int j=0;j<assets.length();j++)if(assets.getJSONObject(j).optString("name").endsWith(".apk"))apk=true;
                    if(!apk)continue;
                    String latest=release.getString("tag_name").substring(9);
                    String installed=getContext().getPackageManager().getPackageInfo(getContext().getPackageName(),0).versionName;
                    String[] a=latest.split("\\."),b=installed.split("\\."); boolean available=false;
                    for(int j=0;j<3;j++){int left=Integer.parseInt(a[j]),right=j<b.length?Integer.parseInt(b[j]):0;if(left!=right){available=left>right;break;}}
                    call.resolve(new JSObject().put("available",available).put("latest",latest).put("installed",installed));return;
                }
                call.resolve(new JSObject().put("available",false).put("unreleased",true));
            }catch(Exception error){call.reject(error.getMessage());}finally{if(connection!=null)connection.disconnect();}
        });
    }
    @PluginMethod public void openReleases(PluginCall call) {
        getActivity().runOnUiThread(()->{try{getActivity().startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://github.com/migawari558/TRPG_Canvas/releases")));call.resolve();}catch(Exception error){call.reject("ブラウザを開けませんでした");}});
    }

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
    private JSObject source(Uri uri) {
        String name = "シナリオファイル";
        try (Cursor cursor = getContext().getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) name = cursor.getString(0);
        } catch (Exception ignored) {}
        return new JSObject().put("uri", uri.toString()).put("name", name).put("provider", uri.getAuthority());
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
                call.resolve(source(uri).put("text", new String(bytes, StandardCharsets.UTF_8)).put("hash", hash(bytes)));
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
        String name=source(uri).getString("name");
        if(name==null || !name.matches("[a-zA-Z0-9-]{1,80}\\.trpg\\.json")) {
            String id=new JSONObject(text).getString("id");
            if(!id.matches("[a-zA-Z0-9-]{1,80}"))throw new Exception("シナリオIDが不正です");
            Uri renamed=DocumentsContract.renameDocument(getContext().getContentResolver(),uri,id+".trpg.json");
            if(renamed==null)throw new Exception("PC互換のファイル名へ変更できませんでした。ファイル名を "+id+".trpg.json に変更してください");
            uri=renamed;
        }
        try (OutputStream stream = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (stream == null) throw new Exception("書き込み権限がありません");
            stream.write(bytes); stream.flush();
        }
        String actualHash = hash(read(uri));
        if (!actualHash.equals(hash(bytes))) throw new Exception("保存後に読み直した内容が一致しません。Driveの通信状態と書き込み権限を確認してください");
        call.resolve(source(uri).put("hash", actualHash).put("verified", true));
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
