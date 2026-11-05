// src/componentes/TarjetaLugar.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Lugar } from '../tipos';
import Ionicons from '@react-native-vector-icons/ionicons';
import { formatearDistancia, verificarEstadoApertura } from '../utilidades/geolocalizacion';

interface TarjetaLugarProps {
  lugar: Lugar;
  distanciaMetros?: number;
  esFavorito?: boolean;
  onToggleFavorito?: (id: string) => void;
  onPress: (id: string) => void;
}

export const TarjetaLugar = ({
  lugar,
  distanciaMetros,
  esFavorito,
  onToggleFavorito,
  onPress,
}: TarjetaLugarProps) => {
  const apertura = verificarEstadoApertura(lugar.horarios);
  const imagenPortada = lugar.imagenes && lugar.imagenes.length > 0 ? lugar.imagenes[0] : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(lugar.id)}
      accessibilityRole="button"
      accessibilityLabel={`Lugar ${lugar.nombre}`}
    >
      {imagenPortada ? (
        <Image
          source={imagenPortada}
          style={styles.imagen}
          contentFit="cover"
          transition={250}
        />
      ) : (
        <View style={[styles.imagen, styles.imagenPlaceholder]}>
          <Ionicons name="image-outline" size={40} color="#888" />
        </View>
      )}

      {/* Botón de favorito flotante sobre la tarjeta */}
      {onToggleFavorito && (
        <Pressable
          style={styles.btnFavFlotanteTarjeta}
          onPress={() => onToggleFavorito(lugar.id)}
          accessibilityLabel="Marcar favorito"
        >
          <Ionicons
            name={esFavorito ? 'star' : 'star-outline'}
            size={22}
            color={esFavorito ? '#FFB703' : '#FFFFFF'}
          />
        </Pressable>
      )}

      {/* Badge de distancia flotante sobre la foto si está disponible */}
      {distanciaMetros !== undefined && (
        <View style={styles.badgeDistancia}>
          <Ionicons name="navigate-outline" size={13} color="#FFFFFF" />
          <Text style={styles.badgeDistanciaTexto}>{formatearDistancia(distanciaMetros)}</Text>
        </View>
      )}

      <View style={styles.info}>
        <View style={styles.headerFila}>
          <Text style={styles.nombre} numberOfLines={1}>
            {lugar.nombre}
          </Text>
        </View>

        <Text style={styles.descripcion} numberOfLines={2}>
          {lugar.descripcionCorta}
        </Text>

        {/* Estado de apertura */}
        <View style={styles.aperturaFila}>
          <View
            style={[
              styles.puntoEstado,
              { backgroundColor: apertura.abierto ? '#2E7D32' : '#C62828' },
            ]}
          />
          <Text
            style={[
              styles.aperturaTexto,
              { color: apertura.abierto ? '#2E7D32' : '#C62828' },
            ]}
          >
            {apertura.texto}
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.badge}>
            <Ionicons name="cash-outline" size={14} color="#0077B6" />
            <Text style={styles.badgeTexto}>
              {lugar.precioEntrada === 0
                ? 'Gratis'
                : lugar.precioEntrada !== null
                ? `$${lugar.precioEntrada}`
                : 'Consultar'}
            </Text>
          </View>

          <View style={styles.iconosExtra}>
            {lugar.audioguia && (
              <View style={styles.iconoBadge} accessibilityLabel="Cuenta con audioguía">
                <Ionicons name="headset-outline" size={16} color="#0077B6" />
              </View>
            )}
            {lugar.accesible && (
              <View style={styles.iconoBadge} accessibilityLabel="Accesible con silla de ruedas">
                <Ionicons name="body-outline" size={16} color="#2E7D32" />
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  imagen: {
    width: '100%',
    height: 170,
  },
  imagenPlaceholder: {
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFavFlotanteTarjeta: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  badgeDistancia: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(3, 4, 94, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  badgeDistanciaTexto: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  info: {
    padding: 14,
  },
  headerFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#03045E',
    flex: 1,
  },
  descripcion: {
    fontSize: 14,
    color: '#4A5568',
    marginVertical: 6,
    lineHeight: 19,
  },
  aperturaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  puntoEstado: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  aperturaTexto: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CAF0F8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeTexto: {
    fontSize: 13,
    color: '#0077B6',
    fontWeight: '700',
  },
  iconosExtra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconoBadge: {
    padding: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
});
