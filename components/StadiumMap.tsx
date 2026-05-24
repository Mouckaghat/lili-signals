import { Platform, StyleSheet } from 'react-native';
import WebView from 'react-native-webview';

interface Props { uri: string }

const ENABLE_ZOOM_JS = `
(function() {
  var meta = document.querySelector('meta[name="viewport"]');
  if (meta) {
    meta.content = 'width=device-width, initial-scale=1, user-scalable=yes, maximum-scale=10';
  } else {
    var m = document.createElement('meta');
    m.name = 'viewport';
    m.content = 'width=device-width, initial-scale=1, user-scalable=yes, maximum-scale=10';
    document.head && document.head.appendChild(m);
  }
  true;
})();
`;

export default function StadiumMap({ uri }: Props) {
  return (
    <WebView
      source={{ uri }}
      style={styles.map}
      scalesPageToFit={Platform.OS === 'ios'}
      injectedJavaScript={ENABLE_ZOOM_JS}
      javaScriptEnabled
    />
  );
}

const styles = StyleSheet.create({ map: { flex: 1 } });
