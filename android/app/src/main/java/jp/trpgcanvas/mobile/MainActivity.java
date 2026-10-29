package jp.trpgcanvas.mobile;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(android.os.Bundle state) {
        registerPlugin(ScenarioFilesPlugin.class);
        super.onCreate(state);
    }
}
