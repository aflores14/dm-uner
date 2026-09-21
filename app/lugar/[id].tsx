import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
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
      obtenerLugarPorId(id).then((res) => {
        if (res) setLugar(res);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) return <ActivityIndicator style={styles.loader} />;
  if (!lugar) return <Text>Lugar no encontrado</Text>;

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: lugar.nombre }} />
      
      <Image source={lugar.imagenes[0]} style={styles.hero} />
      
      <View style={styles.content}>
        <Text style={styles.categoria}>{lugar.categoriaId.toUpperCase()}</Text>
        <Text style={styles.nombre}>{lugar.nombre}</Text>
        <Text style={styles.direccion}>{lugar.direccion}</Text>
        
        <Text style={styles.descripcion}>{lugar.descripcion}</Text>
        
        <View style={styles.seccion}>
          <Text style={styles.subtitulo}>Horarios</Text>
          {/* Ejemplo de mapeo de horarios según el contrato del PRD */}
          <Text style={styles.horarioInfo}>
            Lunes a Viernes: 08:00 - 20:00
          </Text>
        </View>

        <BotonApp 
          titulo="Como llegar" 
          onPress={() => console.log('Abrir Mapas')} 
          style={styles.boton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  loader: { flex: 1, justifyContent: 'center' },
  hero: { width: '100%', height: 250 },
  content: { padding: 20 },
  categoria: { color: '#0077B6', fontWeight: 'bold', fontSize: 12 },
  nombre: { fontSize: 24, fontWeight: 'bold', color: '#03045E', marginVertical: 4 },
  direccion: { color: '#666', marginBottom: 16 },
  descripcion: { fontSize: 16, lineHeight: 24, color: '#333' },
  seccion: { marginTop: 20, padding: 15, backgroundColor: '#F1F8FF', borderRadius: 8 },
  subtitulo: { fontWeight: 'bold', marginBottom: 5 },
  horarioInfo: { color: '#444' },
  boton: { marginTop: 24 }
});