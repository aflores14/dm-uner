// src/componentes/ReproductorAudioguia.tsx
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Audioguia } from '../tipos';
import {
  descargarAudioguiaOffline,
  eliminarAudioguiaOffline,
  verificarAudioguiaDescargada,
} from '../servicios/audioguias';

interface ReproductorAudioguiaProps {
  lugarId: string;
  audioguia: Audioguia;
  tituloLugar: string;
}

export const ReproductorAudioguia: React.FC<ReproductorAudioguiaProps> = ({
  lugarId,
  audioguia,
  tituloLugar,
}) => {
  const [estaDescargada, setEstaDescargada] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [uriFuente, setUriFuente] = useState<string>(audioguia.url);

  // Configurar modo de audio para segundo plano (pantalla apagada / en el bolsillo)
  useEffect(() => {
    (async () => {
      try {
        if (typeof setAudioModeAsync === 'function') {
          await setAudioModeAsync({
            playsInSilentMode: true,
          });
        }
      } catch (_e) {
        // En Expo Go o entornos de prueba puede tener limitaciones
      }

      // Verificar si ya existe en almacenamiento local
      const res = await verificarAudioguiaDescargada(lugarId);
      if (res.descargada && res.uriLocal) {
        setEstaDescargada(true);
        setUriFuente(res.uriLocal);
      }
    })();
  }, [lugarId, audioguia.url]);

  // Hook oficial de expo-audio
  const player = useAudioPlayer(uriFuente, {
    updateInterval: 500,
  });
  const status = useAudioPlayerStatus(player);

  const duracionTotal = status.duration || audioguia.duracionSegundos || 1;
  const tiempoActual = status.currentTime || 0;
  const progreso = Math.min(1, Math.max(0, tiempoActual / duracionTotal));

  const formatearTiempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const segs = Math.floor(segundos % 60);
    return `${mins}:${segs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    Haptics.selectionAsync();
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleSeek = (segundosDelta: number) => {
    Haptics.selectionAsync();
    const nuevo = Math.min(duracionTotal, Math.max(0, tiempoActual + segundosDelta));
    player.seekTo(nuevo);
  };

  const handleDescargar = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (estaDescargada) {
      Alert.alert(
        'Audioguía descargada',
        'Esta audioguía ya está guardada en tu dispositivo para escuchar sin señal en El Palmar o la costanera.',
        [
          { text: 'Aceptar' },
          {
            text: 'Eliminar descarga',
            style: 'destructive',
            onPress: async () => {
              await eliminarAudioguiaOffline(lugarId);
              setEstaDescargada(false);
              setUriFuente(audioguia.url);
            },
          },
        ]
      );
    } else {
      setDescargando(true);
      try {
        const localUri = await descargarAudioguiaOffline(lugarId, audioguia.url);
        setEstaDescargada(true);
        setUriFuente(localUri);
        Alert.alert(
          '¡Descarga completada!',
          'La audioguía quedó guardada en el teléfono para escucharla sin conexión.'
        );
      } catch (_e) {
        Alert.alert('Error', 'No se pudo descargar la audioguía.');
      } finally {
        setDescargando(false);
      }
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconoOnda}>
          <Ionicons name="headset" size={24} color="#0077B6" />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.titulo}>Audioguía Histórica</Text>
          <Text style={styles.subtitulo} numberOfLines={1}>
            {tituloLugar}
          </Text>
        </View>

        {/* Botón de Descarga Offline (PDF Pág. 3 y 5) */}
        <Pressable
          style={[styles.btnDescarga, estaDescargada && styles.btnDescargaOk]}
          onPress={handleDescargar}
          disabled={descargando}
        >
          {descargando ? (
            <ActivityIndicator size="small" color="#0077B6" />
          ) : (
            <>
              <Ionicons
                name={estaDescargada ? 'cloud-done' : 'cloud-download-outline'}
                size={16}
                color={estaDescargada ? '#16A34A' : '#0077B6'}
              />
              <Text
                style={[
                  styles.btnDescargaTexto,
                  estaDescargada && { color: '#16A34A' },
                ]}
              >
                {estaDescargada ? 'Offline ✓' : 'Guardar'}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Barra de progreso */}
      <View style={styles.progresoContenedor}>
        <View style={styles.barraFondo}>
          <View style={[styles.barraActiva, { width: `${progreso * 100}%` }]} />
        </View>
        <View style={styles.tiemposFila}>
          <Text style={styles.tiempoTexto}>{formatearTiempo(tiempoActual)}</Text>
          <Text style={styles.tiempoTexto}>-{formatearTiempo(duracionTotal - tiempoActual)}</Text>
        </View>
      </View>

      {/* Controles de reproducción */}
      <View style={styles.controlesFila}>
        <Pressable
          style={styles.btnControlSecundario}
          onPress={() => handleSeek(-10)}
          accessibilityLabel="Retroceder 10 segundos"
        >
          <Ionicons name="play-back" size={20} color="#0077B6" />
          <Text style={styles.seekTexto}>-10s</Text>
        </Pressable>

        <Pressable
          style={styles.btnPlayPause}
          onPress={handlePlayPause}
          accessibilityLabel={status.playing ? 'Pausar audioguía' : 'Reproducir audioguía'}
        >
          <Ionicons
            name={status.playing ? 'pause' : 'play'}
            size={28}
            color="#FFFFFF"
            style={!status.playing ? { marginLeft: 3 } : undefined}
          />
        </Pressable>

        <Pressable
          style={styles.btnControlSecundario}
          onPress={() => handleSeek(10)}
          accessibilityLabel="Adelantar 10 segundos"
        >
          <Ionicons name="play-forward" size={20} color="#0077B6" />
          <Text style={styles.seekTexto}>+10s</Text>
        </Pressable>
      </View>

      <Text style={styles.notaSegundoPlano}>
        Sigue sonando con la pantalla apagada o en el bolsillo mientras caminas.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconoOnda: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#03045E',
  },
  subtitulo: {
    fontSize: 13,
    color: '#0284C7',
  },
  btnDescarga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
  },
  btnDescargaOk: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  btnDescargaTexto: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0077B6',
  },
  progresoContenedor: {
    marginVertical: 10,
  },
  barraFondo: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barraActiva: {
    height: '100%',
    backgroundColor: '#0077B6',
    borderRadius: 3,
  },
  tiemposFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  tiempoTexto: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  controlesFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginVertical: 6,
  },
  btnControlSecundario: {
    alignItems: 'center',
    padding: 8,
  },
  seekTexto: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0077B6',
    marginTop: 2,
  },
  btnPlayPause: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0077B6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  notaSegundoPlano: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
  },
});

