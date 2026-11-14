// src/componentes/ReproductorAudioguia.tsx
import Ionicons from "@react-native-vector-icons/ionicons";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  descargarAudioguiaOffline,
  eliminarAudioguiaOffline,
  verificarAudioguiaDescargada,
} from "../servicios/audioguias";
import { Audioguia } from "../tipos";

const BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.100.9:8081"
).replace(/\/+$/, "");

const resolverUriAudio = (urlOClave?: string): string => {
  if (!urlOClave) return "";
  if (
    urlOClave.startsWith("http://") ||
    urlOClave.startsWith("https://") ||
    urlOClave.startsWith("file://")
  ) {
    return urlOClave;
  }
  return `${BASE_URL}/${urlOClave.replace(/^\/+/, "")}`;
};

const formatearTiempo = (segundos: number): string => {
  const s = Math.max(0, Math.floor(segundos));
  const mins = Math.floor(s / 60);
  const segs = s % 60;
  return `${mins}:${segs.toString().padStart(2, "0")}`;
};

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
  const urlRemotaNormalizada = useMemo(
    () => resolverUriAudio(audioguia.url),
    [audioguia.url],
  );

  const [estaDescargada, setEstaDescargada] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [uriFuente, setUriFuente] = useState<string>(urlRemotaNormalizada);
  const [reproduciendoManual, setReproduciendoManual] = useState(false);

  // Inicializamos el reproductor sin fuente fija y la cargamos con replace()
  const player = useAudioPlayer(null, {
    updateInterval: 250,
  });
  const status = useAudioPlayerStatus(player);

  // 1. Configurar modo de audio para SEGUNDO PLANO y pantalla bloqueada
  useEffect(() => {
    const configurarAudioSegundoPlano = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: "doNotMix",
          interruptionModeAndroid: "doNotMix",
        });
      } catch (error) {
        console.warn("No se pudo configurar el modo de audio:", error);
      }
    };

    configurarAudioSegundoPlano();
  }, []);

  // 2. Verificar disponibilidad offline
  useEffect(() => {
    let activo = true;
    setUriFuente(urlRemotaNormalizada);
    setEstaDescargada(false);

    (async () => {
      try {
        const res = await verificarAudioguiaDescargada(lugarId);
        if (activo && res.descargada && res.uriLocal) {
          setEstaDescargada(true);
          setUriFuente(res.uriLocal);
        }
      } catch (error) {
        console.warn("Error verificando caché offline:", error);
      }
    })();

    return () => {
      activo = false;
    };
  }, [lugarId, urlRemotaNormalizada]);

  // 3. Cargar explícitamente la URI en el reproductor cuando cambie
  useEffect(() => {
    if (!uriFuente) return;
    try {
      player.replace({ uri: uriFuente });
    } catch (error) {
      console.error("Error cargando fuente de audio:", error);
    }
  }, [uriFuente, player]);

  // Sincronizar estado visual cuando el audio termina solo
  useEffect(() => {
    if (status.didJustFinish) {
      setReproduciendoManual(false);
    }
  }, [status.didJustFinish]);

  const estaSonando = status.playing || reproduciendoManual;
  const duracionTotal = status.duration || audioguia.duracionSegundos || 1;
  const tiempoActual = status.currentTime || 0;
  const progreso = Math.min(1, Math.max(0, tiempoActual / duracionTotal));
  const cargandoAudio = Boolean(status.isBuffering && !status.playing);

  // 4. Control manual garantizado de Play / Pause
  const handlePlayPause = useCallback(async () => {
    Haptics.selectionAsync();

    if (!uriFuente) {
      Alert.alert(
        "Audio no disponible",
        "No se encontró una ruta válida para la audioguía.",
      );
      return;
    }

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: "doNotMix",
        interruptionModeAndroid: "doNotMix",
      });

      if (status.playing) {
        player.pause();
        setReproduciendoManual(false);
      } else {
        if (!status.isLoaded) {
          player.replace({ uri: uriFuente });
        }

        if (
          status.didJustFinish ||
          (duracionTotal > 1 && tiempoActual >= duracionTotal - 0.5)
        ) {
          await player.seekTo(0);
        }

        player.play();
        setReproduciendoManual(true);
      }
    } catch (error) {
      setReproduciendoManual(false);
      console.error("Error al controlar la reproducción:", error);
      Alert.alert(
        "Error de reproducción",
        "No se pudo iniciar el audio. Verifica la conexión o descarga la audioguía.",
      );
    }
  }, [
    uriFuente,
    status.playing,
    status.isLoaded,
    status.didJustFinish,
    duracionTotal,
    tiempoActual,
    player,
  ]);

  const handleSeek = useCallback(
    async (segundosDelta: number) => {
      Haptics.selectionAsync();
      const nuevo = Math.min(
        duracionTotal,
        Math.max(0, tiempoActual + segundosDelta),
      );
      await player.seekTo(nuevo);
    },
    [duracionTotal, tiempoActual, player],
  );

  const handleDescargar = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (estaDescargada) {
      Alert.alert(
        "Audioguía descargada",
        "Esta audioguía ya está guardada en tu dispositivo para escuchar sin señal.",
        [
          { text: "Aceptar", style: "cancel" },
          {
            text: "Eliminar descarga",
            style: "destructive",
            onPress: async () => {
              player.pause();
              setReproduciendoManual(false);
              await eliminarAudioguiaOffline(lugarId);
              setEstaDescargada(false);
              setUriFuente(urlRemotaNormalizada);
            },
          },
        ],
      );
      return;
    }

    setDescargando(true);
    try {
      const localUri = await descargarAudioguiaOffline(
        lugarId,
        urlRemotaNormalizada,
      );
      setEstaDescargada(true);
      setUriFuente(localUri);
      Alert.alert(
        "¡Descarga completada!",
        "La audioguía quedó guardada en el teléfono para escucharla sin conexión.",
      );
    } catch (error) {
      console.error("Error descargando audioguía:", error);
      Alert.alert(
        "Error",
        "No se pudo descargar la audioguía. Verifica tu conexión.",
      );
    } finally {
      setDescargando(false);
    }
  }, [estaDescargada, lugarId, urlRemotaNormalizada, player]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconoOnda}>
          <Ionicons name="headset" size={24} color="#0077B6" />
        </View>
        <View style={styles.infoContenedor}>
          <Text style={styles.titulo}>Audioguía Histórica</Text>
          <Text style={styles.subtitulo} numberOfLines={1}>
            {tituloLugar}
          </Text>
        </View>

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
                name={estaDescargada ? "cloud-done" : "cloud-download-outline"}
                size={16}
                color={estaDescargada ? "#16A34A" : "#0077B6"}
              />
              <Text
                style={[
                  styles.btnDescargaTexto,
                  estaDescargada && styles.btnDescargaTextoOk,
                ]}
              >
                {estaDescargada ? "Offline ✓" : "Guardar"}
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
          <Text style={styles.tiempoTexto}>
            {formatearTiempo(tiempoActual)}
          </Text>
          <Text style={styles.tiempoTexto}>
            -{formatearTiempo(duracionTotal - tiempoActual)}
          </Text>
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
          disabled={cargandoAudio}
          accessibilityLabel={
            estaSonando ? "Pausar audioguía" : "Reproducir audioguía"
          }
        >
          {cargandoAudio ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name={estaSonando ? "pause" : "play"}
              size={28}
              color="#FFFFFF"
              style={!estaSonando ? styles.iconoPlayOffset : undefined}
            />
          )}
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
    backgroundColor: "#F0F9FF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconoOnda: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContenedor: {
    flex: 1,
    marginLeft: 10,
  },
  titulo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#03045E",
  },
  subtitulo: {
    fontSize: 13,
    color: "#0284C7",
  },
  btnDescarga: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 16,
  },
  btnDescargaOk: {
    backgroundColor: "#DCFCE7",
    borderColor: "#BBF7D0",
  },
  btnDescargaTexto: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0077B6",
  },
  btnDescargaTextoOk: {
    color: "#16A34A",
  },
  progresoContenedor: {
    marginVertical: 10,
  },
  barraFondo: {
    height: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    overflow: "hidden",
  },
  barraActiva: {
    height: "100%",
    backgroundColor: "#0077B6",
    borderRadius: 3,
  },
  tiemposFila: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  tiempoTexto: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  controlesFila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginVertical: 6,
  },
  btnControlSecundario: {
    alignItems: "center",
    padding: 8,
  },
  seekTexto: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0077B6",
    marginTop: 2,
  },
  btnPlayPause: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0077B6",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  iconoPlayOffset: {
    marginLeft: 3,
  },
  notaSegundoPlano: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    fontStyle: "italic",
  },
});
