// src/servicios/notificaciones.ts
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { Evento, Lugar } from '../tipos';

const AVISOS_ENVIADOS_KEY = 'notificaciones_enviadas_hoy_v4';

// Configurar cómo se presentan las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

/**
 * Registra categorías y acciones explícitas para evitar que en Android
 * el Intent extra de acción retorne nulo en NotificationForwarderActivity.
 */
export const configurarCategoriasNotificaciones = async (): Promise<void> => {
  try {
    await Notifications.setNotificationCategoryAsync('proximidad', [
      {
        identifier: 'ver_lugar',
        buttonTitle: 'Ver lugar',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('evento', [
      {
        identifier: 'ver_evento',
        buttonTitle: 'Ver agenda',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);
  } catch (e) {
    console.log('Aviso al configurar categorías de notificación:', e);
  }
};

export const solicitarPermisosNotificaciones = async (): Promise<boolean> => {
  try {
    await configurarCategoriasNotificaciones();

    const { status: statusExistente } = await Notifications.getPermissionsAsync();
    let finalStatus = statusExistente;
    if (statusExistente !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (e) {
    console.log('Error solicitando permisos de notificaciones:', e);
    return false;
  }
};

/**
 * REGLA DE LA CÁTEDRA (Pág. 4):
 * "Un aviso por lugar y por día es más que suficiente."
 * En desarrollo (__DEV__) se permite volver a notificar tras 1 minuto para facilitar pruebas.
 */
export const notificarProximidadLugar = async (
  lugar: Lugar,
  distanciaMetros: number
): Promise<boolean> => {
  try {
    const hoy = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const ahoraMs = Date.now();
    const registroRaw = await SecureStore.getItemAsync(AVISOS_ENVIADOS_KEY);
    const registro: Record<string, { fecha: string; timestamp: number }> = registroRaw
      ? JSON.parse(registroRaw)
      : {};

    const ultimoAviso = registro[lugar.id];
    const mismoDia = ultimoAviso && ultimoAviso.fecha === hoy;
    const tiempoDesdeUltimoAviso = ultimoAviso ? ahoraMs - ultimoAviso.timestamp : Infinity;

    // En desarrollo permitimos avisar nuevamente tras 60 segundos para poder probar en el lugar
    const bloqueadoPorFrecuencia = mismoDia && (!__DEV__ || tiempoDesdeUltimoAviso < 60000);

    if (bloqueadoPorFrecuencia) {
      console.log(`[Proximidad] Aviso para "${lugar.nombre}" omitido para no saturar.`);
      return false;
    }

    const tienePermiso = await solicitarPermisosNotificaciones();
    if (!tienePermiso) {
      console.log('[Proximidad] Permiso de notificaciones no concedido.');
      return false;
    }

    // Vibración háptica requerida por la cátedra (expo-haptics)
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_h) {}

    // Disparo inmediato mediante expo-notifications con enlace y categoría
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `¡Estás cerca de ${lugar.nombre}!`,
        body: `A solo ${Math.round(distanciaMetros)}m. Toca para ver horarios y detalles.`,
        data: {
          url: `/lugar/${lugar.id}`,
          lugarId: lugar.id,
        },
        categoryIdentifier: 'proximidad',
      },
      trigger: null,
    });

    console.log(`[Proximidad] Notificación emitida con éxito para "${lugar.nombre}" (${Math.round(distanciaMetros)}m).`);

    // Guardar registro
    registro[lugar.id] = { fecha: hoy, timestamp: ahoraMs };
    await SecureStore.setItemAsync(AVISOS_ENVIADOS_KEY, JSON.stringify(registro));
    return true;
  } catch (e) {
    console.error('Error enviando notificación de proximidad:', e);
    return false;
  }
};

/**
 * Recordatorio de evento agendado (Pág. 2)
 */
export const programarRecordatorioEvento = async (evento: Evento): Promise<boolean> => {
  try {
    const tienePermiso = await solicitarPermisosNotificaciones();
    if (!tienePermiso) return false;

    const inicio = new Date(evento.inicio);
    const ahora = new Date();

    // Notificar 1 hora antes del evento si aún no pasó
    const tiempoNotif = new Date(inicio.getTime() - 60 * 60 * 1000);

    if (tiempoNotif > ahora) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `Recordatorio: ${evento.titulo}`,
          body: `El evento comienza en 1 hora en ${evento.direccionLibre || 'Colón'}.`,
          data: {
            url: '/(tabs)/agenda',
            eventoId: evento.id,
          },
          categoryIdentifier: 'evento',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: tiempoNotif,
        },
      });
    } else {
      // Si falta menos de 1 hora, avisar ahora
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `¡Evento hoy: ${evento.titulo}!`,
          body: `Comienza hoy a las ${inicio.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs.`,
          data: {
            url: '/(tabs)/agenda',
            eventoId: evento.id,
          },
          categoryIdentifier: 'evento',
        },
        trigger: null,
      });
    }

    return true;
  } catch (e) {
    console.error('Error agendando recordatorio de evento:', e);
    return false;
  }
};

/**
 * Utilidad para reiniciar el registro de avisos y permitir pruebas inmediatas
 */
export const reiniciarHistorialNotificacionesProximidad = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(AVISOS_ENVIADOS_KEY);
    console.log('[Proximidad] Historial de notificaciones reiniciado.');
  } catch (_e) {}
};
