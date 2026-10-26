import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';

// Cargamos el mapa nativo SOLO si el sistema operativo NO es web
let ComponenteMapa: React.ComponentType<any> | null = null;

if (Platform.OS !== 'web') {
  ComponenteMapa = require('@/components/MapaInteractivo').default;
}

export default function PantallaMapa() {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <Text style={styles.webTexto}>
          El mapa interactivo está disponible en dispositivos móviles (Android / iOS).
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {ComponenteMapa && <ComponenteMapa />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // REGLA FUNDAMENTAL: Debe ser flex: 1 para que el mapa ocupe la pantalla en Android
  },
  webContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webTexto: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
});