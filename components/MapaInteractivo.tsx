import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';

const REGION_INICIAL = {
  latitude: -32.4825,
  longitude: -58.2325,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapaInteractivo() {
  const params = useLocalSearchParams<{ lat?: string; lng?: string; titulo?: string }>();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const ubicacionActual = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLocation(ubicacionActual);
        }
      } catch (error) {
        console.log('Error al obtener ubicación:', error);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={{ marginTop: 10 }}>Cargando mapa...</Text>
      </View>
    );
  }

  // Prioridad: 1. Destino seleccionado ("Cómo llegar"), 2. GPS del usuario, 3. Región por defecto
  const regionDestino = params.lat && params.lng
    ? {
        latitude: parseFloat(params.lat),
        longitude: parseFloat(params.lng),
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : location
    ? {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : REGION_INICIAL;

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={regionDestino}
        region={regionDestino}
        showsUserLocation
        showsMyLocationButton
      >
        {/* Marcador del destino enviado por parámetros */}
        {params.lat && params.lng && (
          <Marker
            coordinate={{
              latitude: parseFloat(params.lat),
              longitude: parseFloat(params.lng),
            }}
            title={params.titulo || 'Destino'}
            description="Lugar seleccionado"
            pinColor="red"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});