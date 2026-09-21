import React, { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { obtenerLugares } from '../../src/servicios/lugares';
import { TarjetaLugar } from '../../src/componentes/TarjetaLugar';
import { Lugar } from '../../src/tipos';

export default function CatalogoScreen() {
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const data = await obtenerLugares();
        setLugares(data);
      } finally {
        setLoading(false);
      }
    };
    cargarDatos();
  }, []);

  const irAlDetalle = (id: string) => {
    router.push({ pathname: '/lugar/[id]', params: { id } });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0077B6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={lugares}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TarjetaLugar lugar={item} onPress={irAlDetalle} />
        )}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          <Text style={styles.vacio}>No hay lugares disponibles en este momento.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lista: { padding: 16 },
  vacio: { textAlign: 'center', marginTop: 50, color: '#999' },
});