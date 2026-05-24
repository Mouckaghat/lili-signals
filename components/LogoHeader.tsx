import { Image, StyleSheet, Text, View } from 'react-native';

export default function LogoHeader() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/blue_lobster.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Lili Signals</Text>
      <Text style={styles.subtitle}>Football prediction learning lab</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 20,
  },
  logo: {
    width: 84,
    height: 84,
    marginBottom: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1D1D1F',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#6E6E73',
    marginTop: 5,
    fontWeight: '400',
  },
});
