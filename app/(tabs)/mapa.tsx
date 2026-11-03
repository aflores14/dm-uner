// app/(tabs)/mapa.tsx
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

// Cargamos el mapa nativo SOLO si el sistema operativo NO es web
let ComponenteMapa: React.ComponentType<any> | null = null;

if (Platform.OS !== 'web') {
  // Nota: Asegúrate que la ruta sea correcta hacia tu src/componentes
  ComponenteMapa = require('../../src/componentes/MapaInteractivo').default;
}

export default function PantallaMapa() {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <Text style={styles.webTexto}>
          El mapa interactivo solo está disponible en dispositivos móviles.
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
    flex: 1,
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