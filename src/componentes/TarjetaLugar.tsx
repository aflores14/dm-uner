import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Lugar } from '../tipos';
import Ionicons from '@react-native-vector-icons/ionicons';

interface TarjetaLugarProps {
  lugar: Lugar;
  onPress: (id: string) => void;
}

export const TarjetaLugar = ({ lugar, onPress }: TarjetaLugarProps) => {
  return (
    <Pressable 
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} 
      onPress={() => onPress(lugar.id)}
    >
      <Image
        source={lugar.imagenes[0]}
        style={styles.imagen}
        contentFit="cover"
        transition={300}
      />
      <View style={styles.info}>
        <Text style={styles.nombre} numberOfLines={1}>{lugar.nombre}</Text>
        <Text style={styles.descripcion} numberOfLines={2}>{lugar.descripcionCorta}</Text>
        
        <View style={styles.footer}>
          <View style={styles.badge}>
            <Ionicons name="cash-outline" size={14} color="#0077B6" />
            <Text style={styles.badgeTexto}>
              {lugar.precioEntrada === 0 ? 'Gratis' : `$${lugar.precioEntrada}`}
            </Text>
          </View>
          {lugar.accesible && (
            <Ionicons name="body-outline" size={18} color="#4CAF50" />
          )}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.9,
  },
  imagen: {
    width: '100%',
    height: 180,
  },
  info: {
    padding: 12,
  },
  nombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#03045E',
  },
  descripcion: {
    fontSize: 14,
    color: '#666',
    marginVertical: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CAF0F8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeTexto: {
    fontSize: 12,
    color: '#0077B6',
    fontWeight: '600',
    marginLeft: 4,
  },
});