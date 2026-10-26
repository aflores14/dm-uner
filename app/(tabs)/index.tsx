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
    obtenerLugares().then((data) => { setLugares(data); setLoading(false); });
  }, []);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={lugares}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TarjetaLugar lugar={item} onPress={(id) => router.push(`/lugar/${id}`)} />}
        contentContainerStyle={styles.lista}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  centered: { flex: 1, justifyContent: 'center' },
  lista: { padding: 16 }
});