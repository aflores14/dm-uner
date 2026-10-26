import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Image } from 'expo-image';
import { obtenerLugarPorId } from '../../src/servicios/lugares';
import { Lugar } from '../../src/tipos';
import { BotonApp } from '../../src/componentes/BotonApp';

export default function DetalleLugarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lugar, setLugar] = useState<Lugar | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      obtenerLugarPorId(id).then(res => {
        setLugar(res || null);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!lugar) return <Text style={styles.errorText}>Lugar no encontrado</Text>;

  // Función corregida para acceder al objeto coordenadas
  const irAlMapa = () => {
    if (lugar.coordenadas?.latitud && lugar.coordenadas?.longitud) {
      router.push({
        pathname: '/(tabs)/mapa',
        params: {
          lat: lugar.coordenadas.latitud.toString(),
          lng: lugar.coordenadas.longitud.toString(),
          titulo: lugar.nombre,
        },
      });
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: lugar.nombre }} />
      <Image source={lugar.imagenes[0]} style={styles.hero} contentFit="cover" />
      <View style={styles.content}>
        <Text style={styles.nombre}>{lugar.nombre}</Text>
        <Text style={styles.descripcion}>{lugar.descripcion}</Text>
        
        <View style={styles.botonContainer}>
          <BotonApp 
            titulo="Cómo llegar" 
            onPress={irAlMapa} 
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  hero: { width: '100%', height: 250 },
  content: { padding: 20 },
  nombre: { fontSize: 24, fontWeight: 'bold', color: '#1E293B' },
  descripcion: { marginTop: 10, fontSize: 16, color: '#475569', lineHeight: 22 },
  botonContainer: { marginTop: 25 },
  errorText: { flex: 1, textAlign: 'center', marginTop: 50, fontSize: 16 }
});