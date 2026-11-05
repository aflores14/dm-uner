// src/servicios/notificaciones.ts
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Evento, Lugar } from '../tipos';

const AVISOS_ENVIADOS_KEY = 'notificaciones_enviadas_hoy_v1';

// Configurar cómo se presentan las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export const solicitarPermisosNotificaciones = async (): Promise<boolean> => {
  try {
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
 * REGLA ESTRICTA DE LA CÁTEDRA (Pág. 4):
 * "No la conviertan en una máquina de notificaciones. Si alguien camina por la peatonal
 * no puede recibir doce avisos en cinco cuadras. Un aviso por lugar y por día es más que suficiente."
 */
export const notificarProximidadLugar = async (
  lugar: Lugar,
  distanciaMetros: number
): Promise<boolean> => {
  try {
    const hoy = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const registroRaw = await SecureStore.getItemAsync(AVISOS_ENVIADOS_KEY);
    const registro: Record<string, string> = registroRaw ? JSON.parse(registroRaw) : {};

    // Si ya se le envió notificación sobre este lugar hoy, NO saturar
    if (registro[lugar.id] === hoy) {
      return false;
    }

    const tienePermiso = await solicitarPermisosNotificaciones();
    if (!tienePermiso) return false;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `¡Estás cerca de ${lugar.nombre}!`,
        body: `A solo ${Math.round(distanciaMetros)}m. Toca para ver horarios y detalles.`,
        data: { lugarId: lugar.id },
      },
      trigger: null, // Disparo inmediato
    });

    // Guardar registro para evitar duplicados en el mismo día
    registro[lugar.id] = hoy;
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
          data: { eventoId: evento.id },
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
          data: { eventoId: evento.id },
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
